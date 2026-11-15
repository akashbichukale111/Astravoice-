// The ledger is read from Paytm Sandbox Store (source of truth for status, SHA-256 checksum, and switch codes).
import { callTool } from "./paytm-toolkit";
import type { InvoiceStatus, LedgerRow, PaymentMode } from "./types";

type RawInvoice = {
  id?: string;
  status: InvoiceStatus;
  detail?: { currency_code?: string; reference?: string; metadata?: { create_time?: string }; invoice_date?: string };
  primary_recipients?: { billing_info?: { email_address?: string; name?: { given_name?: string; full_name?: string } } }[];
  items?: { name: string; brand?: string; quantity: string; unit_amount: { value: string } }[];
  amount?: { value: string; currency_code?: string };
  payments?: { transactions?: { method?: string; payment_date?: string; amount?: { value: string } }[] };
  checksum_hash?: string;
  switch_code?: "00" | "U30" | "U66";
  settlement_state?: "SETTLED" | "PENDING_SWITCH_U30" | "KAVACH_RESCUED";
};

export function modeFromReference(reference?: string): PaymentMode | "seed" | undefined {
  if (!reference?.startsWith("SD:")) return undefined;
  const tag = reference.slice(3);
  if (tag.startsWith("seed")) return "seed";
  return tag === "qr" ? "paypal_qr" : tag === "later" ? "paypal_later" : tag === "cash" ? "cash" : undefined;
}

export function rowFromInvoice(id: string, inv: RawInvoice): LedgerRow | null {
  const reference = inv.detail?.reference;
  if (!reference?.startsWith("SD:")) return null;
  const payment = inv.payments?.transactions?.[0];
  const cashPaid = payment?.method === "CASH";
  const recipient = inv.primary_recipients?.[0]?.billing_info;
  return {
    invoice_id: id,
    time: reference.startsWith("SD:seed") && payment?.payment_date ? normaliseDate(payment.payment_date) : (inv.detail?.metadata?.create_time ?? new Date().toISOString()),
    items: (inv.items ?? []).map((i) => ({ name: i.name, brand: i.brand, qty: Number(i.quantity), unit_price: Number(i.unit_amount.value) })),
    total: Number(inv.amount?.value ?? 0),
    currency: inv.detail?.currency_code ?? inv.amount?.currency_code ?? "INR",
    method: cashPaid || reference === "SD:cash" ? "CASH" : "PAYPAL",
    status: inv.status,
    payer: displayName(recipient),
    curated: reference.startsWith("SD:seed"),
    later: reference === "SD:later",
    payer_email: recipient?.email_address,
    checksum_hash: inv.checksum_hash,
    switch_code: inv.switch_code ?? "00",
    settlement_state: inv.settlement_state ?? "SETTLED",
  };
}

export function displayName(billing?: { email_address?: string; name?: { given_name?: string; full_name?: string } }): string | undefined {
  const name = billing?.name?.full_name ?? billing?.name?.given_name;
  if (name === "Customer") return billing?.email_address ?? "Walk-in Customer";
  return name || billing?.email_address;
}

function normaliseDate(d: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T20:00:00.000Z` : d;
}

let listCache: { rows: LedgerRow[]; at: number } | null = null;
const TTL_MS = 4000;

async function listAllInvoiceIds(): Promise<{ id: string; status: InvoiceStatus }[]> {
  const res = await callTool<{ items?: { id: string; status: InvoiceStatus }[]; total_pages?: number }>("list_invoices", { page: 1, page_size: 100, total_required: true });
  return (res.items ?? []).map((i) => ({ id: i.id, status: i.status }));
}

export async function fetchLedger(opts: { fresh?: boolean } = {}): Promise<LedgerRow[]> {
  if (!opts.fresh && listCache && Date.now() - listCache.at < TTL_MS) return listCache.rows;
  const ids = await listAllInvoiceIds();
  const rows = await Promise.all(
    ids.map(async ({ id }) => {
      const inv = await callTool<RawInvoice>("get_invoice", { invoice_id: id });
      return rowFromInvoice(id, inv);
    }),
  );
  const clean = rows.filter((r): r is LedgerRow => r !== null).sort((a, b) => b.time.localeCompare(a.time));
  listCache = { rows: clean, at: Date.now() };
  return clean;
}

export function invalidateLedger() {
  listCache = null;
}
