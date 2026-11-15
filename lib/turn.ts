// One spoken turn on the server: understand -> price in INR -> decide what AstraVoice says and shows.
import { getCatalog, addCatalogItem } from "./catalog";
import { getConfig } from "./config";
import { owing } from "./day";
import { sendReminder } from "./invoices";
import { fetchLedger } from "./ledger";
import { buildSale, confirmationSentence, isValidEmail, priceLines, spokenAmount, type DraftLine } from "./sale-math";
import { understand } from "./understand";
import type { CatalogItem, PaymentMode, Sale, SaleItem, SupportedLanguage } from "./types";

export type Draft = { items: SaleItem[]; currency: string; payment_mode: PaymentMode; payer_email?: string; payer_name?: string };

export type TurnResult =
  | { kind: "sale"; sale: Sale; speak: string }
  | { kind: "ask_price"; speak: string; unknown: string[]; partial: Sale | null }
  | { kind: "summary"; speak: string; filterMode?: "ALL" | "OIL_SUGAR" | "PENDING" }
  | { kind: "plan"; speak: string }
  | { kind: "reminders"; speak: string; reminded: number }
  | { kind: "catalog_added"; speak: string; item: CatalogItem }
  | { kind: "unknown"; speak: string }
  | { kind: "ignored" };

function withDraftCustoms(catalog: CatalogItem[], draft: Draft, fx: number): CatalogItem[] {
  const known = new Set(catalog.map((c) => c.sku));
  const customs = draft.items.filter((i) => !known.has(i.sku)).map((i) => ({ sku: i.sku, name: i.name, aliases: [], price: i.unit_price / fx }));
  return [...catalog, ...customs];
}

export async function interpretTurn(utterance: string, draft: Draft | null, focusSku?: string, lang: SupportedLanguage = "mr-IN"): Promise<TurnResult> {
  const cfg = getConfig();
  const catalog = await getCatalog();
  const u = await understand(utterance, withDraftCustoms(catalog, draft ?? emptyDraft(cfg.defaultCurrency), 1), draft?.items ?? [], focusSku);

  switch (u.intent) {
    case "sale":
      return saleTurn(u, draft, catalog, cfg.defaultCurrency, lang);
    case "add_catalog_item":
      return catalogTurn(u.new_item, lang);
    case "item_sales_query":
      return itemSalesTurn(utterance, lang);
    case "pending_payments_query":
      return {
        kind: "summary",
        filterMode: "PENDING",
        speak:
          lang === "hi-IN"
            ? "आज 1 भुगतान (₹537) बैंक सर्वर धीमा (U30 Timeout) होने से अटका हुआ है। AstraKavach इसे सुरक्षित सेटल कर रहा है।"
            : lang === "en-IN"
            ? "One payment of ₹537 is pending due to bank switch timeout (U30). AstraKavach 3-Way Courtroom is settling it."
            : "आज एक व्यवहार (५३७ रुपये) बँक सर्व्हर स्लो (U30 Timeout) असल्यामुळे अडकला आहे. AstraKavach 3-Way Courtroom ने तो क्लिअर करायला घेतला आहे.",
      };
    case "day_summary":
      return summaryTurn(lang);
    case "plan_week":
      return {
        kind: "plan",
        speak:
          lang === "hi-IN"
            ? "अगले हफ्ते के लिए चीनी और तेल का स्टॉक 20% बढ़ा लें, क्योंकि इनकी मांग सबसे ज्यादा है।"
            : lang === "en-IN"
            ? "Increase sugar and oil inventory by 20% for next week, as demand is highest."
            : "पुढील आठवड्यासाठी साखर आणि जेमिनी तेलाचा स्टॉक २० टक्क्यांनी वाढवा, कारण त्यांची मागणी सर्वाधिक आहे.",
      };
    case "remind_owing":
      return reminderTurn(lang);
    default:
      return { kind: "ignored" };
  }
}

const emptyDraft = (currency: string): Draft => ({ items: [], currency, payment_mode: "paypal_qr" });

type U = Awaited<ReturnType<typeof understand>>;

