export type ProjectMode = "photo" | "sketch";

export type ChangeZone =
  | "facades"
  | "countertop"
  | "backsplash"
  | "facades-countertop"
  | "all"
  | "walls"
  | "floor"
  | "ceiling"
  | "walls-furniture"
  | "full-room";

export type Strictness = "standard" | "strict" | "maximum";

export type VariantCount = 1 | 2 | 4;

export type ImageQuality = "low" | "medium" | "high";

export type GenerationMode = "free" | "pro";

export type ProjectStatus = "draft" | "generating" | "ready" | "error";

export type StylePresetId =
  | "modern"
  | "scandi"
  | "light"
  | "dark"
  | "premium"
  | "minimal";

export interface StoredImage {
  uri: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface VariantItem {
  id: string;
  title: string;
  subtitle: string;
  image: StoredImage;
  createdAt: number;
}

export interface GenerationSession {
  id: string;
  createdAt: number;
  description: string;
  styleId: StylePresetId | null;
  zone: ChangeZone;
  strictness: Strictness;
  variants: VariantItem[];
}

export interface TemplateItem {
  id: string;
  name: string;
  description: string;
  styleId: StylePresetId | null;
  zone: ChangeZone;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectItem {
  id: string;
  title: string;
  mode: ProjectMode;
  sourceImage: StoredImage;
  description: string;
  voiceText: string;
  styleId: StylePresetId | null;
  zone: ChangeZone;
  selectedTemplateId: string | null;
  status: ProjectStatus;
  variants: VariantItem[];
  variantCount: VariantCount;
  quality: ImageQuality;
  history: GenerationSession[];
  createdAt: number;
  updatedAt: number;
  lastError: string | null;
}

export interface StylePreset {
  id: StylePresetId;
  title: string;
  subtitle: string;
}

export interface QuickMaterial {
  id: string;
  label: string;
  snippet: string;
}

export interface GenerationProgress {
  stage: string;
  step: number;
  totalSteps: number;
}
