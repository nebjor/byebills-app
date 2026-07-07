import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Dimensions, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Button, Card, Screen, Text, TextField, TransactionRow } from "@/components";
import { type Transaction } from "@/data/mock";
import { useHustles } from "@/data/hustleStore";
import { useTransactions } from "@/data/store";
import { type Palette, radii, useTheme, useThemedStyles } from "@/theme";

type DatePreset = "all" | "today" | "week" | "month" | "year" | "custom";
const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "week", label: "Last week" },
  { id: "month", label: "Last month" },
  { id: "year", label: "Last year" },
  { id: "custom", label: "Custom range" },
];

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 14 },
    filterBar: { flexDirection: "row", gap: 10 },
    filterChip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    filterChipActive: { borderColor: c.brand, backgroundColor: c.brandTint },
    filterLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
    chevron: { fontSize: 13 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    group: { gap: 10 },
    list: { paddingHorizontal: 16 },
    divider: { height: 1, backgroundColor: c.divider },
    empty: { textAlign: "center", marginTop: 24 },

    backdrop: { flex: 1 },
    popover: {
      position: "absolute",
      backgroundColor: c.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 4,
      shadowColor: "#000",
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    optionLabel: { flex: 1, fontSize: 15 },
    check: { fontSize: 15 },
    rangeCol: { gap: 10, marginTop: 12 },
    dateField: {
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: radii.md,
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 2,
      backgroundColor: c.surface,
    },
    applyBtn: { marginTop: 12, marginBottom: 4 },
  });

