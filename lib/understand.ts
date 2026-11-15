// Turns one spoken sentence in Marathi, Hindi, or English into a structured Kirana sale or ledger command.
// Includes a deterministic local Kirana parser so the app works 100% offline/without an LLM key, plus Gemini 2.5 Flash when configured.
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { getConfig } from "./config";
import type { CatalogItem, SaleItem } from "./types";

export const understandingSchema = z.object({
  intent: z
    .enum(["sale", "add_catalog_item", "day_summary", "plan_week", "remind_owing", "item_sales_query", "pending_payments_query", "unknown"])
    .describe("sale = any sentence that sells, changes or corrects the current sale; item_sales_query = asking how much of specific items sold today; pending_payments_query = asking for stuck/pending payments; day_summary = asking total galla/settlement"),
  items: z
    .array(
      z.object({
        sku: z.string().nullable(),
        name: z.string().nullable(),
        qty: z.number().min(0),
        custom_price: z.number().nullable(),
      }),
    ),
  payment_mode: z.enum(["paypal_qr", "paypal_later", "cash"]).nullable(),
  currency: z.enum(["INR", "USD", "EUR"]).nullable(),
  payer_email: z.string().nullable(),
  payer_name: z.string().nullable(),
  new_item: z
    .object({ name: z.string(), price: z.number(), aliases: z.array(z.string()) })
    .nullable(),
});

export type Understanding = z.infer<typeof understandingSchema>;

const NUM_MAP: Record<string, number> = {
  "१": 1, "२": 2, "३": 3, "४": 4, "५": 5, "६": 6, "७": 7, "८": 8, "९": 9, "१०": 10,
  "एक": 1, "दोन": 2, "दो": 2, "तीन": 3, "चार": 4, "पाच": 5, "पांच": 5, "सहा": 6, "सात": 7, "आठ": 8, "नऊ": 9, "दहा": 10,
  "अकरा": 11, "ग्यारह": 11, "बारा": 12, "बारह": 12, "तेरा": 13, "तेरह": 13, "चौदा": 14, "चौदह": 14, "पंधरा": 15, "पंद्रह": 15,
  "सोळा": 16, "सोलह": 16, "सतरा": 17, "सत्रह": 17, "अठरा": 18, "अठारह": 18, "एकोणीस": 19, "उन्नीस": 19, "वीस": 20, "बीस": 20, "bis": 20, "vis": 20,
  "पंचवीस": 25, "पच्चीस": 25, "तीस": 30, "चाळीस": 40, "चालीस": 40, "पन्नास": 50, "पचास": 50, "शंभर": 100, "सौ": 100,
  "दोनशे": 200, "दो सौ": 200, "दो-सौ": 200, "तीनशे": 300, "तीन सौ": 300, "चारशे": 400, "चार सौ": 400,
  "पाचशे": 500, "पाँच सौ": 500, "पांच सौ": 500, "हजार": 1000, "एक हजार": 1000,
  "two hundred": 200, "three hundred": 300, "four hundred": 400, "five hundred": 500, "one thousand": 1000,
  "ek": 1, "don": 2, "do": 2, "teen": 3, "tin": 3, "char": 4, "paach": 5, "pach": 5, "twenty": 20, "thirty": 30, "fifty": 50,
  "one": 1, "two": 2, "to": 2, "too": 2, "three": 3, "four": 4, "for": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
};

