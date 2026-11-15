// Presentational screens for AstraVoice (Merchant & Sales Teammate).
import type { Awaiting, TraceStep } from "@/lib/counter-machine";
import { formatMoney, saidToDoneRow } from "@/lib/format";
import { getSamples, getSamplesCaption } from "@/lib/sample";
import { plateText, type ChatterPhase } from "@/lib/transcript";
import type { LedgerRow, Sale, SupportedLanguage } from "@/lib/types";
import { getT, translateItemName } from "@/lib/i18n";

const MicIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V22h2v-3.08A7 7 0 0 0 19 12h-2Z" /></svg>
);

export function StartScreen({ onStart, lang = "mr-IN" }: { onStart: () => void; lang?: SupportedLanguage }) {
  const t = getT(lang);
  return (
    <div className="stage">
      <button className="mic" onClick={onStart} aria-label={t.startTitle}><MicIcon /></button>
      <p className="line">{t.startTitle}</p>
      <p className="sub">{t.startSub}</p>
    </div>
  );
}

export function ListeningStage({
  transcript,
  chatter,
  message,
  thinking,
  live,
  lang = "mr-IN",
  onTry,
  onToggleMic,
}: {
  transcript: string;
  chatter?: ChatterPhase;
  message: string;
  thinking: boolean;
  live: boolean;
  lang?: SupportedLanguage;
  onTry: (sentence: string) => void;
  onToggleMic?: () => void;
}) {
  const t = getT(lang);
  return (
    <div className="stage">
      <button
        type="button"
        className={`mic ${live && !thinking ? "live" : ""}`}
        onClick={onToggleMic}
        aria-label={live ? t.micStopBtn : t.micStartBtn}
        style={{ cursor: "pointer" }}
        title={live ? t.micStopBtn : t.micStartBtn}
      >
        <MicIcon />
      </button>

      {onToggleMic && (
        <button
          type="button"
          onClick={onToggleMic}
          style={{
            background: live ? "#dc2626" : "var(--honey)",
            color: "#fff",
            border: "2px solid #fff",
            borderRadius: "999px",
            padding: "8px 20px",
            fontSize: "15px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: live ? "0 4px 14px rgba(220,38,38,0.4)" : "0 4px 14px rgba(201,138,27,0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            margin: "-8px 0 4px",
            transition: "all 0.2s ease",
          }}
        >
          {live ? `🛑 ${t.micStopBtn}` : `🎙️ ${t.micStartBtn}`}
        </button>
      )}

      <p className="line">{thinking ? t.calculating : message || (live ? t.listeningTitle : t.micMutedHint)}</p>
      <div className="heard-slot" style={{ minHeight: "84px", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            background: transcript ? "#ffffff" : "rgba(255, 255, 255, 0.92)",
            border: transcript ? "2px solid #00baf2" : "2px dashed var(--honey)",
            borderRadius: "22px",
            padding: "12px 24px",
            boxShadow: transcript ? "0 8px 28px rgba(0, 186, 242, 0.22)" : "0 4px 14px rgba(201, 138, 27, 0.12)",
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            maxWidth: "min(94vw, 760px)",
            transition: "all 0.2s ease",
          }}
        >
          <span
            style={{
              fontSize: 13,
              background: live ? (transcript ? "#00baf2" : "#16a34a") : "var(--cash)",
              color: "#fff",
              padding: "4px 10px",
              borderRadius: 10,
              fontWeight: 800,
              letterSpacing: "0.03em",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {live ? (transcript ? "🎙️ बोल रहे हैं..." : "🟢 माइक तैयार (बोलें)") : "⚪ माइक बंद"}
          </span>
          <p
            style={{
              margin: 0,
              fontSize: transcript ? 22 : 17,
              fontWeight: transcript ? 700 : 500,
              color: transcript ? "var(--ink)" : "var(--ink-soft)",
              wordBreak: "break-word",
              fontStyle: transcript ? "normal" : "italic",
            }}
          >
            {transcript
              ? `“${transcript}”`
              : live
              ? lang === "hi-IN"
                ? "माइक चालू है... बोलें (उदा. पारलेजी बिस्कुट, 20 किलो गेहू)"
                : lang === "en-IN"
                ? "Mic is listening... speak (e.g. Parle-G, 20 kg wheat)"
                : "माईक सुरू आहे... बोला (उदा. पारलेजी बिस्कीट, २० किलो गहू)"
              : t.micMutedHint}
          </p>
          {transcript && (
            <button
              type="button"
              onClick={() => onTry(transcript)}
              style={{
                marginLeft: "auto",
                background: "linear-gradient(135deg, #002970, #00baf2)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: "0 2px 10px rgba(0,41,112,0.3)",
              }}
            >
              ⚡ {lang === "hi-IN" ? "तुरंत बिल बनाएं" : lang === "en-IN" ? "Create Bill" : "लगेच बिल बनवा"}
            </button>
          )}
        </div>
      </div>
      {!thinking && (
        <div className="samples">
          <p className="sample-caption">{getSamplesCaption(lang)}</p>
          <div className="sample-row">
            {getSamples(lang).map((x) => (
              <button key={x.id} className="hint-btn" title={x.sentence} onClick={() => onTry(x.sentence)}>
                <span>{x.label}</span>{x.shown && <> <em>“{x.shown}”</em></>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ConfirmStage(props: {
  sale: Sale; focusSku?: string; message: string; busy: boolean; lang?: SupportedLanguage;
  onFocus: (sku: string) => void; onAdjust: (sku: string, delta: number) => void; onYes: () => void; onNo: () => void;
}) {
  const { sale, focusSku, busy, lang = "mr-IN" } = props;
  const t = getT(lang);
  return (
    <div className="stage">
      <div className="chips">
        {sale.items.map((i) => (
          <div key={i.sku} className={`chip ${i.sku === focusSku ? "focus" : ""}`} onClick={() => props.onFocus(i.sku)}>
            <span className="qty">{i.qty}×</span>
            <span>
              {translateItemName(i.name, lang)}
              {i.brand ? <small style={{ display: "block", fontSize: 12, color: "#6f6253" }}>Brand: {i.brand} · ₹{i.unit_price}/unit</small> : null}
            </span>
            <span className="price">{formatMoney(i.unit_price * i.qty, sale.currency)}</span>
            {i.sku === focusSku && (
              <span className="stepper">
                <button aria-label={`One less ${i.name}`} onClick={(e) => { e.stopPropagation(); props.onAdjust(i.sku, -1); }}>−</button>
                <button aria-label={`One more ${i.name}`} onClick={(e) => { e.stopPropagation(); props.onAdjust(i.sku, 1); }}>+</button>
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="total">{formatMoney(sale.total, sale.currency)}</p>
      <p className="sub">
        {sale.payment_mode === "cash"
          ? t.confirmSubCash
          : sale.payment_mode === "paypal_later"
          ? `${t.confirmSubKhata}${sale.payer_name ? ` · ${sale.payer_name}` : ""}`
          : t.confirmSubQr}
      </p>
      <div className="actions">
        <button className="btn" disabled={busy} onClick={props.onYes}>{busy ? "Paytm QR..." : t.btnYes}</button>
        <button className="btn ghost" disabled={busy} onClick={props.onNo}>{t.btnCancel}</button>
      </div>
    </div>
  );
}

export function QrScreen(props: {
  awaiting: Awaiting;
  offline: boolean;
  notice: string;
  lang?: SupportedLanguage;
  onSimulatePaytmPay: (simulateU30?: boolean) => void;
  onCash: () => void;
  onLater: () => void;
  onCancel: () => void;
  onBackToCounter?: () => void;
}) {
  const { awaiting, offline, lang = "mr-IN" } = props;
  const t = getT(lang);
  const pending = awaiting.status === "PAYMENT_PENDING";
  const isSvg = awaiting.qr_png_base64?.startsWith("PHN2Zy"); // '<svg' in base64
  const qrSrc = awaiting.qr_png_base64
    ? `data:${isSvg ? "image/svg+xml" : "image/png"};base64,${awaiting.qr_png_base64}`
    : "";

  return (
    <div className="full qr">
      <p className="total">{formatMoney(awaiting.sale.total, awaiting.sale.currency)}</p>
      {qrSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="qr-img" alt="Paytm Dynamic UPI QR code" src={qrSrc} />
      ) : (
        <div className="qr-fallback">Scan Paytm UPI Link:<br />{awaiting.payer_url}</div>
      )}
      <p className="sub">
        {pending
          ? lang === "hi-IN"
            ? "⚠️ बैंक सर्वर स्लो है (ISO 8583 U30 Timeout) — 60 FPS AG Grid लेजर में देखें!"
            : lang === "en-IN"
            ? "⚠️ Bank Server Timeout (ISO 8583 U30) — View in 60 FPS AG Grid!"
            : "⚠️ बँक सर्व्हर स्लो आहे (ISO 8583 U30 Timeout) — 60 FPS AG Grid वर पहा!"
          : props.notice || (lang === "hi-IN" ? "ग्राहक को Paytm / किसी भी UPI ऐप से स्कैन करने कहें।" : "ग्राहकाला Paytm / कोणत्याही UPI ॲपने स्कॅन करायला सांगा.")}
      </p>

      {/* Prominent Action Banner when Bank Server is Down (U30 Timeout) */}
      {pending && (
        <div
          style={{
            background: "#fffbeb",
            border: "2px solid #f59e0b",
            borderRadius: 14,
            padding: "14px 18px",
            margin: "12px auto",
            maxWidth: 520,
            boxShadow: "0 4px 14px rgba(245, 158, 11, 0.25)",
            textAlign: "center",
          }}
        >
          <div style={{ fontWeight: 800, color: "#b45309", fontSize: 16, marginBottom: 6 }}>
            ⚠️ {lang === "hi-IN" ? "बैंक सर्वर स्लो (U30 Timeout) — पेमेंट पेंडिंग" : lang === "en-IN" ? "Bank Server Slow (U30 Timeout) — Payment Pending" : "बँक सर्व्हर स्लो (U30 Timeout) — पेमेंट पेंडिंग"}
          </div>
          <p style={{ margin: "0 0 14px", color: "#78350f", fontSize: 13, lineHeight: 1.4 }}>
            {lang === "hi-IN"
              ? "यह व्यवहार 60 FPS लेजर में 'Pending - ₹" + awaiting.sale.total + " U30' के रूप में सुरक्षित सेव हो गया है। आप मुख्य काउंटर पर लौट सकते हैं या लेजर में देख सकते हैं।"
              : lang === "en-IN"
              ? "This sale of ₹" + awaiting.sale.total + " is safely logged in the 60 FPS Ledger as pending. You can return to the counter or open the Ledger."
              : "हा व्यवहार 60 FPS लेजरमध्ये 'Pending - ₹" + awaiting.sale.total + " U30' म्हणून सुरक्षित सेव्ह झाला आहे. तुम्ही मुख्य काउंटरवर परत जाऊ शकता किंवा लेजरमध्ये तपासू शकता."}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={props.onBackToCounter || props.onCancel}
              style={{
                background: "#16a34a",
                color: "#fff",
                border: "none",
                padding: "10px 20px",
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(22, 163, 74, 0.35)",
              }}
            >
              {lang === "hi-IN" ? "← मुख्य काउंटर पर वापस जाएं" : lang === "en-IN" ? "← Return to Counter" : "← मुख्य काउंटरवर परत जा"}
            </button>
            <a
              href={`/ledger?lang=${lang}`}
              style={{
                background: "#0284c7",
                color: "#fff",
                textDecoration: "none",
                padding: "10px 20px",
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 14,
                boxShadow: "0 2px 8px rgba(2, 132, 199, 0.35)",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {lang === "hi-IN" ? "📊 60 FPS लेजर में देखें →" : lang === "en-IN" ? "📊 View in 60 FPS Ledger →" : "📊 60 FPS लेजर पहा →"}
            </a>
          </div>
        </div>
      )}

      {offline && <span className="status-pending">No connection. Cash?</span>}

      <div className="actions">
        <button className="paytm-sim-btn" onClick={() => props.onSimulatePaytmPay(false)}>
          {t.paytmSimBtn} ({formatMoney(awaiting.sale.total, awaiting.sale.currency)})
        </button>
        <button className="paytm-sim-btn u30" onClick={() => props.onSimulatePaytmPay(true)}>
          {t.paytmU30Btn}
        </button>
        <button className="btn cash" onClick={props.onCash}>{t.btnCash}</button>
        <button className="btn" onClick={props.onLater}>{t.btnKhata}</button>
        <button
          className="btn"
          onClick={props.onBackToCounter || props.onCancel}
          style={{ background: "#4b5563", color: "#fff", fontWeight: 700 }}
          title={lang === "hi-IN" ? "मुख्य काउंटर पर वापस जाएं" : "मुख्य काउंटरवर परत जा"}
        >
          {lang === "hi-IN" ? "← मुख्य काउंटर पर जाएं" : lang === "en-IN" ? "← Back to Counter" : "← मुख्य काउंटरवर जा"}
        </button>
      </div>
      <ProofTrace awaiting={awaiting} />
      <ProofCard invoiceId={awaiting.invoice_id} trace={awaiting.trace} from="UNPAID" to={awaiting.status} />
    </div>
  );
}

export function ProofTrace({ awaiting }: { awaiting: Awaiting }) {
  return (
    <div className="proof" aria-label="Paytm Sandbox tool calls">
      {awaiting.trace.map((t) => (
        <div key={t.tool}><span className="ok">✓</span> {t.tool}{t.ms !== undefined ? ` · ${t.ms} ms` : ""}</div>
      ))}
      <div>… get_invoice · {awaiting.invoice_id} · {awaiting.status === "UNPAID" ? "UNPAID" : `UNPAID → ${awaiting.status}`}</div>
      <div>Paytm Staging Sandbox · x-checksum (HMAC SHA-256)</div>
    </div>
  );
}

export function ProofCard({ invoiceId, trace, from, to, timing }: { invoiceId: string; trace: TraceStep[]; from: string; to: string; timing?: string | null }) {
  const changed = to !== from;
  return (
    <aside className="proof-card" aria-label="Paytm Developer Sandbox proof">
      <h2>Paytm Developer Sandbox · SHA-256 x-checksum</h2>
      <ul>
        {trace.map((t) => (
          <li key={t.tool}><span className="ok">✓</span> {t.tool}{t.ms !== undefined && <span className="ms">{t.ms} ms</span>}</li>
        ))}
        <li><span className="ok">✓</span> sarvam_ai_soundbox<span className="ms">ready</span></li>
      </ul>
      <p className="flip">{invoiceId}</p>
      <p className="flip big">{changed ? `${from} → ${to}` : `${from} · waiting`}</p>
      {timing && <p className="flip timing">{timing}</p>}
    </aside>
  );
}

export function PaidScreen({ total, currency, proof, saidAt, doneAt, lang = "mr-IN" }: { total: number; currency: string; proof?: { invoice_id: string; trace: TraceStep[] }; saidAt?: number; doneAt?: number; lang?: SupportedLanguage }) {
  const t = getT(lang);
  const formatted = formatMoney(total, currency);
  return (
    <div className="full paid" role="status">
      <p className="total">{formatted}</p>
      <p className="line" style={{ color: "#fff" }}>
        🔊 {t.paidVoice.replace("{amount}", formatted)} ({t.paidSub})
      </p>
      {proof && <ProofCard invoiceId={proof.invoice_id} trace={proof.trace} from="UNPAID" to="PAID" timing={saidToDoneRow(saidAt, doneAt)} />}
    </div>
  );
}

export function CashScreen({ total, currency, lang = "mr-IN" }: { total: number; currency: string; lang?: SupportedLanguage }) {
  const t = getT(lang);
  return (
    <div className="full cashed" role="status">
      <p className="total">{formatMoney(total, currency)}</p>
      <p className="line" style={{ color: "#fff" }}>{t.cashNoted}</p>
    </div>
  );
}

export function LaterScreen({ message }: { message: string }) {
  return (
    <div className="full later" role="status">
      <p className="line" style={{ color: "#fff" }}>{message}</p>
    </div>
  );
}

export function OwesList({
  rows,
  loading,
  onRemind,
  reminding,
  onBack,
  lang = "mr-IN",
}: {
  rows: LedgerRow[];
  loading: boolean;
  onRemind: () => void;
  reminding: boolean;
  onBack?: () => void;
  lang?: SupportedLanguage;
}) {
  const t = getT(lang);
  return (
    <div className="stage">
      <div style={{ width: "min(560px, 100%)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontFamily: "var(--serif)" }}>{t.tabKhata}</h2>
        {onBack && (
          <button
            type="button"
            className="btn ghost"
            style={{ minHeight: 40, padding: "0 16px", fontSize: 14, borderRadius: 12 }}
            onClick={onBack}
          >
            {t.btnBackToCounter}
          </button>
        )}
      </div>

      <div className="owes">
        {loading && <p className="sub">{t.owesChecking}</p>}
        {!loading && rows.length === 0 && <p className="line">{t.owesEmpty}</p>}
        {rows.map((r) => (
          <div className="owe" key={r.invoice_id}>
            <span>{r.payer && !r.payer.includes("@") ? r.payer : r.payer ?? "Open invoice"}<small>{r.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</small></span>
            <span className="amber-text">{formatMoney(r.total, r.currency)}</span>
          </div>
        ))}
      </div>

      {rows.length > 0 && (
        <button className="btn amber" disabled={reminding} onClick={onRemind}>
          {reminding ? t.owesReminding : t.owesRemindBtn}
        </button>
      )}

      {onBack && (
        <button
          type="button"
          className="btn ghost"
          style={{ marginTop: 14, minHeight: 46 }}
          onClick={onBack}
        >
          {t.btnBackToCounter}
        </button>
      )}
    </div>
  );
}
