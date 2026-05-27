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

const surfaceRepaintRules = `SURFACE REPAINT ONLY MODE:
- Do not generate a new furniture object.
- Do not reconstruct the room, cabinet, wardrobe, shelving, kitchen, walls or floor.
- Treat the uploaded image as a fixed photograph/CAD underlay.
- Keep the original contour, outline, perspective, camera, crop, vanishing lines, object boundaries and all construction seams.
- Repaint only visible existing surfaces: facades, shelves, side panels, countertop, wall, floor or ceiling according to the selected change zone.
- Preserve all edge positions exactly; only the pixels inside the existing surfaces may change material, color, texture, lighting and reflections.
- Existing black sketch lines, cabinet gaps, shelf lines and divider lines must remain aligned in the same positions.
- The result must look like the same exact object after material replacement, not a redesigned object.`;

const photoSystemPrompt = `You are a professional interior photographer and CGI artist. Your task: repaint and restyle the furniture in the photo while keeping the exact geometry, camera angle and room layout.

${structuralLockRules}

${surfaceRepaintRules}

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

${surfaceRepaintRules}

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

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/ё/g, "е");
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function getFurnitureUnderstanding(project: ProjectItem): string {
  const text = normalizeText([project.title, project.description, project.voiceText].filter(Boolean).join(" "));

  if (hasAny(text, ["кухн", "мойк", "духов", "вароч", "фартук", "столешниц", "верхние шкаф", "нижние шкаф", "пенал кух"])) {
    return `FURNITURE UNDERSTANDING:
Detected furniture type: kitchen furniture / kitchen cabinet system.
Structural reading: preserve the exact kitchen run, upper cabinet row, lower cabinet row, countertop line, backsplash area, tall units, appliance openings, visible side panels, plinth/base line and all cabinet module divisions.
Critical preservation: do not move sink/cooktop/appliance openings, do not change the cabinet grid, do not change countertop height, do not change the camera angle.`;
  }

  if (hasAny(text, ["шкаф", "гардероб", "купе", "платян", "распашн", "прихож", "пенал", "шкафчик"])) {
    return `FURNITURE UNDERSTANDING:
Detected furniture type: wardrobe / tall cabinet system.
Structural reading: preserve the tall outer silhouette, left and right side panels, visible depth, vertical dividers, shelf levels, door zones, base line, top line and perspective angle.
Critical preservation: keep every vertical divider and side panel in the same position; keep shelf count and shelf heights unchanged; do not make the wardrobe deeper, wider, straighter or more symmetrical than the source.`;
  }

  if (hasAny(text, ["стеллаж", "полк", "полки", "открытые секц", "книжн", "ниша", "ячейк"])) {
    return `FURNITURE UNDERSTANDING:
Detected furniture type: open shelving / rack system.
Structural reading: preserve every horizontal shelf, vertical upright, open cell, side panel, back panel line, depth line and perspective angle.
Critical preservation: keep the number of shelves and open cells unchanged; keep all horizontal shelf lines aligned with the source; do not add decorative items inside shelves unless explicitly requested.`;
  }

  if (hasAny(text, ["тумб", "комод", "ящик", "консоль", "тв зона", "тв-тумб", "tv"])) {
    return `FURNITURE UNDERSTANDING:
Detected furniture type: cabinet / drawer unit / TV unit.
Structural reading: preserve the outer box, facade grid, drawer lines, door gaps, side panels, legs or plinth and all visible proportions.
Critical preservation: keep facade and drawer grid unchanged; keep outer proportions and visible side depth unchanged; do not add or remove handles, legs or drawers unless requested.`;
  }

  if (hasAny(text, ["стол", "рабочее место", "письмен", "компьютерн"])) {
    return `FURNITURE UNDERSTANDING:
Detected furniture type: desk / workstation furniture.
Structural reading: preserve tabletop outline, supports, side panels, drawer blocks, shelves and all visible perspective lines.
Critical preservation: keep tabletop size and angle unchanged; keep supports, drawer blocks and shelves in the same positions; do not change the viewing angle.`;
  }

  return `FURNITURE UNDERSTANDING:
