import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "./authStore";

/**
 * Billing / entitlement — READ from the server, never the device.
 *
 * The trial clock, plan and daily usage live in Supabase and are owned by
 * SECURITY DEFINER functions keyed to auth.uid() (see trial_quota_setup.sql).
 * The client can only *read* status via the extraction_status() RPC — it can
 * never grant itself access or reset the trial. This store just mirrors that
 * server state for the UI.
 *
 * Caps: trial = 7 days / 30 scans per day; pro = 200/day; expired = 0.
 * The real gate is the backend extract route (402); this is for display + a
 * fast client-side pre-check.
 */

export type Plan = "monthly" | "annual";
export type EntitlementStatus = "trial" | "pro" | "expired";

type StatusRow = {
  status: EntitlementStatus;
  trial_days_left: number;
  used_today: number;
  daily_cap: number;
  remaining_today: number;
};

// Optimistic default until the first server read returns (or when signed out).
const DEFAULT_ROW: StatusRow = {
  status: "trial",
  trial_days_left: 7,
  used_today: 0,
  daily_cap: 30,
  remaining_today: 30,
};

type BillingContextValue = {
  loading: boolean;
  isPro: boolean;
  isTrialActive: boolean;
  trialEnded: boolean;
  trialDaysLeft: number;
  usedToday: number;
  dailyCap: number;
  remainingToday: number;
  canScan: boolean;
  refresh: () => Promise<void>;
  activatePro: (plan: Plan) => Promise<void>; // RevenueCat purchase point
  restore: () => Promise<void>; // RevenueCat restore point
};

const BillingContext = createContext<BillingContextValue>({
  loading: true,
  isPro: false,
  isTrialActive: true,
  trialEnded: false,
  trialDaysLeft: 7,
  usedToday: 0,
  dailyCap: 30,
  remainingToday: 30,
  canScan: true,
  refresh: async () => {},
  activatePro: async () => {},
  restore: async () => {},
});

export function BillingProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<StatusRow>(DEFAULT_ROW);

  const refresh = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.rpc("extraction_status").single<StatusRow>();
      if (!error && data) setRow(data);
    } catch {
      // keep last known state; the backend 402 is still the real gate
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Re-read whenever the session changes (sign in / out).
  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  // RevenueCat goes here: purchase/restore the package, then refresh from the
  // server so `status` reflects the new entitlement. Mocked as a refresh for now.
  const activatePro = useCallback(async (_plan: Plan) => {
    await refresh();
  }, [refresh]);

  const restore = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const value = useMemo<BillingContextValue>(() => {
    const isPro = row.status === "pro";
    const isTrialActive = row.status === "trial";
    return {
      loading,
      isPro,
      isTrialActive,
      trialEnded: row.status === "expired",
      trialDaysLeft: row.trial_days_left,
      usedToday: row.used_today,
      dailyCap: row.daily_cap,
      remainingToday: row.remaining_today,
      canScan: (isPro || isTrialActive) && row.remaining_today > 0,
      refresh,
      activatePro,
      restore,
    };
  }, [loading, row, refresh, activatePro, restore]);

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export const useBilling = () => useContext(BillingContext);
