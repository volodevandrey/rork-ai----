import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Bookmark, FolderOpen, LayoutTemplate, Mic, Palette, Sparkles } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Chip } from "@/components/ui/Chip";
import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { AppScrollScreen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import {
  beautifulSuggestions,
  getModeHint,
  quickMaterials,
  smartPromptExamples,
  stylePresets,
  zoneOptions,
} from "@/constants/design";
import theme from "@/constants/theme";
import { useAppData } from "@/providers/AppDataProvider";
import {
  startVoiceCapture,
  stopVoiceCaptureAndTranscribe,
} from "@/services/media/voiceService";
import { createAutoProjectTitle } from "@/utils/format";
import { getSingleParam } from "@/utils/routes";

function appendSnippet(currentValue: string, snippet: string): string {
  const trimmedValue = currentValue.trim();
  const trimmedSnippet = snippet.trim();

  if (!trimmedValue) {
    return trimmedSnippet;
  }

  if (trimmedValue.toLowerCase().includes(trimmedSnippet.toLowerCase())) {
    return trimmedValue;
  }

  return `${trimmedValue}, ${trimmedSnippet}`;
}

export default function ProjectDesignScreen() {
  const params = useLocalSearchParams<{ projectId: string | string[] }>();
  const projectId = getSingleParam(params.projectId);
  const {
    getProject,
    saveTemplateFromProject,
    templates,
    updateProject,
  } = useAppData();
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const project = getProject(projectId);
  const currentTemplate = useMemo(() => {
    if (!project?.selectedTemplateId) {
      return null;
    }

    return templates.find((item) => item.id === project.selectedTemplateId) ?? null;
  }, [project?.selectedTemplateId, templates]);

  const handleDescriptionChange = useCallback(
    (value: string) => {
      updateProject(projectId, (current) => ({
        ...current,
        description: value,
        title:
          current.description.trim().length > 0 || value.trim().length === 0
            ? current.title
            : createAutoProjectTitle(current.mode, value),
      }));
    },
    [projectId, updateProject],
  );

  const handleVoiceInput = useCallback(async () => {
    try {
      if (!isRecording) {
        await startVoiceCapture();
        setIsRecording(true);
        return;
      }

      const text = await stopVoiceCaptureAndTranscribe();
      setIsRecording(false);
      updateProject(projectId, (current) => {
        const nextDescription = appendSnippet(current.description, text);
        return {
          ...current,
          description: nextDescription,
          voiceText: text,
          title:
            current.description.trim().length > 0
              ? current.title
              : createAutoProjectTitle(current.mode, text),
        };
      });
    } catch (error) {
      setIsRecording(false);
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось распознать речь. Попробуйте ещё раз или введите текст вручную.";
      Alert.alert("Ошибка", message);
    }
  }, [isRecording, projectId, updateProject]);

  const handleSuggestStyle = useCallback(() => {
    if (!project) {
      return;
    }

    const availableStyles = stylePresets.filter((item) => item.id !== project.styleId);
    const nextStyle =
      availableStyles[Math.floor(Math.random() * availableStyles.length)] ?? stylePresets[0];

    updateProject(projectId, (current) => ({
      ...current,
      styleId: nextStyle.id,
    }));
  }, [project, projectId, updateProject]);

  const handleBeautiful = useCallback(() => {
    if (!project) {
      return;
    }

    const options = beautifulSuggestions[project.mode];
    const suggestion = options[Math.floor(Math.random() * options.length)] ?? options[0] ?? "";
    handleDescriptionChange(suggestion);
  }, [handleDescriptionChange, project]);

  const handleSaveTemplate = useCallback(() => {
    if (!project) {
      return;
    }

    if (!project.description.trim() && !project.styleId) {
      Alert.alert(
        "Недостаточно данных",
        "Опишите дизайн или выберите стиль, чтобы сохранить шаблон.",
      );
      return;
    }

    saveTemplateFromProject(projectId);
    Alert.alert("Готово", "Шаблон сохранён.");
  }, [project, projectId, saveTemplateFromProject]);

  const handleGenerate = useCallback(() => {
    if (!project) {
      return;
    }

    if (!project.description.trim() && !project.styleId) {
      Alert.alert(
        "Нужно уточнение",
        `Опишите, что хотите изменить. Например: ${smartPromptExamples[0]}`,
      );
      return;
    }

    updateProject(projectId, (current) => ({
      ...current,
      status: "generating",
      lastError: null,
    }));

    router.push({
      pathname: "/project/[projectId]/generating",
      params: { projectId },
    });
  }, [project, projectId, updateProject]);

  if (!project) {
    return (
      <AppScrollScreen contentContainerStyle={styles.content} testId="project-missing-screen">
        <SectionCard title="Проект не найден">
          <Text style={styles.helperText}>Откройте список проектов и выберите нужный проект заново.</Text>
          <AppButton label="Мои проекты" onPress={() => router.replace("/projects")} />
        </SectionCard>
      </AppScrollScreen>
    );
  }

  return (
    <AppScrollScreen contentContainerStyle={styles.content} testId="project-screen">
      <Stack.Screen options={{ title: project.title }} />

      <SectionCard
        title="Исходное изображение"
        subtitle={getModeHint(project.mode)}
      >
        <Image contentFit="cover" source={{ uri: project.sourceImage.uri }} style={styles.previewImage} />
        <View style={styles.ruleBanner}>
          <Text style={styles.ruleBannerTitle}>Главное правило</Text>
          <Text style={styles.ruleBannerText}>
            Конструкция мебели и ракурс сохраняются. Меняется только внешний вид.
          </Text>
        </View>
        {currentTemplate ? (
          <View style={styles.templateBadge}>
            <Text style={styles.templateBadgeText}>Шаблон: {currentTemplate.name}</Text>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="Описание дизайна" subtitle="Текст можно ввести вручную или надиктовать голосом">
        <AppTextField
          label="Описание дизайна"
          multiline
          onChangeText={handleDescriptionChange}
          placeholder="Например: верх белый матовый, низ дуб, столешница бетон"
          testId="design-description"
          value={project.description}
        />
        <AppButton
          icon={<Mic color={theme.colors.text} size={18} />}
          label={isRecording ? "Остановить запись" : "Сказать голосом"}
          onPress={handleVoiceInput}
          testId="voice-input"
          variant="secondary"
        />
        <View style={styles.examplesWrap}>
          {smartPromptExamples.map((example) => (
            <Text key={example} style={styles.exampleText}>
              • {example}
            </Text>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Предложить стиль" subtitle="Выберите направление или доверьтесь приложению">
        <View style={styles.buttonRow}>
          <AppButton
            icon={<Palette color={theme.colors.text} size={18} />}
            label="Предложить стиль"
            onPress={handleSuggestStyle}
            testId="suggest-style"
            variant="secondary"
          />
          <AppButton
            icon={<Sparkles color={theme.colors.text} size={18} />}
            label="Сделать красиво"
            onPress={handleBeautiful}
            testId="make-beautiful"
            variant="secondary"
          />
        </View>
        <View style={styles.chipWrap}>
          {stylePresets.map((style) => (
            <Chip
              key={style.id}
              label={style.title}
              onPress={() =>
                updateProject(projectId, (current) => ({
                  ...current,
                  styleId: current.styleId === style.id ? null : style.id,
                }))
              }
              selected={project.styleId === style.id}
              testId={`style-${style.id}`}
            />
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Готовые материалы" subtitle="Быстрый способ собрать понятное описание">
        <View style={styles.chipWrap}>
          {quickMaterials.map((material) => (
            <Chip
              key={material.id}
              label={material.label}
              onPress={() => handleDescriptionChange(appendSnippet(project.description, material.snippet))}
              selected={project.description.toLowerCase().includes(material.snippet.toLowerCase())}
              testId={`material-${material.id}`}
            />
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Что изменить" subtitle="Можно ограничить обработку только нужными зонами">
        <View style={styles.chipWrap}>
          {zoneOptions.map((zone) => (
            <Chip
              key={zone.id}
              label={zone.title}
              onPress={() =>
                updateProject(projectId, (current) => ({
                  ...current,
                  zone: zone.id,
                }))
              }
              selected={project.zone === zone.id}
              testId={`zone-${zone.id}`}
            />
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Шаблоны" subtitle="Сохраняйте удачные комбинации и применяйте их позже">
        <View style={styles.buttonRow}>
          <AppButton
            icon={<Bookmark color={theme.colors.text} size={18} />}
            label="Сохранить шаблон"
            onPress={handleSaveTemplate}
            testId="save-template"
            variant="secondary"
          />
          <AppButton
            icon={<LayoutTemplate color={theme.colors.text} size={18} />}
            label="Применить шаблон"
            onPress={() =>
              router.push({
                pathname: "/templates",
                params: { applyTo: projectId },
              })
            }
            testId="apply-template"
            variant="secondary"
          />
        </View>
      </SectionCard>

      {project.lastError ? (
        <SectionCard title="Нужна повторная попытка" subtitle={project.lastError}>
          <AppButton
            icon={<Sparkles color="#241B10" size={18} />}
            label="Создать варианты снова"
            onPress={handleGenerate}
            variant="primary"
          />
        </SectionCard>
      ) : null}

      <View style={styles.footerActions}>
        <AppButton
          icon={<Sparkles color="#241B10" size={18} />}
          label="Создать варианты"
          onPress={handleGenerate}
          testId="generate-variants"
        />
        {project.variants.length > 0 ? (
          <AppButton
            icon={<FolderOpen color={theme.colors.text} size={18} />}
            label="Открыть последние варианты"
            onPress={() =>
              router.push({
                pathname: "/project/[projectId]/results",
                params: { projectId },
              })
            }
            testId="open-results"
            variant="secondary"
          />
        ) : null}
      </View>
    </AppScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingTop: 12,
  },
  previewImage: {
    width: "100%",
    height: 260,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.surfaceAlt,
  },
  ruleBanner: {
    gap: 6,
    padding: 16,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.backgroundElevated,
  },
  ruleBannerTitle: {
    color: theme.colors.accentStrong,
    fontSize: 13,
    fontWeight: "700",
  },
  ruleBannerText: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  templateBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accentSoft,
  },
  templateBadgeText: {
    color: theme.colors.accentStrong,
    fontSize: 13,
    fontWeight: "700",
  },
  buttonRow: {
    gap: 12,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  examplesWrap: {
    gap: 6,
  },
  exampleText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  helperText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  footerActions: {
    gap: 12,
    marginBottom: 8,
  },
});
