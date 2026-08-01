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

import { useAuth } from "@/data/authStore";
import {
  deleteTransaction,
  fetchTransactions,
  patchTransaction,
  pushTransaction,
  rowToTransaction,
} from "@/lib/remote";
import { supabase } from "@/lib/supabase";

import { transactions as seed, type Transaction } from "./mock";

const STORAGE_KEY = "byebills:transactions";

/**
 * Transactions.
 *
 * AsyncStorage is the offline cache (so the list paints instantly on launch and
 * still works on a train), but Supabase is the source of truth whenever there's
 * a session. Every mutation writes through, and a realtime channel folds in
 * changes made elsewhere — which is what makes a receipt scanned here appear on
 * the web app, and vice versa.
 */

type TransactionsContextValue = {
  transactions: Transaction[];
  update: (id: string, patch: Partial<Transaction>) => void;
  remove: (id: string) => void;
  add: (t: Transaction, imagePath?: string | null) => void;
  syncing: boolean;
};

const TransactionsContext = createContext<TransactionsContextValue>({
  transactions: seed,
  update: () => {},
  remove: () => {},
  add: () => {},
  syncing: false,
});

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [transactions, setTransactions] = useState<Transaction[]>(seed);
  const [syncing, setSyncing] = useState(false);
  const hydrated = useRef(false);

  // 1. Local cache first — instant paint, works offline.
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

  // 2. Then the server, once we know who the user is.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setSyncing(true);

    (async () => {
      const remote = await fetchTransactions(userId);
      if (cancelled) return;

      setTransactions((local) => {
        // Union by id. Anything created offline exists only locally, so push it
        // up rather than letting the server's view silently delete it.
        const remoteIds = new Set(remote.map((t) => t.id));
        const localOnly = local.filter((t) => !remoteIds.has(t.id));
        for (const t of localOnly) void pushTransaction(t, userId).catch(() => {});
        return [...remote, ...localOnly].sort((a, b) => b.date.localeCompare(a.date));
      });
      setSyncing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 3. Realtime — changes from the web (or another phone) land here live.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`tx-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_transactions", filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const gone = payload.old as { id: string };
            setTransactions((prev) => prev.filter((t) => t.id !== gone.id));
            return;
          }
          const incoming = rowToTransaction(
            payload.new as Parameters<typeof rowToTransaction>[0],
          );
          setTransactions((prev) => {
            const idx = prev.findIndex((t) => t.id === incoming.id);
            if (idx === -1) {
              return [incoming, ...prev].sort((a, b) => b.date.localeCompare(a.date));
            }
            const next = [...prev];
            next[idx] = incoming;
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Persist the cache on every change (after hydration, so we don't clobber it
  // with the seed).
  useEffect(() => {
    if (hydrated.current) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)).catch(() => {});
    }
  }, [transactions]);

  const update = useCallback(
    (id: string, patch: Partial<Transaction>) => {
      setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      if (userId) void patchTransaction(id, userId, patch).catch(() => {});
    },
    [userId],
  );

  const remove = useCallback(
    (id: string) => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      if (userId) void deleteTransaction(id, userId).catch(() => {});
    },
    [userId],
  );

  const add = useCallback(
    (t: Transaction, imagePath?: string | null) => {
      setTransactions((prev) => [t, ...prev]);
      if (userId) void pushTransaction(t, userId, imagePath).catch(() => {});
    },
    [userId],
  );

  const value = useMemo<TransactionsContextValue>(
    () => ({ transactions, update, remove, add, syncing }),
    [transactions, update, remove, add, syncing],
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}

export const useTransactions = () => useContext(TransactionsContext);
