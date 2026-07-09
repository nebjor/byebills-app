import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Billing / entitlement + free-scan metering.
 *
 * Free users get FREE_SCAN_LIMIT AI scans per calendar month; the counter
 * resets when the month rolls over. Manual transactions are always free and
 * never counted. Pro users are unlimited.
 *
 * The purchase itself is mocked for now (activatePro flips the flag locally).
 * When RevenueCat is wired, replace activatePro/restore with SDK calls and
 * hydrate `isPro` from the customer's entitlements — see SETUP_REVENUECAT.md.
 * Server-side enforcement still lives in the backend quota RPC; this client
 * counter is for UX (showing the paywall before a wasted round-trip).
 */

export const FREE_SCAN_LIMIT = 5;

export type Plan = "monthly" | "annual";

type BillingState = {
  isPro: boolean;
  plan: Plan | null;
  month: string; // "YYYY-MM"
  count: number; // scans used this month
};

const STORAGE_KEY = "byebills:billing";

function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const DEFAULT: BillingState = { isPro: false, plan: null, month: monthKey(), count: 0 };

/** Roll the counter to the current month if it belongs to a past month. */
function rolled(s: BillingState): BillingState {
  const now = monthKey();
  return s.month === now ? s : { ...s, month: now, count: 0 };
}

type BillingContextValue = {
  isPro: boolean;
  plan: Plan | null;
  freeLimit: number;
  used: number;
  remaining: number; // Infinity when Pro
  canScan: boolean;
  recordScan: () => void;
  activatePro: (plan: Plan) => void;
  restore: () => void;
  cancelPro: () => void; // dev / testing helper
};

const BillingContext = createContext<BillingContextValue>({
  isPro: false,
  plan: null,
  freeLimit: FREE_SCAN_LIMIT,
  used: 0,
  remaining: FREE_SCAN_LIMIT,
  canScan: true,
  recordScan: () => {},
  activatePro: () => {},
  restore: () => {},
  cancelPro: () => {},
});

export function BillingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BillingState>(DEFAULT);

  const persist = useCallback((next: BillingState) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
    return next;
  }, []);

  // Load once, rolling the month forward if needed.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (!v) return;
      try {
        const loaded = rolled({ ...DEFAULT, ...JSON.parse(v) });
        setState(loaded);
        persist(loaded);
      } catch {
        // ignore malformed value
      }
    });
  }, [persist]);

  const recordScan = useCallback(() => {
    setState((prev) => {
      const r = rolled(prev);
      if (r.isPro) return persist(r);
      return persist({ ...r, count: r.count + 1 });
    });
  }, [persist]);

  const activatePro = useCallback(
    (plan: Plan) => {
      setState((prev) => persist({ ...rolled(prev), isPro: true, plan }));
    },
    [persist],
  );

  const restore = useCallback(() => {
    // Mock: with RevenueCat this re-reads entitlements from the store.
    setState((prev) => persist(rolled(prev)));
  }, [persist]);

  const cancelPro = useCallback(() => {
    setState((prev) => persist({ ...rolled(prev), isPro: false, plan: null }));
  }, [persist]);

  const value = useMemo<BillingContextValue>(() => {
    const r = rolled(state);
    const remaining = r.isPro ? Infinity : Math.max(0, FREE_SCAN_LIMIT - r.count);
    return {
      isPro: r.isPro,
      plan: r.plan,
      freeLimit: FREE_SCAN_LIMIT,
      used: r.count,
      remaining,
      canScan: r.isPro || r.count < FREE_SCAN_LIMIT,
      recordScan,
      activatePro,
      restore,
      cancelPro,
    };
  }, [state, recordScan, activatePro, restore, cancelPro]);

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export const useBilling = () => useContext(BillingContext);
