import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type Palette, useTheme, useThemedStyles } from "@/theme";

import { Text } from "./Text";

type Meta = { icon: string; label: string };

const META: Record<string, Meta> = {
  dashboard: { icon: "🏠", label: "Home" },
  transactions: { icon: "🧾", label: "Invoices" },
  reports: { icon: "📊", label: "Reports" },
  profile: { icon: "👤", label: "Profile" },
};

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    navigate: (name: string) => void;
    emit: (e: { type: string; target?: string; canPreventDefault?: boolean }) => {
      defaultPrevented: boolean;
    };
  };
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.divider,
      paddingTop: 10,
      paddingHorizontal: 8,
    },
    group: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
    tab: { alignItems: "center", gap: 4, paddingHorizontal: 8 },
    icon: { fontSize: 22 },
    iconInactive: { opacity: 0.5 },
    label: { fontSize: 11 },
    fabSlot: { width: 84, alignItems: "center" },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 18,
      marginTop: -18,
      backgroundColor: c.brand,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: c.brand,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    fabPlus: { color: c.onBrand, fontSize: 30, lineHeight: 34, fontWeight: "700" },
  });

export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const renderTab = (name: string) => {
    const index = state.routes.findIndex((r) => r.name === name);
    if (index < 0) return null;
    const route = state.routes[index];
    const meta = META[name] ?? { icon: "•", label: name };
    const focused = state.index === index;

    const onPress = () => {
      const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };

    return (
      <Pressable key={route.key} onPress={onPress} style={styles.tab}>
        <Text style={[styles.icon, !focused && styles.iconInactive]}>{meta.icon}</Text>
        <Text
          weight={focused ? "bold" : "medium"}
          color={focused ? colors.brand : colors.ink400}
          style={styles.label}
        >
          {meta.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.group}>
        {renderTab("dashboard")}
        {renderTab("transactions")}
      </View>

      <View style={styles.fabSlot}>
        <Pressable
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel="Add"
          onPress={() => router.push("/capture/scan")}
        >
          <Text style={styles.fabPlus}>+</Text>
        </Pressable>
      </View>

      <View style={styles.group}>
        {renderTab("reports")}
        {renderTab("profile")}
      </View>
    </View>
  );
}

export default TabBar;
