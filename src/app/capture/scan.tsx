import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components";
import { captureReceipt } from "@/lib/receipt";

const BG = "#07090F";
const GREY = "#5C677A";
const PAPER = "#EAEDF2";
const LINE = "#B4BBC7";
const HEAD = "#2A3343";

export default function Scan() {
  const [flashOn, setFlashOn] = useState(false);

  const go = async (fromLibrary: boolean) => {
    const uri = await captureReceipt(fromLibrary);
    if (uri) router.push({ pathname: "/capture/processing", params: { uri } });
  };

  const goManual = () => router.push({ pathname: "/capture/review", params: { manual: "1" } });

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
            <Text color="#FFFFFF" style={styles.iconGlyph}>
              ✕
            </Text>
          </Pressable>
          <Text weight="bold" color="#FFFFFF" style={styles.title}>
            Scan receipt
          </Text>
          <Pressable style={styles.iconBtn} onPress={() => setFlashOn((f) => !f)} hitSlop={8}>
            <Text color={flashOn ? "#FFD54A" : "rgba(255,255,255,0.5)"} style={styles.iconGlyph}>
              ⚡
            </Text>
          </Pressable>
        </View>

        {/* Viewfinder */}
        <View style={styles.center}>
          <View style={styles.frame}>
            <View style={styles.receipt}>
              <View style={[styles.line, { width: "70%", height: 12, backgroundColor: HEAD }]} />
              <View style={[styles.line, { width: "45%" }]} />
              <View style={[styles.line, { width: "85%" }]} />
              <View style={[styles.line, { width: "60%" }]} />
              <View style={[styles.line, { width: "78%" }]} />
              <View style={[styles.totalBox]} />
            </View>
          </View>
          <View style={styles.hint}>
            <View style={styles.hintDot} />
            <Text weight="medium" color="#FFFFFF" style={styles.hintText}>
              Hold steady to capture
            </Text>
          </View>
        </View>

        {/* Controls: library · shutter · manual */}
        <View style={styles.controls}>
          <Pressable
            style={styles.sideBtn}
            accessibilityRole="button"
            accessibilityLabel="Choose from library"
            onPress={() => go(true)}
            hitSlop={8}
          >
            <Ionicons name="images-outline" size={29} color="#FFFFFF" />
            <Text color="rgba(255,255,255,0.85)" weight="medium" style={styles.sideLabel}>
              Library
            </Text>
          </Pressable>

          <Pressable
            style={styles.shutter}
            accessibilityRole="button"
            accessibilityLabel="Capture"
            onPress={() => go(false)}
          >
            <View style={styles.shutterCore} />
          </Pressable>

          <Pressable
            style={styles.sideBtn}
            accessibilityRole="button"
            accessibilityLabel="Enter manually"
            onPress={goManual}
            hitSlop={8}
          >
            <Text color="#FFFFFF" weight="bold" style={styles.manualText}>
              Manual
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlyph: { fontSize: 18 },
  title: { fontSize: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 24 },
  frame: {
    width: 264,
    height: 344,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: GREY,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14,20,31,0.6)",
  },
  receipt: {
    width: 172,
    height: 256,
    borderRadius: 10,
    backgroundColor: PAPER,
    padding: 18,
    gap: 10,
  },
  line: { height: 7, borderRadius: 4, backgroundColor: LINE },
  totalBox: {
    marginTop: 8,
    width: 64,
    height: 18,
    borderRadius: 5,
    backgroundColor: HEAD,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 22,
  },
  hintDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: GREY },
  hintText: { fontSize: 13 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 44,
    paddingBottom: 28,
    paddingTop: 8,
  },
  sideBtn: { width: 64, alignItems: "center", justifyContent: "center", gap: 5 },
  sideLabel: { fontSize: 12 },
  manualText: { fontSize: 15 },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: GREY,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterCore: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.9)" },
});
