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

import { useAuth } from "@/data/authStore";
import { fetchProfile, pushProfile } from "@/lib/remote";

import { setDisplayCurrency, user as seed } from "./mock";

export type UserProfile = { name: string; email: string; currency: string };

const STORAGE_KEY = "byebills:user";
const DEFAULT: UserProfile = { name: "", email: seed.email, currency: seed.currency };

/**
 * Profile — name + currency, shared with the web app via app_profiles.
 *
 * `email` stays local: it comes from the auth session, not from us.
 */

type UserContextValue = {
  user: UserProfile;
  update: (patch: Partial<UserProfile>) => void;
  /** Marks onboarding complete server-side, so the web app doesn't re-ask. */
  completeOnboarding: () => Promise<void>;
};

const UserContext = createContext<UserContextValue>({
  user: DEFAULT,
  update: () => {},
  completeOnboarding: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [user, setUser] = useState<UserProfile>(DEFAULT);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (!v) return;
      try {
        setUser({ ...DEFAULT, ...JSON.parse(v) });
      } catch {
        // ignore malformed value
      }
    });
  }, []);

  // The server wins for name/currency once we have a session — that's how a
  // change made on the web reaches the phone.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const remote = await fetchProfile(userId);
      if (cancelled || !remote) return;
      setUser((prev) => {
        const next = {
          ...prev,
          name: remote.name || prev.name,
          currency: remote.currency || prev.currency,
          email: session?.user.email ?? prev.email,
        };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, session?.user.email]);

  const update = useCallback(
    (patch: Partial<UserProfile>) => {
      setUser((prev) => {
        const next = { ...prev, ...patch };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      if (userId && (patch.name !== undefined || patch.currency !== undefined)) {
        void pushProfile(userId, { name: patch.name, currency: patch.currency }).catch(() => {});
      }
    },
    [userId],
  );

  const completeOnboarding = useCallback(async () => {
    if (!userId) return;
    try {
      await pushProfile(userId, { onboardedAt: new Date().toISOString() });
    } catch {
      // The local AsyncStorage flag still gates this device; the web will just
      // ask once more, which is recoverable.
    }
  }, [userId]);

  // Keep the money() formatter in sync with the chosen currency.
  useEffect(() => {
    setDisplayCurrency(user.currency);
  }, [user.currency]);

  const value = useMemo<UserContextValue>(
    () => ({ user, update, completeOnboarding }),
    [user, update, completeOnboarding],
  );
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export const useUser = () => useContext(UserContext);