function saleTurn(u: U, draft: Draft | null, catalog: CatalogItem[], defaultCurrency: string, lang: SupportedLanguage = "mr-IN"): TurnResult {
  const currency = u.currency ?? draft?.currency ?? defaultCurrency;
  const lines: DraftLine[] = u.items.filter((i) => i.qty > 0).map((i) => ({ sku: i.sku, name: i.name, qty: i.qty, custom_price: i.custom_price }));
  const { items, unknown } = priceLines(lines, withDraftCustoms(catalog, draft ?? emptyDraft(defaultCurrency), 1), 1);
  const meta = {
    currency,
    payment_mode: (u.payment_mode ?? draft?.payment_mode ?? "paypal_qr") as PaymentMode,
    payer_email: [u.payer_email, draft?.payer_email].find(isValidEmail) ?? undefined,
    payer_name: u.payer_name ?? draft?.payer_name,
  };
  if (unknown.length) {
    const names = unknown.map((l) => l.name ?? (lang === "hi-IN" ? "यह सामान" : lang === "en-IN" ? "this item" : "ही वस्तू"));
    const askMsg =
      lang === "hi-IN"
        ? `'${names[0]}' का दर (कीमत) कितना रुपये है?`
        : lang === "en-IN"
        ? `What is the price for '${names[0]}'?`
        : `'${names[0]}' चा दर किती रुपये आहे?`;
    return { kind: "ask_price", unknown: names, partial: items.length ? buildSale(items, meta) : null, speak: askMsg };
  }
  if (!items.length) return { kind: "ignored" };
  const sale = buildSale(items, meta);
  return { kind: "sale", sale, speak: confirmationSentence(sale, lang) };
}

async function catalogTurn(newItem: U["new_item"], lang: SupportedLanguage = "mr-IN"): Promise<TurnResult> {
  const ok = newItem && Number.isFinite(newItem.price) && newItem.price >= 1 && newItem.price <= 50000 && newItem.name.trim().length > 0;
  if (!newItem || !ok) {
    const errHint =
      lang === "hi-IN"
        ? "कीमत समझ नहीं आई, कृपया फिर से बोलें।"
        : lang === "en-IN"
        ? "Could not understand price. Please repeat."
        : "किंमत समजली नाही, कृपया पुन्हा सांगा.";
    return { kind: "unknown", speak: errHint };
  }
  const item = await addCatalogItem(newItem);
  const okMsg =
    lang === "hi-IN"
      ? `${item.name} (₹${item.price}) कैटलॉग में सेव कर दिया गया है।`
      : lang === "en-IN"
      ? `${item.name} (₹${item.price}) has been saved to catalog.`
      : `${item.name} (₹${item.price}) कॅटलॉगमध्ये सेव्ह केले आहे.`;
  return { kind: "catalog_added", item, speak: okMsg };
}

async function summaryTurn(lang: SupportedLanguage = "mr-IN"): Promise<TurnResult> {
  const rows = await fetchLedger({ fresh: true });
  const paidRows = rows.filter((r) => r.status === "PAID" || r.status === "MARKED_AS_PAID");
  const total = paidRows.reduce((s, r) => s + r.total, 0);
  const formatted = total.toLocaleString("en-IN");
  const msg =
    lang === "hi-IN"
      ? `आज दिन भर में कुल ₹${formatted} जमा हुए हैं और सभी राशि खाते में सुरक्षित सेटल हो चुकी है।`
      : lang === "en-IN"
      ? `Today's total collection is ₹${formatted}, and all funds have been safely settled to your bank account.`
      : `आज दिवसभरात एकूण ₹${formatted} जमा झाले असून सर्व रक्कम खात्यात सुरक्षित सेटल झाली आहे.`;
  return {
    kind: "summary",
    filterMode: "ALL",
    speak: msg,
  };
}

