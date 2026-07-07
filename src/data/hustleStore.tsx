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

import { hustles as seed, type Hustle } from "./mock";

const STORAGE_KEY = "byebills:hustles";

type HustlesContextValue = {
  hustles: Hustle[];
  setHustles: (h: Hustle[]) => void;
};

const HustlesContext = createContext<HustlesContextValue>({
  hustles: seed,
  setHustles: () => {},
});

export function HustlesProvider({ children }: { children: ReactNode }) {
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

  const setHustles = useCallback((h: Hustle[]) => {
    setH(h);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(h)).catch(() => {});
  }, []);

  const value = useMemo<HustlesContextValue>(() => ({ hustles, setHustles }), [hustles, setHustles]);
  return <HustlesContext.Provider value={value}>{children}</HustlesContext.Provider>;
}

export const useHustles = () => useContext(HustlesContext);
