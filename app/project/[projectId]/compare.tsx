import { router, Stack, useLocalSearchParams } from "expo-router";
import { Save, Share2 } from "lucide-react-native";
import { useCallback, useMemo, useRef } from "react";
import { Alert, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import ViewShot from "react-native-view-shot";

import { BeforeAfterSlider } from "@/components/results/BeforeAfterSlider";
import { BrandedResultImage } from "@/components/results/BrandedResultImage";
import { AppButton } from "@/components/ui/AppButton";
import { AppScrollScreen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import theme from "@/constants/theme";
import { useAppData } from "@/providers/AppDataProvider";
import { saveImageToGallery, shareImage } from "@/services/actions/exportService";
import { getSingleParam } from "@/utils/routes";

export default function CompareScreen() {
  const params = useLocalSearchParams<{
    projectId: string | string[];
    variantId?: string | string[];
  }>();
  const projectId = getSingleParam(params.projectId);
  const variantId = getSingleParam(params.variantId);
  const { getProject } = useAppData();
  const { width: viewportWidth } = useWindowDimensions();
  const brandedImageRef = useRef<ViewShot | null>(null);
  const project = getProject(projectId);
  const variant = useMemo(() => {
    return project?.variants.find((item) => item.id === variantId) ?? null;
  }, [project?.variants, variantId]);

  const hiddenCaptureWidth = useMemo(() => {
    return Math.max(260, Math.min(viewportWidth - 40, 420));
  }, [viewportWidth]);

  const hiddenCaptureHeight = useMemo(() => {
    if (!variant) {
      return 260;
    }

    const aspectRatio = variant.image.height / Math.max(variant.image.width, 1);
    return Math.max(220, Math.round(hiddenCaptureWidth * aspectRatio));
  }, [hiddenCaptureWidth, variant]);

  const captureBrandedUri = useCallback(async (): Promise<string> => {
    if (!variant) {
      return "";
    }

    const viewShot = brandedImageRef.current;
    if (!viewShot?.capture) {
      return variant.image.uri;
    }

    try {
      return await viewShot.capture();
    } catch (error) {
      console.log("[CompareScreen] capture failed", error);
      return variant.image.uri;
    }
  }, [variant]);

  const handleSave = useCallback(async () => {
    if (!variant) {
      return;
    }

    try {
      const uri = await captureBrandedUri();
      await saveImageToGallery(uri);
      Alert.alert("Готово", "Результат сохранён в галерею.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сохранить результат.";
      Alert.alert("Ошибка", message);
    }
  }, [captureBrandedUri, variant]);

  const handleShare = useCallback(async () => {
    if (!variant) {
      return;
    }

    try {
      const uri = await captureBrandedUri();
      await shareImage(uri, `${project?.title ?? "Проект"} — ${variant.title}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось поделиться результатом.";
      Alert.alert("Ошибка", message);
    }
  }, [captureBrandedUri, project?.title, variant]);

  if (!project || !variant) {
    return (
      <AppScrollScreen contentContainerStyle={styles.content} testId="compare-missing-screen">
        <SectionCard title="Сравнение недоступно">
          <Text style={styles.helperText}>Откройте экран результатов и выберите вариант заново.</Text>
          <AppButton
            label="К вариантам"
            onPress={() =>
              router.replace({
                pathname: "/project/[projectId]/results",
                params: { projectId },
              })
            }
          />
        </SectionCard>
      </AppScrollScreen>
    );
  }

  return (
    <AppScrollScreen contentContainerStyle={styles.content} testId="compare-screen">
      <Stack.Screen options={{ title: variant.title }} />
      <SectionCard title="До / После" subtitle={variant.subtitle}>
        <BeforeAfterSlider
          afterUri={variant.image.uri}
          beforeUri={project.sourceImage.uri}
          testId="before-after-slider"
        />
      </SectionCard>
      <View style={styles.actions}>
        <AppButton
          icon={<Save color={theme.colors.text} size={18} />}
          label="Сохранить"
          onPress={() => {
            void handleSave();
          }}
          variant="secondary"
        />
        <AppButton
          icon={<Share2 color={theme.colors.text} size={18} />}
          label="Поделиться"
          onPress={() => {
            void handleShare();
          }}
          variant="secondary"
        />
      </View>
      <View pointerEvents="none" style={styles.captureHost}>
        <BrandedResultImage
          captureHeight={variant.image.height}
          captureWidth={variant.image.width}
          ref={brandedImageRef}
          style={{ width: hiddenCaptureWidth, height: hiddenCaptureHeight }}
          uri={variant.image.uri}
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
  actions: {
    gap: 12,
    marginBottom: 8,
  },
  helperText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  captureHost: {
    position: "absolute",
    left: -10000,
    top: 0,
  },
});
