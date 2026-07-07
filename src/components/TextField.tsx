import { useState } from "react";
import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";

import { fonts, type Palette, radii, useTheme, useThemedStyles } from "@/theme";

import { Text } from "./Text";

export interface TextFieldProps extends TextInputProps {
  label?: string;
  helper?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    label: { fontSize: 13, marginBottom: 8 },
    box: {
      minHeight: 54,
      borderRadius: radii.md,
      backgroundColor: c.surface,
      paddingHorizontal: 16,
      justifyContent: "center",
    },
    input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: c.ink, paddingVertical: 0 },
    helper: { marginTop: 6 },
  });

export function TextField({
  label,
  helper,
  error,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.error : focused ? colors.brand : colors.border;
  const borderWidth = focused || error ? 2 : 1.5;

  return (
    <View style={containerStyle}>
      {label ? (
        <Text weight="bold" color={colors.ink} style={styles.label}>
          {label}
        </Text>
      ) : null}

      <View style={[styles.box, { borderColor, borderWidth }]}>
        <TextInput
          placeholderTextColor={colors.ink400}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
      </View>

      {error || helper ? (
        <Text variant="small" color={error ? colors.error : colors.ink400} style={styles.helper}>
          {error ?? helper}
        </Text>
      ) : null}
    </View>
  );
}

export default TextField;
