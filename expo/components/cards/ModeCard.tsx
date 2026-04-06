import { ReactElement, isValidElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import appTheme from "@/constants/theme";

interface ModeCardProps {
  title: string;
  subtitle: string;
  selected: boolean;
  icon: ReactElement;
  onPress: () => void;
  testId?: string;
}

function renderIcon(icon: ReactElement) {
  if (!isValidElement(icon)) {
    return null;
  }

  return icon;
}

export function ModeCard(props: ModeCardProps) {
  const { title, subtitle, selected, icon, onPress, testId } = props;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected ? styles.cardSelected : null, pressed ? styles.pressed : null]}
      testID={testId}
    >
      <View style={[styles.iconWrap, selected ? styles.iconWrapSelected : null]}>{renderIcon(icon)}</View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 14,
    padding: 18,
    borderRadius: appTheme.radii.lg,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
    alignItems: "center",
  },
  cardSelected: {
    borderColor: appTheme.colors.accent,
    backgroundColor: appTheme.colors.accentSoft,
  },
  pressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: appTheme.radii.md,
    backgroundColor: appTheme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapSelected: {
    backgroundColor: "rgba(216, 186, 138, 0.22)",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: appTheme.colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    color: appTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
