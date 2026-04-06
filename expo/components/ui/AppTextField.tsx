import { StyleSheet, Text, TextInput, View } from "react-native";

import appTheme from "@/constants/theme";

interface AppTextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  testId?: string;
}

export function AppTextField(props: AppTextFieldProps) {
  const { label, value, onChangeText, placeholder, multiline = false, testId } = props;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={appTheme.colors.textMuted}
        style={[styles.input, multiline ? styles.multiline : null]}
        testID={testId}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  label: {
    color: appTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  input: {
    borderRadius: appTheme.radii.md,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
    color: appTheme.colors.text,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  multiline: {
    minHeight: 128,
    textAlignVertical: "top",
  },
});
