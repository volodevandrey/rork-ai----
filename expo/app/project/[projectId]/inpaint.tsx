import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, Mask, Path, Rect } from "react-native-svg";
import ViewShot from "react-native-view-shot";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { AppScrollScreen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import appTheme from "@/constants/theme";
import { useAppData } from "@/providers/AppDataProvider";
import { inpaintFurniture } from "@/services/ai/imageGeneration";
import { readBase64FromUri } from "@/services/storage/fileStorage";
import { createId } from "@/utils/id";
import { getSingleParam } from "@/utils/routes";

interface MaskPoint {
  x: number;
  y: number;
}

interface MaskPath {
  id: string;
  points: MaskPoint[];
}

interface Size {
  width: number;
  height: number;
}

const MASK_CAPTURE_SIZE = 1024;
const BRUSH_WIDTH_RATIO = 0.042;
const MASK_ID = "editable-region-mask";

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function buildPathD(points: MaskPoint[], width: number, height: number): string {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => {
      const x = Number((point.x * width).toFixed(1));
      const y = Number((point.y * height).toFixed(1));

      if (index === 0 && points.length === 1) {
        return `M ${x} ${y} L ${x + 0.1} ${y + 0.1}`;
      }

      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function trimDescriptionLabel(value: string): string {
  const normalized = value.trim();
  if (normalized.length <= 80) {
    return normalized;
  }

  return `${normalized.slice(0, 77).trim()}...`;
}

export default function InpaintScreen() {
  const params = useLocalSearchParams<{
    projectId: string | string[];
    variantId: string | string[];
  }>();
  const projectId = getSingleParam(params.projectId);
  const variantId = getSingleParam(params.variantId);
  const { getProject, updateProject } = useAppData();
  const project = getProject(projectId);
  const sourceVariant = project?.variants.find((item) => item.id === variantId) ?? null;
  const [description, setDescription] = useState<string>("");
  const [layoutSize, setLayoutSize] = useState<Size>({ width: 0, height: 0 });
  const [paths, setPaths] = useState<MaskPath[]>([]);
  const activePathIdRef = useRef<string | null>(null);
  const latestPointRef = useRef<MaskPoint | null>(null);
  const maskShotRef = useRef<ViewShot | null>(null);

  const previewAspectRatio = useMemo(() => {
    const width = sourceVariant?.image.width ?? 1;
    const height = sourceVariant?.image.height ?? 1;

    if (width <= 0 || height <= 0) {
      return 1;
    }

    return width / height;
  }, [sourceVariant?.image.height, sourceVariant?.image.width]);

  const brushPreviewWidth = useMemo(() => {
    if (layoutSize.width <= 0) {
      return 16;
    }

    return Math.max(14, layoutSize.width * BRUSH_WIDTH_RATIO);
  }, [layoutSize.width]);

  const normalizePoint = useCallback(
    (x: number, y: number): MaskPoint | null => {
      if (layoutSize.width <= 0 || layoutSize.height <= 0) {
        return null;
      }

      return {
        x: clamp(x / layoutSize.width),
        y: clamp(y / layoutSize.height),
      };
    },
    [layoutSize.height, layoutSize.width],
  );

  const beginPath = useCallback((point: MaskPoint) => {
    const pathId = createId("mask");
    activePathIdRef.current = pathId;
    latestPointRef.current = point;

    setPaths((current) => [
      ...current,
      {
        id: pathId,
        points: [point],
      },
    ]);
  }, []);

  const appendPoint = useCallback((point: MaskPoint) => {
    const activePathId = activePathIdRef.current;

    if (!activePathId) {
      beginPath(point);
      return;
    }

    const previousPoint = latestPointRef.current;
    if (previousPoint) {
      const dx = previousPoint.x - point.x;
      const dy = previousPoint.y - point.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 0.0035) {
        return;
      }
    }

    latestPointRef.current = point;
    setPaths((current) =>
      current.map((path) =>
        path.id === activePathId
          ? {
              ...path,
              points: [...path.points, point],
            }
          : path,
      ),
    );
  }, [beginPath]);

  const endPath = useCallback(() => {
    activePathIdRef.current = null;
    latestPointRef.current = null;
  }, []);

  const drawingGesture = useMemo(() => {
    return Gesture.Pan()
      .runOnJS(true)
      .maxPointers(1)
      .minDistance(0)
      .shouldCancelWhenOutside(false)
      .onStart((event) => {
        const point = normalizePoint(event.x, event.y);
        if (!point) {
          return;
        }

        beginPath(point);
      })
      .onUpdate((event) => {
        const point = normalizePoint(event.x, event.y);
        if (!point) {
          return;
        }

        appendPoint(point);
      })
      .onFinalize((event) => {
        const point = normalizePoint(event.x, event.y);
        if (point && activePathIdRef.current) {
          appendPoint(point);
        }

        endPath();
      });
  }, [appendPoint, beginPath, endPath, normalizePoint]);

  const handleCanvasLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayoutSize({ width, height });
  }, []);

  const previewPaths = useMemo(() => {
    return paths
      .map((path) => {
        const d = buildPathD(path.points, layoutSize.width, layoutSize.height);
        if (!d) {
          return null;
        }

        return {
          id: path.id,
          d,
        };
      })
      .filter((item): item is { id: string; d: string } => item !== null);
  }, [layoutSize.height, layoutSize.width, paths]);

  const capturePaths = useMemo(() => {
    return paths
      .map((path) => {
        const d = buildPathD(path.points, MASK_CAPTURE_SIZE, MASK_CAPTURE_SIZE);
        if (!d) {
          return null;
        }

        return {
          id: path.id,
          d,
        };
      })
      .filter((item): item is { id: string; d: string } => item !== null);
  }, [paths]);

  const captureMaskBase64 = useCallback(async (): Promise<string> => {
    const viewShot = maskShotRef.current;
    if (!viewShot?.capture) {
      throw new Error("Не удалось подготовить маску.");
    }

    console.log("[InpaintScreen] capturing mask");
    const result = await viewShot.capture();

    if (!result) {
      throw new Error("Не удалось захватить маску.");
    }

    if (result.startsWith("data:")) {
      return result.split(",")[1] ?? "";
    }

    if (result.startsWith("file:")) {
      return readBase64FromUri(result);
    }

    return result;
  }, []);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!sourceVariant) {
        throw new Error("Исходный результат не найден.");
      }

      if (paths.length === 0) {
        throw new Error("Сначала закрасьте область, куда нужно добавить мебель.");
      }

      const normalizedDescription = description.trim();
      if (!normalizedDescription) {
        throw new Error("Опишите, какую мебель нужно дорисовать.");
      }

      updateProject(projectId, (current) => ({
        ...current,
        status: "generating",
        lastError: null,
      }));

      const [sourceBase64, maskBase64] = await Promise.all([
        readBase64FromUri(sourceVariant.image.uri),
        captureMaskBase64(),
      ]);

      return inpaintFurniture({
        sourceBase64,
        sourceMimeType: sourceVariant.image.mimeType,
        maskBase64,
        description: normalizedDescription,
      });
    },
    onSuccess: (variant) => {
      updateProject(projectId, (current) => ({
        ...current,
        status: "ready",
        lastError: null,
        variants: [variant, ...current.variants],
        history: [
          {
            id: createId("session"),
            createdAt: Date.now(),
            description: `Дорисовка: ${trimDescriptionLabel(description)}`,
            styleId: current.styleId,
            zone: current.zone,
            strictness: current.mode === "photo" ? "maximum" : "strict",
            variants: [variant],
          },
          ...current.history,
        ],
      }));

      router.replace({
        pathname: "/project/[projectId]/results",
        params: { projectId },
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Не удалось дорисовать мебель.";
      updateProject(projectId, (current) => ({
        ...current,
        status: "error",
        lastError: message,
      }));
      Alert.alert("Ошибка", message);
    },
  });

  const handleClearMask = useCallback(() => {
    setPaths([]);
    endPath();
  }, [endPath]);

  const handleSubmit = useCallback(() => {
    submitMutation.mutate();
  }, [submitMutation]);

  if (!project || !sourceVariant) {
    return (
      <AppScrollScreen contentContainerStyle={styles.content} testId="inpaint-missing-screen">
        <SectionCard title="Изображение не найдено" subtitle="Вернитесь к результатам и выберите вариант заново.">
          <AppButton
            label="Открыть варианты"
            onPress={() =>
              router.replace({
                pathname: "/project/[projectId]/results",
                params: { projectId },
              })
            }
            testId="open-results-from-inpaint"
          />
        </SectionCard>
      </AppScrollScreen>
    );
  }

  return (
    <AppScrollScreen contentContainerStyle={styles.content} testId="inpaint-screen">
      <Stack.Screen options={{ title: "Дорисовать мебель" }} />

      <SectionCard
        title="Отметьте зону для новой мебели"
        subtitle="Проведите пальцем по месту, где AI должен аккуратно добавить объект в том же стиле."
      >
        <View style={styles.canvasShell}>
          <View style={[styles.canvasFrame, { aspectRatio: previewAspectRatio }]} onLayout={handleCanvasLayout}>
            <Image contentFit="cover" source={{ uri: sourceVariant.image.uri }} style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={styles.canvasShade} />
            <GestureDetector gesture={drawingGesture}>
              <View style={styles.gestureLayer} testID="inpaint-mask-canvas">
                <Svg height="100%" pointerEvents="none" style={StyleSheet.absoluteFill} width="100%">
                  {previewPaths.map((path) => (
                    <Path
                      d={path.d}
                      fill="none"
                      key={`${path.id}-glow`}
                      stroke="rgba(255, 255, 255, 0.26)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={brushPreviewWidth + 6}
                    />
                  ))}
                  {previewPaths.map((path) => (
                    <Path
                      d={path.d}
                      fill="none"
                      key={path.id}
                      stroke={appTheme.colors.accentStrong}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={brushPreviewWidth}
                    />
                  ))}
                </Svg>
                {paths.length === 0 ? (
                  <View pointerEvents="none" style={styles.helperBubble}>
                    <Text style={styles.helperBubbleTitle}>Закрасьте область</Text>
                    <Text style={styles.helperBubbleText}>Например, место у стены, под окном или рядом с диваном.</Text>
                  </View>
                ) : (
                  <View pointerEvents="none" style={styles.maskBadge}>
                    <Text style={styles.maskBadgeText}>Маска готова</Text>
                  </View>
                )}
              </View>
            </GestureDetector>
          </View>
        </View>

        <View style={styles.inlineActions}>
          <AppButton
            label="Очистить маску"
            onPress={handleClearMask}
            testId="clear-inpaint-mask"
            variant="secondary"
          />
        </View>
      </SectionCard>

      <SectionCard
        title="Что дорисовать?"
        subtitle="Например: комод в том же стиле, консоль у стены, тумбу под телевизор"
      >
        <AppTextField
          label="Описание мебели"
          onChangeText={setDescription}
          placeholder="Например: комод в том же стиле"
          testId="inpaint-description"
          value={description}
        />
      </SectionCard>

      <View style={styles.footerActions}>
        <AppButton
          label={submitMutation.isPending ? "Дорисовываем..." : "Дорисовать"}
          onPress={handleSubmit}
          testId="submit-inpaint"
          disabled={submitMutation.isPending || paths.length === 0 || description.trim().length === 0}
        />
        {submitMutation.isPending ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={appTheme.colors.accentStrong} size="small" />
            <Text style={styles.loadingText}>AI аккуратно вписывает новую мебель в сцену.</Text>
          </View>
        ) : null}
      </View>

      <View pointerEvents="none" style={styles.hiddenCaptureRoot}>
        <ViewShot
          options={{ format: "png", quality: 1, result: "base64" }}
          ref={maskShotRef}
          style={styles.hiddenCaptureShot}
        >
          <View style={styles.hiddenCaptureCanvas}>
            <Svg height={MASK_CAPTURE_SIZE} width={MASK_CAPTURE_SIZE}>
              <Defs>
                <Mask id={MASK_ID}>
                  <Rect fill="white" height={MASK_CAPTURE_SIZE} width={MASK_CAPTURE_SIZE} x={0} y={0} />
                  {capturePaths.map((path) => (
                    <Path
                      d={path.d}
                      fill="none"
                      key={`${path.id}-capture`}
                      stroke="black"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={MASK_CAPTURE_SIZE * BRUSH_WIDTH_RATIO}
                    />
                  ))}
                </Mask>
              </Defs>
              <Rect
                fill="white"
                height={MASK_CAPTURE_SIZE}
                mask={`url(#${MASK_ID})`}
                width={MASK_CAPTURE_SIZE}
                x={0}
                y={0}
              />
            </Svg>
          </View>
        </ViewShot>
      </View>
    </AppScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingTop: 12,
  },
  canvasShell: {
    borderRadius: appTheme.radii.xl,
    overflow: "hidden",
    backgroundColor: appTheme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  canvasFrame: {
    width: "100%",
    position: "relative",
    backgroundColor: appTheme.colors.surfaceAlt,
  },
  canvasShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 5, 5, 0.08)",
  },
  gestureLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  helperBubble: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: appTheme.radii.lg,
    backgroundColor: appTheme.colors.overlay,
    gap: 4,
  },
  helperBubbleTitle: {
    color: appTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  helperBubbleText: {
    color: appTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  maskBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: appTheme.radii.pill,
    backgroundColor: appTheme.colors.overlay,
  },
  maskBadgeText: {
    color: appTheme.colors.accentStrong,
    fontSize: 12,
    fontWeight: "700",
  },
  inlineActions: {
    gap: 12,
  },
  footerActions: {
    gap: 12,
    marginBottom: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 6,
  },
  loadingText: {
    flex: 1,
    color: appTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  hiddenCaptureRoot: {
    position: "absolute",
    top: -4000,
    left: -4000,
    opacity: 0.01,
  },
  hiddenCaptureShot: {
    width: MASK_CAPTURE_SIZE,
    height: MASK_CAPTURE_SIZE,
    backgroundColor: "transparent",
  },
  hiddenCaptureCanvas: {
    width: MASK_CAPTURE_SIZE,
    height: MASK_CAPTURE_SIZE,
    backgroundColor: "transparent",
  },
});
