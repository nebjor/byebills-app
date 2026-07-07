import { Pressable, StyleSheet, View } from "react-native";

import { money } from "@/data/mock";
import { useTheme } from "@/theme";

import { Text } from "./Text";

export interface TransactionRowProps {
  title: string;
  meta: string;
  amount: number;
  color: string;
  onPress?: () => void;
}

export function TransactionRow({ title, meta, amount, color, onPress }: TransactionRowProps) {
  const { colors } = useTheme();
  const positive = amount >= 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.pressed : null]}
    >
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text weight="extra" color="#FFFFFF">
          {title.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.mid}>
        <Text weight="bold" style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text variant="small" color={colors.ink600} numberOfLines={1}>
          {meta}
        </Text>
      </View>

      <Text weight="extra" color={positive ? colors.brand : colors.error} style={styles.amount}>
        {money(amount, true)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  pressed: { opacity: 0.6 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  mid: { flex: 1, gap: 2 },
  title: { fontSize: 15 },
  amount: { fontSize: 15 },
});

export default TransactionRow;
