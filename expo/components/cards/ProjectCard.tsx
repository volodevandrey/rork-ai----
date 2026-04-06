import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { FolderOpen, Pencil, Trash2 } from "lucide-react-native";

import appTheme from "@/constants/theme";
import { getModeTitle } from "@/constants/design";
import { ProjectItem } from "@/types/app";
import { formatDate } from "@/utils/format";

interface ProjectCardProps {
  project: ProjectItem;
  isEditing: boolean;
  draftName: string;
  onOpen: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onNameChange: (value: string) => void;
  onSaveName: () => void;
  testId?: string;
}

export function ProjectCard(props: ProjectCardProps) {
  const {
    project,
    isEditing,
    draftName,
    onOpen,
    onDelete,
    onStartEdit,
    onNameChange,
    onSaveName,
    testId,
  } = props;

  return (
    <View style={styles.card} testID={testId}>
      <Image contentFit="cover" source={{ uri: project.sourceImage.uri }} style={styles.image} />
      <View style={styles.body}>
        {isEditing ? (
          <TextInput
            onBlur={onSaveName}
            onChangeText={onNameChange}
            placeholder="Название проекта"
            placeholderTextColor={appTheme.colors.textMuted}
            style={styles.input}
            value={draftName}
          />
        ) : (
          <Text style={styles.title}>{project.title}</Text>
        )}
        <Text style={styles.meta}>{getModeTitle(project.mode)} · {formatDate(project.updatedAt)}</Text>
        <Text numberOfLines={2} style={styles.description}>
          {project.description || "Описание ещё не добавлено"}
        </Text>
        <View style={styles.actions}>
          <Pressable onPress={onOpen} style={styles.actionButton}>
            <FolderOpen color={appTheme.colors.accentStrong} size={16} />
            <Text style={styles.actionText}>Открыть</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: appTheme.radii.lg,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 172,
    backgroundColor: appTheme.colors.surfaceMuted,
  },
  body: {
    gap: 10,
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
  meta: {
    color: appTheme.colors.textSecondary,
    fontSize: 13,
  },
  description: {
    color: appTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
