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

import { setDisplayCurrency, user as seed } from "./mock";

export type UserProfile = { name: string; email: string; currency: string };

const STORAGE_KEY = "byebills:user";
const DEFAULT: UserProfile = { name: "Joris Neber", email: seed.email, currency: seed.currency };

type UserContextValue = {
  user: UserProfile;
  update: (patch: Partial<UserProfile>) => void;
};

const UserContext = createContext<UserContextValue>({ user: DEFAULT, update: () => {} });

export function UserProvider({ children }: { children: ReactNode }) {
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

  const update = useCallback((patch: Partial<UserProfile>) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // Keep the money() formatter in sync with the chosen currency.
  useEffect(() => {
    setDisplayCurrency(user.currency);
  }, [user.currency]);

  const value = useMemo<UserContextValue>(() => ({ user, update }), [user, update]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export const useUser = () => useContext(UserContext);
