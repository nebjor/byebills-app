import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { transactions as seed, type Transaction } from "./mock";

const STORAGE_KEY = "byebills:transactions";

type TransactionsContextValue = {
  transactions: Transaction[];
  update: (id: string, patch: Partial<Transaction>) => void;
  remove: (id: string) => void;
  add: (t: Transaction) => void;
};

const TransactionsContext = createContext<TransactionsContextValue>({
  transactions: seed,
  update: () => {},
  remove: () => {},
  add: () => {},
});

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(seed);
  const hydrated = useRef(false);

  // Load saved transactions once on mount.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v) {
          try {
            setTransactions(JSON.parse(v) as Transaction[]);
          } catch {
            // ignore malformed value
          }
        }
      })
      .finally(() => {
        hydrated.current = true;
      });
  }, []);

  // Persist on every change (after hydration, so we don't overwrite with the seed).
  useEffect(() => {
    if (hydrated.current) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)).catch(() => {});
    }
  }, [transactions]);

  const update = useCallback(
    (id: string, patch: Partial<Transaction>) =>
      setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    [],
  );
  const remove = useCallback(
    (id: string) => setTransactions((prev) => prev.filter((t) => t.id !== id)),
    [],
  );
  const add = useCallback((t: Transaction) => setTransactions((prev) => [t, ...prev]), []);

  const value = useMemo<TransactionsContextValue>(
    () => ({ transactions, update, remove, add }),
    [transactions, update, remove, add],
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}

export const useTransactions = () => useContext(TransactionsContext);
