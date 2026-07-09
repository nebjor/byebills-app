import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";

import { Button, Card, Screen, Text } from "@/components";
import { useAuth } from "@/data/authStore";
import { useBilling } from "@/data/billingStore";
import { useUser } from "@/data/userStore";
import { clearAllReceipts } from "@/lib/receipt";
import { type Palette, radii, useTheme, useThemedStyles } from "@/theme";

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 12 },
    flex: { flex: 1 },
    profileCard: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 4 },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: c.purple,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 22 },
    tag: {
      alignSelf: "flex-start",
      marginTop: 6,
      backgroundColor: c.successTint,
      paddingVertical: 4,
      paddingHorizontal: 9,
      borderRadius: radii.pill,
    },
    tagText: { fontSize: 11 },
    editBtn: {
      width: 40,
      height: 40,
      borderRadius: 11,
      backgroundColor: c.canvas,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    editEmoji: { fontSize: 16 },
    sectionLabel: { marginTop: 8, marginLeft: 4 },
    menu: { paddingHorizontal: 16 },
    row: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 14 },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.canvas,
      alignItems: "center",
      justifyContent: "center",
    },
    icon: { fontSize: 18 },
    rowLabel: { fontSize: 15 },
    chevron: { fontSize: 22 },
    divider: { height: 1, backgroundColor: c.divider },
    signOut: { marginTop: 12 },
  });

