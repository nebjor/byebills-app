import { Pressable, StyleSheet, View } from "react-native";

import { type Palette, radii, useTheme, useThemedStyles } from "@/theme";

import { Text } from "./Text";

export interface SelectCardProps {
  title: string;
  subtitle?: string;
  emoji?: string;
  selected?: boolean;
  onPress?: () => void;
  multi?: boolean;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1.5,
      borderRadius: radii.lg,
      padding: 16,
    },
    cardSelected: { borderColor: c.brand, borderWidth: 2, backgroundColor: c.selectedTint },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: c.subtle,
      alignItems: "center",
      justifyContent: "center",
    },
    iconWrapSelected: { backgroundColor: c.brandTint },
    emoji: { fontSize: 24 },
    textWrap: { flex: 1, gap: 2 },
    subtitle: { marginTop: 1 },
    indicator: {
      width: 26,
      height: 26,
      borderWidth: 2,
      borderColor: c.controlBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    indicatorSquare: { borderRadius: 8 },
    indicatorRound: { borderRadius: 13 },
    indicatorSelected: { backgroundColor: c.brand, borderColor: c.brand },
    check: { fontSize: 15, lineHeight: 18 },
  });

/** Selectable card used for choosers (radio cards / multi-select tags). */
export function SelectCard({
  title,
  subtitle,
  emoji,
  selected = false,
  onPress,
  multi = true,
}: SelectCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole={multi ? "checkbox" : "radio"}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      <View style={styles.textWrap}>
        <Text variant="title">{title}</Text>
        {subtitle ? (
          <Text variant="small" color={colors.ink600} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.indicator,
          multi ? styles.indicatorSquare : styles.indicatorRound,
          selected && styles.indicatorSelected,
        ]}
      >
        {selected ? (
          <Text weight="extra" color={colors.onBrand} style={styles.check}>
            ✓
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default SelectCard;
