import { router, Stack } from "expo-router";
import Constants from "expo-constants";
import { Coins, KeyRound, ShieldCheck } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppScrollScreen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import appTheme from "@/constants/theme";
import { useCreditsStore } from "@/stores/creditsStore";
import { useLicenseStore } from "@/stores/licenseStore";

export default function SettingsScreen() {
  const credits = useCreditsStore((state) => state.credits);
  const isLicenseActive = useLicenseStore((s) => s.isActive);
  const daysLeft = useLicenseStore((s) => s.daysLeft);
  const appVersion = Constants.expoConfig?.version ?? "0.0.0";
  const buildNumber = String(
    Constants.expoConfig?.ios?.buildNumber
    ?? Constants.expoConfig?.android?.versionCode
    ?? 0,
  );

  return (
    <AppScrollScreen contentContainerStyle={styles.content} testId="settings-screen">
      <Stack.Screen options={{ title: "Настройки" }} />

      <SectionCard
        title="Лицензия"
        subtitle={isLicenseActive ? "Безлимитный доступ активен" : "Активируйте ключ для безлимита"}
      >
        {isLicenseActive ? (
          <View style={styles.licenseActiveCard}>
            <ShieldCheck color={appTheme.colors.success} size={22} />
            <View style={styles.licenseInfo}>
              <Text style={styles.licenseTitle}>Безлимит активен</Text>
              <Text style={styles.licenseDays}>
                Осталось {daysLeft} {daysLeft === 1 ? "день" : daysLeft < 5 ? "дня" : "дней"}
              </Text>
            </View>
          </View>
        ) : null}
        <AppButton
          icon={<KeyRound color={isLicenseActive ? appTheme.colors.text : "#241B10"} size={18} />}
          label={isLicenseActive ? "Управление лицензией" : "Активировать ключ"}
          onPress={() => router.push("/activate")}
          testId="open-activate"
          variant={isLicenseActive ? "secondary" : undefined}
        />
      </SectionCard>

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
          icon={<Coins color={appTheme.colors.text} size={18} />}
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

      <SectionCard title="Версия приложения" subtitle="Для проверки установленного билда">
        <Text style={styles.versionText}>{`Версия ${appVersion} (${buildNumber})`}</Text>
      </SectionCard>
    </AppScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingTop: 12,
  },
  licenseActiveCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: appTheme.radii.lg,
    backgroundColor: appTheme.colors.backgroundElevated,
  },
  licenseInfo: {
    flex: 1,
    gap: 4,
  },
  licenseTitle: {
    color: appTheme.colors.success,
    fontSize: 17,
    fontWeight: "700",
  },
  licenseDays: {
    color: appTheme.colors.textSecondary,
    fontSize: 14,
  },
  creditsCard: {
    gap: 6,
    padding: 16,
    borderRadius: appTheme.radii.lg,
    backgroundColor: appTheme.colors.backgroundElevated,
  },
  creditsLabel: {
    color: appTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  creditsValue: {
    color: appTheme.colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  creditsHint: {
    color: appTheme.colors.accentStrong,
    fontSize: 14,
    lineHeight: 20,
  },
  ruleCard: {
    gap: 8,
    padding: 16,
    borderRadius: appTheme.radii.lg,
    backgroundColor: appTheme.colors.backgroundElevated,
  },
  ruleTitle: {
    color: appTheme.colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  ruleText: {
    color: appTheme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyText: {
    color: appTheme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    gap: 10,
  },
  listItem: {
    color: appTheme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  versionText: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
