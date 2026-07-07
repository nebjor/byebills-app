import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Button, Card, Screen, Text } from "@/components";
import { money, type Transaction } from "@/data/mock";
import { useHustles } from "@/data/hustleStore";
import { useTransactions } from "@/data/store";
import { useUser } from "@/data/userStore";
import { exportTransactions } from "@/lib/export";
import { type Palette, radii, useTheme, useThemedStyles } from "@/theme";

function totals(items: Transaction[]) {
  let income = 0;
  let expenses = 0;
  for (const t of items) {
    if (t.amount >= 0) income += t.amount;
    else expenses += -t.amount;
  }
  return { income, expenses, net: income - expenses };
}

function monthLabel(key: string) {
  if (key === "undated") return "Undated";
  const d = new Date(`${key}-01T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 14 },
    sub: { marginTop: 4 },
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
    yearRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
    card: { gap: 12 },
    rangeRow: { flexDirection: "row", gap: 12 },
    dateField: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: radii.md,
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 2,
      backgroundColor: c.surface,
    },
    cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    stats: { flexDirection: "row", gap: 12 },
    stat: { flex: 1, gap: 2 },
    bigAmount: { fontSize: 18 },
    empty: { alignItems: "center", justifyContent: "center", paddingVertical: 64, gap: 8 },
  });

export default function Reports() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { transactions } = useTransactions();
  const { hustles } = useHustles();
  const { user } = useUser();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selectedHustle, setSelectedHustle] = useState<string>("all");
  const scoped = useMemo(
    () =>
      selectedHustle === "all"
        ? transactions
        : transactions.filter((t) => t.hustleId === selectedHustle),
    [transactions, selectedHustle],
  );
  const hustleName =
    selectedHustle === "all" ? "" : hustles.find((h) => h.id === selectedHustle)?.name ?? "";
  const slug = hustleName
    ? hustleName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : "";
  const lbl = (base: string) => (slug ? `${base}-${slug}` : base);
  const today = new Date();
  const [from, setFrom] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [to, setTo] = useState<Date>(() => new Date());
  const [picker, setPicker] = useState<null | "from" | "to">(null);

  const { monthsMap, monthKeys, years } = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    for (const t of scoped) {
      const key = (t.date ?? "").slice(0, 7) || "undated";
      (map[key] ||= []).push(t);
    }
    const keys = Object.keys(map).sort().reverse();
    const ys = Array.from(new Set(keys.filter((k) => k !== "undated").map((k) => k.slice(0, 4)))).sort().reverse();
    return { monthsMap: map, monthKeys: keys, years: ys };
  }, [scoped]);

  const run = async (key: string, items: Transaction[], label: string) => {
    if (!items.length) {
      Alert.alert("Nothing to export", "No transactions in this period.");
      return;
    }
    setBusyKey(key);
    try {
      await exportTransactions(items, label, user.currency);
    } catch {
      Alert.alert(
        "Export failed",
        "Couldn't build the file. Make sure expo-file-system, expo-sharing and jszip are installed.",
      );
    } finally {
      setBusyKey(null);
    }
  };

  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

  const onPick = (e: DateTimePickerEvent, d?: Date) => {
    const which = picker;
    setPicker(null);
    if (e.type !== "dismissed" && d) {
      if (which === "from") setFrom(d);
      else setTo(d);
    }
  };

  const onExportRange = () => {
    let a = iso(from);
    let b = iso(to);
    if (a > b) [a, b] = [b, a];
    const items = scoped.filter((t) => t.date && t.date >= a && t.date <= b);
    run("range", items, lbl(`${a}_to_${b}`));
  };

  const renderMonthCard = (key: string) => {
    const items = monthsMap[key];
    const t = totals(items);
    return (
      <Card key={key} style={styles.card}>
        <View style={styles.cardTop}>
          <Text variant="title">{monthLabel(key)}</Text>
          <Button
            label="Export"
            size="sm"
            variant="secondary"
            loading={busyKey === key}
            onPress={() => run(key, items, lbl(key))}
          />
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text variant="small" color={colors.ink600}>
              Income
            </Text>
            <Text weight="extra" color={colors.brand} style={styles.bigAmount}>
              {money(t.income, true)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text variant="small" color={colors.ink600}>
              Expenses
            </Text>
            <Text weight="extra" color={colors.error} style={styles.bigAmount}>
              {money(-t.expenses)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text variant="small" color={colors.ink600}>
              Net
            </Text>
            <Text weight="extra" style={styles.bigAmount}>
              {money(t.net, true)}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="h1">Reports</Text>
        <Text variant="body" color={colors.ink600} style={styles.sub}>
          Income & expenses by month. Export a CSV with receipt photos for your tax office.
        </Text>

        {hustles.length > 1 && transactions.length > 0 ? (
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

        {monthKeys.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 32 }}>📊</Text>
            <Text variant="title" center>
              No data yet
            </Text>
            <Text variant="small" color={colors.ink600} center>
              Add a transaction and your monthly totals appear here.
            </Text>
          </View>
        ) : (
          <>
            <Button
              label={selectedHustle === "all" ? "Export everything" : `Export all · ${hustleName}`}
              variant="primary"
              loading={busyKey === "all"}
              onPress={() => run("all", scoped, lbl("all"))}
            />

            <Card style={styles.card}>
              <Text variant="title">Custom range</Text>
              <View style={styles.rangeRow}>
                <Pressable style={styles.dateField} onPress={() => setPicker("from")}>
                  <Text variant="small" color={colors.ink600}>
                    From
                  </Text>
                  <Text weight="bold">{fmt(from)}</Text>
                </Pressable>
                <Pressable style={styles.dateField} onPress={() => setPicker("to")}>
                  <Text variant="small" color={colors.ink600}>
                    To
                  </Text>
                  <Text weight="bold">{fmt(to)}</Text>
                </Pressable>
              </View>
              <Button
                label="Export range"
                variant="secondary"
                loading={busyKey === "range"}
                onPress={onExportRange}
              />
              {picker ? (
                <DateTimePicker
                  value={picker === "from" ? from : to}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  maximumDate={new Date()}
                  onChange={onPick}
                />
              ) : null}
            </Card>

            {years.map((year) => {
              const yearItems = scoped.filter((t) => (t.date ?? "").slice(0, 4) === year);
              return (
                <View key={year} style={{ gap: 12 }}>
                  <View style={styles.yearRow}>
                    <Text variant="label" color={colors.ink400}>
                      {year}
                    </Text>
                    <Button
                      label={`Export ${year}`}
                      size="sm"
                      variant="tertiary"
                      loading={busyKey === `year-${year}`}
                      onPress={() => run(`year-${year}`, yearItems, lbl(year))}
                    />
                  </View>
                  {monthKeys.filter((k) => k.slice(0, 4) === year).map(renderMonthCard)}
                </View>
              );
            })}

            {monthKeys.includes("undated") ? renderMonthCard("undated") : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
