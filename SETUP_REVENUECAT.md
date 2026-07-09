# byeBills — RevenueCat + In-App Purchase setup

This wires real subscriptions to the paywall. Today `src/data/billingStore.tsx`
**mocks** the purchase (`activatePro` just flips a local flag). Below is exactly
what to create in each dashboard and how to swap the mock for the SDK.

Pricing decided: **CHF 8 / month** and **CHF 80 / year** (annual ≈ 2 months free).
Free tier: **5 AI scans / month** (enforced client-side in `billingStore` + server-side
in the quota RPC).

---

## 1. Product & entitlement naming (use these everywhere)

| Concept | ID |
|---|---|
| Entitlement | `pro` |
| Offering | `default` |
| Monthly package | `$rc_monthly` → product `byebills_pro_monthly` |
| Annual package | `$rc_annual` → product `byebills_pro_annual` |
| App Store product IDs | `byebills.pro.monthly`, `byebills.pro.annual` |
| Play product IDs | `byebills_pro_monthly`, `byebills_pro_annual` |

Keep the plan keys in the app (`Plan = "monthly" | "annual"`) mapped to the packages above.

---

## 2. App Store Connect (iOS)
1. **Agreements, Tax, and Banking** must be active (Paid Apps agreement signed) — subscriptions won't work otherwise.
2. Create a **Subscription Group**: "byeBills Pro".
3. Add two **auto-renewable subscriptions** in that group:
   - `byebills.pro.monthly` — CHF 8.00 — 1 month.
   - `byebills.pro.annual` — CHF 80.00 — 1 year.
4. Add localized display name + description (DE + EN). Add a review screenshot of the paywall.
5. (Optional) Add an **intro offer / free trial** later (e.g. 7-day trial) — RevenueCat handles it.
6. Create an **App-Specific Shared Secret** (App Information) — RevenueCat needs it for receipt validation.

## 3. Google Play Console (Android)
1. Monetize → **Subscriptions** → create `byebills_pro_monthly` and `byebills_pro_annual` with base plans (CHF 8 monthly, CHF 80 yearly).
2. Create a **Service Account** with the Play Developer API and upload the JSON to RevenueCat.

## 4. RevenueCat dashboard
1. Create project "byeBills", add the iOS app (bundle id) + Android app (package name).
2. Paste the **App Store shared secret** and the **Play service-account JSON**.
3. **Entitlements** → create `pro`.
4. **Products** → import `byebills.pro.monthly` / `.annual` (and the Play ones).
5. **Offerings** → `default` → add packages `$rc_monthly` and `$rc_annual`, attach the products, mark `pro` entitlement on both.
6. Copy the **public SDK API keys** (one for iOS `appl_…`, one for Android `goog_…`).

Put the keys in `.env` (they are publishable client keys, safe to bundle):
```
EXPO_PUBLIC_RC_IOS_KEY=appl_xxx
EXPO_PUBLIC_RC_ANDROID_KEY=goog_xxx
```

---

## 5. Install the SDK (needs a new dev build — not Expo Go)
```
npx expo install react-native-purchases react-native-purchases-ui
```
`react-native-purchases` ships an Expo config plugin; after installing, rebuild the dev client:
```
npx expo prebuild --clean   # if using bare workflow
eas build --profile development --platform ios   # or android
```

---

## 6. Swap the mock in `billingStore.tsx`

Add a tiny wrapper `src/lib/purchases.ts`:
```ts
import Purchases, { PACKAGE_TYPE } from "react-native-purchases";
import { Platform } from "react-native";

export function initPurchases(appUserId?: string) {
  const apiKey =
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_RC_IOS_KEY!
      : process.env.EXPO_PUBLIC_RC_ANDROID_KEY!;
  Purchases.configure({ apiKey, appUserID: appUserId ?? null });
}

export async function isProActive(): Promise<boolean> {
  const info = await Purchases.getCustomerInfo();
  return !!info.entitlements.active["pro"];
}

export async function purchase(plan: "monthly" | "annual") {
  const offerings = await Purchases.getOfferings();
  const pkg =
    plan === "annual"
      ? offerings.current?.annual
      : offerings.current?.monthly;
  if (!pkg) throw new Error("Package not available");
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return !!customerInfo.entitlements.active["pro"];
}

export async function restore(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  return !!info.entitlements.active["pro"];
}
```

Then in `billingStore.tsx`:
- Call `initPurchases(session?.user.id)` once (e.g. in the provider effect or after sign-in), and pass the Supabase user id as the RevenueCat `appUserID` so entitlements follow the account across devices.
- On mount / focus, hydrate `isPro` from `isProActive()` instead of only AsyncStorage.
- In `activatePro(plan)` → `await purchase(plan)`; on success set `isPro: true`.
- In `restore()` → `await restore()`.
- Keep the AsyncStorage copy as an offline cache; RevenueCat is the source of truth.

In `paywall.tsx`, the `onStart` handler already calls `activatePro(selected)` — once the store method awaits `purchase()`, the button's `busy` state and `router.back()` flow stay the same. Remove the `setTimeout` mock.

---

## 7. Server side (already scaffolded)
- The monthly free cap is enforced by the Supabase `consume_extraction` RPC (returns 402 when over quota); `extract.ts` maps that to `QuotaError` → the app shows the paywall.
- To let Pro users bypass the cap server-side, have the backend check the user's `pro` entitlement. RevenueCat can push entitlement changes to Supabase via **webhooks** (write to a `user_entitlements` table), which the extract route already reads. Wire the RevenueCat webhook → a `/api/revenuecat/webhook` route that upserts `user_entitlements`.

---

## 8. Test checklist
- iOS **Sandbox** tester account: buy monthly + annual, confirm `isPro` flips and the paywall closes.
- Restore purchases on a fresh install → Pro returns.
- Free user: after 5 scans in a month, the scan button routes to the paywall; next month it resets.
- Cancel in Sandbox → entitlement expires → app reverts to free at period end.
```
