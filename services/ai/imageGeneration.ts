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

interface OpenAIVisionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface BufferLike {
  from(input: string, encoding: string): Uint8Array;
}

interface ImageGeometry {
  width: number;
  height: number;
  aspectRatio: string;
  openAiSize: "1024x1024" | "1024x1536" | "1536x1024";
}

const REQUEST_TIMEOUT_MS = 90_000;
const VISION_TIMEOUT_MS = 35_000;
const TARGET_SOURCE_LONG_SIDE = 1536;
const VISION_SOURCE_LONG_SIDE = 768;

type ImageService = "openai" | "toolkit";

class RequestTimeoutError extends Error {
  constructor(service: ImageService) {
    super(`${service} timeout`);
    this.name = "RequestTimeoutError";
  }
}

class RequestCancelledError extends Error {
  constructor() {
    super("Request cancelled");
    this.name = "RequestCancelledError";
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new RequestCancelledError();
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  service: ImageService,
  externalSignal?: AbortSignal,
): Promise<Response> {
  throwIfAborted(externalSignal);

  const controller = new AbortController();
  let timeoutTriggered = false;
  const timeoutId = setTimeout(() => {
    timeoutTriggered = true;
    controller.abort();
  }, timeoutMs);

  const abortFromExternalSignal = () => {
    controller.abort();
  };

  externalSignal?.addEventListener("abort", abortFromExternalSignal, { once: true });

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      if (timeoutTriggered) {
        throw new RequestTimeoutError(service);
      }

      throw new RequestCancelledError();
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortFromExternalSignal);
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

function gcd(a: number, b: number): number {
  let x = Math.max(1, Math.round(Math.abs(a)));
  let y = Math.max(1, Math.round(Math.abs(b)));

  while (y !== 0) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }

  return x;
}

function toAspectRatio(width: number, height: number): string {
  const divisor = gcd(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function getOpenAiSize(width: number, height: number): ImageGeometry["openAiSize"] {
  const ratio = width / Math.max(height, 1);

  if (ratio >= 1.2) {
    return "1536x1024";
  }

  if (ratio <= 0.83) {
    return "1024x1536";
  }

  return "1024x1024";
}

function getProjectImageGeometry(project: ProjectItem): ImageGeometry {
  const width = Math.max(1, project.sourceImage.width ?? 1024);
  const height = Math.max(1, project.sourceImage.height ?? 1024);

  return {
    width,
    height,
    aspectRatio: toAspectRatio(width, height),
    openAiSize: getOpenAiSize(width, height),
  };
}

async function resizeBase64Image(params: {
  sourceBase64: string;
  geometry: ImageGeometry;
  longSide: number;
  compress: number;
}): Promise<string> {
  const { sourceBase64, geometry, longSide, compress } = params;
  const dataUri = `data:image/png;base64,${sanitizeBase64(sourceBase64)}`;
  const actions = geometry.width >= geometry.height
    ? [{ resize: { width: longSide } }]
    : [{ resize: { height: longSide } }];

  const resized = await ImageManipulator.manipulateAsync(
    dataUri,
    actions,
    { compress, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  return resized.base64 ?? sourceBase64;
}

async function resizeSourceForUpload(sourceBase64: string, geometry: ImageGeometry): Promise<string> {
  return resizeBase64Image({
    sourceBase64,
    geometry,
    longSide: TARGET_SOURCE_LONG_SIDE,
    compress: 0.9,
  });
}

function getFallbackVisionAnalysis(project: ProjectItem): string {
  return [
    "VISION ANALYSIS FALLBACK:",
    "No separate vision analysis was available. Infer the furniture type directly from the uploaded image before rendering.",
    `Project mode: ${project.mode}.`,
    "Identify the furniture category, outer silhouette, visible side panels, vertical dividers, horizontal shelves, doors, drawers, countertop lines, base line, top line, depth lines and perspective angle.",
    "Preserve the detected construction exactly. If uncertain, keep the source geometry instead of inventing a clearer design.",
  ].join("\n");
}

function sanitizeVisionText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1800);
}

async function analyzeFurnitureWithVision(params: {
  project: ProjectItem;
  sourceBase64: string;
  geometry: ImageGeometry;
  signal?: AbortSignal;
}): Promise<string> {
  const { project, sourceBase64, geometry, signal } = params;
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    return getFallbackVisionAnalysis(project);
  }

  try {
    throwIfAborted(signal);
    const visionBase64 = await resizeBase64Image({
      sourceBase64,
      geometry,
      longSide: VISION_SOURCE_LONG_SIDE,
      compress: 0.75,
    });

    const response = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.EXPO_PUBLIC_OPENAI_VISION_MODEL ?? "gpt-4o-mini",
          temperature: 0,
          max_tokens: 450,
          messages: [
            {
              role: "system",
              content:
                "You are a furniture technologist and interior visualization assistant. Analyze the uploaded image only for furniture type and construction geometry. Do not be creative.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: [
                    "Analyze this furniture image for image-to-image rendering.",
                    "Return concise text with:",
                    "1. detected furniture type;",
                    "2. visible construction elements;",
                    "3. vertical lines/dividers;",
                    "4. horizontal shelves/levels;",
                    "5. side panels/depth/perspective;",
                    "6. what must not move during photorealistic rendering.",
                    "Focus on preserving geometry, not style.",
                  ].join("\n"),
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${sanitizeBase64(visionBase64)}`,
                    detail: "low",
                  },
                },
              ],
            },
          ],
        }),
      },
      VISION_TIMEOUT_MS,
      "openai",
      signal,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log("[imageGeneration] vision analysis failed", response.status, errorText);
      return getFallbackVisionAnalysis(project);
    }

    const data = (await response.json()) as OpenAIVisionResponse;
    const content = sanitizeVisionText(data.choices?.[0]?.message?.content ?? "");

    if (!content) {
      return getFallbackVisionAnalysis(project);
    }

    return [`VISION ANALYSIS:", content].join("\n");
  } catch (error) {
    if (error instanceof RequestCancelledError) {
      throw error;
    }

    console.log("[imageGeneration] vision analysis skipped", error);
    return getFallbackVisionAnalysis(project);
  }
}

async function buildVariantItem(params: {
  projectId: string;
  strategyId: string;
  strategyTitle: string;
  strategySubtitle: string;
  generatedBase64: string;
  mimeType: string;
  geometry: ImageGeometry;
}): Promise<VariantItem> {
  const { projectId, strategyId, strategyTitle, strategySubtitle, generatedBase64, mimeType, geometry } = params;
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
      width: geometry.width,
      height: geometry.height,
    },
    createdAt: Date.now(),
  };
}

