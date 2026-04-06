import { router, Stack } from "expo-router";
import { KeyRound, ShieldCheck, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { AppScrollScreen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import appTheme from "@/constants/theme";
import { useLicenseStore } from "@/stores/licenseStore";

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(timestamp));
}

export default function ActivateScreen() {
  const isActive = useLicenseStore((s) => s.isActive);
  const license = useLicenseStore((s) => s.license);
  const daysLeft = useLicenseStore((s) => s.daysLeft);
  const activate = useLicenseStore((s) => s.activate);
  const removeLicense = useLicenseStore((s) => s.removeLicense);
  const [keyInput, setKeyInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleActivate = useCallback(async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      Alert.alert("Введите ключ", "Вставьте лицензионный ключ в поле выше.");
      return;
    }

    setIsLoading(true);
    try {
      await activate(trimmed);
      setKeyInput("");
      Alert.alert("Готово!", "Лицензия активирована. Генерации без ограничений!", [
        { text: "Отлично", onPress: () => router.back() },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось активировать ключ.";
      Alert.alert("Ошибка", message);
    } finally {
      setIsLoading(false);
    }
  }, [activate, keyInput]);

  const handleRemove = useCallback(() => {
    Alert.alert("Деактивировать лицензию?", "Вы вернётесь к кредитной системе.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Деактивировать",
        style: "destructive",
        onPress: async () => {
          await removeLicense();
          Alert.alert("Готово", "Лицензия деактивирована.");
        },
      },
    ]);
  }, [removeLicense]);

  return (
    <AppScrollScreen contentContainerStyle={styles.content} testId="activate-screen">
      <Stack.Screen options={{ title: "Активация" }} />

      {isActive && license ? (
        <SectionCard title="Лицензия активна" subtitle="Безлимитные генерации в любом качестве">
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <ShieldCheck color={appTheme.colors.success} size={28} />
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>Безлимит</Text>
                <Text style={styles.statusDays}>
                  {daysLeft > 0
                    ? `Осталось ${daysLeft} ${daysLeft === 1 ? "день" : daysLeft < 5 ? "дня" : "дней"}`
                    : "Срок истёк"}
                </Text>
              </View>
            </View>
            <View style={styles.detailsBlock}>
              <Text style={styles.detailLine}>
                Ключ: {license.key.slice(0, 8)}...{license.key.slice(-4)}
              </Text>
              <Text style={styles.detailLine}>
                Активирован: {formatDate(license.activatedAt)}
              </Text>
              <Text style={styles.detailLine}>
                Истекает: {formatDate(license.expiresAt)}
              </Text>
            </View>
          </View>
          <AppButton
            icon={<Trash2 color={appTheme.colors.danger} size={18} />}
            label="Деактивировать"
            onPress={handleRemove}
            testId="remove-license"
            variant="secondary"
          />
        </SectionCard>
      ) : (
        <>
          <SectionCard title="Активация ключа" subtitle="Введите ключ для безлимитного доступа">
            <View style={styles.inputBlock}>
              <AppTextField
                label="Лицензионный ключ"
                onChangeText={setKeyInput}
                placeholder="RAI-XXXX-XXXX-XXXX-XXXX"
                testId="key-input"
                value={keyInput}
              />
              <Text style={styles.hint}>
                Ключ выглядит как RAI-A1B2-3C4D-5E6F-7890
              </Text>
            </View>
            <AppButton
              disabled={isLoading || !keyInput.trim()}
              icon={<KeyRound color="#241B10" size={18} />}
              label={isLoading ? "Проверяем..." : "Активировать"}
              onPress={() => {
                void handleActivate();
              }}
              testId="activate-button"
            />
          </SectionCard>

          <SectionCard title="Как получить ключ?" subtitle="Свяжитесь с нами">
            <Text style={styles.bodyText}>
              Напишите нам в Telegram для покупки лицензии. Ключ активирует безлимитные генерации на оплаченный период.
            </Text>
          </SectionCard>

          <SectionCard title="Без ключа" subtitle="Приложение работает на кредитах">
            <Text style={styles.bodyText}>
              Без лицензии доступна система кредитов: 10 бесплатных на старте, пополнение через магазин.
            </Text>
          </SectionCard>
        </>
      )}
    </AppScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingTop: 12,
  },
  statusCard: {
    gap: 16,
    padding: 18,
    borderRadius: appTheme.radii.lg,
    backgroundColor: appTheme.colors.backgroundElevated,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statusInfo: {
    flex: 1,
    gap: 4,
  },
  statusTitle: {
    color: appTheme.colors.success,
    fontSize: 22,
    fontWeight: "800",
  },
  statusDays: {
    color: appTheme.colors.textSecondary,
    fontSize: 15,
  },
  detailsBlock: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: appTheme.colors.border,
  },
  detailLine: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  inputBlock: {
    gap: 10,
  },
  hint: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
  },
  bodyText: {
    color: appTheme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
