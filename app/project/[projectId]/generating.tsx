import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useCreditsStore } from "@/stores/creditsStore";
import {
  GenerationMode,
  GenerationProgress,
  ImageQuality,
  Strictness,
  VariantCount,
} from "@/types/app";
import { getSingleParam } from "@/utils/routes";

class GenerationCancelledError extends Error {
  constructor() {
    super("Generation cancelled");
    this.name = "GenerationCancelledError";
  }
}

function parseStrictness(value: string | undefined, fallback: Strictness): Strictness {
  if (value === "standard" || value === "strict" || value === "maximum") {
    return value;
  }

  return fallback;
}

function parseVariantCount(value: string | undefined, fallback: VariantCount): VariantCount {
  if (value === "1") {
    return 1;
  }

  if (value === "2") {
    return 2;
  }

  if (value === "4") {
    return 4;
  }

  return fallback;
}

function parseImageQuality(value: string | undefined, fallback: ImageQuality): ImageQuality {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return fallback;
}

function parseGenerationMode(value: string | undefined): GenerationMode {
  if (value === "free" || value === "pro") {
    return value;
  }

  return "pro";
}

export default function GenerationScreen() {
  const params = useLocalSearchParams<{
    projectId: string | string[];
    strictness?: string | string[];
    referenceVariantId?: string | string[];
    variantCount?: string | string[];
    quality?: string | string[];
    mode?: string | string[];
  }>();
  const projectId = getSingleParam(params.projectId);
  const strictnessParam = getSingleParam(params.strictness);
  const referenceVariantId = getSingleParam(params.referenceVariantId);
  const variantCountParam = getSingleParam(params.variantCount);
  const qualityParam = getSingleParam(params.quality);
  const modeParam = getSingleParam(params.mode);
  const { getProject, saveGeneratedVariants, updateProject } = useAppData();
  const spendCredits = useCreditsStore((state) => state.spendCredits);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const project = getProject(projectId);
  const fallbackStrictness = project?.mode === "photo" ? "maximum" : "strict";
  const fallbackVariantCount = project?.variantCount ?? 2;
  const fallbackQuality = project?.quality ?? "medium";
  const isCancelledRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const mode = useMemo(() => {
    return parseGenerationMode(modeParam);
  }, [modeParam]);
  const strictness = useMemo(() => {
    return parseStrictness(strictnessParam, fallbackStrictness);
  }, [fallbackStrictness, strictnessParam]);
  const variantCount = useMemo(() => {
    if (mode === "free") {
      return 1;
    }

    return parseVariantCount(variantCountParam, fallbackVariantCount);
  }, [fallbackVariantCount, mode, variantCountParam]);
  const quality = useMemo(() => {
    if (mode === "free") {
      return "low";
    }

    return parseImageQuality(qualityParam, fallbackQuality);
  }, [fallbackQuality, mode, qualityParam]);
  const [progress, setProgress] = useState<GenerationProgress>({
    stage: "Подготовка изображения",
    step: 1,
    totalSteps: variantCount + 2,
  });
  const animation = useRef<Animated.Value>(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setProgress((current) => ({
      ...current,
      totalSteps: variantCount + 2,
    }));
  }, [variantCount]);

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

  const restoreProjectState = useCallback(() => {
    updateProject(projectId, (current) => ({
      ...current,
      status: current.variants.length > 0 ? "ready" : "draft",
      lastError: null,
    }));
  }, [projectId, updateProject]);

  const generationMutation = useMutation({
    mutationFn: async () => {
      if (!project) {
        throw new Error("Проект не найден.");
      }

      const sourceBase64 = await readBase64FromUri(project.sourceImage.uri);
      const referenceVariant = project.variants.find((item) => item.id === referenceVariantId) ?? null;
      const referenceBase64 = referenceVariant ? await readBase64FromUri(referenceVariant.image.uri) : undefined;
      const variants = await generateProjectVariants({
        project,
        sourceBase64,
        strictness,
        mode,
        quality,
        variantCount,
        referenceBase64,
        referenceMimeType: referenceVariant?.image.mimeType,
        referenceVariantTitle: referenceVariant?.title,
        onProgress: (stage, step, totalSteps) => {
          if (!isMountedRef.current || isCancelledRef.current) {
            return;
          }

          setProgress({ stage, step, totalSteps });
        },
      });

      if (isCancelledRef.current) {
        throw new GenerationCancelledError();
      }

      if (mode === "pro") {
        await spendCredits(quality, variantCount);
      }

      if (isCancelledRef.current) {
        throw new GenerationCancelledError();
      }

      return variants;
    },
    onSuccess: (variants) => {
      if (isCancelledRef.current || !isMountedRef.current) {
        return;
      }

      saveGeneratedVariants(projectId, variants, null);
      router.replace({
        pathname: "/project/[projectId]/results",
        params: { projectId },
      });
    },
    onError: (error) => {
      if (error instanceof GenerationCancelledError || isCancelledRef.current) {
        return;
      }

      console.log("[GenerationScreen] generation failed", error);
      const message = "Генерация не удалась. Кредиты не списаны. Попробуйте ещё раз.";
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

  const handleCancel = useCallback(() => {
    Alert.alert("Отменить генерацию?", "Кредиты не будут списаны.", [
      {
        text: "Продолжать",
        style: "cancel",
      },
      {
        text: "Да, отменить",
        style: "destructive",
        onPress: () => {
          console.log("[GenerationScreen] generation cancelled by user", projectId);
          isCancelledRef.current = true;
          restoreProjectState();
          router.back();
        },
      },
    ]);
  }, [projectId, restoreProjectState]);

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

      <View style={styles.footer}>
        <AppButton
          label="Отменить"
          onPress={handleCancel}
          testId="generation-cancel"
          variant="secondary"
        />
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
  footer: {
    gap: 12,
    paddingTop: 16,
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
