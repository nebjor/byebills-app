# App Store Pre-Submission Checklist — run BEFORE you hit Submit

100s of apps get rejected every week and most founders don't see it coming. Run this list first.

## The 25 rejection killers
- [ ] 1. **Privacy policy linked** — missing = instant rejection, no warning. (byeBills: `/privacy` exists — finalize + link it in App Store Connect + in-app.)
- [ ] 2. **Camera permission explained** — asking without a reason = ~2-week delay. (We set `NSCameraUsageDescription` via app.json — verify the wording.)
- [ ] 3. **No private APIs** — work in dev, caught in review, no appeal.
- [ ] 4. **Guest / demo mode** — login-only frustrates reviewers who must test. ⚠️ byeBills is sign-in-only → give reviewers a demo account or a guest path.
- [ ] 5. **No "beta" in the UI** — reads as unfinished.
- [ ] 6. **No hardcoded test data** — "John Doe"/"Joris"/dummy rows get flagged. ⚠️ Ensure `USE_SEED_DATA = false` in prod; no placeholder names.
- [ ] 7. **Every link works** — reviewers click every link in Settings/About. (Check Contact/feedback mailto, Manage subscription, Privacy, Terms.)
- [ ] 8. **Account deletion in-app** — mandatory since 2022. ⚠️ byeBills has Sign out but NO delete-account yet → must add.
- [ ] 9. **Contextual push permission** — no cold "Allow notifications" on launch. (We ask *after* first scan — good; keep it.)
- [ ] 10. **Works on iPad** — it's tested on iPad even if phone-only, and may crash. Test layouts on iPad.
- [ ] 11. **Show subscription price before the paywall** — legal requirement in most regions. (Build this into the paywall.)
- [ ] 12. **Screenshots match the real UI** — mismatched = misleading metadata = auto-reject.
- [ ] 13. **Offline handling** — no blank white screen on lost signal. ⚠️ byeBills currently errors when it can't reach Supabase at launch → add a graceful offline/no-connection state.
- [ ] 14. **Sign in with Apple** — required if you offer any social login. (We offer Google → Apple is mandatory; wire it up. Task #63.)
- [ ] 15. **Moderate AI-generated content** — if users can generate content. (byeBills = extraction only, low risk, but keep the review step.)
- [ ] 16. **Explain clipboard access** — if used.
- [ ] 17. **Justify background location** — we don't use it; keep it that way.
- [ ] 18. **Age-gate user-generated / social content** — N/A unless we add social.
- [ ] 19. **Not just a webview wrapper** — byeBills is native RN — fine.
- [ ] 20. **No forced-update-on-launch** that bricks the app.
- [ ] 21. **No external payment links** anywhere (triggers the 30% / anti-steering rules). Subscriptions via IAP only.
- [ ] 22. **No sensitive data on lock-screen notifications.**
- [ ] 23. **Accessibility labels** — VoiceOver must work; missing labels lower review score. (Add `accessibilityLabel`s.)
- [ ] 24. **Handle device rotation** — no crash on rotate. Lock orientation or support it.
- [ ] 25. **No "rewards for reviews"** anywhere = immediate rejection + possible account ban.

## byeBills — the ones that need work right now
1. **Account deletion (#8)** — not built yet. **Blocker.**
2. **Offline handling (#13)** — app errors when Supabase is unreachable. **Blocker.**
3. **Guest/demo access for reviewers (#4)** — provide a demo login in App Review notes.
4. **Sign in with Apple (#14)** — required, tracked in #63.
5. **Subscription price shown before paywall (#11)** — part of the paywall build.
6. **Seed data OFF in prod (#6)** — confirm `USE_SEED_DATA` is false in release builds.
7. **All Settings links click through (#7)** — verify before submit.
