import { Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppScrollScreen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import theme from "@/constants/theme";

export default function SettingsScreen() {
  return (
    <AppScrollScreen contentContainerStyle={styles.content} testId="settings-screen">
      <Stack.Screen options={{ title: "Настройки" }} />

      <SectionCard
        title="Главный принцип"
        subtitle="Это правило применяется ко всем вариантам по умолчанию"
      >
        <View style={styles.ruleCard}>
          <Text style={styles.ruleTitle}>Конструкция и ракурс сохраняются</Text>
          <Text style={styles.ruleText}>
            Для фото меняется только внешний вид мебели. Для эскиза сохраняется конфигурация и создаётся реалистичная подача.
          </Text>
        </View>
      </SectionCard>

      <SectionCard title="Хранение данных" subtitle="Приложение работает в локальном режиме v1">
        <Text style={styles.bodyText}>
          Проекты, шаблоны и результаты сохраняются на устройстве. Это помогает быстро вернуться к прошлым клиентским вариантам без лишней сложности.
        </Text>
      </SectionCard>

      <SectionCard title="Разрешения" subtitle="Нужны только для основного сценария">
        <View style={styles.list}>
          <Text style={styles.listItem}>• Галерея — чтобы загрузить исходное изображение</Text>
          <Text style={styles.listItem}>• Камера — чтобы сделать новое фото мебели</Text>
          <Text style={styles.listItem}>• Микрофон — чтобы надиктовать описание дизайна</Text>
        </View>
      </SectionCard>
    </AppScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingTop: 12,
  },
  ruleCard: {
    gap: 8,
    padding: 16,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.backgroundElevated,
  },
  ruleTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  ruleText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    gap: 10,
  },
  listItem: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