async function requestOpenAIVariant(params: {
  prompt: string;
  sourceBase64: string;
  geometry: ImageGeometry;
  strategyTitle: string;
  strategySubtitle: string;
  projectId: string;
  strategyId: string;
  signal?: AbortSignal;
}): Promise<VariantItem> {
  const { prompt, sourceBase64, geometry, strategyTitle, strategySubtitle, projectId, strategyId, signal } = params;
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  throwIfAborted(signal);

  const formData = new FormData();
  formData.append("model", "gpt-image-1");
  formData.append("prompt", prompt);
  formData.append("n", "1");
  formData.append("size", geometry.openAiSize);

  const compressedBase64 = await resizeSourceForUpload(sourceBase64, geometry);
  appendImageToFormData({
    formData,
    fieldName: "image",
    base64: compressedBase64,
    mimeType: "image/jpeg",
    fileNamePrefix: `variant-source-${strategyId}`,
  });

  console.log("[imageGeneration] requesting OpenAI variant", strategyTitle, geometry.openAiSize, geometry.aspectRatio);

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
    signal,
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
    geometry,
  });
}

async function requestToolkitVariant(params: {
  prompt: string;
  sourceBase64: string;
  geometry: ImageGeometry;
  quality: ImageQuality;
  referenceBase64?: string;
  strategyTitle: string;
  strategySubtitle: string;
  projectId: string;
  strategyId: string;
  signal?: AbortSignal;
}): Promise<VariantItem> {
  const {
    prompt,
    sourceBase64,
    geometry,
    quality,
    referenceBase64,
    strategyTitle,
    strategySubtitle,
    projectId,
    strategyId,
    signal,
  } = params;

  console.log("[imageGeneration] requesting toolkit variant", strategyTitle, {
    hasReference: Boolean(referenceBase64),
    quality,
    aspectRatio: geometry.aspectRatio,
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
          aspectRatio: geometry.aspectRatio,
          quality,
        }),
      },
      REQUEST_TIMEOUT_MS,
      "toolkit",
      signal,
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
    geometry,
  });
}

