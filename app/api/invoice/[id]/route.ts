import { getInvoiceAmount, getInvoiceStatus, recordExternalPayment } from "@/lib/invoices";
import { invalidateLedger } from "@/lib/ledger";
import { respond } from "@/lib/http";
import { callTool } from "@/lib/paytm-toolkit";
import { PAID_STATES } from "@/lib/statuses";

export const maxDuration = 15;

type Ctx = { params: Promise<{ id: string }> };

const INVOICE_ID = /^INV2-[A-Z0-9-]{6,48}$/;
const badId = (id: string) => { if (!INVOICE_ID.test(id)) throw new Error("That is not a valid Paytm invoice id."); };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return respond(async () => {
    badId(id);
    return { invoice_id: id, status: await getInvoiceStatus(id) };
  });
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  return respond(async () => {
    badId(id);
    const body = (await req.json().catch(() => ({}))) as { action?: string; simulate_u30_timeout?: boolean };
    if (body.action === "paytm_sandbox_pay") {
      const sim = await callTool<{ status: string; switch_code: string; checksum_hash: string }>("simulate_paytm_sandbox_pay", {
        invoice_id: id,
        simulate_u30_timeout: !!body.simulate_u30_timeout,
      });
      invalidateLedger();
      return { invoice_id: id, status: sim.status, switch_code: sim.switch_code, checksum_hash: sim.checksum_hash };
    }
    if (body.action !== "cash" && body.action !== "cancel") throw new Error("Unknown action.");
    const before = await getInvoiceStatus(id);
    if (PAID_STATES.includes(before)) return { invoice_id: id, status: before };
    if (body.action === "cash") {
      const { total, currency } = await getInvoiceAmount(id);
      await recordExternalPayment(id, total, currency, { method: "CASH" });
    } else {
      await callTool("cancel_invoice", { invoice_id: id });
    }
    invalidateLedger();
    return { invoice_id: id, status: await getInvoiceStatus(id) };
  });
}
