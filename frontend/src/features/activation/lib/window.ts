import { fromYmd, toYmd } from "@/shared/lib/date";

// Opening date means from the start of that local day.
export function opensAtFromYmd(ymd: string): string | null {
  const d = fromYmd(ymd);
  return d ? d.toISOString() : null;
}

// Closing date is inclusive, so the window ends at the start of the next local day.
export function closesAtFromYmd(ymd: string): string | null {
  const d = fromYmd(ymd);
  if (!d) return null;
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

export function ymdFromOpensAt(iso: string | null): string {
  return iso ? toYmd(new Date(iso)) : "";
}

export function ymdFromClosesAt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  d.setDate(d.getDate() - 1);
  return toYmd(d);
}
