import { useCallback, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ArrowLeftRight, RefreshCcw, Save, Share2 } from "lucide-react-native";
import ViewShot from "react-native-view-shot";

import { BrandedResultImage } from "@/components/results/BrandedResultImage";
import { AppButton } from "@/components/ui/AppButton";
import theme from "@/constants/theme";
import { VariantItem } from "@/types/app";

interface ResultCardProps {
  variant: VariantItem;
  onCompare: () => void;
  onSave: (uri: string) => Promise<void> | void;
  onShare: (uri: string) => Promise<void> | void;
  onMore: () => void;
  testId?: string;
}

export function ResultCard(props: ResultCardProps) {
  const { variant, onCompare, onSave, onShare, onMore, testId } = props;
  const brandedImageRef = useRef<ViewShot | null>(null);

  const captureImageUri = useCallback(async (): Promise<string> => {
    const viewShot = brandedImageRef.current;
    if (!viewShot?.capture) {
      return variant.image.uri;
    }

    try {
      return await viewShot.capture();
    } catch (error) {
      console.log("[ResultCard] capture failed", error);
      return variant.image.uri;
    }
  }, [variant.image.uri]);

  const handleSavePress = useCallback(async () => {
    const uri = await captureImageUri();
    await onSave(uri);
  }, [captureImageUri, onSave]);

  const handleSharePress = useCallback(async () => {
    const uri = await captureImageUri();
    await onShare(uri);
  }, [captureImageUri, onShare]);

  return (
    <View style={styles.card} testID={testId}>
      <BrandedResultImage
        captureHeight={variant.image.height}
        captureWidth={variant.image.width}
        ref={brandedImageRef}
        style={styles.image}
        uri={variant.image.uri}
      />
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.title}>{variant.title}</Text>
          <Text style={styles.subtitle}>{variant.subtitle}</Text>
        </View>
        <View style={styles.grid}>
          <View style={styles.actionCell}>
            <AppButton
              icon={<ArrowLeftRight color={theme.colors.text} size={16} />}
              label="До / После"
              onPress={onCompare}
              testId={`${testId}-compare`}
              variant="secondary"
            />
          </View>
          <View style={styles.actionCell}>
            <AppButton
              icon={<RefreshCcw color={theme.colors.text} size={16} />}
              label="Ещё варианты"
              onPress={onMore}
              testId={`${testId}-more`}
              variant="secondary"
            />
          </View>
          <View style={styles.actionCell}>
            <AppButton
              icon={<Save color={theme.colors.text} size={16} />}
              label="Сохранить в галерею"
              onPress={() => {
                void handleSavePress();
              }}
              testId={`${testId}-save`}
              variant="secondary"
            />
          </View>
          <View style={styles.actionCell}>
            <AppButton
              icon={<Share2 color={theme.colors.text} size={16} />}
              label="Поделиться"
              onPress={() => {
                void handleSharePress();
              }}
              testId={`${testId}-share`}
              variant="secondary"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  image: {
    width: "100%",
    height: 260,
  },
  body: {
    gap: 16,
    padding: 16,
  },
  header: {
    gap: 6,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionCell: {
    minWidth: 140,
    flexGrow: 1,
    flexBasis: "48%",
  },
});