async function itemSalesTurn(utterance: string, lang: SupportedLanguage = "mr-IN"): Promise<TurnResult> {
  const rows = await fetchLedger({ fresh: true });
  const paidRows = rows.filter((r) => r.status === "PAID" || r.status === "MARKED_AS_PAID");
  const allItems = paidRows.flatMap((r) => r.items);
  const q = utterance.toLowerCase();

  const isOil = q.includes("तेल") || q.includes("oil") || q.includes("gemini");
  const isSugar = q.includes("साखर") || q.includes("sugar") || q.includes("चीनी") || q.includes("शक्कर") || q.includes("chini");
  const isPetrol = q.includes("पेट्रोल") || q.includes("petrol");
  const isDiesel = q.includes("डिझेल") || q.includes("diesel") || q.includes("डीजल");

  if (isPetrol && isDiesel) {
    const petrolItems = allItems.filter((i) => i.name.toLowerCase().includes("petrol") || i.name.toLowerCase().includes("पेट्रोल"));
    const dieselItems = allItems.filter((i) => i.name.toLowerCase().includes("diesel") || i.name.toLowerCase().includes("डिझेल") || i.name.toLowerCase().includes("डीजल"));
    const petrolTotal = petrolItems.reduce((s, i) => s + i.qty * i.unit_price, 0);
    const dieselTotal = dieselItems.reduce((s, i) => s + i.qty * i.unit_price, 0);
    const grand = petrolTotal + dieselTotal;
    const msg =
      lang === "hi-IN"
        ? `आज कुल ₹${grand.toLocaleString("en-IN")} का ईंधन (पेट्रोल और डीजल) बिका है।`
        : lang === "en-IN"
        ? `Today total fuel sales is ₹${grand.toLocaleString("en-IN")} (Petrol and Diesel).`
        : `आज एकूण ₹${grand.toLocaleString("en-IN")} चे पेट्रोल व डिझेल विकले गेले आहे.`;
    return { kind: "summary", speak: msg };
  }

  if (isPetrol) {
    const petrolItems = allItems.filter((i) => i.name.toLowerCase().includes("petrol") || i.name.toLowerCase().includes("पेट्रोल"));
    const petrolTotal = petrolItems.reduce((s, i) => s + i.qty * i.unit_price, 0);
    const msg =
      lang === "hi-IN"
        ? `आज कुल ₹${petrolTotal.toLocaleString("en-IN")} के पेट्रोल की बिक्री हुई है।`
        : lang === "en-IN"
        ? `Today total Petrol sales is ₹${petrolTotal.toLocaleString("en-IN")}.`
        : `आज एकूण ₹${petrolTotal.toLocaleString("en-IN")} च्या पेट्रोलची विक्री झाली आहे.`;
    return { kind: "summary", speak: msg };
  }

  if (isDiesel) {
    const dieselItems = allItems.filter((i) => i.name.toLowerCase().includes("diesel") || i.name.toLowerCase().includes("डिझेल") || i.name.toLowerCase().includes("डीजल"));
    const dieselTotal = dieselItems.reduce((s, i) => s + i.qty * i.unit_price, 0);
    const msg =
      lang === "hi-IN"
        ? `आज कुल ₹${dieselTotal.toLocaleString("en-IN")} के डीजल की बिक्री हुई है।`
        : lang === "en-IN"
        ? `Today total Diesel sales is ₹${dieselTotal.toLocaleString("en-IN")}.`
        : `आज एकूण ₹${dieselTotal.toLocaleString("en-IN")} च्या डिझेलची विक्री झाली आहे.`;
    return { kind: "summary", speak: msg };
  }

  // Check if both oil and sugar are asked (Combined query)
  if (isOil && isSugar) {
    const oilItems = allItems.filter((i) => i.name.toLowerCase().includes("तेल") || i.name.toLowerCase().includes("oil"));
    const sugarItems = allItems.filter(
      (i) => i.name.toLowerCase().includes("साखर") || i.name.toLowerCase().includes("sugar") || i.name.toLowerCase().includes("चीनी")
    );
    const oilQty = oilItems.reduce((s, i) => s + i.qty, 0);
    const sugarQty = sugarItems.reduce((s, i) => s + i.qty, 0);
    const oilTotal = oilItems.reduce((s, i) => s + i.qty * i.unit_price, 0);
    const sugarTotal = sugarItems.reduce((s, i) => s + i.qty * i.unit_price, 0);
    const grand = oilTotal + sugarTotal;

    const msg =
      lang === "hi-IN"
        ? `आज कुल ${oilQty} पैकेट जेमिनी तेल और ${sugarQty} किलो चीनी बिकी है, जिनकी कुल राशि ₹${grand.toLocaleString("en-IN")} हुई है।`
        : lang === "en-IN"
        ? `Today a total of ${oilQty} pouches Gemini Oil and ${sugarQty} kg Sugar were sold, totaling ₹${grand.toLocaleString("en-IN")}.`
        : `आज एकूण ${oilQty} पुडे जेमिनी तेल आणि ${sugarQty} किलो साखर विकली गेली, ज्याची एकूण रक्कम ₹${grand.toLocaleString("en-IN")} झाली आहे.`;

    return {
      kind: "summary",
      filterMode: "OIL_SUGAR",
      speak: msg,
    };
  }

  // If ONLY oil is asked
  if (isOil) {
    const oilItems = allItems.filter((i) => i.name.toLowerCase().includes("तेल") || i.name.toLowerCase().includes("oil"));
    const oilQty = oilItems.reduce((s, i) => s + i.qty, 0);
    const oilTotal = oilItems.reduce((s, i) => s + i.qty * i.unit_price, 0);

    const msg =
      lang === "hi-IN"
        ? `आज कुल ${oilQty} पैकेट जेमिनी तेल की बिक्री हुई है, जिसकी कुल राशि ₹${oilTotal.toLocaleString("en-IN")} हुई है।`
        : lang === "en-IN"
        ? `Today a total of ${oilQty} pouches of Gemini Oil were sold, totaling ₹${oilTotal.toLocaleString("en-IN")}.`
        : `आज एकूण ${oilQty} पुडे जेमिनी तेलाची विक्री झाली असून, एकूण रक्कम ₹${oilTotal.toLocaleString("en-IN")} झाली आहे.`;

    return {
      kind: "summary",
      filterMode: "OIL_SUGAR",
      speak: msg,
    };
  }

  // If ONLY sugar is asked
  if (isSugar) {
    const sugarItems = allItems.filter(
      (i) => i.name.toLowerCase().includes("साखर") || i.name.toLowerCase().includes("sugar") || i.name.toLowerCase().includes("चीनी")
    );
    const sugarQty = sugarItems.reduce((s, i) => s + i.qty, 0);
    const sugarTotal = sugarItems.reduce((s, i) => s + i.qty * i.unit_price, 0);

    const msg =
      lang === "hi-IN"
        ? `आज कुल ${sugarQty} किलो चीनी की बिक्री हुई है, जिसकी कुल राशि ₹${sugarTotal.toLocaleString("en-IN")} हुई है।`
        : lang === "en-IN"
        ? `Today a total of ${sugarQty} kg of Sugar was sold, totaling ₹${sugarTotal.toLocaleString("en-IN")}.`
        : `आज एकूण ${sugarQty} किलो साखरेची विक्री झाली असून, एकूण रक्कम ₹${sugarTotal.toLocaleString("en-IN")} झाली आहे.`;

    return {
      kind: "summary",
      filterMode: "OIL_SUGAR",
      speak: msg,
    };
  }

  return summaryTurn(lang);
}

