import { Component, ErrorInfo, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import theme from "@/constants/theme";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "Произошла ошибка.",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.log("[AppErrorBoundary] caught error", error, errorInfo.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>Что-то пошло не так</Text>
            <Text style={styles.description}>
              {this.state.message || "Не удалось открыть экран. Попробуйте ещё раз."}
            </Text>
            <Pressable onPress={this.handleReset} style={styles.button}>
              <Text style={styles.buttonText}>Попробовать снова</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    padding: 24,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 14,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  description: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    minHeight: 50,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  buttonText: {
    color: "#241B10",
    fontSize: 16,
    fontWeight: "700",
  },
});
