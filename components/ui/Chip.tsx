import { Pressable, StyleSheet, Text } from "react-native";

import theme from "@/constants/theme";

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
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  selected: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  pressed: {
    opacity: 0.9,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  selectedLabel: {
    color: theme.colors.accentStrong,
  },
});
