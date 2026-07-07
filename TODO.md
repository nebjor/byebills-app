# byeBills — Project TODO

Product = three codebases:
- **Mobile app** — Expo / React Native (`byebills/`)
- **Landing + backend** — Next.js (`byebills_v1_webapp/`: marketing site, `/privacy`, `/terms`, `/api`)
- **Supabase** — auth + database + storage (shared by app & backend)

---

## Backend & data
- [ ] **Hook the app to the Supabase `/api/mobile/extract` endpoint** (replace the dev Gemini key). *(#56)*
- [ ] **Switch app off the dev key → backend + client metering** (show "scans left", handle 402 → upgrade). *(#59)*
- [ ] **Server-side hard cap: 5 free scans / month, abuse-proof** + spend/rate limits + Google Cloud billing cap. *(#57)*
- [ ] **Persist all app data in Supabase** (transactions, hustles, profile → source of truth; receipts → Storage) so data survives reinstalls, updates, and syncs iOS ↔ Android. *(#65)*

## Billing
- [ ] **Pricing tiers + RevenueCat IAP** (5 free/mo; stepped plans; annual = 2 months free); webhook → `user_entitlements`. *(#58)*

## iOS release
- [ ] **Apple Developer account + EAS Build** (build without a Mac → TestFlight → submit). *(#62)*
- [ ] **Finish Apple + Google sign-in for iOS** (enable Apple provider in Supabase; add iOS Google client ID + `iosUrlScheme`). *(#63)*
- [ ] **App icon + splash** (Billie branding) for iOS & Android. *(#64)*

## Landing page & store
- [ ] **App screenshots** — capture real screens, frame them, replace the hero mockup + 3 feature-card visuals, and build the App Store screenshot set. *(#60)*
- [ ] **App Store Optimization (ASO)** — name, subtitle, keywords, description, captions. *(#61)*
- [ ] **Write the ACTUAL Privacy Policy & Terms of Use** for the landing page (replace the current templates with real, reviewed copy; fill in the legal entity/address). ⚠️ needed for App Store submission.
- [ ] **Deploy the webapp** + set `EXPO_PUBLIC_EXTRACT_URL`; wire the "Download on iOS" button + metadata to the real App Store URL once approved. *(#66)*

---

## Notes / decisions
- Auth: **Sign in with Apple + Google** (Apple required because Google is offered).
- Free tier: **5 scans / calendar month**, enforced server-side.
- AI: **Gemini 2.5 Flash**; prompt anchors on today's date to avoid year misreads; user reviews every extraction.
- Store cut ~15% under $1M (Apple SBP); RevenueCat free under ~$2.5k MTR.
