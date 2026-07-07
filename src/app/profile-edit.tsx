import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Button, Screen, Text, TextField } from "@/components";
import { useUser } from "@/data/userStore";
import { type Palette, radii, useTheme, useThemedStyles } from "@/theme";

const CURRENCIES = ["CHF", "EUR", "USD", "GBP"];

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    wrap: { width: "100%", maxWidth: 480, alignSelf: "center" },
    content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28, gap: 18 },
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
    footer: { paddingTop: 4 },
  });

export default function ProfileEdit() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user, update } = useUser();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currency, setCurrency] = useState(user.currency);

  const onSave = () => {
    update({ name: name.trim() || user.name, email: email.trim(), currency });
    router.back();
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.wrap}>
            <View style={styles.topBar}>
              <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={8}>
                <Text style={styles.closeGlyph}>‹</Text>
              </Pressable>
              <Text variant="h2">Edit details</Text>
            </View>

            <TextField label="Your name" value={name} onChangeText={setName} autoCapitalize="words" />
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
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

            <View style={styles.footer}>
              <Button label="Save changes" fullWidth onPress={onSave} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
