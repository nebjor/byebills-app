import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components";
import { useBilling } from "@/data/billingStore";
import { extractReceipt, QuotaError } from "@/lib/extract";

const BG = "#07090F";
const GREEN = "#2FD27E";
const billie = require("../../../assets/images/cute_billie_transparent_cropped.png");

export default function Processing() {
  const params = useLocalSearchParams<{ uri?: string }>();
  const uri = typeof params.uri === "string" ? params.uri : undefined;
  const { recordScan } = useBilling();

  const float = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 950, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();

    let cancelled = false;
    (async () => {
      if (!uri) {
        router.replace({ pathname: "/capture/review", params: {} });
        return;
      }
      try {
        const e = await extractReceipt(uri);
        if (cancelled) return;
        recordScan(); // count this AI scan against the monthly free allowance
        router.replace({
          pathname: "/capture/review",
          params: {
            uri,
            type: e.type,
            amount: e.amount ? String(e.amount) : "",
            merchant: e.counterparty ?? "",
            category: e.description ?? "",
            date: e.documentDate ?? "",
            currency: e.currency ?? "",
            confidence: String(e.confidence),
          },
        });
      } catch (err) {
        if (cancelled) return;
        // Over the monthly quota (backend 402) -> show the paywall instead of an error.
        if (err instanceof QuotaError) {
          router.replace("/paywall");
          return;
        }
        const msg = err instanceof Error ? err.message : "Extraction failed";
        router.replace({ pathname: "/capture/review", params: { uri, error: msg } });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [8, -16] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.3] });
  const glowOuter = glow.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.4] });
  const glowInner = glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <View style={styles.stage}>
            <Animated.View style={[styles.glowOuter, { opacity: glowOuter, transform: [{ scale: glowScale }] }]} />
            <Animated.View style={[styles.glowInner, { opacity: glowInner, transform: [{ scale: glowScale }] }]} />
            <Animated.View style={{ transform: [{ translateY }] }}>
              <Image source={billie} style={styles.billie} contentFit="contain" />
            </Animated.View>
          </View>

          <Text weight="bold" color="#FFFFFF" style={styles.title}>
            Reading your receipt
          </Text>
          <Text weight="medium" color="rgba(255,255,255,0.7)" style={styles.sub}>
            Extracting amount, date & category
          </Text>

          <View style={styles.statusPill}>
            <View style={styles.dot} />
            <Text weight="medium" color={GREEN} style={styles.statusText}>
              Billie is working…
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 18, paddingHorizontal: 32 },
  stage: { width: 240, height: 240, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  glowOuter: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: GREEN },
  glowInner: { position: "absolute", width: 150, height: 150, borderRadius: 75, backgroundColor: GREEN },
  billie: { width: 150, height: 150 },
  title: { fontSize: 18, textAlign: "center", marginTop: 4 },
  sub: { fontSize: 13, textAlign: "center" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(47,210,126,0.14)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    marginTop: 8,
  },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: GREEN },
  statusText: { fontSize: 13 },
});
