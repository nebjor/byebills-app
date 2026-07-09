import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Button, Card, Screen, Text, TransactionRow } from "@/components";
import { money, type Transaction } from "@/data/mock";
import { monthKey } from "@/lib/date";
import { useHustles } from "@/data/hustleStore";
import { useTransactions } from "@/data/store";
import { useUser } from "@/data/userStore";
import { type Palette, radii, useTheme, useThemedStyles } from "@/theme";

const billie = require("../../../assets/images/cute_billie_transparent_cropped.png");

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 16 },
    flex: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", gap: 12 },
    greetRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    greetBillie: { width: 26, height: 26 },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.purple,
      alignItems: "center",
      justifyContent: "center",
    },
    hustleRow: { gap: 8, paddingRight: 4 },
    hChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    hChipActive: { backgroundColor: c.brand, borderColor: c.brand },
    hDot: { width: 9, height: 9, borderRadius: 5 },
    balanceCard: { gap: 10 },
    balance: { fontSize: 34 },
    scope: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      alignSelf: "flex-start",
      backgroundColor: c.successTint,
      paddingVertical: 5,
      paddingHorizontal: 11,
      borderRadius: radii.pill,
    },
    statRow: { flexDirection: "row", gap: 14 },
    statIconBase: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 10 },
    statEmoji: { fontSize: 18, fontWeight: "800" },
    statLabel: { marginBottom: 2 },
    statAmount: { fontSize: 19 },
    cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    bars: { flexDirection: "row", alignItems: "flex-end", height: 130, gap: 8 },
    barCol: { flex: 1, alignItems: "center", gap: 8 },
    bar: { width: "100%", borderRadius: 7 },
    sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
    groupLabel: { marginTop: 8, marginBottom: 2, marginLeft: 4 },
    list: { paddingHorizontal: 16 },
    listEmpty: { paddingVertical: 24, textAlign: "center" },
    divider: { height: 1, backgroundColor: c.divider },
    dim: { opacity: 0.22 },
    overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: 24 },
    emptyCard: { alignItems: "center", gap: 12, maxWidth: 360 },
    emptyBillie: { width: 108, height: 108, marginBottom: 2 },
    emptyCta: { marginTop: 4 },
  });

