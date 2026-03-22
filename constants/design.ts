import { ChangeZone, ProjectMode, QuickMaterial, StylePreset } from "@/types/app";

export const appCopy = {
  title: "Мебель AI",
  subtitle:
    "Изменение внешнего вида мебели по фото и создание реалистичных визуализаций из эскизов",
  preservation: "Конструкция и ракурс сохраняются",
  appearanceOnly: "Меняется только внешний вид",
};

export const stylePresets: StylePreset[] = [
  {
    id: "modern",
    title: "Современный",
    subtitle: "Чистые линии, спокойный контраст, актуальные материалы",
  },
  {
    id: "scandi",
    title: "Сканди",
    subtitle: "Светлая база, дерево, мягкая домашняя подача",
  },
  {
    id: "light",
    title: "Светлый",
    subtitle: "Больше воздуха, мягкий свет, лёгкая подача",
  },
  {
    id: "dark",
    title: "Тёмный",
    subtitle: "Глубокие тона, выразительный контраст, премиальный характер",
  },
  {
    id: "premium",
    title: "Премиум",
    subtitle: "Дорогие материалы, тёплый нейтральный свет, статусная подача",
  },
  {
    id: "minimal",
    title: "Минимализм",
    subtitle: "Спокойная геометрия, минимум лишнего, чистая композиция",
  },
];

export const quickMaterials: QuickMaterial[] = [
  { id: "white-matte", label: "Белый матовый", snippet: "фасады белый матовый" },
  { id: "white-gloss", label: "Белый глянец", snippet: "фасады белый глянец" },
  { id: "beige", label: "Бежевый матовый", snippet: "фасады бежевые матовые" },
  { id: "graphite", label: "Графит матовый", snippet: "низ графит матовый" },
  { id: "oak-light", label: "Дуб светлый", snippet: "столешница светлый дуб" },
  { id: "oak-natural", label: "Дуб натуральный", snippet: "дуб натуральный" },
  { id: "concrete-light", label: "Бетон светлый", snippet: "столешница светлый бетон" },
  { id: "stone-graphite", label: "Камень графит", snippet: "столешница графитовый камень" },
];

export const zoneOptions: Array<{ id: ChangeZone; title: string }> = [
  { id: "facades", title: "Только фасады" },
  { id: "countertop", title: "Только столешницу" },
  { id: "backsplash", title: "Только фартук" },
  { id: "facades-countertop", title: "Фасады и столешницу" },
  { id: "all", title: "Всё вместе" },
  { id: "walls", title: "Только стены / обои" },
  { id: "floor", title: "Только пол" },
  { id: "ceiling", title: "Только потолок" },
  { id: "walls-furniture", title: "Стены и мебель" },
  { id: "full-room", title: "Весь интерьер целиком" },
];

export const beautifulSuggestions: Record<ProjectMode, string[]> = {
  photo: [
    "верх белый матовый, низ дуб натуральный, столешница светлый камень, сделать спокойно и дорого",
    "только заменить фасады на бежевые матовые, сохранить всю геометрию и свет",
    "верх белый, низ графит матовый, столешница дуб, сделать современно и чисто",
    "фасады мягкий песочный оттенок, столешница бетон, без изменения формы мебели",
  ],
  sketch: [
    "сделать реалистичную современную кухню: верх белый матовый, низ графит, столешница бетон",
    "сделать светлый скандинавский интерьер с дубом и мягким дневным светом",
    "сделать дорогую нейтральную визуализацию: бежевые фасады, светлый камень, тёплый свет",
    "перевести эскиз в фотореалистичную кухню с чистыми матовыми фасадами и реалистичными тенями",
  ],
};

export const smartPromptExamples = [
  "верх белый матовый, низ дуб, столешница бетон",
  "сделать современно и светло",
  "фасады графит, столешница светлый камень",
  "только заменить фасады на бежевые",
];

export function getModeTitle(mode: ProjectMode): string {
  return mode === "photo" ? "Фото мебели" : "Эскиз / чертёж";
}

export function getModeHint(mode: ProjectMode): string {
  return mode === "photo"
    ? "Меняется только внешний вид. Конструкция и ракурс сохраняются."
    : "Эскиз будет преобразован в реалистичную визуализацию без изменения конфигурации.";
}

export function getStyleTitle(styleId: StylePreset["id"] | null): string {
  return stylePresets.find((item) => item.id === styleId)?.title ?? "Без стиля";
}

export function getZoneTitle(zone: ChangeZone): string {
  return zoneOptions.find((item) => item.id === zone)?.title ?? "Всё вместе";
}
