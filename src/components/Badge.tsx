import { StyleSheet, View } from "react-native";

import { type Palette, radii, useTheme } from "@/theme";

import { Text } from "./Text";

export type BadgeStatus = "paid" | "pending" | "overdue" | "draft";

function statusColors(c: Palette, status: BadgeStatus) {
  switch (status) {
    case "paid":
      return { fg: c.brandInk, bg: c.successTint, label: "Paid" };
    case "pending":
      return { fg: c.warnInk, bg: c.warningTint, label: "Pending" };
    case "overdue":
      return { fg: c.errInk, bg: c.errorTint, label: "Overdue" };
    case "draft":
    default:
      return { fg: c.ink600, bg: c.subtle, label: "Draft" };
  }
}

export interface BadgeProps {
  status: BadgeStatus;
  label?: string;
}

/** Status pill with a leading dot (Paid / Pending / Overdue / Draft). */
export function Badge({ status, label }: BadgeProps) {
  const { colors } = useTheme();
  const s = statusColors(colors, status);
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <View style={[styles.dot, { backgroundColor: s.fg }]} />
      <Text weight="bold" color={s.fg} style={styles.label}>
        {label ?? s.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: radii.pill,
    alignSelf: "flex-start",
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontSize: 11.5 },
});

export default Badge;