const COMMON_KIRANA_ITEMS: { name: string; aliases: string[]; price: number; brand?: string; unit?: string }[] = [
  { name: "पार्ले-जी बिस्कुट (Parle-G)", aliases: ["पारलेजी", "पारले जी", "पारले", "बिस्कुट", "बिस्कीट", "biscuit", "parle", "biskit", "पार्ले-जी"], price: 30, brand: "Parle", unit: "Pack" },
  { name: "साबुन (Soap)", aliases: ["साबुन", "साबण", "लक्स", "डेटोल", "लाइफबॉय", "lux", "soap", "dettol", "lifebuoy", "rin", "ऋण", "wheel"], price: 35, brand: "Standard", unit: "1 bar" },
  { name: "मैगी नूडल्स (Maggi)", aliases: ["मैगी", "मॅगी", "maggi", "noodles", "नूडल्स"], price: 14, brand: "Nestle", unit: "Pack" },
  { name: "पोहा (Poha 1 kg)", aliases: ["पोहा", "पोहे", "poha"], price: 45, brand: "Market", unit: "1 kg" },
  { name: "रवा / सूजी (Suji 1 kg)", aliases: ["रवा", "सूजी", "सुजी", "rava", "suji"], price: 40, brand: "Market", unit: "1 kg" },
  { name: "बेसन (Besan 1 kg)", aliases: ["बेसन", "चना आटा", "besan"], price: 70, brand: "Market", unit: "1 kg" },
  { name: "हल्दी पाउडर (Haldi)", aliases: ["हल्दी", "हळद", "haldi", "turmeric"], price: 30, brand: "Gold", unit: "100g" },
  { name: "गरम मसाला (Masala)", aliases: ["मसाला", "गरम मसाला", "masala"], price: 40, brand: "Everest", unit: "100g" },
  { name: "नमक (Salt 1 kg)", aliases: ["नमक", "मीठ", "salt", "tata salt"], price: 25, brand: "Tata", unit: "1 kg" },
  { name: "दूध (Milk 500ml)", aliases: ["दूध", "दुध", "milk", "amul milk"], price: 32, brand: "Amul", unit: "500ml" },
  { name: "शुद्ध घी (Pure Ghee)", aliases: ["तूप", "घी", "ghee"], price: 120, brand: "Amul", unit: "200g" },
  { name: "शेंगदाणे (Peanuts 500g)", aliases: ["शेंगदाणे", "दाणे", "मूंगफली", "peanuts"], price: 90, brand: "Market", unit: "500g" },
  { name: "कांदा (Onion 1 kg)", aliases: ["कांदा", "प्याज", "kanda", "onion"], price: 35, brand: "Fresh", unit: "1 kg" },
  { name: "बटाटा / आलू (Potato 1 kg)", aliases: ["बटाटा", "बटाटे", "आलू", "alu", "potato"], price: 30, brand: "Fresh", unit: "1 kg" },
  { name: "चॉकलेट (Chocolate)", aliases: ["चॉकलेट", "chocolate", "cadbury"], price: 20, brand: "Cadbury", unit: "1 bar" },
];

function normalizeDigits(s: string): string {
  const devanagari = "०१२३४५६७८९";
  return s.replace(/[०-९]/g, (d) => String(devanagari.indexOf(d)));
}

