import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Button, Screen, Text, TextField } from "@/components";
import { useHustles } from "@/data/hustleStore";
import { useTransactions } from "@/data/store";
import { formatDate, groupForDate, parseISODate, toISODate } from "@/lib/date";
import { scheduleDailyScanReminder } from "@/lib/notifications";
import { persistReceipt } from "@/lib/receipt";
import { type Palette, radii, useTheme, useThemedStyles } from "@/theme";

const ASKED_KEY = "byebills:askedDailyScan";

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 16 },
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
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      backgroundColor: c.brandTint,
      borderRadius: radii.md,
      padding: 14,
    },
    bannerError: { backgroundColor: c.errorTint },
    photo: { width: "100%", height: 190, borderRadius: radii.md, backgroundColor: c.subtle },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
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
    chipActive: { borderColor: c.brand, backgroundColor: c.selectedTint },
    chipDot: { width: 10, height: 10, borderRadius: 5 },
    fieldLabel: { fontSize: 13, marginBottom: 8 },
    segment: { flexDirection: "row", gap: 4, padding: 4, borderRadius: radii.md, backgroundColor: c.subtle },
    segItem: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: "center" },
    segActive: { backgroundColor: c.surface },
    dateField: {
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: radii.md,
      paddingVertical: 15,
      paddingHorizontal: 14,
      backgroundColor: c.surface,
    },
    footer: { gap: 10, paddingTop: 4 },
    viewerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", alignItems: "center", justifyContent: "center" },
    viewerImage: { width: "100%", height: "85%" },
    viewerClose: {
      position: "absolute",
      top: 48,
      right: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    viewerCloseGlyph: { fontSize: 18 },
  });

export default function Review() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { add } = useTransactions();
  const { hustles } = useHustles();
  const params = useLocalSearchParams<{
    uri?: string;
    manual?: string;
    type?: string;
    amount?: string;
    merchant?: string;
    category?: string;
    date?: string;
    currency?: string;
    confidence?: string;
    error?: string;
  }>();
  const uri = typeof params.uri === "string" ? params.uri : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;
  const scanned = !!uri && !error;

  const str = (v: unknown) => (typeof v === "string" ? v : "");

  // Pre-fill from AI extraction params; manual / failed scans start blank.
  const [type, setType] = useState<"expense" | "income">(params.type === "income" ? "income" : "expense");
  const [hustleId, setHustleId] = useState(hustles[0]?.id ?? "free");
  const [amount, setAmount] = useState(str(params.amount));
  const [merchant, setMerchant] = useState(str(params.merchant));
  const [date, setDate] = useState<Date>(() =>
    parseISODate(typeof params.date === "string" ? params.date : undefined),
  );
  const [showPicker, setShowPicker] = useState(false);
  const [category, setCategory] = useState(str(params.category));
  const [note, setNote] = useState("");
  const [photoOpen, setPhotoOpen] = useState(false);

  const onPickDate = (e: DateTimePickerEvent, d?: Date) => {
    setShowPicker(false);
    if (e.type !== "dismissed" && d) setDate(d);
  };

  const finish = (again: boolean) => router.replace(again ? "/capture/scan" : "/dashboard");

  const onSave = async (again: boolean) => {
    const num = parseFloat(amount.replace(",", ".")) || 0;
    const savedIso = toISODate(date);
    const id = String(Date.now());
    let storedUri = uri;
    if (uri) {
      try {
        storedUri = await persistReceipt(uri, id);
      } catch {
        // keep the original uri if persisting fails
      }
    }
    add({
      id,
      title: merchant.trim() || "Receipt",
      meta: category.trim() || "Expense",
      amount: type === "expense" ? -Math.abs(num) : Math.abs(num),
      status: "pending",
      hustleId: hustleId || "free",
      group: groupForDate(savedIso),
      date: savedIso,
      imageUri: storedUri,
    });

    try {
      const asked = await AsyncStorage.getItem(ASKED_KEY);
      if (!asked) {
        await AsyncStorage.setItem(ASKED_KEY, "1");
        Alert.alert("One more thing", "Should we ask you daily to scan your receipts?", [
          { text: "No thanks", style: "cancel", onPress: () => finish(again) },
          {
            text: "Yes, remind me",
            onPress: async () => {
              await scheduleDailyScanReminder();
              finish(again);
            },
          },
        ]);
        return;
      }
    } catch {
      // ignore storage errors
    }
    finish(again);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Pressable style={styles.closeBtn} onPress={finish} hitSlop={8}>
            <Text style={styles.closeGlyph}>✕</Text>
          </Pressable>
          <Text variant="h2">{uri ? "Review details" : "New transaction"}</Text>
        </View>

        <View style={[styles.banner, error ? styles.bannerError : null]}>
          <Text style={{ fontSize: 18 }}>{error ? "⚠️" : scanned ? "✨" : "✏️"}</Text>
          <Text variant="small" color={colors.ink} style={{ flex: 1 }}>
            {error
              ? "Couldn't read the receipt automatically — add the details below."
              : scanned
                ? "Details read from your receipt — check and edit before saving."
                : "Enter the details below and save."}
          </Text>
        </View>

        {uri ? (
          <Pressable onPress={() => setPhotoOpen(true)}>
            <Image source={{ uri }} style={styles.photo} contentFit="cover" />
          </Pressable>
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
                  <Text
                    weight="bold"
                    color={active ? (t === "income" ? colors.brand : colors.error) : colors.ink400}
                  >
                    {t === "income" ? "↑ Income" : "↓ Expense"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <View style={[styles.chipDot, { backgroundColor: h.color }]} />
                  <Text weight="bold" color={active ? colors.ink : colors.ink600}>
                    {h.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextField label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <TextField label="Merchant" value={merchant} onChangeText={setMerchant} />

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

        <TextField label="Category" value={category} onChangeText={setCategory} />
        <TextField label="Note" placeholder="Add a note (optional)" value={note} onChangeText={setNote} />

        <View style={styles.footer}>
          <Button label="Save transaction" fullWidth onPress={() => onSave(false)} />
          <Button label="Save & scan another" variant="secondary" fullWidth onPress={() => onSave(true)} />
          {uri ? (
            <Button label="Retake photo" variant="tertiary" fullWidth onPress={() => router.replace("/capture/scan")} />
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={photoOpen} transparent animationType="fade" onRequestClose={() => setPhotoOpen(false)}>
        <Pressable style={styles.viewerBackdrop} onPress={() => setPhotoOpen(false)}>
          {uri ? <Image source={{ uri }} style={styles.viewerImage} contentFit="contain" /> : null}
          <Pressable style={styles.viewerClose} onPress={() => setPhotoOpen(false)} hitSlop={10}>
            <Text color="#FFFFFF" style={styles.viewerCloseGlyph}>
              ✕
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
