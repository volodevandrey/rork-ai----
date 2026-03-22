import AsyncStorage from "@react-native-async-storage/async-storage";

import { ImageQuality, ProjectItem, TemplateItem, VariantCount } from "@/types/app";

const PROJECTS_KEY = "@furniture-ai/projects";
const TEMPLATES_KEY = "@furniture-ai/templates";
const LAST_ACTIVE_PROJECT_KEY = "@furniture-ai/last-active-project";

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

function normalizeProject(project: Partial<ProjectItem>): ProjectItem {
  return {
    ...(project as ProjectItem),
    variantCount: parseVariantCount(project.variantCount),
    quality: parseImageQuality(project.quality),
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
  return projects.map(normalizeProject);
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
