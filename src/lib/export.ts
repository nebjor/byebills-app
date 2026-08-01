import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";

import { type Transaction } from "@/data/mock";
import { receiptUrl } from "@/lib/remote";

function csvCell(value: string | number): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function ext(uri: string): string {
  const m = /\.(jpg|jpeg|png|heic|webp)$/i.exec(uri);
  return m ? `.${m[1].toLowerCase()}` : ".jpg";
}

/**
 * Read a receipt as base64, wherever it lives.
 *
 * Local file first (no network, always current). Otherwise the row only knows
 * a storage path — that is NOT readable by FileSystem, so it has to be
 * downloaded via a signed URL. Without this, receipts scanned on another
 * device would be silently missing from the export a tax office receives.
 */
async function readReceiptBase64(t: Transaction): Promise<string | null> {
  if (t.imageUri?.startsWith("file://")) {
    return FileSystem.readAsStringAsync(t.imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  const url = await receiptUrl(t.imagePath);
  if (!url) return null;

  const tmp = `${FileSystem.cacheDirectory}export-${t.id}${ext(t.imagePath ?? "")}`;
  const res = await FileSystem.downloadAsync(url, tmp);
  const b64 = await FileSystem.readAsStringAsync(res.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await FileSystem.deleteAsync(tmp, { idempotent: true });
  return b64;
}

/**
 * Build a .zip containing transactions.csv plus the receipt photos, and open
 * the share sheet so the user can save it / send it to their tax office.
 * `label` is used for the file name (e.g. "2026-06", "2026", "all").
 */
export async function exportTransactions(
  items: Transaction[],
  label: string,
  currency = "CHF",
): Promise<boolean> {
  if (!items.length) return false;

  const zip = new JSZip();
  const receipts = zip.folder("receipts");

  const header = ["id", "date", "title", "category", "type", "amount", "currency", "receipt"].join(",");
  const lines: string[] = [header];

  for (const t of items) {
    const type = t.amount >= 0 ? "income" : "expense";
    // A transaction has a receipt if EITHER this device holds the file or the
    // row points at one in storage (scanned on another device / the web).
    const hasReceipt = !!(t.imageUri || t.imagePath);
    const receiptName = hasReceipt ? `receipts/${t.id}${ext(t.imageUri ?? t.imagePath ?? "")}` : "";
    lines.push(
      [
        csvCell(t.id),
        csvCell(t.date ?? ""),
        csvCell(t.title),
        csvCell(t.meta),
        type,
        t.amount.toFixed(2),
        csvCell(currency),
        csvCell(receiptName),
      ].join(","),
    );

    if (hasReceipt && receipts) {
      try {
        const b64 = await readReceiptBase64(t);
        if (b64) {
          receipts.file(`${t.id}${ext(t.imageUri ?? t.imagePath ?? "")}`, b64, { base64: true });
        }
      } catch {
        // skip unreadable images — the CSV row still names the expected file
      }
    }
  }

  zip.file("transactions.csv", lines.join("\n"));

  const base64 = await zip.generateAsync({ type: "base64" });
  const uri = `${FileSystem.cacheDirectory}byebills-${label}.zip`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/zip",
      dialogTitle: `byeBills export — ${label}`,
      UTI: "public.zip-archive",
    });
  }
  return true;
}
