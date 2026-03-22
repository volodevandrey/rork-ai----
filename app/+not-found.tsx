import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import theme from "@/constants/theme";

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
    backgroundColor: theme.colors.background,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    gap: 12,
    padding: 24,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  description: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  link: {
    marginTop: 6,
  },
  linkText: {
    color: theme.colors.accentStrong,
    fontSize: 16,
    fontWeight: "700",
  },
});
