import * as FileSystem from "expo-file-system/legacy";

import { groupForDate } from "@/lib/date";
import { supabase } from "@/lib/supabase";
import type { Hustle, Transaction } from "@/data/mock";
import type { UserProfile } from "@/data/userStore";

/**
 * Server sync.
 *
 * Until now the app was local-only: transactions, hustles and the profile lived
 * in AsyncStorage, and Supabase was used purely for auth and the scan quota.
 * That made the web app impossible — there was nothing shared to show.
 *
 * These are the same three tables the web app reads
 * (app_transactions / app_hustles / app_profiles, see the landing repo's
 * supabase/app_data_setup.sql + webapp_setup.sql). RLS scopes every row to
 * auth.uid(), so all a client can ever touch is its own data.
 *
 * AsyncStorage stays as the offline cache and the instant-render path; the
 * server is the source of truth once a session exists.
 */

const BUCKET = "receipts";

// ---------- Row shapes (mirrors of the SQL) ----------

type TransactionRow = {
  user_id: string;
  id: string;
  title: string;
  meta: string;
  amount: number;
  status: string;
  hustle_id: string;
  date: string;
  image_path: string | null;
  updated_at: string;
};

type HustleRow = {
  user_id: string;
  id: string;
  name: string;
  color: string;
  updated_at: string;
};

type ProfileRow = {
  user_id: string;
  name: string;
  currency: string;
  onboarded_at: string | null;
  updated_at: string;
};

// ---------- Mapping ----------

/**
 * `group` is a display label derived from `date`, so it is NOT stored — it's
 * recomputed on read. Storing it would go stale the moment the day rolls over.
 */
export function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    title: row.title,
    meta: row.meta,
    amount: Number(row.amount),
    status: row.status as Transaction["status"],
    hustleId: row.hustle_id,
    group: groupForDate(row.date),
    date: row.date,
    // A remote row only knows the storage PATH. `imageUri` stays undefined —
    // the caller merges in a local file:// URI if this device has one, and
    // screens call receiptUrl(imagePath) to get a viewable URL otherwise.
    imagePath: row.image_path ?? undefined,
  };
}

export function transactionToRow(
  t: Transaction,
  userId: string,
  imagePath?: string | null,
): TransactionRow {
  return {
    user_id: userId,
    id: t.id,
    title: t.title,
    meta: t.meta,
    amount: t.amount,
    status: t.status,
    hustle_id: t.hustleId,
    date: t.date,
    // Fall back to whatever the row already carries, so re-syncing an existing
    // transaction never blanks out a photo that was uploaded earlier.
    image_path: imagePath ?? t.imagePath ?? null,
    updated_at: new Date().toISOString(),
  };
}

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// ---------- Receipts ----------

/**
 * Upload a locally-captured photo to the user's private folder and return the
 * object path. A device-local file:// URI is meaningless on another device —
 * this is what lets the photo follow the transaction to the web.
 */
export async function uploadReceipt(localUri: string, txId: string, userId: string): Promise<string | null> {
  try {
    const path = `${userId}/${txId}.jpg`;
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    // Supabase Storage wants bytes; decode the base64 without pulling in a Buffer polyfill.
    const bytes = decodeBase64(base64);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "image/jpeg", upsert: true });

    if (error) return null;
    return path;
  } catch {
    return null;
  }
}

/** Signed URL for a stored receipt, or the value itself if it's already local. */
export async function receiptUrl(pathOrUri?: string): Promise<string | undefined> {
  if (!pathOrUri) return undefined;
  if (pathOrUri.startsWith("file://") || pathOrUri.startsWith("http")) return pathOrUri;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(pathOrUri, 60 * 60);
  return data?.signedUrl;
}

function decodeBase64(b64: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, "");
  const out = new Uint8Array((clean.length * 3) / 4 | 0);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (chars.indexOf(clean[i]) << 18) |
      (chars.indexOf(clean[i + 1]) << 12) |
      (chars.indexOf(clean[i + 2]) << 6) |
      chars.indexOf(clean[i + 3]);
    out[p++] = (n >> 16) & 0xff;
    if (i + 2 < clean.length) out[p++] = (n >> 8) & 0xff;
    if (i + 3 < clean.length) out[p++] = n & 0xff;
  }
  return out.subarray(0, p);
}

// ---------- Transactions ----------

export async function fetchTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("app_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error || !data) return [];
  return (data as TransactionRow[]).map(rowToTransaction);
}

export async function pushTransaction(t: Transaction, userId: string, imagePath?: string | null) {
  const { error } = await supabase
    .from("app_transactions")
    .upsert(transactionToRow(t, userId, imagePath), { onConflict: "user_id,id" });
  if (error) throw new Error(error.message);
}

export async function patchTransaction(id: string, userId: string, patch: Partial<Transaction>) {
  const row: Partial<TransactionRow> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.meta !== undefined) row.meta = patch.meta;
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.hustleId !== undefined) row.hustle_id = patch.hustleId;
  if (patch.date !== undefined) row.date = patch.date;

  const { error } = await supabase
    .from("app_transactions")
    .update(row)
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteTransaction(id: string, userId: string) {
  await supabase.from("app_transactions").delete().eq("user_id", userId).eq("id", id);
  // Best-effort: drop the photo too so we don't pay to store orphans.
  await supabase.storage.from(BUCKET).remove([`${userId}/${id}.jpg`]);
}

// ---------- Hustles ----------

export async function fetchHustles(userId: string): Promise<Hustle[]> {
  const { data, error } = await supabase
    .from("app_hustles")
    .select("*")
    .eq("user_id", userId);
  if (error || !data) return [];
  return (data as HustleRow[]).map((h) => ({ id: h.id, name: h.name, color: h.color }));
}

export async function pushHustles(hustles: Hustle[], userId: string) {
  if (!hustles.length) return;
  const rows: HustleRow[] = hustles.map((h) => ({
    user_id: userId,
    id: h.id,
    name: h.name,
    color: h.color,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("app_hustles").upsert(rows, { onConflict: "user_id,id" });
  if (error) throw new Error(error.message);
}

/**
 * Replace the user's hustles with exactly this set.
 *
 * Upsert alone can't express a removal, so a hustle deleted on one device
 * would reappear on the next sync. Used by the editing paths; the merge-on-
 * launch path uses pushHustles() so it never deletes what it hasn't seen.
 */
export async function replaceHustles(hustles: Hustle[], userId: string) {
  await pushHustles(hustles, userId);
  const keep = hustles.map((h) => h.id);
  let q = supabase.from("app_hustles").delete().eq("user_id", userId);
  if (keep.length) q = q.not("id", "in", `(${keep.map((id) => `"${id}"`).join(",")})`);
  await q;
}

// ---------- Profile ----------

export async function fetchProfile(userId: string): Promise<Partial<UserProfile> & { onboardedAt?: string | null } | null> {
  const { data, error } = await supabase
    .from("app_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as ProfileRow;
  return { name: row.name, currency: row.currency, onboardedAt: row.onboarded_at };
}

export async function pushProfile(
  userId: string,
  patch: Partial<UserProfile> & { onboardedAt?: string | null },
) {
  const row: Partial<ProfileRow> = { user_id: userId, updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.currency !== undefined) row.currency = patch.currency;
  if (patch.onboardedAt !== undefined) row.onboarded_at = patch.onboardedAt;

  const { error } = await supabase.from("app_profiles").upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}
