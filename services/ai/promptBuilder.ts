import {
  ChangeZone,
  ProjectItem,
  Strictness,
  StylePresetId,
} from "@/types/app";
import { getStyleTitle, getZoneTitle } from "@/constants/design";

const photoSystemPrompt = `You are editing a real furniture photo. Hard rule: preserve camera angle, perspective, furniture structure, proportions, module count, room architecture, appliance placement and all object boundaries. Never redesign the scene. Never add, remove, move or reshape furniture modules. Only update allowed appearance properties such as cabinet fronts, colors, materials, textures, countertop, backsplash, decorative trim and subtle lighting cleanup. If any conflict exists, preserving geometry wins.`;

const sketchSystemPrompt = `You are transforming a furniture sketch or drawing into a photorealistic interior image. Hard rule: preserve original configuration, camera angle, perspective, module count, proportions and placement. Do not redesign the furniture. Create a premium realistic render with believable materials, lighting, shadows and depth. If any conflict exists, preserving geometry wins.`;

const strictnessLabels: Record<Strictness, string> = {
  standard: "Сохраняй форму внимательно",
  strict: "Сохраняй форму очень строго",
  maximum: "Максимально строго сохраняй форму, ракурс и границы мебели",
};

const variantStrategies = [
  {
    id: "close",
    title: "Ближе к запросу",
    subtitle: "Максимально точное попадание в задачу",
    direction: "Stay very close to the user's requested palette and material combination.",
  },
  {
    id: "lighter",
    title: "Светлее и мягче",
    subtitle: "Более лёгкая и спокойная версия",
    direction: "Keep the same structure but make the design lighter, softer and more airy.",
  },
  {
    id: "contrast",
    title: "Контрастнее",
    subtitle: "Чище контраст и современнее подача",
    direction: "Keep the same geometry but create a more contrast, crisp and modern interpretation.",
  },
  {
    id: "premium",
    title: "Дороже на вид",
    subtitle: "Тёплая премиальная подача без лишней вычурности",
    direction: "Keep the same structure and make the result feel more premium with elegant, believable materials.",
  },
] as const;

export function getVariantStrategies() {
  return variantStrategies;
}

function getStyleInstruction(styleId: StylePresetId | null): string {
  if (!styleId) {
    return "Стиль явно не выбран. Сохрани нейтральную, дорогую и аккуратную подачу.";
  }

  return `Предпочтение по стилю: ${getStyleTitle(styleId)}.`;
}

function getZoneInstruction(zone: ChangeZone): string {
  return `Зона изменения: ${getZoneTitle(zone)}.`;
}

export function buildVariantPrompt(params: {
  project: ProjectItem;
  strictness: Strictness;
  strategyIndex: number;
  referenceVariantTitle?: string;
}): string {
  const { project, strictness, strategyIndex, referenceVariantTitle } = params;
  const strategy = variantStrategies[strategyIndex] ?? variantStrategies[0];
  const systemPrompt = project.mode === "photo" ? photoSystemPrompt : sketchSystemPrompt;

  const referenceInstruction = referenceVariantTitle
    ? `Use the reference result called "${referenceVariantTitle}" only as style direction, but still preserve the original geometry from the first image.`
    : "No reference variant is provided.";

  return [
    systemPrompt,
    `Mode: ${project.mode === "photo" ? "real furniture photo repaint" : "sketch to photorealistic render"}.`,
    `User request in Russian: ${project.description || project.voiceText || "Сделать красиво и аккуратно."}`,
    getStyleInstruction(project.styleId),
    getZoneInstruction(project.zone),
    `Shape preservation level: ${strictnessLabels[strictness]}.`,
    strategy.direction,
    referenceInstruction,
    "Do not add new furniture modules. Do not change the camera. Do not change room architecture. Keep edges aligned with the source.",
    "Return only one final image.",
  ].join("\n\n");
}
