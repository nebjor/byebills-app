# byeBills — Auth, Backend Quota & AI: Setup Guide

This is your checklist to take receipt scanning from the **dev key** (Gemini key
bundled in the app) to **production** (users sign in, the key lives on the
server, and a hard 5-scans/month free cap is enforced).

## Decisions locked in
- **Auth:** Sign in with **Apple + Google** (one-tap, stable identity → the free
  cap can't be farmed by reinstalling).
- **Backend:** Reuse the **same Supabase project** as the webapp (shared
  accounts). New mobile endpoint `/api/mobile/extract` so the website is
  untouched.
- **Free tier:** **5 scans / calendar month**, enforced server-side.
- **Model:** Gemini 2.5 Flash (~$0.001–0.002 per receipt).
- **AI cost is tiny; the app-store cut (~15% under $1M) is the real cost.**

Three things must happen: **(A) Supabase dashboard**, **(B) backend deploy**,
**(C) mobile app**. Do them in order.

---

## A. Supabase dashboard (you)

### A1. Get your keys
Dashboard → **Project Settings → API**. Copy:
- **Project URL** (`https://xxxx.supabase.co`)
- **anon public** key (safe to ship in the app)
- **service_role** key (server only — never in the app)

### A2. Run the quota SQL
Dashboard → **SQL Editor → New query** → paste the contents of
`byebills_v1_webapp/supabase/quota_setup.sql` → **Run**.
This creates `extraction_usage`, `user_entitlements`, and the
`consume_extraction()` / `refund_extraction()` functions (the unhackable cap).

### A3. Enable Google sign-in
1. **Google Cloud Console** → create OAuth client IDs (follow Supabase's
   "Login with Google" native guide):
   - **Web** client (used by Supabase + as `webClientId` in the app)
   - **iOS** client (bundle id `com.byebills...`)
   - **Android** client (needs your app's SHA-1 fingerprint)
2. Supabase → **Authentication → Providers → Google** → enable, paste the **Web
   client ID + secret**, and add the **iOS + Web client IDs** to *Authorized
   Client IDs*.

### A4. Enable Apple sign-in
1. **Apple Developer**: App ID with **Sign in with Apple** capability → create a
   **Services ID** and a **Key** for Sign in with Apple → generate the client
   secret.
2. Supabase → **Authentication → Providers → Apple** → enable, add your app's
   **bundle ID** to *Authorized Client IDs*, and paste the Services ID + secret.

> Apple/Google credential setup is the fiddliest part. Supabase's provider pages
> link directly to step-by-step guides — follow those for the exact fields.

---

## B. Backend deploy (you, mostly)

The code is already written:
- `src/app/api/mobile/extract/route.ts` — bearer-auth + quota + Gemini.
- `supabase/quota_setup.sql` — the tables/functions (ran in A2).

Set these **environment variables** on the webapp host (Vercel → Project →
Settings → Environment Variables):
```
GOOGLE_GEMINI_API_KEY=...          # your Gemini key (server-side only)
LLM_PROVIDER=gemini
NEXT_PUBLIC_SUPABASE_URL=...        # from A1
NEXT_PUBLIC_SUPABASE_ANON_KEY=...  # from A1
```
Deploy. Your endpoint is then:
```
https://<your-webapp-domain>/api/mobile/extract
```
Quick test (replace TOKEN + a real image):
```
curl -X POST https://<domain>/api/mobile/extract \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@Quittung_1.jpeg"
```
Expect JSON with `extraction` + `remaining`, or `402` once over 5/month.

---

## C. Mobile app (I've written the code below — apply after installing deps)

> Adding the Supabase + Apple/Google SDKs requires a **dev-client rebuild**, so
> I staged this here instead of wiring it live (that would break the JS bundle
> you're testing AI on today). When you're ready, do these steps.

### C1. Install packages
```
npx expo install @supabase/supabase-js react-native-url-polyfill expo-apple-authentication @react-native-google-signin/google-signin
```

### C2. Add env vars (mobile project `.env`)
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_EXTRACT_URL=https://<your-webapp-domain>/api/mobile/extract
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...apps.googleusercontent.com
# Keep EXPO_PUBLIC_GEMINI_API_KEY only for dev fallback; remove before release.
```

### C3. `app.json` plugins
Add to the `plugins` array:
```json
["expo-apple-authentication"],
"@react-native-google-signin/google-signin"
```
And under `ios`: `"usesAppleSignIn": true`.

### C4. `src/lib/supabase.ts` (new file)
```ts
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import { setAccessTokenProvider } from "@/lib/extract";

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } },
);

