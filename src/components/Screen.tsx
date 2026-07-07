import { StatusBar } from "expo-status-bar";
import { type ReactNode } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/theme";

type Edge = "top" | "bottom" | "left" | "right";

export interface ScreenProps {
  children: ReactNode;
  background?: string;
  edges?: Edge[];
  style?: ViewStyle;
}

/** Full-screen safe-area container with the themed background + status bar. */
export function Screen({ children, background, edges = ["top", "bottom"], style }: ScreenProps) {
  const { colors, isDark } = useTheme();
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safe, { backgroundColor: background ?? colors.canvas }, style]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });

export default Screen;
