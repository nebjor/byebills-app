import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";

import { Button, Screen, Text, TextField } from "@/components";
import { useUser } from "@/data/userStore";
import { type Palette, radii, useTheme, useThemedStyles } from "@/theme";

const CURRENCIES = ["CHF", "EUR", "USD", "GBP"];

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    wrap: { flex: 1, width: "100%", maxWidth: 480, alignSelf: "center" },
    header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
    title: { marginTop: 8 },
    sub: { marginTop: 8 },
    body: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 24 },
    fieldLabel: { fontSize: 13, marginBottom: 8 },
    currencyRow: { flexDirection: "row", gap: 10 },
    pill: {
      paddingVertical: 11,
      paddingHorizontal: 18,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    pillActive: { backgroundColor: c.brand, borderColor: c.brand },
    footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  });

export default function NameStep() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user, update } = useUser();
  const [name, setName] = useState(user.name);
  const [currency, setCurrency] = useState(user.currency || "CHF");

  const onContinue = () => {
    update({ name: name.trim(), currency });
    router.push("/setup");
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.wrap}>
        <View style={styles.header}>
          <Text variant="label" color={colors.brand}>
            STEP 1 OF 2
          </Text>
          <Text variant="h1" style={styles.title}>
            First, the basics
          </Text>
          <Text variant="body" color={colors.ink600} style={styles.sub}>
            So Billie can greet you and format your money the right way.
          </Text>
        </View>

        <View style={styles.body}>
          <TextField
            label="Your name"
            placeholder="e.g. Joris"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoFocus
            returnKeyType="done"
          />

          <View>
            <Text weight="bold" color={colors.ink} style={styles.fieldLabel}>
              Currency
            </Text>
            <View style={styles.currencyRow}>
              {CURRENCIES.map((cur) => {
                const active = cur === currency;
                return (
                  <Pressable key={cur} onPress={() => setCurrency(cur)} style={[styles.pill, active && styles.pillActive]}>
                    <Text weight="bold" color={active ? colors.onBrand : colors.ink600}>
                      {cur}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Button label="Continue" fullWidth disabled={name.trim().length === 0} onPress={onContinue} />
        </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
