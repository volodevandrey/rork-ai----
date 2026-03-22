import { ProjectItem, Strictness, VariantItem } from "@/types/app";
import { createId } from "@/utils/id";
import { persistBase64Image } from "@/services/storage/fileStorage";
import { buildVariantPrompt, getVariantStrategies } from "@/services/ai/promptBuilder";

interface EditImageResponse {
  image: {
    base64Data: string;
    mimeType: string;
    aspectRatio: string;
  };
}

function getAspectRatio(project: ProjectItem): string {
  const ratio = project.sourceImage.width / Math.max(project.sourceImage.height, 1);

  if (ratio > 1.5) {
    return "16:9";
  }

  if (ratio > 1.1) {
    return "4:3";
  }

  if (ratio < 0.8) {
    return "3:4";
  }

  return "1:1";
}

async function requestVariant(params: {
  project: ProjectItem;
  strictness: Strictness;
  strategyIndex: number;
  sourceBase64: string;
  referenceBase64?: string;
  referenceVariantTitle?: string;
}): Promise<VariantItem> {
  const {
    project,
    strictness,
    strategyIndex,
    sourceBase64,
    referenceBase64,
    referenceVariantTitle,
  } = params;
  const prompt = buildVariantPrompt({
    project,
    strictness,
    strategyIndex,
    referenceVariantTitle,
  });
  const toolkitUrl = new URL(
    "/images/edit/",
    process.env.EXPO_PUBLIC_TOOLKIT_URL ?? "https://toolkit.rork.com",
  ).toString();
  const strategy = getVariantStrategies()[strategyIndex];

  console.log("[imageGeneration] requesting variant", strategy.title);

  const response = await fetch(toolkitUrl, {
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
      aspectRatio: getAspectRatio(project),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log("[imageGeneration] request failed", response.status, errorText);
    throw new Error("Не удалось создать вариант.");
  }

  const data = (await response.json()) as EditImageResponse;
  const uri = await persistBase64Image({
    base64: data.image.base64Data,
    mimeType: data.image.mimeType,
    fileNamePrefix: `variant-${project.id}-${strategy.id}`,
  });

  return {
    id: createId("variant"),
    title: strategy.title,
    subtitle: strategy.subtitle,
    image: {
      uri,
      mimeType: data.image.mimeType,
      width: project.sourceImage.width,
      height: project.sourceImage.height,
    },
    createdAt: Date.now(),
  };
}

export async function generateProjectVariants(params: {
  project: ProjectItem;
  sourceBase64: string;
  strictness: Strictness;
  referenceBase64?: string;
  referenceVariantTitle?: string;
  onProgress?: (stage: string, step: number, totalSteps: number) => void;
}): Promise<VariantItem[]> {
  const {
    project,
    sourceBase64,
    strictness,
    referenceBase64,
    referenceVariantTitle,
    onProgress,
  } = params;
  const strategies = getVariantStrategies();
  const totalSteps = strategies.length + 2;

  onProgress?.("Подготовка изображения", 1, totalSteps);
  console.log("[imageGeneration] project start", project.id, project.mode, strictness);

  onProgress?.("Проверка сохранения формы", 2, totalSteps);

  const variants: VariantItem[] = [];

  for (let index = 0; index < strategies.length; index += 1) {
    onProgress?.(`Создание варианта ${index + 1} из ${strategies.length}`, index + 3, totalSteps);
    const variant = await requestVariant({
      project,
      strictness,
      strategyIndex: index,
      sourceBase64,
      referenceBase64,
      referenceVariantTitle,
    });
    variants.push(variant);
  }

  console.log("[imageGeneration] project completed", project.id, variants.length);
  return variants;
}
