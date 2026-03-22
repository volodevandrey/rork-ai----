import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { Camera, ImageIcon, PenTool } from "lucide-react-native";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { ModeCard } from "@/components/cards/ModeCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppScrollScreen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { getModeHint } from "@/constants/design";
import appTheme from "@/constants/theme";
import { useAppData } from "@/providers/AppDataProvider";
import { captureImage, pickImageFromLibrary } from "@/services/media/imageService";
import { ProjectMode } from "@/types/app";

export default function NewProjectScreen() {
  const { createProject } = useAppData();
  const [mode, setMode] = useState<ProjectMode>("photo");

  const sourceHint =
    mode === "photo"
      ? "Снимайте при дневном свете, держите телефон ровно, вся мебель в кадре — это даёт лучший результат"
      : "Чем чище эскиз, тем точнее результат. Подойдёт фото чертежа или рисунок от руки";

  const sourceMutation = useMutation({
    mutationFn: async (source: "library" | "camera") => {
      const image =
        source === "library"
          ? await pickImageFromLibrary(`source-${mode}`)
          : await captureImage(`source-${mode}`);

      if (!image) {
        return null;
      }

      return createProject(mode, image);
    },
    onSuccess: (projectId) => {
      if (!projectId) {
        return;
      }

      router.replace({
        pathname: "/project/[projectId]",
        params: { projectId },
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Не удалось открыть изображение.";
      Alert.alert("Ошибка", message);
    },
  });

  return (
    <AppScrollScreen contentContainerStyle={styles.content} testId="new-project-screen">
      <SectionCard
        title="Выберите тип исходника"
        subtitle="Приложение сохраняет конструкцию мебели и меняет только внешний вид"
      >
        <View style={styles.modeList}>
          <ModeCard
            icon={<ImageIcon color={appTheme.colors.accentStrong} size={22} />}
            onPress={() => setMode("photo")}
            selected={mode === "photo"}
            subtitle="Точная перекраска и замена материалов без изменения формы и ракурса"
            testId="mode-photo"
            title="Фото мебели"
          />
          <ModeCard
            icon={<PenTool color={appTheme.colors.accentStrong} size={22} />}
            onPress={() => setMode("sketch")}
            selected={mode === "sketch"}
            subtitle="Преобразование эскиза в реалистичную визуализацию без изменения конфигурации"
            testId="mode-sketch"
            title="Эскиз / чертёж"
          />
        </View>
      </SectionCard>

      <SectionCard title="Как это работает" subtitle={getModeHint(mode)}>
        <Text style={styles.copy}>
          Сначала загрузите изображение. Затем вы сможете описать дизайн текстом или голосом,
          сохранить шаблон и получить 4 аккуратных варианта.
        </Text>
      </SectionCard>

      <SectionCard title="Источник изображения" subtitle="Поддерживается галерея и камера">
        <Text style={styles.sourceHint} testID="source-hint">
          {sourceHint}
        </Text>
        <View style={styles.actions}>
          <AppButton
            disabled={sourceMutation.isPending}
            icon={<ImageIcon color="#241B10" size={18} />}
            label={sourceMutation.isPending ? "Открываем..." : "Загрузить фото"}
            onPress={() => sourceMutation.mutate("library")}
            testId="pick-image"
          />
          <AppButton
            disabled={sourceMutation.isPending}
            icon={<Camera color={appTheme.colors.text} size={18} />}
            label="Сделать фото"
            onPress={() => sourceMutation.mutate("camera")}
            testId="capture-image"
            variant="secondary"
          />
        </View>
      </SectionCard>
    </AppScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingTop: 12,
  },
  modeList: {
    gap: 12,
  },
  copy: {
    color: appTheme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    gap: 12,
  },
  sourceHint: {
    color: appTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
});
