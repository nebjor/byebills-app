import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Button, Screen, Text, TextField } from "@/components";
import { useHustles } from "@/data/hustleStore";
import { type Hustle } from "@/data/mock";
import { type Palette, radii, useTheme, useThemedStyles } from "@/theme";

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28, gap: 16 },
    topBar: { flexDirection: "row", alignItems: "center", gap: 12 },
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
    row: { flexDirection: "row", alignItems: "center", gap: 10 },
    dot: { width: 40, height: 40, borderRadius: 20 },
    remove: { fontSize: 18, paddingHorizontal: 4 },
    addRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    addBtn: { height: 54 },
    footer: { paddingTop: 4 },
  });

export default function ManageHustles() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { hustles, setHustles } = useHustles();

  const palette = [colors.brand, colors.purple, colors.info, colors.warning, colors.error, "#0EA5A5"];
  const [items, setItems] = useState<Hustle[]>(hustles);
  const [draft, setDraft] = useState("");

  const rename = (id: string, name: string) =>
    setItems((p) => p.map((h) => (h.id === id ? { ...h, name } : h)));

  const recolor = (id: string) =>
    setItems((p) =>
      p.map((h) => {
        if (h.id !== id) return h;
        const i = palette.indexOf(h.color);
        return { ...h, color: palette[(i + 1) % palette.length] };
      }),
    );

  const removeH = (id: string) => setItems((p) => p.filter((h) => h.id !== id));

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    setItems((p) => [
      ...p,
      {
        id: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
        name,
        color: palette[p.length % palette.length],
      },
    ]);
    setDraft("");
  };

  const save = () => {
    setHustles(items.map((h) => ({ ...h, name: h.name.trim() })).filter((h) => h.name));
    router.back();
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.closeGlyph}>‹</Text>
            </Pressable>
            <Text variant="h2">Your hustles</Text>
          </View>

          <Text variant="small" color={colors.ink600}>
            Tap a colour to change it. Hustles let Billie keep each one&apos;s income and expenses
            separate.
          </Text>

          {items.map((h) => (
            <View key={h.id} style={styles.row}>
              <Pressable onPress={() => recolor(h.id)} style={[styles.dot, { backgroundColor: h.color }]} />
              <TextField
                containerStyle={styles.flex}
                value={h.name}
                onChangeText={(t) => rename(h.id, t)}
                autoCapitalize="words"
              />
              <Pressable onPress={() => removeH(h.id)} hitSlop={8}>
                <Text color={colors.ink400} style={styles.remove}>
                  ✕
                </Text>
              </Pressable>
            </View>
          ))}

          <View style={styles.addRow}>
            <TextField
              containerStyle={styles.flex}
              placeholder="Add a hustle"
              value={draft}
              onChangeText={setDraft}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={add}
            />
            <Button label="Add" size="sm" onPress={add} disabled={!draft.trim()} style={styles.addBtn} />
          </View>

          <View style={styles.footer}>
            <Button label="Save" fullWidth onPress={save} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
