import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import { type Palette, radii, useTheme } from "@/theme";

import { Text } from "./Text";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive";
export type ButtonSize = "md" | "sm";

function variantColors(c: Palette, v: ButtonVariant) {
  switch (v) {
    case "secondary":
      return { bg: c.brandTint, bgPressed: c.brandTint, fg: c.brandInk, border: undefined as string | undefined };
    case "tertiary":
      return { bg: "transparent", bgPressed: c.subtle, fg: c.brand, border: c.border };
    case "destructive":
      return { bg: c.error, bgPressed: c.error, fg: c.onBrand, border: undefined };
    case "primary":
    default:
      return { bg: c.brand, bgPressed: c.brandPressed, fg: c.onBrand, border: undefined };
  }
}

export interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: ViewStyle;
}

export function Button({
  label,
  variant = "primary",
  size = "md",
  fullWidth,
  loading,
  disabled,
  leftIcon,
  rightIcon,
  style,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const v = variantColors(colors, variant);
  const isDisabled = !!disabled || !!loading;
  const paddingVertical = size === "sm" ? 11 : 16;
  const paddingHorizontal = size === "sm" ? 16 : 22;
  const fontSize = size === "sm" ? 14 : 17;
  const fg = isDisabled ? colors.ink400 : v.fg;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          paddingVertical,
          paddingHorizontal,
          backgroundColor: isDisabled ? colors.disabledBg : pressed ? v.bgPressed : v.bg,
        },
        v.border ? { borderWidth: 1.5, borderColor: isDisabled ? colors.disabledBg : v.border } : null,
        fullWidth && styles.fullWidth,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {leftIcon}
          <Text weight="extra" color={fg} style={{ fontSize }}>
            {label}
          </Text>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 9 },
  fullWidth: { alignSelf: "stretch" },
});

export default Button;
