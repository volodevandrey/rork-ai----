import { router, Stack } from "expo-router";
import { Check, Sparkles } from "lucide-react-native";
import { useCallback } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppScrollScreen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import theme from "@/constants/theme";
import { useCreditsStore } from "@/stores/creditsStore";

interface CreditPackage {
  id: string;
  title: string;
  credits: number;
  price: string;
  featured?: boolean;
}

const creditPackages: CreditPackage[] = [
  {
    id: "starter",
    title: "Старт",
    credits: 20,
    price: "199 ₽",
  },
  {
    id: "basic",
    title: "Базовый",
    credits: 50,
    price: "399 ₽",
    featured: true,
  },
  {
    id: "pro",
    title: "Про",
    credits: 150,
    price: "990 ₽",
  },
];

export default function ShopScreen() {
  const credits = useCreditsStore((state) => state.credits);
  const addCredits = useCreditsStore((state) => state.addCredits);

  const handlePurchase = useCallback(
    async (creditPackage: CreditPackage) => {
      try {
        console.log("[shop] test purchase", creditPackage.id, creditPackage.credits);
        await addCredits(creditPackage.credits);
        Alert.alert(
          "Оплата будет добавлена в следующем обновлении",
          `${creditPackage.credits} кредитов уже зачислены для тестирования.`,
          [
            {
              text: "Готово",
              onPress: () => router.back(),
            },
          ],
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Не удалось зачислить кредиты.";
        Alert.alert("Ошибка", message);
      }
    },
    [addCredits],
  );

  return (
    <AppScrollScreen contentContainerStyle={styles.content} testId="shop-screen">
      <Stack.Screen options={{ title: `Кредиты · ${credits} кр.` }} />

      <View style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <Sparkles color={theme.colors.accentStrong} size={16} />
          <Text style={styles.heroBadgeText}>Баланс пополняется моментально</Text>
        </View>
        <Text style={styles.heroTitle}>Выберите пакет кредитов</Text>
        <Text style={styles.heroSubtitle}>
          Кредиты тратятся на генерации. Ниже видно, сколько стоит каждый уровень качества.
        </Text>
        <View style={styles.explainerCard}>
          <Text style={styles.explainerLine}>1 кредит = 1 генерация низкого качества</Text>
          <Text style={styles.explainerLine}>2 кредита = 1 генерация среднего качества</Text>
          <Text style={styles.explainerLine}>4 кредита = 1 генерация высокого качества</Text>
          <Text style={styles.explainerFree}>Бесплатно: неограниченно в низком качестве</Text>
        </View>
      </View>

      {creditPackages.map((creditPackage) => {
        const mediumGenerations = creditPackage.credits / 2;

        return (
          <SectionCard
            key={creditPackage.id}
            title={`${creditPackage.title} · ${creditPackage.credits} кредитов`}
            subtitle={`Примерно ${mediumGenerations} генераций при medium качестве`}
          >
            <View
              style={[
                styles.packageCard,
                creditPackage.featured ? styles.packageCardFeatured : null,
              ]}
            >
              <View style={styles.packageHeader}>
                <View style={styles.packageMeta}>
                  <Text style={styles.packageCredits}>{creditPackage.credits} кр.</Text>
                  <Text style={styles.packagePrice}>{creditPackage.price}</Text>
                </View>
                {creditPackage.featured ? (
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>Выгодно</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.benefitsList}>
                <View style={styles.benefitRow}>
                  <Check color={theme.colors.accentStrong} size={16} />
                  <Text style={styles.benefitText}>Мгновенное пополнение баланса</Text>
                </View>
                <View style={styles.benefitRow}>
                  <Check color={theme.colors.accentStrong} size={16} />
                  <Text style={styles.benefitText}>Подходит для быстрых тестовых генераций</Text>
                </View>
              </View>

              <AppButton
                label={`Купить за ${creditPackage.price}`}
                onPress={() => {
                  void handlePurchase(creditPackage);
                }}
                testId={`buy-${creditPackage.id}`}
              />
            </View>
          </SectionCard>
        );
      })}
    </AppScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingTop: 12,
  },
  heroCard: {
    gap: 14,
    padding: 22,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow,
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceAlt,
  },
  heroBadgeText: {
    color: theme.colors.accentStrong,
    fontSize: 13,
    fontWeight: "700",
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  explainerCard: {
    gap: 8,
    padding: 16,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.backgroundElevated,
  },
  explainerLine: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  explainerFree: {
    color: theme.colors.accentStrong,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  packageCard: {
    gap: 16,
    padding: 18,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  packageCardFeatured: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.backgroundElevated,
  },
  packageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  packageMeta: {
    gap: 6,
  },
  packageCredits: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  packagePrice: {
    color: theme.colors.accentStrong,
    fontSize: 15,
    fontWeight: "700",
  },
  featuredBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accentSoft,
  },
  featuredBadgeText: {
    color: theme.colors.accentStrong,
    fontSize: 12,
    fontWeight: "800",
  },
  benefitsList: {
    gap: 10,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  benefitText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
