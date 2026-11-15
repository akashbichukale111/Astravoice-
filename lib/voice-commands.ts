// Short spoken commands in Marathi, Hindi, and English matched locally & deterministically.
export type Command = "yes" | "no" | "cash" | "later" | "never_mind" | "other";

const norm = (s: string) => s.toLowerCase().replace(/[.,!?"]/g, " ").replace(/\s+/g, " ").trim();

const YES = new Set([
  "yes", "yeah", "yep", "yup", "that's right", "go ahead", "do it", "confirm", "confirmed", "yes please",
  "ho", "ha", "haan", "haa", "banav", "kara", "chalu kara", "हो", "हा", "हां", "हाँ", "बनव", "करा", "हो बनव", "जी हां", "जी हाँ", "हांजी", "हाँजी"
]);
const NO = new Set(["no", "nope", "wrong", "not that", "nah", "nahi", "nako", "नाही", "नको", "नहीं"]);
const NEVER_MIND = new Set(["never mind", "nevermind", "cancel", "cancel that", "forget it", "scratch that", "stop", "radd kara", "रद्द करा"]);
const CASH = new Set(["cash", "in cash", "cash please", "she pays cash", "he pays cash", "they pay cash", "paid cash", "cash it", "rokh", "nagad", "रोख", "नगद", "कॅश"]);
const LATER = new Set(["later", "pay later", "she pays later", "he pays later", "they pay later", "on account", "udhari", "khata", "उधारी", "खात्यावर", "नंतर देईल"]);

export function classify(text: string): Command {
  const t = norm(text);
  if (YES.has(t)) return "yes";
  if (NEVER_MIND.has(t)) return "never_mind";
  if (NO.has(t)) return "no";
  if (CASH.has(t)) return "cash";
  if (LATER.has(t)) return "later";

  // Substring checks for natural speech (e.g. "हाँ बना दो", "yes please", "हो करा", "हाँ", "हो", "हा")
  if (
    t.includes("हाँ") ||
    t.includes("हां") ||
    t.includes("हा") ||
    t.includes("हो") ||
    t.includes("yes") ||
    t.includes("बना दो") ||
    t.includes("बनाओ") ||
    t.includes("बनव") ||
    t.includes("करा") ||
    t.includes("क्यूआर बना") ||
    t.includes("qr बना") ||
    t.includes("कर दो") ||
    t.includes("confirm")
  ) {
    return "yes";
  }

  if (t.includes("नाही") || t.includes("नहीं") || t.includes("cancel") || t.includes("रद्द") || t.includes("नको")) {
    return "no";
  }

  if (t.includes("रोख") || t.includes("नकद") || t.includes("नगद") || t.includes("cash")) {
    return "cash";
  }

  if (t.includes("उधारी") || t.includes("खाता") || t.includes("khata") || t.includes("later")) {
    return "later";
  }

  return "other";
}

const WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, to: 2, too: 2, three: 3, four: 4, for: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12,
  ek: 1, don: 2, do: 2, teen: 3, tin: 3, char: 4, paach: 5, pach: 5, saha: 6, saat: 7, aath: 8, nau: 9, daha: 10,
  "एक": 1, "१": 1, "दोन": 2, "दो": 2, "२": 2, "तीन": 3, "३": 3, "चार": 4, "४": 4, "पाच": 5, "पांच": 5, "५": 5,
};

export function parseQuantity(text: string): number | null {
  const t = norm(text)
    .replace(/^(no|nope|nahi|नाही|actually|wait|sorry|make it|make that|change it to|change that to|it's|its|let's say|say)\s+/, "")
    .replace(/^(make it|make that|change it to)\s+/, "")
    .replace(/\s+(please|of them|of those|kilo|kg|pude|puda|नग|किलो|पुडे)$/, "")
    .trim();
  if (/^\d{1,2}$/.test(t)) return Number(t);
  return t in WORDS ? WORDS[t] : null;
}

export function toAsciiDigits(str: string): string {
  return str.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 2406));
}

