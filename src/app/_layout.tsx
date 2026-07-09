import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/nunito";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/data/authStore";
import { BillingProvider } from "@/data/billingStore";
import { HustlesProvider } from "@/data/hustleStore";
import { TransactionsProvider } from "@/data/store";
import { UserProvider } from "@/data/userStore";
import { ThemeProvider, useTheme } from "@/theme";

SplashScreen.preventAutoHideAsync();

function StackHost() {
  const { colors } = useTheme();
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const routing = useRef(false);

  // Auth gate: unauthenticated users go to /sign-in. When a session appears
  // while on the sign-in screen, route straight to the final destination
  // (dashboard if onboarded, else onboarding). The `routing` guard ensures we
  // fire the post-login navigation exactly once — Supabase emits several auth
  // events in a row, and a double replace() is what causes the flicker.
  useEffect(() => {
    if (loading) return;
    const onSignIn = segments[0] === "sign-in";
    if (!session && !onSignIn) {
      routing.current = false;
      router.replace("/sign-in");
    } else if (session && onSignIn && !routing.current) {
      routing.current = true;
      AsyncStorage.getItem("byebills:onboarded").then((v) => {
        router.replace(v === "1" ? "/dashboard" : "/name");
      });
    }
  }, [session, loading, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Screen name="paywall" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <UserProvider>
            <BillingProvider>
              <HustlesProvider>
                <TransactionsProvider>
                  <StackHost />
                </TransactionsProvider>
              </HustlesProvider>
            </BillingProvider>
          </UserProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