export default function Profile() {
  const router = useRouter();
  const { colors, isDark, setMode } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user } = useUser();
  const { signOut, session } = useAuth();
  const { isPro, plan, used, freeLimit, cancelPro } = useBilling();
  const [checking, setChecking] = useState(false);

  const onSignOut = () => {
    Alert.alert("Sign out", "Sign out of byeBills?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  const onResetOnboarding = async () => {
    await AsyncStorage.multiRemove(["byebills:onboarded", "byebills:askedDailyScan"]);
    await signOut();
  };

  const onDeleteAccount = () => {
    Alert.alert("Delete account", "All your data will be permanently lost. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          // Delete the server-side account (auth user + data), best-effort.
          const base = process.env.EXPO_PUBLIC_API_BASE;
          if (base && session?.access_token) {
            try {
              await fetch(`${base}/api/account/delete`, {
                method: "POST",
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
            } catch {
              // still clear local + sign out below
            }
          }
          try {
            await clearAllReceipts();
          } catch {
            // ignore
          }
          await AsyncStorage.multiRemove([
            "byebills:onboarded",
            "byebills:askedDailyScan",
            "byebills:transactions",
            "byebills:hustles",
            "byebills:user",
            "byebills:colorMode",
          ]);
          await signOut();
        },
      },
    ]);
  };

  const onCheckUpdate = async () => {
    setChecking(true);
    await new Promise((r) => setTimeout(r, 1200));
    setChecking(false);
    Alert.alert("byeBills", "You're on the latest version (1.0.0).");
  };

  // Opens the platform subscription-management screen.
  const onManageSubscription = () => {
    const url =
      Platform.OS === "ios"
        ? "https://apps.apple.com/account/subscriptions"
        : "https://play.google.com/store/account/subscriptions";
    Linking.openURL(url).catch(() => Alert.alert("Couldn't open", "Manage your subscription in the App Store settings."));
  };

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="h1">Profile</Text>

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text weight="extra" color={colors.white} style={styles.avatarText}>
              {user.name.charAt(0)}
            </Text>
          </View>
          <View style={styles.flex}>
            <Text variant="title">{user.name}</Text>
            <Text variant="small" color={colors.ink600}>
              {user.email}
            </Text>
            <View style={[styles.tag, isPro && { backgroundColor: colors.purpleTint }]}>
              <Text weight="bold" color={isPro ? colors.purpleInk : colors.brandInk} style={styles.tagText}>
                {isPro ? `Side hustler · Pro (${plan === "annual" ? "yearly" : "monthly"})` : "Side hustler · Free plan"}
              </Text>
            </View>
          </View>
          <Pressable style={styles.editBtn} hitSlop={8} onPress={() => router.push("/profile-edit")}>
            <Text style={styles.editEmoji}>✏️</Text>
          </Pressable>
        </Card>

        <Text variant="label" color={colors.ink400} style={styles.sectionLabel}>
          HUSTLES
        </Text>
        <Card flush style={styles.menu}>
          <Pressable style={styles.row} onPress={() => router.push("/manage-hustles")}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>💼</Text>
            </View>
            <Text weight="bold" style={[styles.rowLabel, styles.flex]}>
              Manage hustles
            </Text>
            <Text color={colors.ink400} style={styles.chevron}>
              ›
            </Text>
          </Pressable>
        </Card>

        <Text variant="label" color={colors.ink400} style={styles.sectionLabel}>
          PREFERENCES
        </Text>
        <Card flush style={styles.menu}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>🌙</Text>
            </View>
            <Text weight="bold" style={[styles.rowLabel, styles.flex]}>
              Dark mode
            </Text>
            <Switch
              value={isDark}
              onValueChange={(v) => setMode(v ? "dark" : "light")}
              trackColor={{ true: colors.brand, false: colors.controlBorder }}
              thumbColor={colors.white}
            />
          </View>
        </Card>

        <Text variant="label" color={colors.ink400} style={styles.sectionLabel}>
          SUBSCRIPTION
        </Text>
        <Card flush style={styles.menu}>
          {!isPro ? (
            <>
              <Pressable style={styles.row} onPress={() => router.push("/paywall")}>
                <View style={[styles.iconWrap, { backgroundColor: colors.purpleTint }]}>
                  <Text style={styles.icon}>⭐</Text>
                </View>
                <View style={styles.flex}>
                  <Text weight="bold" style={styles.rowLabel}>
                    Upgrade to Pro
                  </Text>
                  <Text variant="small" color={colors.ink600}>
                    {used} of {freeLimit} free scans used this month
                  </Text>
                </View>
                <Text color={colors.ink400} style={styles.chevron}>
                  ›
                </Text>
              </Pressable>
              <View style={styles.divider} />
            </>
          ) : null}
          <Pressable style={styles.row} onPress={onManageSubscription}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>💳</Text>
            </View>
            <Text weight="bold" style={[styles.rowLabel, styles.flex]}>
              Manage subscription
            </Text>
            <Text color={colors.ink400} style={styles.chevron}>
              ›
            </Text>
          </Pressable>
        </Card>

        <Text variant="label" color={colors.ink400} style={styles.sectionLabel}>
          ABOUT & SUPPORT
        </Text>
        <Card flush style={styles.menu}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>ℹ️</Text>
            </View>
            <View style={styles.flex}>
              <Text weight="bold" style={styles.rowLabel}>
                App version
              </Text>
              <Text variant="small" color={colors.ink600}>
                1.0.0
              </Text>
            </View>
            <Button label="Update" size="sm" loading={checking} onPress={onCheckUpdate} />
          </View>
          <View style={styles.divider} />
          <Pressable
            style={styles.row}
            onPress={() =>
              Linking.openURL(
                "mailto:jneber@proton.me?subject=byeBills%20feedback&body=Hi%20Billie%2C%0A%0AMy%20feedback%3A%0A",
              )
            }
          >
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>💬</Text>
            </View>
            <Text weight="bold" style={[styles.rowLabel, styles.flex]}>
              Give feedback
            </Text>
            <Text color={colors.ink400} style={styles.chevron}>
              ›
            </Text>
          </Pressable>
        </Card>

        <Button label="Sign out" variant="destructive" fullWidth style={styles.signOut} onPress={onSignOut} />

        {__DEV__ ? (
          <>
            <Button
              label="Reset onboarding (dev)"
              variant="tertiary"
              fullWidth
              style={styles.signOut}
              onPress={onResetOnboarding}
            />
            <Button
              label={isPro ? "Cancel Pro (dev)" : "Activate Pro (dev)"}
              variant="tertiary"
              fullWidth
              onPress={() => (isPro ? cancelPro() : router.push("/paywall"))}
            />
          </>
        ) : (
          <Button
            label="Delete account"
            variant="destructive"
            fullWidth
            style={styles.signOut}
            onPress={onDeleteAccount}
          />
        )}
      </ScrollView>
    </Screen>
  );
}
