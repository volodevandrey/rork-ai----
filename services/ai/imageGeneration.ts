import { ProjectItem, Strictness, VariantCount, VariantItem } from "@/types/app";
import { createId } from "@/utils/id";
import { persistBase64Image } from "@/services/storage/fileStorage";
import { buildVariantPrompt, getVariantStrategies } from "@/services/ai/promptBuilder";

interface OpenAIImageEditResponse {
  data?: Array<{
    b64_json?: string;
  }>;
  error?: {
    message?: string;
  };
}

interface BufferLike {
  from(input: string, encoding: string): Uint8Array;
}

function getExtensionFromMimeType(mimeType: string): string {
  if (mimeType.includes("png")) {
    return "png";
  }

  if (mimeType.includes("webp")) {
    return "webp";
  }

  return "jpg";
}

function sanitizeBase64(input: string): string {
  if (input.startsWith("data:")) {
    return input.split(",")[1] ?? "";
  }

  return input;
}

function decodeBase64(base64: string): Uint8Array {
  const safeBase64 = sanitizeBase64(base64);
  const atobFn = globalThis.atob;

  if (typeof atobFn === "function") {
    const binary = atobFn(safeBase64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  }

  const maybeBuffer = (globalThis as typeof globalThis & { Buffer?: BufferLike }).Buffer;

  if (maybeBuffer) {
    return Uint8Array.from(maybeBuffer.from(safeBase64, "base64"));
  }

  throw new Error("Не удалось подготовить изображение для отправки.");
}

function createImageBlob(base64: string, mimeType: string): Blob {
  const bytes = decodeBase64(base64);
  const blobBytes = new Uint8Array(bytes.byteLength);

  blobBytes.set(bytes);

  return new Blob([blobBytes.buffer], { type: mimeType });
}

function appendImageToFormData(params: {
  formData: FormData;
  fieldName: string;
  base64: string;
  mimeType: string;
  fileNamePrefix: string;
}): void {
  const { formData, fieldName, base64, mimeType, fileNamePrefix } = params;
  const extension = getExtensionFromMimeType(mimeType);
  const imageBlob = createImageBlob(base64, mimeType);
  const fileName = `${fileNamePrefix}.${extension}`;

  formData.append(fieldName, imageBlob, fileName);
}

async function requestVariant(params: {
  project: ProjectItem;
  strictness: Strictness;
  strategyIndex: number;
  sourceBase64: string;
  referenceBase64?: string;
  referenceMimeType?: string;
  referenceVariantTitle?: string;
}): Promise<VariantItem> {
  const {
    project,
    strictness,
    strategyIndex,
    sourceBase64,
    referenceBase64,
    referenceMimeType,
    referenceVariantTitle,
  } = params;
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    console.log("[imageGeneration] missing EXPO_PUBLIC_OPENAI_API_KEY");
    throw new Error("Не настроен OpenAI API key. Добавьте EXPO_PUBLIC_OPENAI_API_KEY и попробуйте снова.");
  }

  const prompt = buildVariantPrompt({
    project,
    strictness,
    strategyIndex,
    referenceVariantTitle,
  });
  const strategy = getVariantStrategies()[strategyIndex];
  const formData = new FormData();

  formData.append("model", "gpt-image-1");
  formData.append("prompt", prompt);
  formData.append("n", "1");
  formData.append("size", "1024x1024");
  formData.append("output_format", "png");

  appendImageToFormData({
    formData,
    fieldName: "image",
    base64: sourceBase64,
    mimeType: project.sourceImage.mimeType,
    fileNamePrefix: `source-${project.id}`,
  });

  if (referenceBase64) {
    appendImageToFormData({
      formData,
      fieldName: "image",
      base64: referenceBase64,
      mimeType: referenceMimeType ?? "image/png",
      fileNamePrefix: `reference-${project.id}-${strategy.id}`,
    });
  }

  console.log("[imageGeneration] requesting OpenAI variant", strategy.title, {
    hasReference: Boolean(referenceBase64),
    model: "gpt-image-1",
  });

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log("[imageGeneration] OpenAI request failed", response.status, errorText);
    throw new Error("Не удалось создать вариант изображения.");
  }

  const data = (await response.json()) as OpenAIImageEditResponse;
  const generatedBase64 = data.data?.[0]?.b64_json;

  if (!generatedBase64) {
    console.log("[imageGeneration] OpenAI response missing image", data.error?.message ?? "unknown error");
    throw new Error("OpenAI не вернул изображение.");
  }

  const mimeType = "image/png";
  const uri = await persistBase64Image({
    base64: generatedBase64,
    mimeType,
    fileNamePrefix: `variant-${project.id}-${strategy.id}`,
  });

  return {
    id: createId("variant"),
    title: strategy.title,
    subtitle: strategy.subtitle,
    image: {
      uri,
      mimeType,
      width: 1024,
      height: 1024,
    },
    createdAt: Date.now(),
  };
}

export async function generateProjectVariants(params: {
  project: ProjectItem;
  sourceBase64: string;
  strictness: Strictness;
  variantCount: VariantCount;
  referenceBase64?: string;
  referenceMimeType?: string;
  referenceVariantTitle?: string;
  onProgress?: (stage: string, step: number, totalSteps: number) => void;
}): Promise<VariantItem[]> {
  const {
    project,
    sourceBase64,
    strictness,
    variantCount,
    referenceBase64,
    referenceMimeType,
    referenceVariantTitle,
    onProgress,
  } = params;
  const strategies = getVariantStrategies().slice(0, variantCount);
  const totalSteps = variantCount + 2;

  onProgress?.("Подготовка изображения", 1, totalSteps);
  console.log("[imageGeneration] project start", project.id, project.mode, strictness, variantCount);

  onProgress?.("Проверка сохранения формы", 2, totalSteps);

  let completedVariants = 0;

  const variants = await Promise.all(
    strategies.map(async (_, index) => {
      console.log("[imageGeneration] scheduling variant", index + 1, "of", strategies.length);

      const variant = await requestVariant({
        project,
        strictness,
        strategyIndex: index,
        sourceBase64,
        referenceBase64,
        referenceMimeType,
        referenceVariantTitle,
      });

      completedVariants += 1;
      onProgress?.(
        `Создан вариант ${completedVariants} из ${strategies.length}: ${variant.title}`,
        completedVariants + 2,
        totalSteps,
      );

      return variant;
    }),
  );

  console.log("[imageGeneration] project completed", project.id, variants.length);
  return variants;
}
