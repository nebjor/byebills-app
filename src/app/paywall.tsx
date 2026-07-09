import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Button, Screen, Text } from "@/components";
import { useBilling, type Plan } from "@/data/billingStore";
import { useUser } from "@/data/userStore";
import { track } from "@/lib/analytics";
import { radii, useTheme, useThemedStyles, type Palette } from "@/theme";

const billie = require("../../assets/images/cute_billie_transparent_cropped.png");

const BENEFITS = [
  "Unlimited AI receipt scans",
  "All your side-hustles in one place",
  "CSV & ZIP export for your accountant",
  "Priority updates & new features",
];

const PRICE = {
  monthly: { amount: "CHF 8", per: "per month", note: null as string | null },
  annual: { amount: "CHF 80", per: "per year", note: "≈ CHF 6.65/mo · save 2 months" },
};

export default function Paywall() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { activatePro, restore, isPro, isTrialActive, trialDaysLeft } = useBilling();
  const { user } = useUser();
  const { reason } = useLocalSearchParams<{ reason?: string }>();

  const dailyCap = reason === "daily_cap";
  const businessCap = dailyCap && isPro; // Pro hit the 200/day ceiling
  const trialCap = dailyCap && !isPro; // trial hit the 30/day cap

  const [selected, setSelected] = useState<Plan>("annual");
  const [busy, setBusy] = useState(false);

  const onStart = async () => {
    setBusy(true);
    track("paywall_start_pro", { plan: selected });
    try {
      await activatePro(selected); // RevenueCat purchase point; refreshes from server
    } finally {
      setBusy(false);
      router.back();
    }
  };

  const onRestore = () => {
    restore();
    track("paywall_restore");
  };

  // Pro hit the daily ceiling -> ask about a business plan (prefilled email).
  const onBusinessContact = () => {
    track("paywall_business_contact");
    const subject = encodeURIComponent("byeBills — Business plan enquiry");
    const body = encodeURIComponent(
      `hey there,\nwe hit the rate limit of 200/day, we would like to know about a business plan.\n\nkind regards,\n${user.name}`,
    );
    Linking.openURL(`mailto:jneber@proton.me?subject=${subject}&body=${body}`).catch(() => {});
  };

  const title = dailyCap ? `Daily limit${"\n"}reached` : `Unlimited scans${"\n"}with Pro`;
  const subtitle = businessCap
    ? "You've hit the Pro limit of 200 scans today. Contact us about a business plan for higher limits."
    : trialCap
      ? "You've hit today's limit of 30 scans on your free trial. Upgrade to Pro to scan more."
      : isPro
        ? "You're on Pro — scan as much as you like."
        : isTrialActive
          ? `${trialDaysLeft} ${trialDaysLeft === 1 ? "day" : "days"} left in your free trial. Subscribe now to keep Billie doing the books.`
          : "Your free trial has ended. Subscribe to keep scanning receipts with Billie.";

  return (
    <Screen>
      <View style={styles.topBar}>
        <View style={styles.badge}>
          <Text weight="bold" color={colors.purpleInk} style={styles.badgeText}>
            byeBills Pro
          </Text>
        </View>
        <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.closeGlyph}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={billie} style={styles.billie} contentFit="contain" />

        <Text variant="h1" style={styles.title}>
          {title}
        </Text>
        <Text variant="body" color={colors.ink600} style={styles.subtitle}>
          {subtitle}
        </Text>

        {businessCap ? (
          // Pro user over the daily ceiling — business-plan contact only.
          <Button label="Contact us" fullWidth onPress={onBusinessContact} />
        ) : (
          <>
            <View style={styles.benefits}>
              {BENEFITS.map((b) => (
                <View key={b} style={styles.benefitRow}>
                  <View style={styles.check}>
                    <Text weight="bold" color={colors.onBrand} style={styles.checkGlyph}>
                      ✓
                    </Text>
                  </View>
                  <Text variant="bodyStrong" color={colors.ink} style={styles.benefitText}>
                    {b}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.plans}>
              {(["annual", "monthly"] as const).map((p) => {
                const active = p === selected;
                const price = PRICE[p];
                return (
                  <Pressable
                    key={p}
                    onPress={() => setSelected(p)}
                    style={[styles.planCard, active && styles.planCardActive]}
                  >
                    <View style={styles.radio}>{active ? <View style={styles.radioDot} /> : null}</View>
                    <View style={styles.planBody}>
                      <View style={styles.planTop}>
                        <Text weight="bold" color={colors.ink} style={styles.planName}>
                          {p === "annual" ? "Yearly" : "Monthly"}
                        </Text>
                        {p === "annual" ? (
                          <View style={styles.savePill}>
                            <Text weight="bold" color={colors.brandInk} style={styles.savePillText}>
                              BEST VALUE
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text color={colors.ink600} style={styles.planPrice}>
                        <Text weight="extra" color={colors.ink} style={styles.planAmount}>
                          {price.amount}
                        </Text>{" "}
                        {price.per}
                      </Text>
                      {price.note ? (
                        <Text variant="small" color={colors.brandInk} style={styles.planNote}>
                          {price.note}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Button
              label={busy ? "Starting…" : isPro ? "You're on Pro" : "Start Pro"}
              fullWidth
              onPress={onStart}
              disabled={busy || isPro}
            />

            <Pressable onPress={onRestore} hitSlop={8} style={styles.restore}>
              <Text weight="bold" color={colors.ink600}>
                Restore purchases
              </Text>
            </Pressable>

            <Text variant="small" color={colors.ink400} style={styles.fine}>
              Subscriptions renew automatically until cancelled. Cancel anytime in your App Store
              settings. By continuing you agree to our{" "}
              <Text
                variant="small"
                color={colors.brand}
                onPress={() => Linking.openURL("https://byebills.app/terms")}
              >
                Terms
              </Text>{" "}
              and{" "}
              <Text
                variant="small"
                color={colors.brand}
                onPress={() => Linking.openURL("https://byebills.app/privacy")}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 4,
    },
    badge: {
      backgroundColor: c.purpleTint,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: radii.pill,
    },
    badgeText: { fontSize: 13, letterSpacing: 0.3 },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    closeGlyph: { fontSize: 16 },
    content: { paddingHorizontal: 20, paddingBottom: 32, gap: 14, alignItems: "stretch" },
    billie: { width: 96, height: 96, alignSelf: "center", marginTop: 4 },
    title: { textAlign: "center", lineHeight: 34 },
    subtitle: { textAlign: "center", paddingHorizontal: 4 },
    benefits: { gap: 12, marginTop: 6, paddingHorizontal: 4 },
    benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    check: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    checkGlyph: { fontSize: 13 },
    benefitText: { flex: 1 },
    plans: { gap: 12, marginTop: 8 },
    planCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      borderWidth: 2,
      borderColor: c.border,
      borderRadius: radii.lg,
      padding: 16,
      backgroundColor: c.surface,
    },
    planCardActive: { borderColor: c.brand, backgroundColor: c.selectedTint },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: c.controlBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.brand },
    planBody: { flex: 1, gap: 3 },
    planTop: { flexDirection: "row", alignItems: "center", gap: 8 },
    planName: { fontSize: 17 },
    savePill: {
      backgroundColor: c.brandTint,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: radii.pill,
    },
    savePillText: { fontSize: 10, letterSpacing: 0.5 },
    planPrice: { fontSize: 14 },
    planAmount: { fontSize: 20 },
    planNote: { marginTop: 1 },
    restore: { alignSelf: "center", paddingVertical: 6, marginTop: 2 },
    fine: { textAlign: "center", lineHeight: 18, marginTop: 2 },
  });
