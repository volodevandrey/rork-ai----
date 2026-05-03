import * as ImageManipulator from "expo-image-manipulator";
import { buildVariantPrompt, getVariantStrategies } from "@/services/ai/promptBuilder";
import { persistBase64Image } from "@/services/storage/fileStorage";
import {
  GenerationMode,
  ImageQuality,
  ProjectItem,
  Strictness,
  VariantCount,
  VariantItem,
} from "@/types/app";
import { createId } from "@/utils/id";

interface ToolkitImageEditResponse {
  image?: {
    base64Data?: string;
    mimeType?: string;
    aspectRatio?: string;
  };
  error?: {
    message?: string;
  };
}

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

const REQUEST_TIMEOUT_MS = 90_000;

class RequestTimeoutError extends Error {
  constructor(service: "openai" | "toolkit") {
    super(`${service} timeout`);
    this.name = "RequestTimeoutError";
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  service: "openai" | "toolkit",
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new RequestTimeoutError(service);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getToolkitImageEditUrl(): string {
  return new URL(
    "/images/edit/",
    process.env.EXPO_PUBLIC_TOOLKIT_URL ?? "https://toolkit.rork.com",
  ).toString();
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

async function buildVariantItem(params: {
  projectId: string;
  strategyId: string;
  strategyTitle: string;
  strategySubtitle: string;
  generatedBase64: string;
  mimeType: string;
}): Promise<VariantItem> {
  const { projectId, strategyId, strategyTitle, strategySubtitle, generatedBase64, mimeType } = params;
  const uri = await persistBase64Image({
    base64: generatedBase64,
    mimeType,
    fileNamePrefix: `variant-${projectId}-${strategyId}`,
  });

  return {
    id: createId("variant"),
    title: strategyTitle,
    subtitle: strategySubtitle,
    image: {
      uri,
      mimeType,
      width: 1024,
      height: 1024,
    },
    createdAt: Date.now(),
  };
}

async function requestOpenAIVariant(params: {
  prompt: string;
  sourceBase64: string;
  strategyTitle: string;
  strategySubtitle: string;
  projectId: string;
  strategyId: string;
  projectMode: ProjectItem["mode"];
}): Promise<VariantItem> {
  const { prompt, sourceBase64, strategyTitle, strategySubtitle, projectId, strategyId, projectMode } = params;
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const formData = new FormData();
  formData.append("model", "gpt-image-1");
  formData.append("prompt", prompt);
  formData.append("n", "1");
  formData.append("size", "1024x1024");
  // Для эскизов снижаем "цепляние" за исходный контур, чтобы получить более реалистичный рендер.
  formData.append("input_fidelity", projectMode === "sketch" ? "low" : "high");

  const dataUri = `data:image/png;base64,${sanitizeBase64(sourceBase64)}`;
  const resized = await ImageManipulator.manipulateAsync(dataUri, [{ resize: { width: 1024 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  const compressedBase64 = resized.base64 ?? sourceBase64;
  appendImageToFormData({ formData, fieldName: "image", base64: compressedBase64, mimeType: "image/jpeg", fileNamePrefix: `variant-source-${strategyId}` });

  console.log("[imageGeneration] requesting OpenAI variant", strategyTitle);

  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/images/edits",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    },
    REQUEST_TIMEOUT_MS,
    "openai",
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.log("[imageGeneration] OpenAI request failed", response.status, errorText);
    throw new Error("OpenAI image edit failed.");
  }

  const data = (await response.json()) as OpenAIImageEditResponse;
  const generatedBase64 = data.data?.[0]?.b64_json;

  if (!generatedBase64) {
    console.log("[imageGeneration] OpenAI response missing image", data.error?.message ?? "unknown error");
    throw new Error("OpenAI image edit returned no image.");
  }

  return buildVariantItem({
    projectId,
    strategyId,
    strategyTitle,
    strategySubtitle,
    generatedBase64,
    mimeType: "image/png",
  });
}

async function requestToolkitVariant(params: {
  prompt: string;
  sourceBase64: string;
  quality: ImageQuality;
  referenceBase64?: string;
  strategyTitle: string;
  strategySubtitle: string;
  projectId: string;
  strategyId: string;
}): Promise<VariantItem> {
  const {
    prompt,
    sourceBase64,
    quality,
    referenceBase64,
    strategyTitle,
    strategySubtitle,
    projectId,
    strategyId,
  } = params;

  console.log("[imageGeneration] requesting toolkit variant", strategyTitle, {
    hasReference: Boolean(referenceBase64),
    quality,
  });

  let response: Response;
  try {
    response = await fetchWithTimeout(
      getToolkitImageEditUrl(),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          images: [
            { type: "image", image: sourceBase64 },
            ...(referenceBase64 ? [{ type: "image", image: referenceBase64 }] : []),
          ],
          aspectRatio: "1:1",
          quality,
        }),
      },
      REQUEST_TIMEOUT_MS,
      "toolkit",
    );
  } catch (error) {
    if (error instanceof RequestTimeoutError) {
      console.log("Toolkit timeout 90s, generation failed");
    }
    throw error;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.log("[imageGeneration] toolkit request failed", response.status, errorText);
    throw new Error("Не удалось создать вариант изображения.");
  }

  const data = (await response.json()) as ToolkitImageEditResponse;
  const generatedBase64 = data.image?.base64Data;
  const mimeType = data.image?.mimeType ?? "image/png";

  if (!generatedBase64) {
    console.log("[imageGeneration] toolkit response missing image", data.error?.message ?? "unknown error");
    throw new Error("Сервис генерации не вернул изображение.");
  }

  return buildVariantItem({
    projectId,
    strategyId,
    strategyTitle,
    strategySubtitle,
    generatedBase64,
    mimeType,
  });
}

async function requestVariant(params: {
  project: ProjectItem;
  strictness: Strictness;
  strategyIndex: number;
  sourceBase64: string;
  mode: GenerationMode;
  quality: ImageQuality;
  referenceBase64?: string;
  referenceVariantTitle?: string;
}): Promise<VariantItem> {
  const {
    project,
    strictness,
    strategyIndex,
    sourceBase64,
    mode,
    quality,
    referenceBase64,
    referenceVariantTitle,
  } = params;
  const prompt = buildVariantPrompt({
    project,
    strictness,
    strategyIndex,
    referenceVariantTitle,
  });
  const strategy = getVariantStrategies()[strategyIndex];

  if (!strategy) {
    throw new Error("Стратегия генерации не найдена.");
  }

  if (process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
    try {
      console.log("[imageGeneration] trying OpenAI first, mode=", mode);
      return await requestOpenAIVariant({
        prompt,
        sourceBase64,
        strategyTitle: strategy.title,
        strategySubtitle: strategy.subtitle,
        projectId: project.id,
        strategyId: strategy.id,
        projectMode: project.mode,
      });
    } catch (error) {
      if (error instanceof RequestTimeoutError) {
        console.log("OpenAI timeout 90s, switching to Toolkit fallback");
      }
      console.log("[imageGeneration] OpenAI failed, fallback to toolkit");
      console.log("[imageGeneration] OpenAI fallback reason", error);
    }
  } else {
    console.log("[imageGeneration] no OpenAI key, using toolkit directly");
  }

  try {
    return await requestToolkitVariant({
      prompt,
      sourceBase64,
      quality,
      referenceBase64,
      strategyTitle: strategy.title,
      strategySubtitle: strategy.subtitle,
      projectId: project.id,
      strategyId: strategy.id,
    });
  } catch (error) {
    console.log("[imageGeneration] toolkit failed after OpenAI fallback", error);
    throw new Error("Не удалось создать изображение. Попробуйте ещё раз или проверьте подключение к интернету.");
  }
}

export async function generateProjectVariants(params: {
  project: ProjectItem;
  sourceBase64: string;
  strictness: Strictness;
  mode: GenerationMode;
  quality: ImageQuality;
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
    mode,
    quality,
    variantCount,
    referenceBase64,
    referenceVariantTitle,
    onProgress,
  } = params;
  const strategies = getVariantStrategies().slice(0, variantCount);
  const totalSteps = variantCount + 2;

  onProgress?.("Подготовка изображения", 1, totalSteps);
  console.log("[imageGeneration] project start", project.id, project.mode, mode, strictness, quality, variantCount);

  onProgress?.("Проверка сохранения формы", 2, totalSteps);

  let completedVariants = 0;

  const variants: VariantItem[] = [];
  for (let index = 0; index < strategies.length; index++) {
    console.log("[imageGeneration] sequential variant", index + 1, "of", strategies.length);
    const variant = await requestVariant({ project, strictness, strategyIndex: index, sourceBase64, mode, quality, referenceBase64, referenceVariantTitle });
    variants.push(variant);
    completedVariants += 1;
    onProgress?.(`Создан вариант ${completedVariants} из ${strategies.length}: ${variant.title}`, completedVariants + 2, totalSteps);
  }

  console.log("[imageGeneration] project completed", project.id, variants.length);
  return variants;
}

export async function inpaintFurniture(params: {
  sourceBase64: string;
  sourceMimeType?: string;
  maskBase64: string;
  description: string;
}): Promise<VariantItem> {
  const { sourceBase64, sourceMimeType = "image/png", maskBase64, description } = params;
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  const normalizedDescription = description.trim();

  if (!normalizedDescription) {
    throw new Error("Опишите, какую мебель нужно дорисовать.");
  }

  // Попытка через OpenAI (если есть ключ)
  if (apiKey) {
    try {
      console.log("[imageGeneration] trying OpenAI inpaint");

      const formData = new FormData();
      formData.append("model", "gpt-image-1");
      formData.append(
        "prompt",
        `Add ${normalizedDescription} in the same style as existing furniture. Preserve all existing furniture exactly.`,
      );
      formData.append("n", "1");
      formData.append("size", "1024x1024");
      formData.append("output_format", "png");

      appendImageToFormData({
        formData,
        fieldName: "image",
        base64: sourceBase64,
        mimeType: sourceMimeType,
        fileNamePrefix: "inpaint-source",
      });

      appendImageToFormData({
        formData,
        fieldName: "mask",
        base64: maskBase64,
        mimeType: "image/png",
        fileNamePrefix: "inpaint-mask",
      });

      const response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = (await response.json()) as OpenAIImageEditResponse;
        const generatedBase64 = data.data?.[0]?.b64_json;

        if (generatedBase64) {
          const mimeType = "image/png";
          const uri = await persistBase64Image({
            base64: generatedBase64,
            mimeType,
            fileNamePrefix: "inpaint-result",
          });

          return {
            id: createId("variant"),
            title: "Дорисовано",
            subtitle: normalizedDescription,
            image: { uri, mimeType, width: 1024, height: 1024 },
            createdAt: Date.now(),
          };
        }
      }

      console.log("[imageGeneration] OpenAI inpaint failed, fallback to toolkit");
    } catch (error) {
      console.log("[imageGeneration] OpenAI inpaint error, fallback to toolkit", error);
    }
  } else {
    console.log("[imageGeneration] no OpenAI key, using toolkit for inpaint");
  }

  // Фолбэк через Rork Toolkit
  const toolkitPrompt = `Add ${normalizedDescription} in the marked area, matching the style of existing furniture. Preserve everything else exactly as is.`;

  const toolkitResponse = await fetch(getToolkitImageEditUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: toolkitPrompt,
      images: [
        { type: "image", image: sourceBase64 },
        { type: "image", image: maskBase64 },
      ],
      aspectRatio: "1:1",
      quality: "medium",
    }),
  });

  if (!toolkitResponse.ok) {
    const errorText = await toolkitResponse.text();
    console.log("[imageGeneration] toolkit inpaint failed", toolkitResponse.status, errorText);
    throw new Error("Не удалось дорисовать мебель. Попробуйте ещё раз.");
  }

  const toolkitData = (await toolkitResponse.json()) as ToolkitImageEditResponse;
  const generatedBase64 = toolkitData.image?.base64Data;
  const mimeType = toolkitData.image?.mimeType ?? "image/png";

  if (!generatedBase64) {
    throw new Error("Сервис не вернул изображение для дорисовки.");
  }

  const uri = await persistBase64Image({
    base64: generatedBase64,
    mimeType,
    fileNamePrefix: "inpaint-result",
  });

  return {
    id: createId("variant"),
    title: "Дорисовано",
    subtitle: normalizedDescription,
    image: { uri, mimeType, width: 1024, height: 1024 },
    createdAt: Date.now(),
  };
}
