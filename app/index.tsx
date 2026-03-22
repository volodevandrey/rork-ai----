import { Image } from "expo-image";
import { router } from "expo-router";
import { FolderOpen, LayoutTemplate, Settings, Sparkles } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppScrollScreen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { appCopy, getModeTitle } from "@/constants/design";
import appTheme from "@/constants/theme";
import { useAppData } from "@/providers/AppDataProvider";
import { loadOnboardingShown, saveOnboardingShown } from "@/services/storage/appStorage";
import { useCreditsStore } from "@/stores/creditsStore";

export default function HomeScreen() {
  const { projects, templates, isHydrating } = useAppData();
  const credits = useCreditsStore((state) => state.credits);
  const onboardingAlertShownRef = useRef<boolean>(false);
  const recentProject = projects[0] ?? null;
  const isEmptyBalance = credits === 0;
  const isLowBalance = credits > 0 && credits <= 5;
  const balanceColor = isEmptyBalance ? appTheme.colors.danger : isLowBalance ? "#F2A65A" : appTheme.colors.accentStrong;
  const balanceIcon = isLowBalance ? "⚠" : "✦";
  const balanceLabel = isLowBalance ? `Осталось ${credits} кредитов` : `${credits} кредитов`;

  useEffect(() => {
    let isActive = true;

    const checkOnboarding = async () => {
      if (onboardingAlertShownRef.current) {
        return;
      }

      const alreadyShown = await loadOnboardingShown();
      if (!isActive || alreadyShown) {
        return;
      }

      onboardingAlertShownRef.current = true;
      Alert.alert(
        "Добро пожаловать!",
        "Как пользоваться:\n1. Сфотографируй мебель или загрузи эскиз\n2. Опиши что хочешь изменить\n3. Нажми Создать — AI всё сделает\n\nУ вас 10 бесплатных кредитов для старта!",
        [
          {
            text: "Начать",
            onPress: () => {
              void saveOnboardingShown(true);
            },
          },
        ],
      );
    };

    void checkOnboarding();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <AppScrollScreen contentContainerStyle={styles.content} safeAreaEdges={["top"]} testId="home-screen">
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Sparkles color={appTheme.colors.accentStrong} size={16} />
          <Text style={styles.heroBadgeText}>Точная визуализация мебели</Text>
        </View>
        <Text style={styles.title}>{appCopy.title}</Text>
        <View style={styles.balanceRow} testID="home-credits-balance">
          <Text style={[styles.balanceIcon, { color: balanceColor }]}>{balanceIcon}</Text>
          <Text style={[styles.balanceText, { color: balanceColor }]}>{balanceLabel}</Text>
          {isEmptyBalance ? (
            <Pressable onPress={() => router.push("/shop")} testID="home-credits-topup">
              {({ pressed }) => (
                <Text style={[styles.balanceLink, pressed ? styles.balanceLinkPressed : null]}>Пополнить</Text>
              )}
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.subtitle}>{appCopy.subtitle}</Text>
        <View style={styles.ruleCard}>
          <Text style={styles.ruleTitle}>{appCopy.preservation}</Text>
          <Text style={styles.ruleText}>{appCopy.appearanceOnly}</Text>
        </View>
        <AppButton
          icon={<Sparkles color="#241B10" size={18} />}
          label="Новый проект"
          onPress={() => router.push("/new-project")}
          testId="home-new-project"
        />
      </View>

      <SectionCard title="Разделы" subtitle="Быстрый доступ к основным экранам">
        <View style={styles.buttonStack}>
          <AppButton
            icon={<LayoutTemplate color={appTheme.colors.text} size={18} />}
            label="Шаблоны"
            onPress={() => router.push("/templates")}
            variant="secondary"
            testId="home-templates"
          />
          <AppButton
            icon={<FolderOpen color={appTheme.colors.text} size={18} />}
            label="Мои проекты"
            onPress={() => router.push("/projects")}
            variant="secondary"
            testId="home-projects"
          />
          <AppButton
            icon={<Settings color={appTheme.colors.text} size={18} />}
            label="Настройки"
            onPress={() => router.push("/settings")}
            variant="secondary"
            testId="home-settings"
          />
        </View>
      </SectionCard>

      <SectionCard
        title="Последний проект"
        subtitle={isHydrating ? "Загрузка локальных данных..." : "Проекты сохраняются на устройстве"}
      >
        {recentProject ? (
          <View style={styles.projectPreview}>
            <Image contentFit="cover" source={{ uri: recentProject.sourceImage.uri }} style={styles.projectImage} />
            <View style={styles.projectBody}>
              <Text style={styles.projectTitle}>{recentProject.title}</Text>
              <Text style={styles.projectMeta}>{getModeTitle(recentProject.mode)}</Text>
              <Text numberOfLines={2} style={styles.projectDescription}>
                {recentProject.description || "Описание ещё не добавлено"}
              </Text>
              <AppButton
                label="Открыть проект"
                onPress={() =>
                  router.push({
                    pathname: "/project/[projectId]",
                    params: { projectId: recentProject.id },
                  })
                }
                variant="secondary"
                testId="home-open-recent-project"
              />
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>
            Пока пусто. Начните с нового проекта и загрузите фото мебели или эскиз.
          </Text>
        )}
      </SectionCard>

      <SectionCard title="Локально на устройстве" subtitle="Без входа и без лишней сложности">
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{projects.length}</Text>
            <Text style={styles.metricLabel}>Проектов</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{templates.length}</Text>
            <Text style={styles.metricLabel}>Шаблонов</Text>
          </View>
        </View>
      </SectionCard>
    </AppScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingTop: 10,
  },
  hero: {
    gap: 16,
    padding: 24,
    borderRadius: appTheme.radii.xl,
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    ...appTheme.shadow,
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: appTheme.radii.pill,
    backgroundColor: appTheme.colors.surfaceAlt,
  },
  heroBadgeText: {
    color: appTheme.colors.accentStrong,
    fontSize: 13,
    fontWeight: "700",
  },
  title: {
    color: appTheme.colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
  },
  balanceRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: appTheme.radii.pill,
    backgroundColor: appTheme.colors.surfaceAlt,
  },
  balanceIcon: {
    fontSize: 13,
    fontWeight: "700",
  },
  balanceText: {
    fontSize: 13,
    fontWeight: "700",
  },
  balanceLink: {
    color: appTheme.colors.text,
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  balanceLinkPressed: {
    opacity: 0.7,
  },
  subtitle: {
    color: appTheme.colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  ruleCard: {
    gap: 6,
    padding: 16,
    borderRadius: appTheme.radii.lg,
    backgroundColor: appTheme.colors.backgroundElevated,
  },
  ruleTitle: {
    color: appTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  ruleText: {
    color: appTheme.colors.textSecondary,
    fontSize: 14,
  },
  buttonStack: {
    gap: 12,
  },
  projectPreview: {
    gap: 14,
  },
  projectImage: {
    width: "100%",
    height: 210,
    borderRadius: appTheme.radii.lg,
    backgroundColor: appTheme.colors.surfaceAlt,
  },
  projectBody: {
    gap: 10,
  },
  projectTitle: {
    color: appTheme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  projectMeta: {
    color: appTheme.colors.accentStrong,
    fontSize: 13,
    fontWeight: "600",
  },
  projectDescription: {
    color: appTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    color: appTheme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    gap: 8,
    padding: 16,
    borderRadius: appTheme.radii.lg,
    backgroundColor: appTheme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  metricValue: {
    color: appTheme.colors.text,
    fontSize: 26,
    fontWeight: "800",
  },
  metricLabel: {
    color: appTheme.colors.textSecondary,
    fontSize: 14,
  },
});
