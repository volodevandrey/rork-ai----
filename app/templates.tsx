import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { TemplateCard } from "@/components/cards/TemplateCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppScrollScreen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import theme from "@/constants/theme";
import { useAppData } from "@/providers/AppDataProvider";
import { getSingleParam } from "@/utils/routes";

export default function TemplatesScreen() {
  const params = useLocalSearchParams<{ applyTo?: string | string[] }>();
  const applyToProjectId = getSingleParam(params.applyTo);
  const {
    applyTemplateToProject,
    deleteTemplate,
    lastActiveProjectId,
    templates,
    updateTemplateName,
  } = useAppData();
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState<string>("");

  const activeProjectId = useMemo(() => {
    return applyToProjectId || lastActiveProjectId || "";
  }, [applyToProjectId, lastActiveProjectId]);

  const handleApply = useCallback(
    (templateId: string) => {
      if (!activeProjectId) {
        Alert.alert("Нет активного проекта", "Откройте проект и примените шаблон оттуда.");
        return;
      }

      applyTemplateToProject(activeProjectId, templateId);
      Alert.alert("Готово", "Шаблон применён.");

      if (applyToProjectId) {
        router.replace({
          pathname: "/project/[projectId]",
          params: { projectId: activeProjectId },
        });
      }
    },
    [activeProjectId, applyTemplateToProject, applyToProjectId],
  );

  const handleDelete = useCallback(
    (templateId: string) => {
      Alert.alert("Удалить шаблон?", "Шаблон будет удалён без возможности восстановления.", [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () => deleteTemplate(templateId),
        },
      ]);
    },
    [deleteTemplate],
  );

  const handleStartEdit = useCallback((templateId: string, currentName: string) => {
    setEditingTemplateId(templateId);
    setDraftName(currentName);
  }, []);

  const handleSaveName = useCallback(() => {
    if (!editingTemplateId) {
      return;
    }

    updateTemplateName(editingTemplateId, draftName);
    setEditingTemplateId(null);
    setDraftName("");
  }, [draftName, editingTemplateId, updateTemplateName]);

  return (
    <AppScrollScreen contentContainerStyle={styles.content} testId="templates-screen">
      <Stack.Screen options={{ title: applyToProjectId ? "Выбор шаблона" : "Шаблоны" }} />

      <SectionCard
        title="Сохранённые шаблоны"
        subtitle={
          applyToProjectId
            ? "После выбора шаблон сразу применится к текущему проекту"
            : "Сохраняйте удачные сочетания и применяйте их к новым проектам"
        }
      >
        {templates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Пока нет шаблонов. Сохраните удачный результат из проекта, чтобы использовать его снова.
            </Text>
            <AppButton
              label="К моим проектам"
              onPress={() => router.push("/projects")}
              variant="secondary"
            />
          </View>
        ) : (
          <View style={styles.list}>
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                draftName={editingTemplateId === template.id ? draftName : template.name}
                isEditing={editingTemplateId === template.id}
                onApply={() => handleApply(template.id)}
                onDelete={() => handleDelete(template.id)}
                onNameChange={setDraftName}
                onSaveName={handleSaveName}
                onStartEdit={() => handleStartEdit(template.id, template.name)}
                template={template}
                testId={`template-${template.id}`}
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
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
