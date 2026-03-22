import { router, Stack } from "expo-router";
import { Coins } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppScrollScreen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import theme from "@/constants/theme";
import { useCreditsStore } from "@/stores/creditsStore";

export default function SettingsScreen() {
  const credits = useCreditsStore((state) => state.credits);

  return (
    <AppScrollScreen contentContainerStyle={styles.content} testId="settings-screen">
      <Stack.Screen options={{ title: "Настройки" }} />

      <SectionCard
        title="Кредиты"
        subtitle="Баланс используется для генерации вариантов в разных режимах качества"
      >
        <View style={styles.creditsCard}>
          <Text style={styles.creditsLabel}>Текущий баланс</Text>
          <Text style={styles.creditsValue}>{credits} кр.</Text>
          <Text style={styles.creditsHint}>Medium качество стоит 2 кредита за вариант.</Text>
        </View>
        <AppButton
          icon={<Coins color={theme.colors.text} size={18} />}
          label="Пополнить кредиты"
          onPress={() => router.push("/shop")}
          testId="open-shop"
          variant="secondary"
        />
      </SectionCard>

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
          Проекты, шаблоны, кредиты и результаты сохраняются на устройстве. Это помогает быстро вернуться к прошлым клиентским вариантам без лишней сложности.
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
  creditsCard: {
    gap: 6,
    padding: 16,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.backgroundElevated,
  },
  creditsLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  creditsValue: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  creditsHint: {
    color: theme.colors.accentStrong,
    fontSize: 14,
    lineHeight: 20,
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
