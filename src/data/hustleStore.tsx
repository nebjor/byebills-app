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
import { fetchHustles, pushHustles, replaceHustles } from "@/lib/remote";

import { hustles as seed, type Hustle } from "./mock";

const STORAGE_KEY = "byebills:hustles";

/**
 * Hustles — server-backed, with AsyncStorage as the offline cache.
 * Shares the app_hustles table with the web app, so a hustle added on either
 * device shows up on the other (and colours stay consistent).
 */

type HustlesContextValue = {
  hustles: Hustle[];
  setHustles: (h: Hustle[]) => void;
};

const HustlesContext = createContext<HustlesContextValue>({
  hustles: seed,
  setHustles: () => {},
});

export function HustlesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [hustles, setH] = useState<Hustle[]>(seed);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (!v) return;
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed) && parsed.length) setH(parsed);
      } catch {
        // ignore
      }
    });
  }, []);

  // Pull the server's set, then push anything that only existed on this device.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const remote = await fetchHustles(userId);
      if (cancelled) return;
      setH((local) => {
        const remoteIds = new Set(remote.map((h) => h.id));
        const localOnly = local.filter((h) => !remoteIds.has(h.id));
        if (localOnly.length) void pushHustles(localOnly, userId).catch(() => {});
        const merged = [...remote, ...localOnly];
        return merged.length ? merged : local;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setHustles = useCallback(
    (h: Hustle[]) => {
      setH(h);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(h)).catch(() => {});
      // Replace, not upsert — this is the authoritative edited set, so a hustle
      // the user removed must actually disappear rather than resurface on sync.
      if (userId) void replaceHustles(h, userId).catch(() => {});
    },
    [userId],
  );

  const value = useMemo<HustlesContextValue>(() => ({ hustles, setHustles }), [hustles, setHustles]);
  return <HustlesContext.Provider value={value}>{children}</HustlesContext.Provider>;
}

export const useHustles = () => useContext(HustlesContext);
