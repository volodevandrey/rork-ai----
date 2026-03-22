import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";

import theme from "@/constants/theme";

interface AppScrollScreenProps {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  safeAreaEdges?: Edge[];
  testId?: string;
}

interface AppViewScreenProps {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  safeAreaEdges?: Edge[];
  testId?: string;
}

export function AppScrollScreen(props: AppScrollScreenProps) {
  const { children, contentContainerStyle, safeAreaEdges = [], testId } = props;

  return (
    <View style={styles.root} testID={testId}>
      <LinearGradient
        colors={[
          theme.colors.background,
          theme.colors.backgroundElevated,
          theme.colors.background,
        ]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView edges={safeAreaEdges} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export function AppViewScreen(props: AppViewScreenProps) {
  const { children, contentContainerStyle, safeAreaEdges = [], testId } = props;

  return (
    <View style={styles.root} testID={testId}>
      <LinearGradient
        colors={[
          theme.colors.background,
          theme.colors.backgroundElevated,
          theme.colors.background,
        ]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView edges={safeAreaEdges} style={[styles.safeArea, contentContainerStyle]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 18,
  },
});