// Let extract.ts reach the current token without importing Supabase itself.
setAccessTokenProvider(async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});
```

### C5. `src/data/authStore.tsx` (new file)
```tsx
import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/lib/supabase";

type AuthValue = { session: Session | null; loading: boolean; signOut: () => Promise<void> };
const AuthContext = createContext<AuthValue>({ session: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <AuthContext.Provider value={{ session, loading, signOut: async () => { await supabase.auth.signOut(); } }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
```

### C6. `src/app/sign-in.tsx` (new file — first onboarding step)
```tsx
import * as AppleAuthentication from "expo-apple-authentication";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { router } from "expo-router";
import { useEffect } from "react";
import { Alert, View } from "react-native";

import { Button, Screen, Text } from "@/components";
import { supabase } from "@/lib/supabase";

export default function SignIn() {
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
  }, []);

  const afterAuth = (fullName?: string | null) => {
    router.replace({ pathname: "/name", params: fullName ? { name: fullName } : {} });
  };

  const onGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const info = await GoogleSignin.signIn();
      const idToken = info.data?.idToken;
      if (!idToken) return;
      await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
      afterAuth(info.data?.user?.name);
    } catch (e) {
      Alert.alert("Sign-in failed", e instanceof Error ? e.message : "Try again.");
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
      await supabase.auth.signInWithIdToken({ provider: "apple", token: cred.identityToken });
      afterAuth(cred.fullName?.givenName); // Apple only sends the name on first sign-in
    } catch (e: any) {
      if (e?.code !== "ERR_REQUEST_CANCELED") Alert.alert("Sign-in failed", "Try again.");
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 14 }}>
        <Text variant="h1" center>Welcome to byeBills</Text>
        <Text variant="body" center>Sign in to start scanning. 5 free scans every month.</Text>
        <Button label="Continue with Apple" onPress={onApple} fullWidth />
        <Button label="Continue with Google" variant="secondary" onPress={onGoogle} fullWidth />
      </View>
    </Screen>
  );
}
```

### C7. Wire it into `src/app/_layout.tsx`
- Wrap the tree in `<AuthProvider>` (inside `ThemeProvider`).
- Add an auth gate: if `!session && !loading`, the router should send the user to
  `/sign-in` before the rest of onboarding. (The existing `byebills:onboarded`
  flag still controls skipping the name/hustles steps after the first run.)

### C8. Prefill the name (`src/app/name.tsx`)
Read the param the sign-in screen passes:
```ts
const { name: nameParam } = useLocalSearchParams<{ name?: string }>();
const [name, setName] = useState(typeof nameParam === "string" ? nameParam : "");
```
(If a name field already exists there, just seed its initial value from
`nameParam`.)

### C9. Rebuild the dev client
```
npx expo run:android   # and/or: npx expo run:ios
```
(Native modules were added, so a plain reload isn't enough.)

Once C1–C9 are done and `EXPO_PUBLIC_EXTRACT_URL` is set, `extract.ts`
automatically routes through your backend (key server-side, quota enforced) and
only falls back to the dev key when there's no URL/token.

---

## How the quota works (recap)
1. App POSTs the photo + the user's token to `/api/mobile/extract`.
2. Backend verifies the token, then `consume_extraction()` atomically reserves
   one scan **only if** `used < quota` (5 for free). Over quota → **402**.
3. Gemini runs server-side; on failure the scan is **refunded**.
4. The app shows "scans left" and, on 402, an upgrade prompt.

Because the counter is server-side and tied to the account (not the device),
reinstalling can't reset it. Add a Google Cloud **billing budget cap** as a
final wallet backstop.

---

## RevenueCat — do you need it?
**No, it's not required — but DIY is real work.** Selling subscriptions in the
app must go through Apple/Google In-App Purchase (you can't use Stripe for
in-app digital goods on iOS). What you'd have to build yourself:
- IAP product setup in App Store Connect + Play Console (unavoidable either way).
- **Server-side receipt validation** for both stores.
- Handling renewals, cancellations, refunds, grace periods, billing retries, and
  cross-platform "same user, two stores."
- A webhook to flip `user_entitlements.plan` / `monthly_quota` when a sub
  changes.

RevenueCat does the validation, the two-store abstraction, and the webhooks for
you (free under ~$2.5k/mo revenue). DIY is doable for one platform and a single
plan, but gets bug-prone across two stores. Recommendation: ship the free tier
now, add RevenueCat when you turn on paid plans — it'll save you the riskiest
part (getting entitlement state right).
