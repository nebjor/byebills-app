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
  uploadReceipt,
} from "@/lib/remote";
import { supabase } from "@/lib/supabase";

import { transactions as seed, type Transaction } from "./mock";

const STORAGE_KEY = "byebills:transactions";

/**
 * Fold a server row into what this device already knows.
 *
 * The server is authoritative for the data, but NOT for `imageUri` — that's a
 * file:// path only this device can open, and the server has never heard of it.
 * Taking the remote row wholesale would blank the photo in the detail screen
 * and drop it from the ZIP export.
 */
function mergeLocalImage(remote: Transaction, local?: Transaction): Transaction {
  if (!local) return remote;
  return {
    ...remote,
    imageUri: local.imageUri ?? remote.imageUri,
    imagePath: remote.imagePath ?? local.imagePath,
  };
}

/**
 * Push a transaction the server has never seen (created offline, or before
 * sync existed). Its photo has never been uploaded either, so do that first —
 * otherwise the row syncs with image_path null and the receipt stays trapped
 * on this phone.
 */
async function syncLocalOnly(t: Transaction, userId: string) {
  try {
    let imagePath = t.imagePath ?? null;
    if (!imagePath && t.imageUri?.startsWith("file://")) {
      imagePath = await uploadReceipt(t.imageUri, t.id, userId);
    }
    await pushTransaction(t, userId, imagePath);
  } catch {
    // Offline or storage hiccup — we retry on the next launch.
  }
}

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
        const byId = new Map(local.map((t) => [t.id, t]));

        // Keep this device's local photo when folding in the server's copy —
        // the remote row only knows a storage path, and dropping the file://
        // URI would blank the image everywhere it's rendered.
        const merged = remote.map((r) => mergeLocalImage(r, byId.get(r.id)));

        // Anything created offline exists only locally, so push it up rather
        // than letting the server's view silently delete it. Photos captured
        // offline still need uploading, so send the local URI along.
        const remoteIds = new Set(remote.map((t) => t.id));
        const localOnly = local.filter((t) => !remoteIds.has(t.id));
        for (const t of localOnly) void syncLocalOnly(t, userId);

        return [...merged, ...localOnly].sort((a, b) => b.date.localeCompare(a.date));
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
            // Postgres echoes our own INSERT straight back. Merging (rather
            // than replacing) keeps the local file:// photo we just captured.
            next[idx] = mergeLocalImage(incoming, prev[idx]);
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
      // Keep the path on the row too, so a later re-sync doesn't blank it.
      const row: Transaction = { ...t, imagePath: imagePath ?? t.imagePath };
      setTransactions((prev) => [row, ...prev]);
      if (userId) void pushTransaction(row, userId, imagePath).catch(() => {});
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
