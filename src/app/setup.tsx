import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Button, Screen, Text, TextField } from "@/components";
import { useHustles } from "@/data/hustleStore";
import { type Palette, radii, useTheme, useThemedStyles } from "@/theme";

type Hustle = { id: string; name: string; color: string };

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    wrap: { flex: 1, width: "100%", maxWidth: 480, alignSelf: "center" },
    header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
    title: { marginTop: 8 },
    sub: { marginTop: 8 },
    addRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 20, paddingBottom: 12 },
    addBtn: { height: 54 },
    list: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
    empty: { textAlign: "center", marginTop: 24 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: radii.lg,
      padding: 14,
    },
    avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    remove: { fontSize: 18 },
    footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1, borderTopColor: c.divider },
  });

export default function HustlesStep() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { setHustles: saveHustles } = useHustles();
  const palette = [colors.brand, colors.purple, colors.info, colors.warning, colors.error, "#0EA5A5"];

  const [draft, setDraft] = useState("");
  const [hustles, setHustles] = useState<Hustle[]>([]);

  const onContinue = async () => {
    if (hustles.length) saveHustles(hustles);
    await AsyncStorage.setItem("byebills:onboarded", "1");
    router.replace("/dashboard");
  };

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    setHustles((prev) => [...prev, { id: String(Date.now()), name, color: palette[prev.length % palette.length] }]);
    setDraft("");
  };

  const remove = (id: string) => setHustles((prev) => prev.filter((h) => h.id !== id));
  const count = hustles.length;

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.wrap}>
        <View style={styles.header}>
          <Text variant="label" color={colors.brand}>
            STEP 2 OF 2
          </Text>
          <Text variant="h1" style={styles.title}>
            Add your hustles
          </Text>
          <Text variant="body" color={colors.ink600} style={styles.sub}>
            Give each one a name. Billie keeps their income, expenses and totals separate. You can
            add more anytime.
          </Text>
        </View>

        <View style={styles.addRow}>
          <TextField
            containerStyle={styles.flex}
            placeholder="e.g. Freelance design"
            value={draft}
            onChangeText={setDraft}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={add}
          />
          <Button label="Add" size="sm" onPress={add} disabled={!draft.trim()} style={styles.addBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {count === 0 ? (
            <Text variant="small" color={colors.ink400} style={styles.empty}>
              No hustles yet — add your first above.
            </Text>
          ) : (
            hustles.map((h) => (
              <View key={h.id} style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: h.color }]}>
                  <Text weight="extra" color={colors.white}>
                    {h.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text variant="title" style={styles.flex}>
                  {h.name}
                </Text>
                <Pressable onPress={() => remove(h.id)} hitSlop={10}>
                  <Text color={colors.ink400} style={styles.remove}>
                    ✕
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={count ? `Continue with ${count}` : "Skip for now"}
            variant={count ? "primary" : "secondary"}
            fullWidth
            onPress={onContinue}
          />
        </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
