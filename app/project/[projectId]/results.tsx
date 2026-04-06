import { router, Stack, useLocalSearchParams } from "expo-router";
import { Bookmark, Edit3, ShieldCheck } from "lucide-react-native";
import { useCallback } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { ResultCard } from "@/components/cards/ResultCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppScrollScreen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import appTheme from "@/constants/theme";
import { useAppData } from "@/providers/AppDataProvider";
import { saveImageToGallery, shareImage } from "@/services/actions/exportService";
import { useLicenseStore } from "@/stores/licenseStore";
import { VariantItem } from "@/types/app";
import { getSingleParam } from "@/utils/routes";

export default function ResultsScreen() {
  const params = useLocalSearchParams<{ projectId: string | string[] }>();
  const projectId = getSingleParam(params.projectId);
  const { getProject, saveTemplateFromProject, updateProject } = useAppData();
  const isLicenseActive = useLicenseStore((s) => s.isActive);
  const project = getProject(projectId);

  const handleSave = useCallback(async (uri: string) => {
    try {
      await saveImageToGallery(uri);
      Alert.alert("Готово", "Результат сохранён в галерею.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сохранить результат.";
      Alert.alert("Ошибка", message);
    }
  }, []);

  const handleShare = useCallback(
    async (uri: string, variant: VariantItem) => {
      try {
        const result = await shareImage(uri, `${project?.title ?? "Проект"} — ${variant.title}`);

        if (result === "saved") {
          Alert.alert("Готово", "Шеринг недоступен. Изображение сохранено в галерею.");
        }

        if (result === "downloaded") {
          Alert.alert("Готово", "Шеринг недоступен. Изображение загружено на устройство.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Не удалось поделиться результатом.";
        Alert.alert("Ошибка", message);
      }
    },
    [project?.title],
  );

  const handleMore = useCallback(
    (variant: VariantItem) => {
      if (!project) {
        return;
      }

      updateProject(projectId, (current) => ({
        ...current,
        status: "generating",
        lastError: null,
      }));

      router.push({
        pathname: "/project/[projectId]/generating",
        params: {
          projectId,
          referenceVariantId: variant.id,
          strictness: project.mode === "photo" ? "maximum" : "strict",
          licensed: isLicenseActive ? "true" : "false",
        },
      });
    },
    [isLicenseActive, project, projectId, updateProject],
  );

  const handleInpaint = useCallback(
    (variant: VariantItem) => {
      router.push({
        pathname: "/project/[projectId]/inpaint",
        params: {
          projectId,
          variantId: variant.id,
        },
      });
    },
    [projectId],
  );

  const handleRegenerateStrict = useCallback(() => {
    if (!project) {
      return;
    }

    updateProject(projectId, (current) => ({
      ...current,
      status: "generating",
      lastError: null,
    }));

    router.push({
      pathname: "/project/[projectId]/generating",
      params: {
        projectId,
        strictness: "maximum",
        licensed: isLicenseActive ? "true" : "false",
      },
    });
  }, [isLicenseActive, project, projectId, updateProject]);

  const handleSaveTemplate = useCallback(() => {
    if (!project) {
      return;
    }

    saveTemplateFromProject(projectId);
    Alert.alert("Готово", "Шаблон сохранён.");
  }, [project, projectId, saveTemplateFromProject]);

  const handleTryAgain = useCallback(() => {
    router.push({
      pathname: "/project/[projectId]",
      params: { projectId },
    });
  }, [projectId]);

  if (!project || project.variants.length === 0) {
    return (
      <AppScrollScreen contentContainerStyle={styles.content} testId="empty-results-screen">
        <SectionCard title="Пока нет вариантов">
          <Text style={styles.helperText}>Сначала создайте варианты дизайна на экране проекта.</Text>
          <AppButton
            label="Вернуться к проекту"
            onPress={() =>
              router.replace({
                pathname: "/project/[projectId]",
                params: { projectId },
              })
            }
          />
        </SectionCard>
      </AppScrollScreen>
    );
  }

  return (
    <AppScrollScreen contentContainerStyle={styles.content} testId="results-screen">
      <Stack.Screen options={{ title: project.title }} />

      <SectionCard
        title="Готовые варианты"
        subtitle="Сравнивайте версии, сохраняйте лучший результат и показывайте клиенту"
      >
        <View style={styles.banner}>
          <ShieldCheck color={appTheme.colors.accentStrong} size={18} />
          <Text style={styles.bannerText}>
            Если форма мебели поехала, используйте кнопку «Перегенерировать без изменения формы».
          </Text>
        </View>
        <View style={styles.topActions}>
          <AppButton
            icon={<ShieldCheck color={appTheme.colors.text} size={18} />}
            label="Перегенерировать без изменения формы"
            onPress={handleRegenerateStrict}
            testId="regenerate-strict"
            variant="secondary"
          />
          <AppButton
            icon={<Bookmark color={appTheme.colors.text} size={18} />}
            label="Сохранить шаблон"
            onPress={handleSaveTemplate}
            testId="results-save-template"
            variant="secondary"
          />
          <AppButton
            icon={<Edit3 color={appTheme.colors.text} size={18} />}
            label="Изменить описание"
            onPress={handleTryAgain}
            testId="edit-project"
            variant="secondary"
          />
        </View>
      </SectionCard>

      <View style={styles.list}>
        {project.variants.map((variant) => (
          <View key={variant.id} style={styles.resultGroup}>
            <ResultCard
              onCompare={() =>
                router.push({
                  pathname: "/project/[projectId]/compare",
                  params: { projectId, variantId: variant.id },
                })
              }
              onMore={() => handleMore(variant)}
              onSave={(uri) => handleSave(uri)}
              onShare={(uri) => handleShare(uri, variant)}
              testId={`variant-${variant.id}`}
              variant={variant}
            />
            <AppButton
              icon={<Edit3 color={appTheme.colors.text} size={18} />}
              label="Дорисовать мебель"
              onPress={() => handleInpaint(variant)}
              testId={`variant-${variant.id}-inpaint`}
              variant="secondary"
            />
          </View>
        ))}
      </View>

      <View style={styles.bottomActions}>
        <AppButton
          label="Изменить и создать заново"
          onPress={handleTryAgain}
          testId="results-try-again"
          variant="secondary"
        />
      </View>
    </AppScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingTop: 12,
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: appTheme.radii.lg,
    backgroundColor: appTheme.colors.backgroundElevated,
  },
  bannerText: {
    flex: 1,
    color: appTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  topActions: {
    gap: 12,
  },
  list: {
    gap: 16,
    marginBottom: 8,
  },
  resultGroup: {
    gap: 12,
  },
  helperText: {
    color: appTheme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  bottomActions: {
    gap: 12,
    marginBottom: 8,
  },
});
