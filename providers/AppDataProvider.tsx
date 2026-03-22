import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  loadLastActiveProjectId,
  loadProjects,
  loadTemplates,
  saveLastActiveProjectId,
  saveProjects,
  saveTemplates,
} from "@/services/storage/appStorage";
import { deleteImageIfNeeded } from "@/services/storage/fileStorage";
import {
  ProjectItem,
  ProjectMode,
  StoredImage,
  TemplateItem,
  VariantItem,
} from "@/types/app";
import { createAutoProjectTitle } from "@/utils/format";
import { createId } from "@/utils/id";

export const [AppDataProvider, useAppData] = createContextHook(() => {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [lastActiveProjectId, setLastActiveProjectId] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      console.log("[AppDataProvider] hydrating storage");
      const [storedProjects, storedTemplates, storedLastProjectId] = await Promise.all([
        loadProjects(),
        loadTemplates(),
        loadLastActiveProjectId(),
      ]);

      if (!isMounted) {
        return;
      }

      setProjects(storedProjects);
      setTemplates(storedTemplates);
      setLastActiveProjectId(storedLastProjectId);
      setIsHydrating(false);
    };

    void hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    void saveProjects(projects);
  }, [isHydrating, projects]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    void saveTemplates(templates);
  }, [isHydrating, templates]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    void saveLastActiveProjectId(lastActiveProjectId);
  }, [isHydrating, lastActiveProjectId]);

  const createProject = useCallback(
    (mode: ProjectMode, sourceImage: StoredImage): string => {
      const projectId = createId("project");
      const now = Date.now();
      const project: ProjectItem = {
        id: projectId,
        title: createAutoProjectTitle(mode, ""),
        mode,
        sourceImage,
        description: "",
        voiceText: "",
        styleId: null,
        zone: "all",
        selectedTemplateId: null,
        status: "draft",
        variants: [],
        variantCount: 2,
        quality: "medium",
        history: [],
        createdAt: now,
        updatedAt: now,
        lastError: null,
      };

      console.log("[AppDataProvider] create project", projectId, mode);
      setProjects((current) => [project, ...current]);
      setLastActiveProjectId(projectId);
      return projectId;
    },
    [],
  );

  const updateProject = useCallback(
    (projectId: string, updater: (project: ProjectItem) => ProjectItem) => {
      console.log("[AppDataProvider] update project", projectId);
      setProjects((current) =>
        current.map((project) => {
          if (project.id !== projectId) {
            return project;
          }

          return {
            ...updater(project),
            updatedAt: Date.now(),
          };
        }),
      );
      setLastActiveProjectId(projectId);
    },
    [],
  );

  const renameProject = useCallback(
    (projectId: string, title: string) => {
      updateProject(projectId, (project) => ({
        ...project,
        title: title.trim() || project.title,
      }));
    },
    [updateProject],
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      const project = projects.find((item) => item.id === projectId);
      if (!project) {
        return;
      }

      console.log("[AppDataProvider] delete project", projectId);
      await deleteImageIfNeeded(project.sourceImage.uri);
      await Promise.all(
        project.history.flatMap((session) =>
          session.variants.map((variant) => deleteImageIfNeeded(variant.image.uri)),
        ),
      );

      setProjects((current) => current.filter((item) => item.id !== projectId));
      setLastActiveProjectId((current) => (current === projectId ? null : current));
    },
    [projects],
  );

  const saveTemplateFromProject = useCallback(
    (projectId: string): TemplateItem => {
      const project = projects.find((item) => item.id === projectId);
      if (!project) {
        throw new Error("Проект не найден.");
      }

      const now = Date.now();
      const template: TemplateItem = {
        id: createId("template"),
        name: createAutoProjectTitle(project.mode, project.description),
        description: project.description || project.voiceText,
        styleId: project.styleId,
        zone: project.zone,
        createdAt: now,
        updatedAt: now,
      };

      console.log("[AppDataProvider] save template", template.id);
      setTemplates((current) => [template, ...current]);
      return template;
    },
    [projects],
  );

  const applyTemplateToProject = useCallback(
    (projectId: string, templateId: string) => {
      const template = templates.find((item) => item.id === templateId);
      if (!template) {
        throw new Error("Шаблон не найден.");
      }

      updateProject(projectId, (project) => ({
        ...project,
        description: template.description,
        styleId: template.styleId,
        zone: template.zone,
        selectedTemplateId: template.id,
        title:
          project.description.trim().length > 0
            ? project.title
            : createAutoProjectTitle(project.mode, template.description),
      }));
    },
    [templates, updateProject],
  );

  const updateTemplateName = useCallback((templateId: string, name: string) => {
    setTemplates((current) =>
      current.map((template) =>
        template.id === templateId
          ? {
              ...template,
              name: name.trim() || template.name,
              updatedAt: Date.now(),
            }
          : template,
      ),
    );
  }, []);

  const deleteTemplate = useCallback((templateId: string) => {
    console.log("[AppDataProvider] delete template", templateId);
    setTemplates((current) => current.filter((item) => item.id !== templateId));
  }, []);

  const saveGeneratedVariants = useCallback(
    (projectId: string, variants: VariantItem[], lastError: string | null = null) => {
      updateProject(projectId, (project) => ({
        ...project,
        status: lastError ? "error" : "ready",
        lastError,
        variants,
        history: [
          {
            id: createId("session"),
            createdAt: Date.now(),
            description: project.description,
            styleId: project.styleId,
            zone: project.zone,
            strictness: project.mode === "photo" ? "maximum" : "strict",
            variants,
          },
          ...project.history,
        ],
      }));
    },
    [updateProject],
  );

  const projectMap = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project]));
  }, [projects]);

  const getProject = useCallback(
    (projectId: string) => {
      return projectMap.get(projectId) ?? null;
    },
    [projectMap],
  );

  return useMemo(
    () => ({
      projects,
      templates,
      lastActiveProjectId,
      isHydrating,
      createProject,
      updateProject,
      renameProject,
      deleteProject,
      saveTemplateFromProject,
      applyTemplateToProject,
      updateTemplateName,
      deleteTemplate,
      saveGeneratedVariants,
      getProject,
      setLastActiveProjectId,
    }),
    [
      projects,
      templates,
      lastActiveProjectId,
      isHydrating,
      createProject,
      updateProject,
      renameProject,
      deleteProject,
      saveTemplateFromProject,
      applyTemplateToProject,
      updateTemplateName,
      deleteTemplate,
      saveGeneratedVariants,
      getProject,
    ],
  );
});