async function requestVariant(params: {
  project: ProjectItem;
  strictness: Strictness;
  strategyIndex: number;
  sourceBase64: string;
  geometry: ImageGeometry;
  visionAnalysis: string;
  mode: GenerationMode;
  quality: ImageQuality;
  referenceBase64?: string;
  referenceVariantTitle?: string;
  signal?: AbortSignal;
}): Promise<VariantItem> {
  const {
    project,
    strictness,
    strategyIndex,
    sourceBase64,
    geometry,
    visionAnalysis,
    mode,
    quality,
    referenceBase64,
    referenceVariantTitle,
    signal,
  } = params;
  const prompt = buildVariantPrompt({
    project,
    strictness,
    strategyIndex,
    referenceVariantTitle,
    visionAnalysis,
  });
  const strategy = getVariantStrategies()[strategyIndex];

  if (!strategy) {
    throw new Error("Стратегия генерации не найдена.");
  }

  throwIfAborted(signal);

  if (process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
    try {
      console.log("[imageGeneration] trying OpenAI first, mode=", mode);
      return await requestOpenAIVariant({
        prompt,
        sourceBase64,
        geometry,
        strategyTitle: strategy.title,
        strategySubtitle: strategy.subtitle,
        projectId: project.id,
        strategyId: strategy.id,
        signal,
      });
    } catch (error) {
      if (error instanceof RequestCancelledError) {
        throw error;
      }

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
      geometry,
      quality,
      referenceBase64,
      strategyTitle: strategy.title,
      strategySubtitle: strategy.subtitle,
      projectId: project.id,
      strategyId: strategy.id,
      signal,
    });
  } catch (error) {
    if (error instanceof RequestCancelledError) {
      throw error;
    }

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
  signal?: AbortSignal;
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
    signal,
  } = params;
  const strategies = getVariantStrategies().slice(0, variantCount);
  const totalSteps = variantCount + 3;
  const geometry = getProjectImageGeometry(project);

  throwIfAborted(signal);
  onProgress?.("Подготовка изображения", 1, totalSteps);
  console.log("[imageGeneration] project start", project.id, project.mode, mode, strictness, quality, variantCount, geometry);

  onProgress?.("Анализ конструкции мебели", 2, totalSteps);
  const visionAnalysis = await analyzeFurnitureWithVision({
    project,
    sourceBase64,
    geometry,
    signal,
  });

  onProgress?.("Отправка запроса в сервис генерации", 3, totalSteps);

  let completedVariants = 0;

  const variants: VariantItem[] = [];
  for (let index = 0; index < strategies.length; index += 1) {
    throwIfAborted(signal);
    const currentVariantNumber = index + 1;
    console.log("[imageGeneration] sequential variant", currentVariantNumber, "of", strategies.length);
    onProgress?.(`Генерация варианта ${currentVariantNumber} из ${strategies.length}`, Math.min(currentVariantNumber + 2, totalSteps), totalSteps);

    const variant = await requestVariant({
      project,
      strictness,
      strategyIndex: index,
      sourceBase64,
      geometry,
      visionAnalysis,
      mode,
      quality,
      referenceBase64,
      referenceVariantTitle,
      signal,
    });
    variants.push(variant);
    completedVariants += 1;
    onProgress?.(`Создан вариант ${completedVariants} из ${strategies.length}: ${variant.title}`, completedVariants + 3, totalSteps);
  }

  console.log("[imageGeneration] project completed", project.id, variants.length);
  return variants;
}

export async function inpaintFurniture(params: {
  sourceBase64: string;
  sourceMimeType?: string;
  maskBase64: string;
  description: string;
  signal?: AbortSignal;
}): Promise<VariantItem> {
  const { sourceBase64, sourceMimeType = "image/png", maskBase64, description, signal } = params;
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  const normalizedDescription = description.trim();

  if (!normalizedDescription) {
    throw new Error("Опишите, какую мебель нужно дорисовать.");
  }

  throwIfAborted(signal);

  if (apiKey) {
    try {
      console.log("[imageGeneration] trying OpenAI inpaint");

      const formData = new FormData();
      formData.append("model", "gpt-image-1");
      formData.append(
        "prompt",
        `Add ${normalizedDescription} in the same style as existing furniture. Preserve all existing furniture, camera angle, perspective, visible geometry and construction lines exactly.`,
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
        signal,
      );

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
      } else {
        const errorText = await response.text();
        console.log("[imageGeneration] OpenAI inpaint failed", response.status, errorText);
      }
    } catch (error) {
      if (error instanceof RequestCancelledError) {
        throw error;
      }
      console.log("[imageGeneration] OpenAI inpaint fallback", error);
    }
  }

  throw new Error("Дорисовка временно недоступна. Попробуйте позже.");
}
