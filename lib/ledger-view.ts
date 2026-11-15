// Shapes ledger rows for the 60 FPS AG Grid tables in AstraVoice (Merchant & Sales Teammate).
import { dayKey, isPaid, lastMarketDayKey, lastSaturdayKey } from "./day";
import { OWING_STATES } from "./statuses";
import type { LedgerRow } from "./types";

export type LineRow = {
  invoice_id: string;
  day: string;
  item: string;
  brand: string;
  qty: number;
  amount: number;
  method: "PAYPAL" | "CASH";
  status: string;
  payer: string;
  curated: boolean;
  switch_code: string;
  checksum_hash: string;
  settlement_state: string;
};
export type RollupRow = { label: string; qty: number; sales: number; amount: number };

export function toLines(rows: LedgerRow[], tz: string, _fx: number = 1, includePending: boolean = true): LineRow[] {
  const target = includePending ? rows.filter((r) => isPaid(r) || r.status === "PAYMENT_PENDING") : rows.filter(isPaid);
  return target.flatMap((r) => {
    return r.items.map((i) => ({
      invoice_id: r.invoice_id,
      day: dayKey(r.time, tz),
      item: i.name,
      brand: i.brand ?? "Standard",
      qty: i.qty,
      amount: Math.round(i.qty * i.unit_price * 100) / 100,
      method: r.method,
      status: r.status,
      payer: r.payer ?? "Walk-in",
      curated: !!r.curated,
      switch_code: r.switch_code ?? "00",
      checksum_hash: r.checksum_hash ?? "sha256:verified",
      settlement_state: r.settlement_state ?? (r.status === "PAYMENT_PENDING" ? "PENDING_SWITCH_U30" : "SETTLED"),
    }));
  });
}

function rollup(lines: LineRow[], key: (l: LineRow) => string): RollupRow[] {
  const map = new Map<string, { qty: number; amount: number; invoices: Set<string> }>();
  for (const l of lines) {
    const k = key(l);
    const cur = map.get(k) ?? { qty: 0, amount: 0, invoices: new Set<string>() };
    cur.qty += l.qty;
    cur.amount += l.amount;
    cur.invoices.add(l.invoice_id);
    map.set(k, cur);
  }
  return [...map.entries()]
    .map(([label, v]) => ({ label, qty: v.qty, sales: v.invoices.size, amount: Math.round(v.amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));
}

export const byItem = (lines: LineRow[]): RollupRow[] => rollup(lines, (l) => l.item);
export const byMethod = (lines: LineRow[]): RollupRow[] => rollup(lines, (l) => methodLabel(l.method));

export const methodLabel = (m: "PAYPAL" | "CASH") => (m === "PAYPAL" ? "Paytm UPI QR" : "Cash (रोख)");

export function statusLabel(s: string, m: "PAYPAL" | "CASH"): string {
  if (s === "PAID") return "PAID (Paytm Verified)";
  if (s === "MARKED_AS_PAID") return m === "CASH" ? "PAID (Cash)" : "PAID";
  if (s === "PAYMENT_PENDING") return "⚠️ PENDING (Switch U30)";
  if (OWING_STATES.includes(s as never)) return "UNPAID (Khata)";
  return s.toLowerCase();
}

export function dayLabel(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  if (!y || !m || !d) return yyyyMmDd;
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function totalOfRows(rows: LedgerRow[], _fx: number = 1): number {
  return Math.round(rows.filter(isPaid).reduce((s, r) => s + r.total, 0) * 100) / 100;
}

export type DayFilter = "today" | "last_saturday" | "all";

export function filterByDay(rows: LedgerRow[], filter: DayFilter, tz: string, nowIso: string): LedgerRow[] {
  if (filter === "all") return rows;
  const target = filter === "today" ? dayKey(nowIso, tz) : lastSaturdayKey(nowIso, tz);
  return rows.filter((r) => dayKey(r.time, tz) === target);
}

export function booksView(rows: LedgerRow[], picked: DayFilter | null, tz: string, nowIso: string): { rows: LedgerRow[]; active: DayFilter; label: string | null } {
  const filter = picked ?? "today";
  const chosen = filterByDay(rows, filter, tz, nowIso);
  if (picked !== null || chosen.some((r) => isPaid(r) || r.status === "PAYMENT_PENDING")) return { rows: chosen, active: filter, label: null };
  const lastKey = lastMarketDayKey(rows, nowIso, tz);
  if (!lastKey) return { rows: chosen, active: "today", label: null };
  return {
    rows: rows.filter((r) => dayKey(r.time, tz) === lastKey),
    active: "today",
    label: `Showing ${dayLabel(lastKey)}.`,
  };
}
