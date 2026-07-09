import * as FileSystem from "expo-file-system/legacy";

/**
 * Receipt/invoice extraction.
 *
 * Two paths:
 *  1. PRODUCTION — POST the image to our backend (/api/mobile/extract) with the
 *     user's Supabase access token. The backend holds the Gemini key and
 *     enforces the monthly quota. Used when a backend URL + auth token exist.
 *  2. DEV — call Gemini directly with EXPO_PUBLIC_GEMINI_API_KEY. Used while
 *     developing before auth is wired. The key is bundled into the app, so this
 *     path must NOT ship to production.
 */

const MODEL = "gemini-2.5-flash";

const EXTRACTION_PROMPT = `You are an expert bookkeeper for small Swiss businesses.
Analyze this invoice/bill image and extract the following fields as JSON.

Required JSON schema:
{
  "type": "income" or "expense",
  "document_type": "invoice" or "bill",
  "status": "pending" or "paid" or "unpaid",
  "counterparty": "company or person name",
  "description": "brief description of what the invoice is for",
  "amount": number (total amount),
  "currency": "CHF" or other ISO currency code,
  "payment_method": "cash" | "bank" | "twint" | "card" | "other" | null,
  "document_ref": "invoice/reference number or null",
  "document_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "vat_amount": number or null,
  "vat_rate": number or null,
  "confidence": number between 0 and 1
}

Rules:
- If the document is sent TO the business (something they must pay), it's an "expense" with document_type "bill"
- If the document is sent BY the business (they expect payment), it's "income" with document_type "invoice"
- When in doubt about direction, default to "expense" / "bill" (most common scan use case)
- Extract amounts as plain numbers without currency symbols
- Dates are printed in DD.MM.YYYY (Swiss/European) format — read day, month and the EXACT 4-digit year as printed; never guess or default the year, and if only two year digits are shown treat "YY" as 20YY
- Output document_date and due_date as ISO YYYY-MM-DD; a date must never be in the future
- Set confidence based on how clear/readable the document is
- Return ONLY valid JSON, no markdown fences, no explanation`;

export type Extracted = {
  type: "income" | "expense";
  status: string;
  counterparty: string | null;
  description: string | null;
  amount: number;
  currency: string;
  vatAmount: number | null;
  vatRate: number | null;
  paymentMethod: string | null;
  documentRef: string | null;
  documentDate: string | null;
  dueDate: string | null;
  confidence: number;
};

/** Thrown when the backend blocks a scan (402): daily cap hit or trial ended. */
export class QuotaError extends Error {
  used?: number;
  cap?: number;
  reason?: string; // 'daily_cap' | 'trial_ended'
  constructor(message: string, used?: number, cap?: number, reason?: string) {
    super(message);
    this.name = "QuotaError";
    this.used = used;
    this.cap = cap;
    this.reason = reason;
  }
}

/**
 * The auth layer registers a function here that returns the current Supabase
 * access token (or null). Kept as a setter so this file never imports the
 * Supabase SDK directly — that keeps the dev build working before auth is
 * installed.
 */
let getAccessToken: (() => Promise<string | null>) | null = null;
export function setAccessTokenProvider(fn: () => Promise<string | null>) {
  getAccessToken = fn;
}

function mimeFromUri(uri: string): string {
  const m = /\.(jpe?g|png|heic|webp)$/i.exec(uri);
  const ext = m ? m[1].toLowerCase() : "jpeg";
  if (ext === "png") return "image/png";
  if (ext === "heic") return "image/heic";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

function mapExtraction(p: Record<string, unknown>): Extracted {
  const num = (v: unknown) => (v != null ? Number(v) : null);
  return {
    type: p.type === "income" ? "income" : "expense",
    status: (p.status as string) ?? "pending",
    counterparty: (p.counterparty as string) ?? null,
    description: (p.description as string) ?? null,
    amount: Number(p.amount) || 0,
    currency: (p.currency as string) ?? "CHF",
    vatAmount: num(p.vat_amount),
    vatRate: num(p.vat_rate),
    paymentMethod: (p.payment_method as string) ?? null,
    documentRef: (p.document_ref as string) ?? null,
    documentDate: (p.document_date as string) ?? null,
    dueDate: (p.due_date as string) ?? null,
    confidence: typeof p.confidence === "number" ? p.confidence : 0.5,
  };
}

export async function extractReceipt(uri: string): Promise<Extracted> {
  const backendUrl = process.env.EXPO_PUBLIC_EXTRACT_URL;
  const token = getAccessToken ? await getAccessToken() : null;

  if (backendUrl && token) {
    return extractViaBackend(uri, backendUrl, token);
  }
  return extractViaGeminiDev(uri);
}

/** PRODUCTION path — image goes to our backend, key + quota live there. */
async function extractViaBackend(uri: string, url: string, token: string): Promise<Extracted> {
  const form = new FormData();
  // React Native FormData accepts a file descriptor object.
  form.append("file", {
    uri,
    name: "receipt.jpg",
    type: mimeFromUri(uri),
  } as unknown as Blob);

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (res.status === 402) {
    const body = await res.json().catch(() => ({}));
    throw new QuotaError(body.error ?? "Scan limit reached", body.used, body.cap, body.reason);
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Extraction failed (${res.status}): ${err}`);
  }

  const json = await res.json();
  return mapExtraction(json.extraction ?? json);
}

/** DEV path — direct Gemini call using the bundled EXPO_PUBLIC key. */
async function extractViaGeminiDev(uri: string): Promise<Extracted> {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!key) {
    throw new Error("EXPO_PUBLIC_GEMINI_API_KEY is not set. Add it to your .env and restart the bundler.");
  }

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const mimeType = mimeFromUri(uri);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const year = now.getFullYear();
  const prompt =
    `${EXTRACTION_PROMPT}\n\n` +
    `Today's date is ${today} (current year ${year}). Receipts are almost always from ${year}, ` +
    `occasionally the previous year, and NEVER in the future. On faded/crumpled thermal receipts a "6" ` +
    `can look like a "0" — if the printed year is at all ambiguous, choose the most recent plausible year ` +
    `(prefer ${year}). Do not output a year more than one year before ${year}.`;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const body = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
    generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
  };

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No content in Gemini response");
  return mapExtraction(JSON.parse(text));
}
