import { ReactElement, isValidElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import theme from "@/constants/theme";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  icon?: ReactElement;
  disabled?: boolean;
  testId?: string;
}

function renderIcon(icon?: ReactElement) {
  if (!isValidElement(icon)) {
    return null;
  }

  return icon;
}

export function AppButton(props: AppButtonProps) {
  const {
    label,
    onPress,
    variant = "primary",
    icon,
    disabled = false,
    testId,
  } = props;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" ? styles.primary : styles.secondary,
        variant === "ghost" ? styles.ghost : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
      testID={testId}
    >
      <View style={styles.content}>
        {icon ? <View style={styles.icon}>{renderIcon(icon)}</View> : null}
        <Text
          style={[
            styles.label,
            variant === "primary" ? styles.primaryLabel : styles.secondaryLabel,
            variant === "ghost" ? styles.ghostLabel : null,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: theme.radii.md,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: theme.colors.border,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },
  disabled: {
    opacity: 0.45,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  icon: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
  primaryLabel: {
    color: "#241B10",
  },
  secondaryLabel: {
    color: theme.colors.text,
  },
  ghostLabel: {
    color: theme.colors.textSecondary,
  },
});