export function deterministicKiranaUnderstand(
  utterance: string,
  catalog: CatalogItem[],
  draft: SaleItem[],
  focusSku?: string,
): Understanding | null {
  const raw = normalizeDigits(utterance).trim();
  const lower = raw.toLowerCase();

  // 1. Check Ask Astra Queries (Voice-to-Grid commands)
  if (
    lower.includes("अडकलेले") ||
    lower.includes("पेंडिंग") ||
    lower.includes("pending") ||
    lower.includes("stuck") ||
    lower.includes("अटके")
  ) {
    return {
      intent: "pending_payments_query",
      items: [],
      payment_mode: null,
      currency: "INR",
      payer_email: null,
      payer_name: null,
      new_item: null,
    };
  }

  const isQueryForSales =
    lower.includes("विक्री") ||
    lower.includes("किती विकल") ||
    lower.includes("how much") ||
    lower.includes("कितना बिका") ||
    lower.includes("कितनी बिक्री") ||
    lower.includes("सेल किती") ||
    lower.includes("खप");

  if (
    isQueryForSales &&
    (lower.includes("तेल") ||
      lower.includes("साखर") ||
      lower.includes("oil") ||
      lower.includes("sugar") ||
      lower.includes("चीनी") ||
      lower.includes("चहा") ||
      lower.includes("tea") ||
      lower.includes("वडापाव") ||
      lower.includes("कांदा") ||
      lower.includes("बटाटा") ||
      lower.includes("टोमॅटो") ||
      lower.includes("डोलो") ||
      lower.includes("बल्ब") ||
      lower.includes("हेअरकट") ||
      lower.includes("पेट्रोल") ||
      lower.includes("petrol") ||
      lower.includes("डिझेल") ||
      lower.includes("diesel") ||
      lower.includes("cng"))
  ) {
    return {
      intent: "item_sales_query",
      items: [],
      payment_mode: null,
      currency: "INR",
      payer_email: null,
      payer_name: null,
      new_item: null,
    };
  }

  if (
    lower.includes("एकूण गल्ला") ||
    lower.includes("किती पैसे जमा") ||
    lower.includes("सेटलमेंट किती") ||
    lower.includes("how did today go") ||
    lower.includes("आजचा हिशोब") ||
    lower.includes("आजचा गल्ला") ||
    lower.includes("कुल गल्ला")
  ) {
    return {
      intent: "day_summary",
      items: [],
      payment_mode: null,
      currency: "INR",
      payer_email: null,
      payer_name: null,
      new_item: null,
    };
  }

  if (lower.includes("उधारी") && (lower.includes("आठवण") || lower.includes("remind"))) {
    return {
      intent: "remind_owing",
      items: [],
      payment_mode: null,
      currency: "INR",
      payer_email: null,
      payer_name: null,
      new_item: null,
    };
  }

  // 2. Match Kirana Catalog items with quantities in Marathi, Hindi, or English
  const paymentMode: "paypal_qr" | "paypal_later" | "cash" | null =
    lower.includes("रोख") || lower.includes("कॅश") || lower.includes("नगद") || lower.includes("cash")
      ? "cash"
      : lower.includes("उधारी") || lower.includes("खात्यावर") || lower.includes("नंतर") || lower.includes("later") || lower.includes("khata")
      ? "paypal_later"
      : lower.includes("paytm") || lower.includes("qr") || lower.includes("upi")
      ? "paypal_qr"
      : null;

  // Split sentence into clauses by 'आणि', standalone 'व', 'और', 'and', commas, or plus
  const clauses = lower.split(/(?:,|\s+आणि\s+|\s+व\s+|\s+और\s+|\s+and\s+|\s*\+\s*|\s*&\s*)/).map((c) => c.trim()).filter(Boolean);

  // ==========================================
  // 1.5. PETROL PUMP & REVERSE MATH ENGINE (Universal Fuel Engine)
  // Supports both:
  //   - Mode A (Liter-based): "२ लिटर पेट्रोल आणि १ लिटर डिझेल" -> 2×104 + 1×92 = ₹300
  //   - Mode B (Amount-based / Reverse Math): "२०० रुपयांचे पेट्रोल" -> 1.92 Ltr @ ₹104/L = ₹200.00 Paytm QR
  //   - Single item queries: "१ लिटर पेट्रोल" -> ONLY 1 item (₹104) without combining diesel!
  // ==========================================
  const FUEL_ENTITIES = [
    {
      id: "petrol",
      sku: "fuel-petrol",
      name: "पेट्रोल (Petrol)",
      rate: 104,
      unit: "Ltr",
      keywords: ["पेट्रोल", "पैट्रोल", "petrol", "साधे पेट्रोल", "power petrol", "speed petrol"],
    },
    {
      id: "diesel",
      sku: "fuel-diesel",
      name: "डिझेल (High Speed Diesel)",
      rate: 92,
      unit: "Ltr",
      keywords: ["डिझेल", "डीजल", "diesel", "high speed diesel", "डिझल"],
    },
    {
      id: "cng",
      sku: "fuel-cng",
      name: "CNG गॅस (Compressed Natural Gas)",
      rate: 89,
      unit: "kg",
      keywords: ["cng", "सीएनजी", "सीएनजी गॅस", "cng gas", "नैसर्गिक वायू"],
    },
    {
      id: "xp95",
      sku: "fuel-xp95",
      name: "XP95 प्रीमियम पेट्रोल (Speed / Power 95)",
      rate: 112,
      unit: "Ltr",
      keywords: ["xp95", "speed petrol", "power petrol", "premium petrol", "स्पीड पेट्रोल", "प्रीमियम पेट्रोल", "एक्सपी ९५", "xp 95"],
    },
    {
      id: "2t",
      sku: "fuel-2t-oil",
      name: "2T इंजिन ऑइल (2T 40ml Pouch)",
      rate: 20,
      unit: "pouch",
      keywords: ["2t", "2t oil", "two t oil", "2t ऑइल", "टू टी ऑईल", "टूटी ऑईल", "ऑईल पाउच", "टू-टी"],
    },
  ];

  const hasAnyFuel = FUEL_ENTITIES.some((f) => f.keywords.some((k) => lower.includes(k)));
  if (hasAnyFuel) {
    const fuelMatched: { sku: string; name: string; qty: number; custom_price: number | null }[] = [];

    for (const clause of clauses) {
      let matchedFuel: (typeof FUEL_ENTITIES)[0] | null = null;
      for (const f of FUEL_ENTITIES) {
        if (f.keywords.some((k) => clause.includes(k))) {
          matchedFuel = f;
          break;
        }
      }
      if (!matchedFuel) continue;

      const isLiterBased =
        clause.includes("लिटर") ||
        clause.includes("लीटर") ||
        clause.includes("liter") ||
        clause.includes("ltr") ||
        clause.includes("किलो") ||
        clause.includes("kg") ||
        clause.includes("पाउच") ||
        clause.includes("pouch") ||
        clause.includes("कॅन") ||
        clause.includes("can") ||
        clause.includes("बाटली");

      let extractedNum: number | null = null;
      const tokens = clause.split(/\s+/);
      for (const tok of tokens) {
        const cleanTok = tok.replace(/[^a-z0-9ऀ-ॿ]/g, "");
        const numMatch = cleanTok.match(/^(\d+)/);
        if (numMatch) {
          extractedNum = Number(numMatch[1]);
          break;
        } else if (cleanTok in NUM_MAP) {
          extractedNum = NUM_MAP[cleanTok];
          break;
        }
      }

      if (extractedNum === null) {
        const numM = clause.match(/(\d+)/);
        if (numM) {
          extractedNum = Number(numM[1]);
        }
      }

      if (isLiterBased) {
        // Mode A: Liter/Quantity based
        const qty = Math.max(1, extractedNum ?? 1);
        fuelMatched.push({
          sku: matchedFuel.sku,
          name: matchedFuel.name,
          qty,
          custom_price: matchedFuel.rate,
        });
      } else {
        // Mode B: Reverse Math Engine (Amount based)
        // e.g. "200 रुपयांचे पेट्रोल", "500 चे डिझेल", "300 रुपये CNG"
        const amount = extractedNum && extractedNum > 25 ? extractedNum : (extractedNum === 1 || !extractedNum ? 100 : extractedNum);

        if (matchedFuel.id === "2t") {
          const qty = Math.max(1, Math.round(amount / 20));
          fuelMatched.push({
            sku: matchedFuel.sku,
            name: matchedFuel.name,
            qty,
            custom_price: 20,
          });
        } else {
          const dispensedLiters = (amount / matchedFuel.rate).toFixed(2);
          const reverseDisplayName = `${matchedFuel.name.split(" ")[0]} (${dispensedLiters} ${matchedFuel.unit} @ ₹${matchedFuel.rate}/${matchedFuel.unit})`;
          fuelMatched.push({
            sku: matchedFuel.sku,
            name: reverseDisplayName,
            qty: 1,
            custom_price: amount,
          });
        }
      }
    }

    if (fuelMatched.length > 0) {
      return {
        intent: "sale",
        items: fuelMatched,
        payment_mode: paymentMode,
        currency: "INR",
        payer_email: null,
        payer_name: lower.includes("ramesh") || lower.includes("रमेश") ? "Ramesh Dada" : null,
        new_item: null,
      };
    }
  }

  const matchedLines: { sku: string | null; name: string | null; qty: number; custom_price: number | null }[] = [];

  for (const clause of clauses) {
    let bestItem: CatalogItem | null = null;
    let bestAliasLen = 0;

    for (const c of catalog) {
      const candidates = [c.name.toLowerCase(), c.sku.toLowerCase(), ...(c.aliases ?? []).map((a) => a.toLowerCase())];
      for (const alias of candidates) {
        if (alias && clause.includes(alias) && alias.length > bestAliasLen) {
          bestItem = c;
          bestAliasLen = alias.length;
        }
      }
    }

    if (bestItem) {
      let qty = 1;
      const tokens = clause.split(/\s+/);
      for (const tok of tokens) {
        const cleanTok = tok.replace(/[^a-z0-9ऀ-ॿ]/g, "");
        const numMatch = cleanTok.match(/^(\d+)/);
        if (numMatch) {
          const val = Number(numMatch[1]);
          if (val >= 1 && val <= 500 && val !== 250) {
            qty = val;
            break;
          }
        } else if (cleanTok in NUM_MAP) {
          qty = NUM_MAP[cleanTok];
          break;
        }
      }
      matchedLines.push({ sku: bestItem.sku, name: bestItem.name, qty, custom_price: null });
    }
  }

  // Also do a full-sentence scan ONLY IF user spoke multiple clauses and some were missed
  const hasConjunction = /(?:,|\s+आणि\s+|\s+व\s+|\s+और\s+|\s+and\s+|\s*\+\s*|\s*&\s*)/.test(lower);
  if (hasConjunction && matchedLines.length < clauses.length) {
    const fullScan: { sku: string | null; name: string | null; qty: number; custom_price: number | null }[] = [];
    for (const c of catalog) {
      const candidates = [c.sku.toLowerCase(), ...(c.aliases ?? []).map((a) => a.toLowerCase())];
      let hitPos = -1;
      for (const alias of candidates) {
        const idx = lower.indexOf(alias);
        if (idx !== -1) {
          hitPos = idx;
          break;
        }
      }
      if (hitPos !== -1) {
        // Look at the 25 characters right before hitPos for a quantity
        const prefix = lower.slice(Math.max(0, hitPos - 25), hitPos);
        const words = prefix.split(/\s+/).filter(Boolean).reverse();
        let qty = 1;
        for (const w of words) {
          const cw = w.replace(/[^a-z0-9ऀ-ॿ]/g, "");
          const numM = cw.match(/^(\d+)/);
          if (numM) {
            const v = Number(numM[1]);
            if (v >= 1 && v <= 500 && v !== 250) { qty = v; break; }
          } else if (cw in NUM_MAP) {
            qty = NUM_MAP[cw];
            break;
          }
        }
        fullScan.push({ sku: c.sku, name: c.name, qty, custom_price: null });
      }
    }
    if (fullScan.length > matchedLines.length) {
      return {
        intent: "sale",
        items: fullScan,
        payment_mode: paymentMode,
        currency: "INR",
        payer_email: null,
        payer_name: lower.includes("ramesh") || lower.includes("रमेश") ? "Ramesh Dada" : null,
        new_item: null,
      };
    }
  }

  // 3. Match against common Kirana grocery items
  if (matchedLines.length === 0) {
    for (const clause of clauses) {
      let bestCommon: typeof COMMON_KIRANA_ITEMS[0] | null = null;
      let bestLen = 0;
      for (const item of COMMON_KIRANA_ITEMS) {
        for (const alias of item.aliases) {
          if (clause.includes(alias) && alias.length > bestLen) {
            bestCommon = item;
            bestLen = alias.length;
          }
        }
      }
      if (bestCommon) {
        let qty = 1;
        const tokens = clause.split(/\s+/);
        for (const tok of tokens) {
          const cleanTok = tok.replace(/[^a-z0-9ऀ-ॿ]/g, "");
          const numMatch = cleanTok.match(/^(\d+)/);
          if (numMatch) {
            const val = Number(numMatch[1]);
            if (val >= 1 && val <= 500 && val !== 250) { qty = val; break; }
          } else if (cleanTok in NUM_MAP) {
            qty = NUM_MAP[cleanTok];
            break;
          }
        }
        matchedLines.push({ sku: null, name: bestCommon.name, qty, custom_price: bestCommon.price });
      }
    }
  }

  // 4. Dynamic Spoken Item Extractor: never ignore whatever item is spoken
  if (matchedLines.length === 0 && raw.length >= 2) {
    for (const clause of clauses) {
      let qty = 1;
      let price: number | null = null;
      const tokens = clause.split(/\s+/);
      for (const tok of tokens) {
        const cleanTok = tok.replace(/[^a-z0-9ऀ-ॿ]/g, "");
        const numMatch = cleanTok.match(/^(\d+)/);
        if (numMatch) {
          const val = Number(numMatch[1]);
          if (val >= 1 && val <= 500 && val !== 250) { qty = val; break; }
        } else if (cleanTok in NUM_MAP) {
          qty = NUM_MAP[cleanTok];
          break;
        }
      }

      // Check if price was mentioned (e.g. 50 रुपये वाला or 20 रुपये)
      const priceM = clause.match(/(\d+)\s*(?:रुपये|रु|₹|rs)/);
      if (priceM) {
        price = Number(priceM[1]);
      }

      // Clean out common filler words to extract the clean item name
      const cleanItemName = clause
        .replace(/\b(?:\d+|एक|दोन|दो|तीन|चार|पाच|पांच|सहा|सात|आठ|नऊ|दहा|वीस|बीस|पन्नास|पचास)\b/g, "")
        .replace(/\b(?:किलो|kg|kilo|ग्राम|g|gm|पुडा|पुडे|पॅकेट|पैकेट|पैक|लिटर|ltr|l|नग)\b/g, "")
        .replace(/\b(?:देना|दीजिए|द्या|पाहिजे|चाहिए|आहे|रुपये|वाला|वाली|चे|चा|का|की)\b/g, "")
        .trim();

      if (cleanItemName.length >= 2) {
        matchedLines.push({
          sku: null,
          name: cleanItemName,
          qty,
          custom_price: price ?? 30, // Default estimated Kirana price
        });
      }
    }
  }

  if (matchedLines.length > 0) {
    return {
      intent: "sale",
      items: matchedLines,
      payment_mode: paymentMode,
      currency: "INR",
      payer_email: null,
      payer_name: lower.includes("ramesh") || lower.includes("रमेश") ? "Ramesh Dada" : null,
      new_item: null,
    };
  }

  return null;
}