const DEV_PRICES: Record<string, number> = {
  "दहा": 10, "वीस": 20, "तीस": 30, "चाळीस": 40, "पन्नास": 50, "साठ": 60, "सत्तर": 70, "ऐंशी": 80, "नव्वद": 90, "शंभर": 100,
  "एकशे": 100, "दोनशे": 200, "तीनशे": 300, "चारशे": 400, "पाचशे": 500,
  "दस": 10, "बीस": 20, "चालीस": 40, "पचास": 50, "अस्सी": 80, "नब्बे": 90, "सौ": 100,
  "एक सौ": 100, "दो सौ": 200, "तीन सौ": 300
};

export type VoiceCatalogResult = {
  name: string;
  brand: string;
  unit: string;
  price: number;
  aliases: string[];
};

export function parseVoiceCatalogAdd(text: string): VoiceCatalogResult | null {
  const rawClean = toAsciiDigits(text.trim());
  if (!rawClean) return null;

  let price: number | null = null;
  let matchedWord: string | null = null;
  const digitMatch = rawClean.match(/(?:रुपये|₹|rs|दर|price|कीमत)?\s*(\d+(?:\.\d+)?)\s*(?:रुपये|₹|rs|rupees|रु)?/i);
  if (digitMatch && digitMatch[1]) {
    price = parseFloat(digitMatch[1]);
  } else {
    for (const [w, val] of Object.entries(DEV_PRICES)) {
      if (rawClean.includes(w)) {
        price = val;
        matchedWord = w;
        break;
      }
    }
  }

  if (price === null || price <= 0) return null;

  let unit = "1 kg";
  if (/(?:लिटर|liter|litre|1l|ltr)/i.test(rawClean)) unit = "1 Ltr";
  else if (/(?:पुडा|packet|pack|पॅकेट|पॉकेट)/i.test(rawClean)) unit = "1 Pack";
  else if (/(?:डझन|dozen)/i.test(rawClean)) unit = "1 Dozen";
  else if (/(?:नग|piece)/i.test(rawClean)) unit = "1 Unit";
  else if (/(?:५०g|250g|500g)/i.test(rawClean)) unit = "250g";

  let brand = "Standard";
  const brandKeywords = [
    { k: "fortune", name: "Fortune" },
    { k: "फॉर्च्यून", name: "Fortune" },
    { k: "gemini", name: "Gemini" },
    { k: "जेमिनी", name: "Gemini" },
    { k: "tata", name: "Tata Sampann" },
    { k: "टाटा", name: "Tata Sampann" },
    { k: "aashirvaad", name: "Aashirvaad" },
    { k: "आशीर्वाद", name: "Aashirvaad" },
    { k: "india gate", name: "India Gate" },
    { k: "इंडिया गेट", name: "India Gate" },
    { k: "wagh bakri", name: "Wagh Bakri" },
    { k: "वाघबकरी", name: "Wagh Bakri" },
    { k: "parle", name: "Parle" },
    { k: "पार्ले", name: "Parle" },
    { k: "madhur", name: "Madhur" },
    { k: "मधुर", name: "Madhur" },
  ];
  for (const b of brandKeywords) {
    if (rawClean.toLowerCase().includes(b.k)) {
      brand = b.name;
      break;
    }
  }

  let clean = rawClean
    .replace(/(?:नवीन|नया|new|सामान|वस्तू|item|जोडा|जोड़ो|add to catalog|कॅटलॉगमध्ये|कैटलॉग में|कॅटलॉग|कैटलॉग|नोंदवा)\s*/gi, " ")
    .replace(/(?:दर|किंमत|price|rate|कीमत)\s*/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\b/g, " ")
    .replace(/(?:रुपये|rupees|rs|₹|रु)\s*/gi, " ")
    .replace(/(?:किलो|kg|लिटर|liter|ltr|पुडा|पॅकेट|pack)\s*/gi, " ");

  if (matchedWord) {
    clean = clean.replace(new RegExp(matchedWord, "gi"), " ");
  }

  clean = clean.replace(/\s+/g, " ").trim();
  if (clean.length < 2) {
    clean = brand !== "Standard" ? `${brand} Item` : "Kirana Item";
  }

  const aliases = [
    clean.toLowerCase(),
    clean.replace(/\s+/g, ""),
  ].filter(Boolean);

  return {
    name: clean,
    brand,
    unit,
    price,
    aliases,
  };
}
