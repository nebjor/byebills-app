# byeBills — RevenueCat + In-App Purchase setup

This wires real subscriptions to the paywall. Today `src/data/billingStore.tsx`
**mocks** the purchase (`activatePro` just flips a local flag). Below is exactly
what to create in each dashboard and how to swap the mock for the SDK.

Pricing decided: **CHF 8 / month** and **CHF 80 / year** (annual ≈ 2 months free).
Access model: **7-day Pro trial, then paid — no permanent free tier.** The trial is
tracked client-side in `billingStore` (`trialStartedAt` + `TRIAL_DAYS`). When you wire
RevenueCat, prefer a **store-side 7-day free trial (intro offer)** on both products so
Apple/Google handle it: during the trial the `pro` entitlement is *active*, so the same
"is `pro` active?" check covers trial **and** paid — server-side too.

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
- With the **trial-then-paid** model (no free tier), the backend rule simplifies to: **allow a scan only if the `pro` entitlement is active** (RevenueCat marks it active during the free trial *and* while paid), else return 402 → `extract.ts` maps that to `QuotaError` → the app shows the paywall.
- RevenueCat pushes entitlement changes to Supabase via **webhooks** → a `/api/revenuecat/webhook` route that upserts `public.user_entitlements` (`plan='pro'`, `valid_until`=period/trial end). The `quota_pro_bypass.sql` function already grants unlimited scans when `plan='pro'` and not expired.
- Follow-up: since there is no free tier now, set the default `monthly_quota` to **0** in `user_entitlements` (or have the extract route require an active `pro` entitlement outright), so a user with no active entitlement can't scan via the backend.

---

## 8. Test checklist
- iOS **Sandbox** tester account: buy monthly + annual, confirm `isPro` flips and the paywall closes.
- Restore purchases on a fresh install → Pro returns.
- New install: scanning works during the 7-day trial; after the trial the scan button routes to the paywall.
- Cancel in Sandbox → entitlement expires → app blocks scanning (routes to paywall) at period end.
```
