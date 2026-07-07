import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Button, Screen, Text, TextField } from "@/components";
import { useHustles } from "@/data/hustleStore";
import { useTransactions } from "@/data/store";
import { formatDate, groupForDate, parseISODate, toISODate } from "@/lib/date";
import { deleteReceipt } from "@/lib/receipt";
import { type Palette, radii, useTheme, useThemedStyles } from "@/theme";

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28, gap: 16 },
    topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 4 },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 11,
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    closeGlyph: { fontSize: 18 },
    photo: { width: "100%", height: 200, borderRadius: radii.md, backgroundColor: c.subtle },
    fieldLabel: { fontSize: 13, marginBottom: 8 },
    segment: { flexDirection: "row", gap: 4, padding: 4, borderRadius: radii.md, backgroundColor: c.subtle },
    segItem: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: "center" },
    segActive: { backgroundColor: c.surface },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chipActive: { backgroundColor: c.brand, borderColor: c.brand },
    hchip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingVertical: 9,
      paddingHorizontal: 13,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    hdot: { width: 10, height: 10, borderRadius: 5 },
    dateField: {
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: radii.md,
      paddingVertical: 15,
      paddingHorizontal: 14,
      backgroundColor: c.surface,
    },
    footer: { gap: 10, paddingTop: 4 },
    notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  });

export default function TransactionDetail() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const params = useLocalSearchParams<{ id: string }>();
  const id = String(params.id);
  const { transactions, update, remove } = useTransactions();
  const { hustles } = useHustles();
  const tx = transactions.find((t) => t.id === id);

  const [title, setTitle] = useState(tx?.title ?? "");
  const [amount, setAmount] = useState(tx ? String(Math.abs(tx.amount)) : "");
  const [type, setType] = useState<"expense" | "income">(tx && tx.amount >= 0 ? "income" : "expense");
  const [meta, setMeta] = useState(tx?.meta ?? "");
  const [hustleId, setHustleId] = useState(tx?.hustleId ?? "free");
  const [date, setDate] = useState<Date>(() => parseISODate(tx?.date));
  const [showPicker, setShowPicker] = useState(false);

  if (!tx) {
    return (
      <Screen>
        <View style={styles.notFound}>
          <Text variant="h2" center>
            Transaction not found
          </Text>
          <Button label="Go back" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const onPickDate = (e: DateTimePickerEvent, d?: Date) => {
    setShowPicker(false);
    if (e.type !== "dismissed" && d) setDate(d);
  };

  const onSave = () => {
    const num = parseFloat(amount.replace(",", ".")) || 0;
    const signed = type === "expense" ? -Math.abs(num) : Math.abs(num);
    const savedIso = toISODate(date);
    update(id, {
      title: title.trim() || tx.title,
      amount: signed,
      meta,
      hustleId,
      date: savedIso,
      group: groupForDate(savedIso),
    });
    router.back();
  };

  const onDelete = () =>
    Alert.alert("Delete transaction", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteReceipt(tx.imageUri);
          remove(id);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.closeGlyph}>‹</Text>
          </Pressable>
          <Text variant="h2">Edit transaction</Text>
        </View>

        {tx.imageUri ? (
          <Image source={{ uri: tx.imageUri }} style={styles.photo} contentFit="cover" />
        ) : null}

        {/* Type */}
        <View>
          <Text weight="bold" color={colors.ink} style={styles.fieldLabel}>
            Type
          </Text>
          <View style={styles.segment}>
            {(["expense", "income"] as const).map((t) => {
              const active = t === type;
              return (
                <Pressable key={t} style={[styles.segItem, active && styles.segActive]} onPress={() => setType(t)}>
                  <Text weight="bold" color={active ? (t === "income" ? colors.brand : colors.error) : colors.ink400}>
                    {t === "income" ? "↑ Income" : "↓ Expense"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextField label="Title" value={title} onChangeText={setTitle} autoCapitalize="words" />
        <TextField label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <TextField label="Details" value={meta} onChangeText={setMeta} />

        <View>
          <Text weight="bold" color={colors.ink} style={styles.fieldLabel}>
            Date
          </Text>
          <Pressable style={styles.dateField} onPress={() => setShowPicker(true)}>
            <Text weight="bold">{formatDate(date)}</Text>
          </Pressable>
          {showPicker ? (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              maximumDate={new Date()}
              onChange={onPickDate}
            />
          ) : null}
        </View>

        <View>
          <Text weight="bold" color={colors.ink} style={styles.fieldLabel}>
            Hustle
          </Text>
          <View style={styles.chips}>
            {hustles.map((h) => {
              const active = h.id === hustleId;
              return (
                <Pressable
                  key={h.id}
                  onPress={() => setHustleId(h.id)}
                  style={[styles.hchip, active && styles.chipActive]}
                >
                  <View style={[styles.hdot, { backgroundColor: h.color }]} />
                  <Text weight="bold" color={active ? colors.onBrand : colors.ink600}>
                    {h.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <Button label="Save changes" fullWidth onPress={onSave} />
          <Button label="Delete" variant="destructive" fullWidth onPress={onDelete} />
        </View>
      </ScrollView>
    </Screen>
  );
}
