import {
  ChangeZone,
  ProjectItem,
  Strictness,
  StylePresetId,
} from "@/types/app";
import { getStyleTitle, getZoneTitle } from "@/constants/design";

const photoSystemPrompt = `You are a professional interior photographer and CGI artist. Your task: repaint and restyle the furniture in the photo while keeping the exact geometry, camera angle and room layout.

Output quality requirements:
- Photorealistic result indistinguishable from a real photo
- Warm soft lighting: LED strip lights under cabinets, recessed ceiling spotlights with warm glow
- Deep perspective showing room corners and depth
- Realistic reflections on glossy and glass surfaces
- Natural living details: fruits, plants, dishes on countertops
- Rich material textures: marble veins, wood grain, metal shine
- Shot style: wide-angle interior photography, standing inside the room
- Color grade: warm neutral tones, professional interior photo
- Zero CGI plastic look, zero flat lighting, zero AI artifacts

Hard rules: preserve camera angle, furniture geometry, module count, room architecture. Never redesign the scene.`;

const sketchSystemPrompt = `You are a professional CGI artist creating photorealistic interior visualizations from sketches.

Transform this sketch into a premium interior photo with:
- Warm soft lighting: LED strips, recessed spotlights, pendant lights
- Deep perspective and room depth
- Rich realistic materials: marble, wood grain, glass, metal
- Living details: plants, fruits, decorative objects
- Wide-angle interior photography style
- Warm neutral professional color grade
- Result must look like a real photo shot inside the room

Hard rules: preserve original furniture configuration, proportions, module count and layout from the sketch exactly.`;

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
  const instructions: Record<ChangeZone, string> = {
    facades: "Change ONLY cabinet facades and visible front finishes. Keep countertop, backsplash, walls, floor, ceiling and all furniture geometry exactly as is.",
    countertop: "Change ONLY the countertop. Keep cabinet fronts, backsplash, walls, floor, ceiling and all furniture geometry exactly as is.",
    backsplash: "Change ONLY the backsplash. Keep cabinet fronts, countertop, walls, floor, ceiling and all furniture geometry exactly as is.",
    "facades-countertop": "Change ONLY cabinet facades and countertop. Keep backsplash, walls, floor, ceiling and all furniture geometry exactly as is.",
    all: "Change all allowed visible finishes in the current interior while preserving layout, room architecture, object positions and geometry exactly as is.",
    walls: "Change ONLY walls and wallpaper. Keep all furniture, floor and ceiling exactly as is.",
    floor: "Change ONLY the floor. Keep all furniture, walls and ceiling exactly as is.",
    ceiling: "Change ONLY the ceiling. Keep furniture, walls and floor exactly as is.",
    "walls-furniture": "Change walls and furniture only. Keep floor and ceiling exactly as is.",
    "full-room": "Transform entire room: walls, floor, ceiling and furniture in one cohesive style.",
  };

  return `Зона изменения: ${getZoneTitle(zone)}. ${instructions[zone]}`;
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
