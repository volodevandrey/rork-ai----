import { Pressable, StyleSheet, Text } from "react-native";

import appTheme from "@/constants/theme";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  testId?: string;
}

export function Chip(props: ChipProps) {
  const { label, selected = false, onPress, testId } = props;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : null,
        pressed ? styles.pressed : null,
      ]}
      testID={testId}
    >
      <Text style={[styles.label, selected ? styles.selectedLabel : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: appTheme.radii.pill,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
  },
  selected: {
    backgroundColor: appTheme.colors.accentSoft,
    borderColor: appTheme.colors.accent,
  },
  pressed: {
    opacity: 0.9,
  },
  label: {
    color: appTheme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  selectedLabel: {
    color: appTheme.colors.accentStrong,
  },
});
