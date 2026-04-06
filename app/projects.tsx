import { router, Stack } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { ProjectCard } from "@/components/cards/ProjectCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppScrollScreen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import appTheme from "@/constants/theme";
import { useAppData } from "@/providers/AppDataProvider";

export default function ProjectsScreen() {
  const { deleteProject, projects, renameProject } = useAppData();
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState<string>("");

  const handleDelete = useCallback(
    (projectId: string) => {
      Alert.alert("Удалить проект?", "Проект и его локальная история будут удалены.", [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () => {
            void deleteProject(projectId);
          },
        },
      ]);
    },
    [deleteProject],
  );

  const handleStartEdit = useCallback((projectId: string, currentName: string) => {
    setEditingProjectId(projectId);
    setDraftName(currentName);
  }, []);

  const handleSaveName = useCallback(() => {
    if (!editingProjectId) {
      return;
    }

    renameProject(editingProjectId, draftName);
    setEditingProjectId(null);
    setDraftName("");
  }, [draftName, editingProjectId, renameProject]);

  return (
    <AppScrollScreen contentContainerStyle={styles.content} testId="projects-screen">
      <Stack.Screen options={{ title: "Мои проекты" }} />

      <SectionCard title="Локальные проекты" subtitle="Здесь хранится история ваших клиентских задач и вариантов">
        {projects.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Пока нет проектов. Создайте новый проект, чтобы загрузить фото или эскиз мебели.
            </Text>
            <AppButton label="Новый проект" onPress={() => router.push("/new-project")} />
          </View>
        ) : (
          <View style={styles.list}>
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                draftName={editingProjectId === project.id ? draftName : project.title}
                isEditing={editingProjectId === project.id}
                onDelete={() => handleDelete(project.id)}
                onNameChange={setDraftName}
                onOpen={() =>
                  router.push({
                    pathname: "/project/[projectId]",
                    params: { projectId: project.id },
                  })
                }
                onSaveName={handleSaveName}
                onStartEdit={() => handleStartEdit(project.id, project.title)}
                project={project}
                testId={`project-${project.id}`}
              />
            ))}
          </View>
        )}
      </SectionCard>
    </AppScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingTop: 12,
  },
  list: {
    gap: 14,
  },
  emptyState: {
    gap: 14,
  },
  emptyText: {
    color: appTheme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
