import { useMemo, useState } from "react";
import { Image } from "expo-image";
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";

import theme from "@/constants/theme";

interface BeforeAfterSliderProps {
  beforeUri: string;
  afterUri: string;
  testId?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function BeforeAfterSlider(props: BeforeAfterSliderProps) {
  const { beforeUri, afterUri, testId } = props;
  const [width, setWidth] = useState<number>(0);
  const [position, setPosition] = useState<number>(0.5);

  const sliderOffset = width * position;
  const clippedWidth = Math.max(sliderOffset, 0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          if (width <= 0) {
            return;
          }

          setPosition(clamp(event.nativeEvent.locationX / width, 0, 1));
        },
        onPanResponderMove: (event) => {
          if (width <= 0) {
            return;
          }

          setPosition(clamp(event.nativeEvent.locationX / width, 0, 1));
        },
      }),
    [width],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.wrapper} testID={testId}>
      <View onLayout={handleLayout} style={styles.imageWrap} {...panResponder.panHandlers}>
        <Image contentFit="cover" source={{ uri: beforeUri }} style={styles.imageLayer} />
        <View style={[styles.afterClip, { width: clippedWidth }]}>
          <Image
            contentFit="cover"
            source={{ uri: afterUri }}
            style={[styles.imageLayer, styles.clippedImage, { width }]}
          />
        </View>
        <View style={[styles.divider, { left: sliderOffset }]}>
          <View style={styles.dividerHandle} />
        </View>
        <View pointerEvents="none" style={styles.labelRow}>
          <View style={styles.labelPill}>
            <Text style={styles.labelText}>До</Text>
          </View>
          <View style={styles.labelPill}>
            <Text style={styles.labelText}>После</Text>
          </View>
        </View>
      </View>
      <Text style={styles.helper}>Проведите по изображению, чтобы сравнить результат</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 14,
  },
  imageWrap: {
    height: 420,
    borderRadius: theme.radii.xl,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  imageLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  afterClip: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
  },
  clippedImage: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
  },
  divider: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: theme.colors.text,
    marginLeft: -1,
    pointerEvents: "none",
    alignItems: "center",
    justifyContent: "center",
  },
  dividerHandle: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
    borderWidth: 2,
    borderColor: theme.colors.text,
  },
  labelRow: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  labelPill: {
    backgroundColor: theme.colors.overlay,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radii.pill,
  },
  labelText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  helper: {
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontSize: 14,
  },
});