Detected furniture type: unknown from user text. You must infer it visually from the uploaded image before rendering.
Visual analysis task before generation: identify whether the object is a kitchen, wardrobe, shelving, cabinet, desk, vanity or another furniture item. Then preserve its exact structural scheme.
Structural reading required: locate the outer silhouette, visible side panels, vertical dividers, horizontal shelves, door/drawer fronts, base line, top line, depth lines and perspective angle directly from the image.
Critical preservation: keep all detected furniture construction lines in the same visual positions. If uncertain, preserve the source image geometry instead of inventing a clearer or prettier design.`;
}

function getStyleInstruction(styleId: StylePresetId | null): string {
  if (!styleId) {
    return "Стиль явно не выбран. Сохрани нейтральную, дорогую и аккуратную подачу.";
  }

  return `Предпочтение по стилю: ${getStyleTitle(styleId)}.`;
}

function getZoneInstruction(zone: ChangeZone): string {
  const instructions: Record<ChangeZone, string> = {
    facades: "SURFACE REPAINT ONLY. Change ONLY existing cabinet facade surfaces and visible front finishes. Keep every contour, shelf line, divider line, gap, countertop, backsplash, walls, floor, ceiling and all furniture geometry exactly as is.",
    countertop: "SURFACE REPAINT ONLY. Change ONLY the existing countertop surface. Keep cabinet fronts, backsplash, walls, floor, ceiling, edges, seams and all furniture geometry exactly as is.",
    backsplash: "SURFACE REPAINT ONLY. Change ONLY the existing backsplash surface. Keep cabinet fronts, countertop, walls, floor, ceiling, edges, seams and all furniture geometry exactly as is.",
    "facades-countertop": "SURFACE REPAINT ONLY. Change ONLY existing cabinet facade surfaces and the existing countertop surface. Keep backsplash, walls, floor, ceiling, edges, seams and all furniture geometry exactly as is.",
    all: "SURFACE REPAINT ONLY. Change only visible existing furniture/room surfaces while preserving layout, room architecture, object positions, contours, construction seams and geometry exactly as is.",
    walls: "SURFACE REPAINT ONLY. Change ONLY existing walls and wallpaper. Keep all furniture, floor, ceiling, contours, shadows and perspective exactly as is.",
    floor: "SURFACE REPAINT ONLY. Change ONLY the existing floor surface. Keep all furniture, walls, ceiling, contours, shadows and perspective exactly as is.",
    ceiling: "SURFACE REPAINT ONLY. Change ONLY the existing ceiling surface. Keep furniture, walls, floor, contours, shadows and perspective exactly as is.",
    "walls-furniture": "SURFACE REPAINT ONLY. Change only existing wall and furniture surfaces. Keep floor, ceiling, contours, construction seams, object positions and perspective exactly as is.",
    "full-room": "SURFACE REPAINT ONLY. Transform allowed visible finishes across the room in one cohesive style, but preserve the exact room architecture, furniture layout, contours, seams, perspective and object positions.",
  };

  return `Зона изменения: ${getZoneTitle(zone)}. ${instructions[zone]}`;
}

function getMaximumStrictnessInstruction(strictness: Strictness): string {
  if (strictness !== "maximum") {
    return "Structural preservation is required. Use surface repaint only; do not reconstruct the object.";
  }

  return [
    "MAXIMUM STRICTNESS ACTIVE:",
    "Treat the uploaded image like a CAD underlay/reference trace.",
    "Every shelf, vertical divider, side panel, outline edge and perspective line must remain in the same visual position.",
    "Do not improve the design by changing proportions. Do not make the object more symmetrical. Do not correct perspective.",
    "Use surface repaint only: change materials and colors on existing surfaces without changing contours.",
    "The after image must be suitable for an exact before/after overlay comparison.",
  ].join("\n");
}

export function buildVariantPrompt(params: {
  project: ProjectItem;
  strictness: Strictness;
  strategyIndex: number;
  referenceVariantTitle?: string;
  visionAnalysis?: string;
}): string {
  const { project, strictness, strategyIndex, referenceVariantTitle, visionAnalysis } = params;
  const strategy = variantStrategies[strategyIndex] ?? variantStrategies[0];
  const systemPrompt = project.mode === "photo" ? photoSystemPrompt : sketchSystemPrompt;

  const referenceInstruction = referenceVariantTitle
    ? `Use the reference result called "${referenceVariantTitle}" only as style direction, but still preserve the original geometry from the first image.`
    : "No reference variant is provided.";

  return [
    systemPrompt,
    getFurnitureUnderstanding(project),
    visionAnalysis?.trim() || "No separate vision analysis is available. Infer furniture construction from the uploaded image before rendering.",
    `Mode: ${project.mode === "photo" ? "real furniture photo repaint" : "sketch to photorealistic render"}.`,
    `User request in Russian: ${project.description || project.voiceText || "Сделать красиво и аккуратно."}`,
    getStyleInstruction(project.styleId),
    getZoneInstruction(project.zone),
    `Shape preservation level: ${strictnessLabels[strictness]}.`,
    getMaximumStrictnessInstruction(strictness),
    strategy.direction,
    referenceInstruction,
    "Rendering method: surface repaint/material replacement over the existing source image. Do not create a new object or new layout.",
    "Before rendering, use the vision analysis and the uploaded image to identify the furniture type and construction, then keep that construction fixed.",
    "Final check before output: the generated image must keep the same camera, crop, perspective, furniture outline, vertical dividers, shelf lines, module grid, contour and object positions as the uploaded source.",
    "Return only one final image.",
  ].join("\n\n");
}
