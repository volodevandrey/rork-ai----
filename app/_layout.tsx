import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppErrorBoundary } from "@/components/ui/AppErrorBoundary";
import appTheme from "@/constants/theme";
import { AppDataProvider } from "@/providers/AppDataProvider";
import { useCreditsStore } from "@/stores/creditsStore";
import { useLicenseStore } from "@/stores/licenseStore";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Назад",
        headerStyle: {
          backgroundColor: appTheme.colors.background,
        },
        headerShadowVisible: false,
        headerTintColor: appTheme.colors.text,
        headerTitleStyle: {
          color: appTheme.colors.text,
          fontWeight: "700",
        },
        contentStyle: {
          backgroundColor: appTheme.colors.background,
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="new-project" options={{ title: "Новый проект" }} />
      <Stack.Screen name="templates" options={{ title: "Шаблоны" }} />
      <Stack.Screen name="projects" options={{ title: "Мои проекты" }} />
      <Stack.Screen name="settings" options={{ title: "Настройки" }} />
      <Stack.Screen name="shop" options={{ title: "Магазин кредитов" }} />
      <Stack.Screen name="activate" options={{ title: "Активация" }} />
      <Stack.Screen name="project/[projectId]/index" options={{ title: "Проект" }} />
      <Stack.Screen name="project/[projectId]/generating" options={{ headerShown: false }} />
      <Stack.Screen name="project/[projectId]/results" options={{ title: "Варианты" }} />
      <Stack.Screen name="project/[projectId]/inpaint" options={{ title: "Дорисовать мебель" }} />
      <Stack.Screen
        name="project/[projectId]/compare"
        options={{
          title: "До / После",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    let isMounted = true;

    const prepareApp = async () => {
      try {
        console.log("[RootLayout] loading credits and license on startup");
        await Promise.all([
          useCreditsStore.getState().loadCredits(),
          useLicenseStore.getState().loadLicense(),
        ]);
      } finally {
        if (isMounted) {
          await SplashScreen.hideAsync();
        }
      }
    };

    void prepareApp();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppErrorBoundary>
          <AppDataProvider>
            <RootLayoutNav />
          </AppDataProvider>
        </AppErrorBoundary>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