export function buildSystemPrompt(catalog: CatalogItem[], draft: SaleItem[], focusSku?: string): string {
  const focus = focusSku ?? draft[0]?.sku;
  const rows = catalog.map((c) => `- sku=${c.sku} | ${c.name} (${c.brand ?? "Local"}) | ₹${c.price} | aliases: ${c.aliases.join(", ")}`).join("\n");
  const current = draft.length ? draft.map((d) => `- sku=${d.sku} | ${d.name} | qty ${d.qty}`).join("\n") : "(empty)";
  return [
    "You are AstraVoice, the listening AI teammate counter of an Indian Kirana & farmer market stall. The merchant speaks in Marathi, Hindi, or English; you return structured data.",
    "Never invent prices. Match items to the catalog by meaning and Marathi/Hindi/English aliases.",
    focus ? `A bare number changes the quantity of the FOCUS line, sku=${focus}.` : "",
    "CATALOG:",
    rows,
    "CURRENT DRAFT:",
    current,
  ].join("\n");
}

export async function understand(utterance: string, catalog: CatalogItem[], draft: SaleItem[], focusSku?: string): Promise<Understanding> {
  // First try fast deterministic Kirana parser (<2ms latency, works offline and for all Marathi/Hindi/English items)
  const local = deterministicKiranaUnderstand(utterance, catalog, draft, focusSku);
  if (local) return local;

  // If GOOGLE_GENERATIVE_AI_API_KEY is configured, call Gemini
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      const cfg = getConfig();
      const { object } = await generateObject({
        model: google(cfg.geminiModel),
        schema: understandingSchema,
        system: buildSystemPrompt(catalog, draft, focusSku),
        prompt: utterance,
        temperature: 0,
        abortSignal: AbortSignal.timeout(8000),
      });
      return object;
    } catch {
      // Fallback below
    }
  }

  return {
    intent: "unknown",
    items: [],
    payment_mode: null,
    currency: "INR",
    payer_email: null,
    payer_name: null,
    new_item: null,
  };
}
