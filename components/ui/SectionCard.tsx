import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import appTheme from "@/constants/theme";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function SectionCard(props: SectionCardProps) {
  const { title, subtitle, children } = props;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
    padding: 18,
    borderRadius: appTheme.radii.lg,
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  header: {
    gap: 6,
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