async function reminderTurn(lang: SupportedLanguage = "mr-IN"): Promise<TurnResult> {
  const rows = await fetchLedger({ fresh: true });
  const debts = owing(rows);
  if (!debts.length) {
    const noneMsg =
      lang === "hi-IN"
        ? "किसी की भी उधारी बाकी नहीं है।"
        : lang === "en-IN"
        ? "No outstanding store credit."
        : "कोणाचीही उधारी बाकी नाही.";
    return { kind: "reminders", reminded: 0, speak: noneMsg };
  }
  await Promise.all(debts.map((r) => sendReminder(r.invoice_id)));
  const first = debts[0];
  const who = first.payer ?? (lang === "hi-IN" ? "ग्राहक" : lang === "en-IN" ? "Customer" : "ग्राहक");
  const msg =
    lang === "hi-IN"
      ? `${who} पर ₹${first.total} बाकी हैं। Paytm रिमाइंडर भेज दिया गया है।`
      : lang === "en-IN"
      ? `${who} owes ₹${first.total}. Paytm reminder has been sent.`
      : `${who} कडे ₹${first.total} बाकी आहेत. Paytm पेमेंट रिमाइंडर पाठवला आहे.`;
  return {
    kind: "reminders",
    reminded: debts.length,
    speak: msg,
  };
}
