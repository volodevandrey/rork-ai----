import { forwardRef, useMemo } from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { Image } from "expo-image";
import ViewShot, { CaptureOptions } from "react-native-view-shot";

import theme from "@/constants/theme";

interface BrandedResultImageProps {
  uri: string;
  style?: StyleProp<ViewStyle>;
  captureWidth?: number;
  captureHeight?: number;
}

export const BrandedResultImage = forwardRef<ViewShot, BrandedResultImageProps>(
  function BrandedResultImage(props, ref) {
    const { uri, style, captureWidth, captureHeight } = props;

    const captureOptions = useMemo<CaptureOptions>(() => {
      const options: CaptureOptions = {
        format: "jpg",
        quality: 1,
        result: "tmpfile",
      };

      if (captureWidth && captureWidth > 0) {
        options.width = Math.round(captureWidth);
      }

      if (captureHeight && captureHeight > 0) {
        options.height = Math.round(captureHeight);
      }

      return options;
    }, [captureHeight, captureWidth]);

    return (
      <ViewShot options={captureOptions} ref={ref} style={[styles.frame, style]}>
        <Image contentFit="cover" source={{ uri }} style={styles.image} />
      </ViewShot>
    );
  },
);

BrandedResultImage.displayName = "BrandedResultImage";

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceAlt,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
