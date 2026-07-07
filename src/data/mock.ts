import { colors } from "@/theme";

export type Hustle = { id: string; name: string; color: string };

export type InvoiceStatus = "paid" | "pending" | "overdue" | "draft";

export type Transaction = {
  id: string;
  title: string;
  meta: string;
  amount: number; // positive = income, negative = expense
  status: InvoiceStatus;
  hustleId: string;
  group: string; // date group label
  date: string; // ISO date (YYYY-MM-DD…)
  imageUri?: string; // captured receipt photo
};

export type BudgetCategory = {
  id: string;
  name: string;
  spent: number;
  limit: number;
  color: string;
};

export const user = { name: "Joris", email: "j.neber@gmx.ch", currency: "CHF" };

/**
 * Seed (demo) data toggle.
 *
 * `__DEV__` is a React Native global: `true` in development, `false` in
 * production/release builds — so the app ships with sample data while we build,
 * and starts on a blank slate for real users. Set this to `false` here to test
 * the empty state in dev, or `true` to force demo data into a release build.
 *
 * Note: this only controls the initial defaults. Once hustles/transactions are
 * saved to storage, those win — clear app data (or reinstall) to re-seed.
 */
export const USE_SEED_DATA = false; //__DEV__;

const sampleHustles: Hustle[] = [
  { id: "free", name: "Freelance", color: colors.brand },
  { id: "shop", name: "Online shop", color: colors.purple },
  { id: "consult", name: "Consulting", color: colors.info },
];

const sampleTransactions: Transaction[] = [
  { id: "t1", title: "Upwork payout", meta: "Freelance · client project", amount: 1250, status: "paid", hustleId: "free", group: "Today", date: "2026-06-29" },
  { id: "t2", title: "Canva Pro", meta: "Software · subscription", amount: -12.99, status: "paid", hustleId: "free", group: "Today", date: "2026-06-29" },
  { id: "t3", title: "Client retainer", meta: "Consulting · monthly", amount: 800, status: "pending", hustleId: "consult", group: "Yesterday", date: "2026-06-28" },
  { id: "t4", title: "Adobe CC", meta: "Software · subscription", amount: -54.99, status: "paid", hustleId: "free", group: "Yesterday", date: "2026-06-28" },
  { id: "t5", title: "Etsy sale", meta: "Online shop · order #1043", amount: 86.4, status: "paid", hustleId: "shop", group: "26 Jun", date: "2026-06-26" },
  { id: "t6", title: "Lemon Media", meta: "Invoice #INV-011", amount: 320, status: "overdue", hustleId: "free", group: "26 Jun", date: "2026-06-26" },
  { id: "t7", title: "Office supplies", meta: "Materials", amount: -42.3, status: "paid", hustleId: "shop", group: "26 Jun", date: "2026-06-26" },
  { id: "t8", title: "Workshop fee", meta: "Consulting · talk", amount: 600, status: "paid", hustleId: "consult", group: "May", date: "2026-05-18" },
  { id: "t9", title: "Notion", meta: "Software · subscription", amount: -16, status: "paid", hustleId: "free", group: "May", date: "2026-05-12" },
];

// Gated seeds the stores read from: real demo data in dev, empty in production.
export const hustles: Hustle[] = USE_SEED_DATA ? sampleHustles : [];
export const transactions: Transaction[] = USE_SEED_DATA ? sampleTransactions : [];

export const budget = {
  spent: 1180,
  limit: 2000,
  categories: [
    { id: "sw", name: "Software", spent: 320, limit: 500, color: colors.purple },
    { id: "mk", name: "Marketing", spent: 480, limit: 400, color: "#FF7A59" },
    { id: "su", name: "Supplies", spent: 90, limit: 200, color: colors.brand },
    { id: "fee", name: "Platform fees", spent: 140, limit: 150, color: colors.info },
    { id: "tax", name: "Taxes set-aside", spent: 150, limit: 250, color: colors.warning },
  ] as BudgetCategory[],
};

// Active display currency code; kept in sync with the user store.
let displayCurrency = "CHF";
export function setDisplayCurrency(code: string) {
  if (code) displayCurrency = code;
}

/** Format an amount with the active currency, e.g. 1250 -> "CHF 1,250.00". */
export function money(amount: number, withSign = false): string {
  const sign = amount < 0 ? "-" : withSign ? "+" : "";
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${displayCurrency} ${formatted}`;
}
