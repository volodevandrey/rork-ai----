import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Check, Pencil, Trash2 } from "lucide-react-native";

import appTheme from "@/constants/theme";
import { getStyleTitle, getZoneTitle } from "@/constants/design";
import { TemplateItem } from "@/types/app";
import { formatDate } from "@/utils/format";

interface TemplateCardProps {
  template: TemplateItem;
  isEditing: boolean;
  draftName: string;
  onApply: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onNameChange: (value: string) => void;
  onSaveName: () => void;
  testId?: string;
}

export function TemplateCard(props: TemplateCardProps) {
  const {
    template,
    isEditing,
    draftName,
    onApply,
    onDelete,
    onStartEdit,
    onNameChange,
    onSaveName,
    testId,
  } = props;

  return (
    <View style={styles.card} testID={testId}>
      {isEditing ? (
        <TextInput
          onBlur={onSaveName}
          onChangeText={onNameChange}
          placeholder="Название шаблона"
          placeholderTextColor={appTheme.colors.textMuted}
          style={styles.input}
          value={draftName}
        />
      ) : (
        <Text style={styles.title}>{template.name}</Text>
      )}
      <Text style={styles.description}>{template.description || "Без описания"}</Text>
      <Text style={styles.meta}>{getStyleTitle(template.styleId)} · {getZoneTitle(template.zone)}</Text>
      <Text style={styles.meta}>Обновлён {formatDate(template.updatedAt)}</Text>
      <View style={styles.actions}>
        <Pressable onPress={onApply} style={styles.actionButton}>
          <Check color={appTheme.colors.accentStrong} size={16} />
          <Text style={styles.actionText}>Применить</Text>
        </Pressable>
        <Pressable onPress={onStartEdit} style={styles.actionButton}>
          <Pencil color={appTheme.colors.textSecondary} size={16} />
          <Text style={styles.actionText}>Переименовать</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.actionButton}>
          <Trash2 color={appTheme.colors.danger} size={16} />
          <Text style={[styles.actionText, styles.deleteText]}>Удалить</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    borderRadius: appTheme.radii.lg,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
    padding: 16,
  },
  title: {
    color: appTheme.colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  input: {
    borderRadius: appTheme.radii.md,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surfaceAlt,
    color: appTheme.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "600",
  },
  description: {
    color: appTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: appTheme.radii.pill,
    backgroundColor: appTheme.colors.surfaceAlt,
  },
  actionText: {
    color: appTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  deleteText: {
    color: appTheme.colors.danger,
  },
});
