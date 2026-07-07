import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Image } from "expo-image";
import * as AppleAuthentication from "expo-apple-authentication";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import {
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Button, Text } from "@/components";
import { useUser } from "@/data/userStore";
import { supabase } from "@/lib/supabase";
import { type Palette, useTheme, useThemedStyles } from "@/theme";

const billie = require("../../assets/images/cute_billie_transparent_cropped.png");
const DELAY = 450;

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.purple },
    mascotWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
    hill: { position: "absolute", backgroundColor: c.cream },
    textBlock: { position: "absolute", left: 0, right: 0, paddingHorizontal: 28, alignItems: "center" },
    footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 28, alignItems: "center" },
    inner: { width: "100%", maxWidth: 420, alignItems: "center" },
    subtitle: { marginTop: 10, fontSize: 20 },
    body: { marginTop: 16, maxWidth: 360, fontSize: 22, lineHeight: 30 },
    cta: { marginTop: 24 },
    secondary: { marginTop: 12 },
  });

export default function SignIn() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { update } = useUser();
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
  }, []);

  // --- Billie fly-in animation ---------------------------------------------
  const mascot = Math.min(width * 0.6, height * 0.26);
  const crestY = height * 0.52;
  const mascotTop = height * 0.37 - mascot / 2;
  const START = crestY - (mascotTop + mascot / 2) + mascot * 0.5 + 24;
  const PEAK = -34;

  const ty = useRef(new Animated.Value(START)).current;
  const tx = useRef(new Animated.Value(-30)).current;
  const rot = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const op = useRef(new Animated.Value(0)).current;

  const play = () => {
    ty.stopAnimation();
    ty.setValue(START);
    tx.setValue(-30);
    rot.setValue(1);
    scale.setValue(0.85);
    op.setValue(0);

    Animated.sequence([
      Animated.delay(DELAY),
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(ty, { toValue: PEAK, duration: 440, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(tx, { toValue: 0, duration: 440, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(rot, { toValue: 0, duration: 440, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.06, duration: 440, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(ty, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start();
  };

  useEffect(() => {
    play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "8deg"] });

  // --- Auth -----------------------------------------------------------------
  // Prefill the onboarding name from the provider on first run only.
  const prefillName = async (fullName?: string | null) => {
    if (!fullName) return;
    const onboarded = await AsyncStorage.getItem("byebills:onboarded");
    if (!onboarded) update({ name: fullName });
  };

  const onGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      try {
        await GoogleSignin.signOut(); // force the account chooser
      } catch {
        // no cached account — fine
      }
      const info = await GoogleSignin.signIn();
      const idToken = info.data?.idToken;
      if (!idToken) {
        Alert.alert("Sign-in failed", "No ID token returned by Google.");
        return;
      }
      const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
      if (error) {
        Alert.alert("Supabase rejected sign-in", error.message);
        return;
      }
      await prefillName(info.data?.user?.name);
      // Navigation handled by the auth gate once the session propagates.
    } catch (e) {
      Alert.alert("Sign-in failed", e instanceof Error ? e.message : "Please try again.");
    }
  };

  const onApple = async () => {
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken) return;
      const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: cred.identityToken });
      if (error) {
        Alert.alert("Supabase rejected sign-in", error.message);
        return;
      }
      await prefillName(cred.fullName?.givenName ?? null);
      // Navigation handled by the auth gate once the session propagates.
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code !== "ERR_REQUEST_CANCELED") Alert.alert("Sign-in failed", "Please try again.");
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <Animated.View
        style={[
          styles.mascotWrap,
          { top: mascotTop, opacity: op, transform: [{ translateX: tx }, { translateY: ty }, { rotate }, { scale }] },
        ]}
      >
        <Pressable onPress={play} accessibilityRole="button" accessibilityLabel="Replay Billie">
          <Image source={billie} style={{ width: mascot, height: mascot }} contentFit="contain" />
        </Pressable>
      </Animated.View>

      <View
        pointerEvents="none"
        style={[styles.hill, { width: width * 2, height: width * 2, borderRadius: width, left: -width / 2, top: crestY }]}
      />

      <View style={[styles.textBlock, { top: crestY + 44 }]}>
        <View style={styles.inner}>
          <Text variant="h1" center>
            Hey, I&apos;m Billie!
          </Text>
          <Text variant="bodyStrong" color={colors.brand} center style={styles.subtitle}>
            Your flying invoice assistant
          </Text>
          <Text variant="body" color={colors.ink600} center style={styles.body}>
            Snap your receipts — I&apos;ll do the bookkeeping automatically.
          </Text>

          {Platform.OS === "ios" ? (
            <>
              <Button label="Continue with Apple" fullWidth style={styles.cta} onPress={onApple} />
              <Button label="Continue with Google" variant="secondary" fullWidth style={styles.secondary} onPress={onGoogle} />
            </>
          ) : (
            <Button label="Continue with Google" fullWidth style={styles.cta} onPress={onGoogle} />
          )}
        </View>
      </View>
    </View>
  );
}
