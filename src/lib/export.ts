import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";

import { type Transaction } from "@/data/mock";

function csvCell(value: string | number): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function ext(uri: string): string {
  const m = /\.(jpg|jpeg|png|heic|webp)$/i.exec(uri);
  return m ? `.${m[1].toLowerCase()}` : ".jpg";
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
    const receiptName = t.imageUri ? `receipts/${t.id}${ext(t.imageUri)}` : "";
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

    if (t.imageUri && receipts) {
      try {
        const b64 = await FileSystem.readAsStringAsync(t.imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        receipts.file(`${t.id}${ext(t.imageUri)}`, b64, { base64: true });
      } catch {
        // skip unreadable images
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
