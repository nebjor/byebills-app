#!/usr/bin/env bash
# Growth / GTM tickets distilled from Arthur's build-in-public journey (Glow app).
# Complements the technical backlog. Adds each issue to Project #1.
#
# Setup once:  gh auth refresh -s project,repo --hostname github.com
# Run:         bash create-growth-issues.sh

set -e
OWNER="nebjor"
PROJECT=1
REPO="nebjor/byebills-app"

issue () {
  echo "→ $1"
  url=$(GH_HOST=github.com gh issue create --repo "$REPO" --title "$1" --body "$2")
  GH_HOST=github.com gh project item-add "$PROJECT" --owner "$OWNER" --url "$url" >/dev/null
}

# ---- Onboarding (his #1 lever) ----
issue "[Onboarding] Rebuild onboarding for conversion" "Arthur's biggest revenue lift came from onboarding. Add: personalization questions, a short tutorial, a progress bar, and a 'commitment' screen before the paywall. Goal metric: trial-start rate."
issue "[Onboarding] A/B test the onboarding flow" "Test onboarding variants (order, copy, number of steps, where the paywall sits). Small changes moved his trial starts a lot. Measure trial-start and D1 retention per variant."

# ---- Pricing / paywall ----
issue "[Pricing] Add a free trial + monthly & yearly paywall" "Trials convert ~5x better than pure freemium (his model: 3-day trial, \$10/mo, \$40/yr). Add a trial-based hard paywall via RevenueCat; keep/compare against the current 5-free-scans freemium. (Extends #58.)"
issue "[Pricing] RevenueCat paywall experiments" "Use RevenueCat's paywall A/B testing to try price points, trial length, and paywall design. Iterate on conversion, not guesses."

# ---- Measurement ----
issue "[Analytics] Funnel analytics + paid-install attribution" "Instrument the funnel: install → each onboarding step → trial → paid → retained. Add attribution (RevenueCat + an analytics SDK e.g. PostHog) so paid channels can be measured. He couldn't optimize until he could see the funnel."

# ---- ASO / acquisition ----
issue "[ASO] Keyword testing loop" "Treat ASO as an ongoing experiment: iterate app name/subtitle/keywords, ship, measure impressions→installs, repeat. (Extends #61.)"
issue "[Growth] Seed first users with free lifetime access" "Give a batch of free lifetime accounts to seed reviews, feedback, and early word-of-mouth — his earliest traction lever."
issue "[Growth] Build-in-public content pipeline (Shorts/TikTok/Reddit)" "Post the build-in-public content regularly (X + LinkedIn + Shorts/TikTok, Reddit). Note: his ORGANIC TikTok underperformed — treat organic as brand-building and expect to go paid for volume."

# ---- Paid ads ----
issue "[Ads] Paid TikTok ads + heavy creative testing" "Paid TikTok drove his growth. Test MANY creatives — some had far cheaper installs than others. Use TikTok ad credits. Only scale once attribution + funnel are in place."

# ---- Retention ----
issue "[Retention] Retention features" "He added dark mode, themes, and audio practice to lift retention. byeBills equivalents: scan reminders/streak, a home-screen widget (scans/month or net), and polish. Prioritize by retention impact."

# ---- Store submission gotcha ----
issue "[iOS] App Store Connect privacy & tracking settings" "He was rejected first for a privacy/tracking mismatch in App Store Connect. Fill the App Privacy 'nutrition label' + tracking settings correctly (we send receipts to Gemini — disclose it) BEFORE submitting."

# ---- Process ----
issue "[Process] Weekly: talk to users + review the funnel + test one thing" "His core lesson: optimize onboarding, test everything, talk to users, and iterate. Make it a weekly ritual — one user chat + one funnel review + one experiment."

echo "Done — growth tickets created in $REPO and added to project #$PROJECT."
