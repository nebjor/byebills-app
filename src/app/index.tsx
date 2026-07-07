import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

/**
 * Root router. The auth gate (in _layout) sends signed-out users to /sign-in.
 * Signed-in users land here and are routed to the dashboard (if they've finished
 * onboarding) or into the onboarding flow.
 */
export default function Index() {
  const [gate, setGate] = useState<"loading" | "dashboard" | "onboard">("loading");

  useEffect(() => {
    AsyncStorage.getItem("byebills:onboarded").then((v) => setGate(v === "1" ? "dashboard" : "onboard"));
  }, []);

  if (gate === "loading") return null;
  return <Redirect href={gate === "dashboard" ? "/dashboard" : "/name"} />;
}