export default function Dashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { transactions } = useTransactions();
  const { user } = useUser();
  const { hustles } = useHustles();
  const [selectedHustle, setSelectedHustle] = useState<string>("all");
  const empty = transactions.length === 0;

  const hustleColor = useMemo(() => Object.fromEntries(hustles.map((h) => [h.id, h.color])), [hustles]);
  const activeHustle = selectedHustle === "all" ? null : hustles.find((h) => h.id === selectedHustle);

  const scoped = useMemo(
    () => (selectedHustle === "all" ? transactions : transactions.filter((t) => t.hustleId === selectedHustle)),
    [transactions, selectedHustle],
  );

  const { income, expenses, net } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of scoped) {
      if (t.amount >= 0) inc += t.amount;
      else exp += -t.amount;
    }
    return { income: inc, expenses: exp, net: inc - exp };
  }, [scoped]);

  // Recent transactions grouped by their date label (like the Transactions tab).
  const recentGroups = useMemo(() => {
    const sorted = [...scoped].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, 8);
    const order: string[] = [];
    const map: Record<string, Transaction[]> = {};
    for (const t of sorted) {
      if (!map[t.group]) {
        map[t.group] = [];
        order.push(t.group);
      }
      map[t.group].push(t);
    }
    return order.map((label) => ({ label, items: map[label] }));
  }, [scoped]);

  // Net cashflow per month over the last 6 months (green = net positive, red =
  // net negative). Monthly buckets always include recent (often back-dated)
  // receipts, unlike a 7-day window.
  const { bars, peak } = useMemo(() => {
    const netByMonth: Record<string, number> = {};
    for (const t of scoped) {
      if (!t.date) continue;
      const k = monthKey(t.date); // YYYY-MM, format-robust
      netByMonth[k] = (netByMonth[k] ?? 0) + t.amount;
    }
    const now = new Date();
    const out = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { value: netByMonth[key] ?? 0, label: d.toLocaleDateString(undefined, { month: "short" }) };
    });
    return { bars: out, peak: Math.max(1, ...out.map((o) => Math.abs(o.value))) };
  }, [scoped]);

  return (
    <Screen edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!empty}
        style={empty ? styles.dim : undefined}
        pointerEvents={empty ? "none" : "auto"}
      >
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text variant="small" color={colors.ink600}>
              Welcome back
            </Text>
            <View style={styles.greetRow}>
              <Text variant="h2">Hi, {user.name.split(" ")[0]}</Text>
              <Image source={billie} style={styles.greetBillie} contentFit="contain" />
            </View>
          </View>
          <Pressable
            style={styles.avatar}
            onPress={() => router.push("/profile")}
            accessibilityRole="button"
            accessibilityLabel="Profile"
          >
            <Text weight="extra" color={colors.white}>
              {user.name.charAt(0)}
            </Text>
          </Pressable>
        </View>

        {hustles.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hustleRow}>
            <Pressable
              onPress={() => setSelectedHustle("all")}
              style={[styles.hChip, selectedHustle === "all" && styles.hChipActive]}
            >
              <Text weight="bold" color={selectedHustle === "all" ? colors.onBrand : colors.ink600}>
                All hustles
              </Text>
            </Pressable>
            {hustles.map((h) => {
              const active = selectedHustle === h.id;
              return (
                <Pressable
                  key={h.id}
                  onPress={() => setSelectedHustle(h.id)}
                  style={[styles.hChip, active && styles.hChipActive]}
                >
                  <View style={[styles.hDot, { backgroundColor: active ? colors.white : h.color }]} />
                  <Text weight="bold" color={active ? colors.onBrand : colors.ink600}>
                    {h.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <Card style={styles.balanceCard}>
          <Text variant="label" color={colors.ink400}>
            NET
          </Text>
          <Text weight="extra" style={styles.balance}>
            {money(net)}
          </Text>
          <View style={styles.scope}>
            {activeHustle ? <View style={[styles.hDot, { backgroundColor: activeHustle.color }]} /> : null}
            <Text weight="bold" color={colors.brandInk} style={{ fontSize: 12.5 }}>
              {activeHustle ? activeHustle.name : "All hustles"}
            </Text>
          </View>
        </Card>

        <View style={styles.statRow}>
          <Card style={styles.flex}>
            <View style={[styles.statIconBase, { backgroundColor: colors.successTint }]}>
              <Text style={[styles.statEmoji, { color: colors.brand }]}>↗</Text>
            </View>
            <Text variant="small" color={colors.ink600} style={styles.statLabel}>
              Income
            </Text>
            <Text weight="extra" color={colors.brand} style={styles.statAmount}>
              {money(income, true)}
            </Text>
          </Card>
          <Card style={styles.flex}>
            <View style={[styles.statIconBase, { backgroundColor: colors.errorTint }]}>
              <Text style={[styles.statEmoji, { color: colors.error }]}>↘</Text>
            </View>
            <Text variant="small" color={colors.ink600} style={styles.statLabel}>
              Expenses
            </Text>
            <Text weight="extra" color={colors.error} style={styles.statAmount}>
              {money(-expenses)}
            </Text>
          </Card>
        </View>

        <Card>
          <View style={styles.cardHead}>
            <Text variant="title">Cashflow</Text>
            <Text variant="small" color={colors.ink600}>
              Last 6 months
            </Text>
          </View>
          <View style={styles.bars}>
            {bars.map((b, i) => (
              <View key={i} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: 8 + (Math.abs(b.value) / peak) * 104,
                      backgroundColor: b.value < 0 ? colors.error : colors.brand,
                      opacity: b.value !== 0 ? 1 : 0.28,
                    },
                  ]}
                />
                <Text variant="small" color={colors.ink400}>
                  {b.label}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.sectionHead}>
          <Text variant="title">Recent activity</Text>
          <Pressable onPress={() => router.push("/transactions")} hitSlop={8}>
            <Text weight="bold" color={colors.brand}>
              See all
            </Text>
          </Pressable>
        </View>

        {recentGroups.length === 0 ? (
          <Card flush style={styles.list}>
            <Text variant="small" color={colors.ink400} style={styles.listEmpty}>
              No activity yet.
            </Text>
          </Card>
        ) : (
          recentGroups.map((g) => (
            <View key={g.label}>
              <Text variant="label" color={colors.ink400} style={styles.groupLabel}>
                {g.label.toUpperCase()}
              </Text>
              <Card flush style={styles.list}>
                {g.items.map((t, i) => (
                  <View key={t.id}>
                    <TransactionRow
                      title={t.title}
                      meta={t.meta}
                      amount={t.amount}
                      color={hustleColor[t.hustleId] ?? colors.ink400}
                      onPress={() => router.push(`/transaction/${t.id}`)}
                    />
                    {i < g.items.length - 1 ? <View style={styles.divider} /> : null}
                  </View>
                ))}
              </Card>
            </View>
          ))
        )}
      </ScrollView>

      {empty ? (
        <View style={styles.overlay} pointerEvents="box-none">
          <Card style={styles.emptyCard}>
            <Image source={billie} style={styles.emptyBillie} contentFit="contain" />
            <Text variant="h2" center>
              Your books start here
            </Text>
            <Text variant="body" color={colors.ink600} center>
              Scan a receipt or invoice and Billie reads the amount, date and category for you — your totals fill in
              automatically.
            </Text>
            <Button
              label="Scan your first receipt"
              fullWidth
              style={styles.emptyCta}
              onPress={() => router.push("/capture/scan")}
            />
            <Pressable
              onPress={() => router.push({ pathname: "/capture/review", params: { manual: "1" } })}
              hitSlop={8}
            >
              <Text weight="bold" color={colors.brand}>
                Add one manually
              </Text>
            </Pressable>
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