export default function Transactions() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { transactions } = useTransactions();
  const { hustles } = useHustles();

  const hustleColor = useMemo(() => Object.fromEntries(hustles.map((h) => [h.id, h.color])), [hustles]);

  const [query, setQuery] = useState("");
  const [hustleFilter, setHustleFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [from, setFrom] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [to, setTo] = useState<Date>(() => new Date());
  const [sheet, setSheet] = useState<null | "hustle" | "date">(null);
  const [picker, setPicker] = useState<null | "from" | "to">(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number } | null>(null);

  const hustleRef = useRef<View>(null);
  const dateRef = useRef<View>(null);

  const openSheet = (which: "hustle" | "date") => {
    const ref = which === "hustle" ? hustleRef : dateRef;
    ref.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y: y + height + 6, width });
      setSheet(which);
    });
  };
  const closeSheet = () => {
    setSheet(null);
    setPicker(null);
  };

  const onPick = (e: DateTimePickerEvent, d?: Date) => {
    const which = picker;
    setPicker(null);
    if (e.type !== "dismissed" && d) {
      if (which === "from") setFrom(d);
      else setTo(d);
    }
  };

  const range = useMemo(() => {
    const end = isoDay(new Date());
    const back = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return isoDay(d);
    };
    switch (datePreset) {
      case "today":
        return { from: end, to: end };
      case "week":
        return { from: back(6), to: end };
      case "month":
        return { from: back(29), to: end };
      case "year":
        return { from: back(364), to: end };
      case "custom": {
        let a = isoDay(from);
        let b = isoDay(to);
        if (a > b) [a, b] = [b, a];
        return { from: a, to: b };
      }
      default:
        return null;
    }
  }, [datePreset, from, to]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = transactions.filter((t) => {
      if (hustleFilter !== "all" && t.hustleId !== hustleFilter) return false;
      if (range && (!t.date || t.date < range.from || t.date > range.to)) return false;
      if (q && !`${t.title} ${t.meta}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const order: string[] = [];
    const map: Record<string, Transaction[]> = {};
    for (const t of filtered) {
      if (!map[t.group]) {
        map[t.group] = [];
        order.push(t.group);
      }
      map[t.group].push(t);
    }
    return order.map((label) => ({ label, items: map[label] }));
  }, [hustleFilter, range, query, transactions]);

  const activeHustle = hustleFilter === "all" ? null : hustles.find((h) => h.id === hustleFilter);
  const hustleLabel = activeHustle?.name ?? "All hustles";
  const dateLabel =
    datePreset === "custom"
      ? `${fmt(from)} – ${fmt(to)}`
      : DATE_PRESETS.find((p) => p.id === datePreset)?.label ?? "All time";

  const screenW = Dimensions.get("window").width;
  const popWidth = Math.min(300, screenW - 24);
  const popLeft = anchor ? Math.max(12, Math.min(anchor.x, screenW - popWidth - 12)) : 12;

  const renderOption = (
    key: string,
    label: string,
    selected: boolean,
    onPress: () => void,
    color?: string,
  ) => (
    <Pressable key={key} style={styles.optionRow} onPress={onPress}>
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text weight="bold" style={styles.optionLabel}>
        {label}
      </Text>
      {selected ? (
        <Text weight="extra" color={colors.brand} style={styles.check}>
          ✓
        </Text>
      ) : null}
    </Pressable>
  );

  return (
    <Screen edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="h1">Transactions</Text>

        <TextField
          placeholder="Search invoices & clients"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />

        <View style={styles.filterBar}>
          <Pressable
            ref={hustleRef}
            style={[styles.filterChip, hustleFilter !== "all" && styles.filterChipActive]}
            onPress={() => openSheet("hustle")}
          >
            <View style={styles.filterLeft}>
              {activeHustle ? <View style={[styles.dot, { backgroundColor: activeHustle.color }]} /> : null}
              <Text weight="bold" numberOfLines={1} color={hustleFilter !== "all" ? colors.brandInk : colors.ink}>
                {hustleLabel}
              </Text>
            </View>
            <Text color={colors.ink400} style={styles.chevron}>
              ▾
            </Text>
          </Pressable>

          <Pressable
            ref={dateRef}
            style={[styles.filterChip, datePreset !== "all" && styles.filterChipActive]}
            onPress={() => openSheet("date")}
          >
            <Text
              weight="bold"
              numberOfLines={1}
              color={datePreset !== "all" ? colors.brandInk : colors.ink}
              style={styles.filterLeft}
            >
              {dateLabel}
            </Text>
            <Text color={colors.ink400} style={styles.chevron}>
              ▾
            </Text>
          </Pressable>
        </View>

        {groups.length === 0 ? (
          <Text variant="small" color={colors.ink400} style={styles.empty}>
            Nothing matches those filters.
          </Text>
        ) : (
          groups.map((g) => (
            <View key={g.label} style={styles.group}>
              <Text variant="label" color={colors.ink400}>
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

      {/* Anchored filter popover */}
      <Modal visible={sheet !== null} transparent animationType="fade" onRequestClose={closeSheet}>
        <Pressable style={styles.backdrop} onPress={closeSheet}>
          {anchor ? (
            <Pressable style={[styles.popover, { top: anchor.y, left: popLeft, width: popWidth }]} onPress={() => {}}>
            {sheet === "hustle" ? (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {renderOption("all", "All hustles", hustleFilter === "all", () => {
                  setHustleFilter("all");
                  closeSheet();
                })}
                {hustles.map((h) =>
                  renderOption(
                    h.id,
                    h.name,
                    hustleFilter === h.id,
                    () => {
                      setHustleFilter(h.id);
                      closeSheet();
                    },
                    h.color,
                  ),
                )}
              </ScrollView>
            ) : null}

            {sheet === "date" ? (
              <>
                {DATE_PRESETS.map((p) =>
                  renderOption(p.id, p.label, datePreset === p.id, () => {
                    if (p.id === "custom") {
                      setDatePreset("custom");
                    } else {
                      setDatePreset(p.id);
                      closeSheet();
                    }
                  }),
                )}
                {datePreset === "custom" ? (
                  <View style={styles.rangeCol}>
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
                    <Button label="Apply" fullWidth style={styles.applyBtn} onPress={closeSheet} />
                    {picker ? (
                      <DateTimePicker
                        value={picker === "from" ? from : to}
                        mode="date"
                        display={Platform.OS === "ios" ? "inline" : "default"}
                        maximumDate={new Date()}
                        onChange={onPick}
                      />
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : null}
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </Screen>
  );
}
