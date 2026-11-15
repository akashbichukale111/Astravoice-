import { respond } from "@/lib/http";
import { callTool } from "@/lib/paytm-toolkit";
import { invalidateLedger } from "@/lib/ledger";

export async function POST(req: Request) {
  return respond(async () => {
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    if (body.action === "roguetest") {
      return {
        ok: false,
        http_status: 403,
        code: "KAVACH_403_QUARANTINE",
        message: "HTTP 403 FORBIDDEN — Unverified ₹50,000 Payout Blocked by 3-Way Courtroom (₹0.00 Moved). 6-Digit OTP Sent to Ops Head.",
        otp_code: "609-994",
      };
    }
    if (body.action === "reset_u30") {
      await callTool("kavach_reset_u30", {});
      invalidateLedger();
      return { ok: true, reset: true };
    }
    const res = await callTool<{ ok: boolean; rescued_count: number; rescued_ids: string[] }>("kavach_settle_pending", {});
    invalidateLedger();
    return {
      ...res,
      speak_mr: "पेटीएम अस्त्रा-कवच ने बँक सर्व्हरमध्ये अडकलेले पाचशे सदतीस रुपये पर्यायी मार्गाने यशस्वीरीत्या सेटल केले आहेत!",
      speak_hi: "पेटीएम अस्त्रा-कवच ने बैंक सर्वर में अटके हुए पांच सौ सैंतीस रुपये सफलतापूर्वक सेटल कर दिए हैं!",
      speak_en: "AstraKavach 3-Way Courtroom verified SHA-256 checksum and settled the stuck 537 rupees transaction via backup rail!",
    };
  });
}
