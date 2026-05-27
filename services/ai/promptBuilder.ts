import {
  ChangeZone,
  ProjectItem,
  Strictness,
  StylePresetId,
} from "@/types/app";
import { getStyleTitle, getZoneTitle } from "@/constants/design";

const structuralLockRules = `STRICT STRUCTURAL LOCK:
- Use the uploaded image as the exact structural blueprint.
- Preserve the exact camera angle, perspective, framing, crop, furniture silhouette, object position, visible geometry, module divisions, vertical lines, horizontal shelf lines, side panels, depth, proportions and scale.
- The output must align with the source image in a before/after slider.
- Do not rotate, mirror, zoom, crop differently, move the furniture, change viewpoint, change lens, straighten perspective, or reinterpret the layout.
- Do not add, remove, resize, merge or split shelves, partitions, drawers, doors, side panels, handles, legs, walls, ceiling, floor, background objects, or decorative items unless the user explicitly requests it.
- Only change allowed finishes, materials, lighting, shadows and texture realism.
- If any source line or edge is ambiguous, keep the closest possible original position instead of inventing a new design.`;

const photoSystemPrompt = `You are a professional interior photographer and CGI artist. Your task: repaint and restyle the furniture in the photo while keeping the exact geometry, camera angle and room layout.

${structuralLockRules}

Output quality requirements:
- Photorealistic result indistinguishable from a real photo
- Warm soft lighting only where lighting already exists or is naturally implied by the current furniture
- Realistic reflections on glossy and glass surfaces
- Rich material textures: marble veins, wood grain, metal shine
- Color grade: warm neutral tones, professional interior photo
- Zero CGI plastic look, zero flat lighting, zero AI artifacts

Hard rules: preserve camera angle, furniture geometry, module count, room architecture. Never redesign the scene.

ABSOLUTE RULE: NEVER add any new objects, furniture, plants, fruits, decorations, dishes, vases or any items that do not exist in the original image. ONLY change colors, materials, textures and surfaces of existing furniture. If you add anything new — the result is wrong.`;

const sketchSystemPrompt = `You are a professional CGI artist converting hand-drawn sketches and technical drafts into photorealistic furniture renders.

Primary task: convert the existing sketch/draft into a believable real-world render while preserving the sketch structure as a construction blueprint.

${structuralLockRules}

Output quality requirements:
- Photorealistic result with natural camera look and physically plausible lighting
- Realistic material rendering: wood grain, stone, glass, metal, matte and glossy surfaces
- Warm neutral professional color grade
- Result must look like a real furniture/interior render based on the same exact drawing

Interpretation rules for sketch mode:
- Use sketch lines as hard geometry guides, not loose inspiration.
- Keep the same contour, same viewpoint, same visible sides, same module count, same shelves and same partitions.
- Do not preserve raw line-art texture, but keep all structural lines aligned to the source.
- Prioritize structural fidelity over creativity, decoration and redesign.

ABSOLUTE RULE: NEVER add any new objects, furniture, plants, fruits, decorations, dishes, vases or any items that do not exist in the original image. ONLY change colors, materials, textures and surfaces of existing furniture. If you add anything new — the result is wrong.`;

const strictnessLabels: Record<Strictness, string> = {
  standard: "Сохраняй форму внимательно",
  strict: "Сохраняй форму очень строго",
  maximum: "Максимально строго сохраняй форму, ракурс, линии, модульную сетку и границы мебели",
};

const variantStrategies = [
  {
    id: "close",
    title: "Ближе к запросу",
    subtitle: "Максимально точное попадание в задачу",
    direction: "Stay as close as possible to the source structure and to the user's requested palette and material combination. Structural fidelity has priority over visual creativity.",
  },
  {
    id: "lighter",
    title: "Светлее и мягче",
    subtitle: "Более лёгкая и спокойная версия",
    direction: "Keep the exact same structure and make only the finishes lighter, softer and more airy.",
  },
  {
    id: "contrast",
    title: "Контрастнее",
    subtitle: "Чище контраст и современнее подача",
    direction: "Keep the exact same geometry and create a more contrast, crisp and modern material interpretation without changing layout.",
  },
  {
    id: "premium",
    title: "Дороже на вид",
    subtitle: "Тёплая премиальная подача без лишней вычурности",
    direction: "Keep the exact same structure and make only the materials look more premium and believable.",
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
    "full-room": "Transform allowed visible finishes across the room in one cohesive style, but preserve the exact room architecture, furniture layout, perspective and object positions.",
  };

  return `Зона изменения: ${getZoneTitle(zone)}. ${instructions[zone]}`;
}

function getMaximumStrictnessInstruction(strictness: Strictness): string {
  if (strictness !== "maximum") {
    return "Structural preservation is required.";
  }

  return [
    "MAXIMUM STRICTNESS ACTIVE:",
    "Treat the uploaded image like a CAD underlay/reference trace.",
    "Every shelf, vertical divider, side panel, outline edge and perspective line must remain in the same visual position.",
    "Do not improve the design by changing proportions. Do not make the object more symmetrical. Do not correct perspective.",
    "The after image must be suitable for an exact before/after overlay comparison.",
  ].join("\n");
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
    getMaximumStrictnessInstruction(strictness),
    strategy.direction,
    referenceInstruction,
    "Final check before output: the generated image must keep the same camera, crop, perspective, furniture outline, vertical dividers, shelf lines, module grid and object positions as the uploaded source.",
    "Return only one final image.",
  ].join("\n\n");
}
