import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import appTheme from "@/constants/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Не найдено" }} />
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Такого экрана нет</Text>
          <Text style={styles.description}>
            Возможно, ссылка устарела. Вернитесь на главную и продолжайте работу с проектами.
          </Text>
          <Link href="/" style={styles.link}>
            <Text style={styles.linkText}>На главную</Text>
          </Link>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: appTheme.colors.background,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    gap: 12,
    padding: 24,
    borderRadius: appTheme.radii.xl,
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  title: {
    color: appTheme.colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  description: {
    color: appTheme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  link: {
    marginTop: 6,
  },
  linkText: {
    color: appTheme.colors.accentStrong,
    fontSize: 16,
    fontWeight: "700",
  },
});
