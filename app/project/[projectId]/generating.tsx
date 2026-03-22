import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppViewScreen } from "@/components/ui/Screen";
import theme from "@/constants/theme";
import { useAppData } from "@/providers/AppDataProvider";
import { generateProjectVariants } from "@/services/ai/imageGeneration";
import { readBase64FromUri } from "@/services/storage/fileStorage";
import { GenerationProgress, Strictness, VariantCount } from "@/types/app";
import { getSingleParam } from "@/utils/routes";

function parseStrictness(value: string, fallback: Strictness): Strictness {
  if (value === "standard" || value === "strict" || value === "maximum") {
    return value;
  }

  return fallback;
}

function parseVariantCount(value: string | undefined): VariantCount {
  if (value === "1") {
    return 1;
  }

  if (value === "4") {
    return 4;
  }

  return 2;
}

export default function GenerationScreen() {
  const params = useLocalSearchParams<{
    projectId: string | string[];
    strictness?: string | string[];
    referenceVariantId?: string | string[];
    variantCount?: string | string[];
  }>();
  const projectId = getSingleParam(params.projectId);
  const strictnessParam = getSingleParam(params.strictness);
  const referenceVariantId = getSingleParam(params.referenceVariantId);
  const variantCountParam = getSingleParam(params.variantCount);
  const { getProject, saveGeneratedVariants, updateProject } = useAppData();
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const variantCount = useMemo(() => parseVariantCount(variantCountParam), [variantCountParam]);
  const [progress, setProgress] = useState<GenerationProgress>({
    stage: "Подготовка изображения",
    step: 1,
    totalSteps: variantCount + 2,
  });
  const animation = useRef<Animated.Value>(new Animated.Value(0)).current;

  const project = getProject(projectId);
  const fallbackStrictness = project?.mode === "photo" ? "maximum" : "strict";
  const strictness = useMemo(() => {
    return parseStrictness(strictnessParam, fallbackStrictness);
  }, [fallbackStrictness, strictnessParam]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animation, {
          duration: 1100,
          toValue: 1,
          useNativeDriver: false,
        }),
        Animated.timing(animation, {
          duration: 1100,
          toValue: 0,
          useNativeDriver: false,
        }),
      ]),
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [animation]);

  const generationMutation = useMutation({
    mutationFn: async () => {
      if (!project) {
        throw new Error("Проект не найден.");
      }

      const sourceBase64 = await readBase64FromUri(project.sourceImage.uri);
      const referenceVariant = project.variants.find((item) => item.id === referenceVariantId) ?? null;
      const referenceBase64 = referenceVariant ? await readBase64FromUri(referenceVariant.image.uri) : undefined;

      return generateProjectVariants({
        project,
        sourceBase64,
        strictness,
        variantCount,
        referenceBase64,
        referenceVariantTitle: referenceVariant?.title,
        onProgress: (stage, step, totalSteps) => {
          setProgress({ stage, step, totalSteps });
        },
      });
    },
    onSuccess: (variants) => {
      saveGeneratedVariants(projectId, variants, null);
      router.replace({
        pathname: "/project/[projectId]/results",
        params: { projectId },
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Не удалось создать результат. Попробуйте ещё раз.";
      updateProject(projectId, (current) => ({
        ...current,
        status: "error",
        lastError: message,
      }));
      Alert.alert("Ошибка", message);
      router.replace({
        pathname: "/project/[projectId]",
        params: { projectId },
      });
    },
  });

  useEffect(() => {
    if (!project || hasStarted) {
      return;
    }

    setHasStarted(true);
    generationMutation.mutate();
  }, [generationMutation, hasStarted, project]);

  const progressWidth = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["24%", "92%"],
  });

  if (!project) {
    return (
      <AppViewScreen contentContainerStyle={styles.emptyRoot} safeAreaEdges={["top", "bottom"]}>
        <View style={styles.emptyCard}>
          <Text style={styles.title}>Проект не найден</Text>
          <Text style={styles.description}>Откройте список проектов и выберите нужный проект заново.</Text>
          <AppButton label="Мои проекты" onPress={() => router.replace("/projects")} />
        </View>
      </AppViewScreen>
    );
  }

  return (
    <AppViewScreen contentContainerStyle={styles.root} safeAreaEdges={["top", "bottom"]} testId="generation-screen">
      <View style={styles.content}>
        <View style={styles.previewWrap}>
          <Image contentFit="cover" source={{ uri: project.sourceImage.uri }} style={styles.previewImage} />
          <View style={styles.previewOverlay}>
            <Text style={styles.previewBadge}>Конструкция и ракурс сохраняются</Text>
          </View>
        </View>

        <View style={styles.centerBlock}>
          <ActivityIndicator color={theme.colors.accentStrong} size="large" />
          <Text style={styles.title}>Создание вариантов дизайна...</Text>
          <Text style={styles.description}>
            Мы аккуратно обрабатываем изображение и сохраняем геометрию мебели.
          </Text>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressStage}>{progress.stage}</Text>
          <Text style={styles.progressMeta}>
            Шаг {progress.step} из {progress.totalSteps}
          </Text>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
          </View>
        </View>
      </View>
    </AppViewScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: 24,
  },
  previewWrap: {
    overflow: "hidden",
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  previewImage: {
    width: "100%",
    height: 220,
  },
  previewOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
  previewBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.overlay,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  centerBlock: {
    alignItems: "center",
    gap: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
    fontWeight: "800",
  },
  description: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  progressCard: {
    gap: 12,
    padding: 18,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  progressStage: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  progressMeta: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  progressTrack: {
    height: 10,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.sliderTrack,
    overflow: "hidden",
  },
  progressBar: {
    height: 10,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
  },
  emptyRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyCard: {
    width: "100%",
    gap: 12,
    padding: 24,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
