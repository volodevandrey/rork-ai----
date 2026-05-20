import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  ChangeZone,
  ImageQuality,
  ProjectItem,
  ProjectMode,
  ProjectStatus,
  Strictness,
  StylePresetId,
  TemplateItem,
  VariantCount,
} from "@/types/app";

const PROJECTS_KEY = "@furniture-ai/projects";
const TEMPLATES_KEY = "@furniture-ai/templates";
const LAST_ACTIVE_PROJECT_KEY = "@furniture-ai/last-active-project";
const ONBOARDING_SHOWN_KEY = "onboarding_shown";

function parseVariantCount(value: unknown): VariantCount {
  if (value === 1 || value === 2 || value === 4) {
    return value;
  }

  return 2;
}

function parseImageQuality(value: unknown): ImageQuality {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return "medium";
}

function parseProjectMode(value: unknown): ProjectMode {
  if (value === "photo" || value === "sketch") {
    return value;
  }

  return "photo";
}

function parseProjectStatus(value: unknown): ProjectStatus {
  if (value === "draft" || value === "generating" || value === "ready" || value === "error") {
    return value;
  }

  return "draft";
}

function parseStrictness(value: unknown): Strictness {
  if (value === "standard" || value === "strict" || value === "maximum") {
    return value;
  }

  return "strict";
}

function parseStylePresetId(value: unknown): StylePresetId | null {
  if (
    value === "modern" ||
    value === "scandi" ||
    value === "light" ||
    value === "dark" ||
    value === "premium" ||
    value === "minimal"
  ) {
    return value;
  }

  return null;
}

function parseChangeZone(value: unknown): ChangeZone {
  if (
    value === "facades" ||
    value === "countertop" ||
    value === "backsplash" ||
    value === "facades-countertop" ||
    value === "all" ||
    value === "walls" ||
    value === "floor" ||
    value === "ceiling" ||
    value === "walls-furniture" ||
    value === "full-room"
  ) {
    return value;
  }

  return "all";
}

function parseString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeProject(project: Partial<ProjectItem>): ProjectItem | null {
  const now = Date.now();

  if (!isRecord(project.sourceImage) || typeof project.sourceImage.uri !== "string") {
    console.log("[appStorage] skip project without source image", project.id);
    return null;
  }

  const mode = parseProjectMode(project.mode);
  const variants = Array.isArray(project.variants) ? project.variants : [];
  const history = Array.isArray(project.history) ? project.history : [];

  return {
    id: parseString(project.id, `project-${now}`),
    title: parseString(project.title, mode === "photo" ? "Фото мебели" : "Эскиз мебели"),
    mode,
    sourceImage: {
      uri: project.sourceImage.uri,
      mimeType: parseString(project.sourceImage.mimeType, "image/jpeg"),
      width: parseNumber(project.sourceImage.width, 1024),
      height: parseNumber(project.sourceImage.height, 1024),
    },
    description: parseString(project.description),
    voiceText: parseString(project.voiceText),
    styleId: parseStylePresetId(project.styleId),
    zone: parseChangeZone(project.zone),
    selectedTemplateId: typeof project.selectedTemplateId === "string" ? project.selectedTemplateId : null,
    status: parseProjectStatus(project.status),
    variants,
    variantCount: parseVariantCount(project.variantCount),
    quality: parseImageQuality(project.quality),
    history: history.map((session) => ({
      ...session,
      id: parseString(session.id, `session-${now}`),
      createdAt: parseNumber(session.createdAt, now),
      description: parseString(session.description),
      styleId: parseStylePresetId(session.styleId),
      zone: parseChangeZone(session.zone),
      strictness: parseStrictness(session.strictness),
      variants: Array.isArray(session.variants) ? session.variants : [],
    })),
    createdAt: parseNumber(project.createdAt, now),
    updatedAt: parseNumber(project.updatedAt, now),
    lastError: typeof project.lastError === "string" ? project.lastError : null,
  };
}

async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch (error) {
    console.log("[appStorage] load error", key, error);
    return fallback;
  }
}

async function saveJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.log("[appStorage] save error", key, error);
  }
}

export async function loadProjects(): Promise<ProjectItem[]> {
  const projects = await loadJson<Partial<ProjectItem>[]>(PROJECTS_KEY, []);
  return projects
    .map(normalizeProject)
    .filter((project): project is ProjectItem => project !== null);
}

export async function saveProjects(projects: ProjectItem[]): Promise<void> {
  await saveJson(PROJECTS_KEY, projects);
}

export async function loadTemplates(): Promise<TemplateItem[]> {
  return loadJson<TemplateItem[]>(TEMPLATES_KEY, []);
}

export async function saveTemplates(templates: TemplateItem[]): Promise<void> {
  await saveJson(TEMPLATES_KEY, templates);
}

export async function loadLastActiveProjectId(): Promise<string | null> {
  return loadJson<string | null>(LAST_ACTIVE_PROJECT_KEY, null);
}

export async function saveLastActiveProjectId(projectId: string | null): Promise<void> {
  await saveJson<string | null>(LAST_ACTIVE_PROJECT_KEY, projectId);
}

export async function loadOnboardingShown(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_SHOWN_KEY);
    return value === "true";
  } catch (error) {
    console.log("[appStorage] load onboarding error", error);
    return false;
  }
}

export async function saveOnboardingShown(shown: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_SHOWN_KEY, shown ? "true" : "false");
  } catch (error) {
    console.log("[appStorage] save onboarding error", error);
  }
}
