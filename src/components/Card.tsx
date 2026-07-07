import { type ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { type Palette, radii, useThemedStyles } from "@/theme";

export interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  flush?: boolean;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: radii.lg,
      padding: 16,
    },
    flush: { padding: 0 },
  });

/** Surface card: themed background, hairline border, rounded. */
export function Card({ children, style, flush }: CardProps) {
  const styles = useThemedStyles(makeStyles);
  return <View style={[styles.card, flush && styles.flush, style]}>{children}</View>;
}

export default Card;
