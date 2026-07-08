import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Lightweight, dependency-free PostHog capture. POSTs to PostHog's EU capture
 * endpoint — no SDK, no native module, no rebuild. Fire-and-forget; failures
 * are swallowed so analytics never breaks the app.
 */
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;

let cachedId: string | null = null;

async function distinctId(): Promise<string> {
  if (cachedId) return cachedId;
  let id = await AsyncStorage.getItem("byebills:anonId");
  if (!id) {
    id = `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem("byebills:anonId", id);
  }
  cachedId = id;
  return id;
}

/** Tie subsequent events to the signed-in user id. */
export function identify(userId: string) {
  if (userId) cachedId = userId;
}

export async function track(event: string, properties: Record<string, unknown> = {}): Promise<void> {
  if (!KEY) return;
  try {
    const id = await distinctId();
    await fetch(`${HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: KEY,
        event,
        distinct_id: id,
        properties: { ...properties, $lib: "byebills-rn" },
      }),
    });
  } catch {
    // never let analytics break the app
  }
}
