/** Shared date helpers — ISO storage, device-locale display, group labels. */

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const parseISODate = (s?: string): Date => {
  if (s) {
    // Tolerant of non-zero-padded months/days (e.g. "2026-6-3") and trailing time.
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return new Date();
};

/** Canonical "YYYY-MM" key for a stored date, robust to formatting variations. */
export const monthKey = (iso?: string): string => {
  const d = parseISODate(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Long, localized date, e.g. "23 June 2026" / "23. Juni 2026" per device locale. */
export const formatDate = (d: Date) =>
  d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

/** Date-group label for lists: Today / Yesterday / localized short date. */
export function groupForDate(iso: string): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const d = parseISODate(iso);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
