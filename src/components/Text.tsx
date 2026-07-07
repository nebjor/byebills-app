import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native";

import { fonts, type Palette, type as typePresets, useTheme } from "@/theme";

export type TextVariant = keyof typeof typePresets;
export type FontWeight = keyof typeof fonts;

const DEFAULT_COLOR: Record<TextVariant, keyof Palette> = {
  display: "ink",
  h1: "ink",
  h2: "ink",
  title: "ink",
  body: "ink",
  bodyStrong: "ink",
  small: "ink600",
  label: "ink400",
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
  weight?: FontWeight;
}

/** App text — always Nunito, colour resolved from the active theme. */
export function Text({ variant = "body", color, center, weight, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  const override: TextStyle = { color: color ?? colors[DEFAULT_COLOR[variant]] };
  if (center) override.textAlign = "center";
  if (weight) override.fontFamily = fonts[weight];

  return <RNText style={[typePresets[variant], override, style]} {...rest} />;
}

export default Text;
