import type { SupportedLanguage } from "./types";

export type Sample = {
  id: "tea" | "mandi" | "kirana" | "pharmacy" | "hardware" | "services" | "fuel_reverse" | "fuel_combo" | "summary";
  label: string;
  sentence: string;
  shown: string;
  badge?: string;
};

export const SANDBOX_BUYER_EMAIL = "ramesh.patil@paytm.example.com";

const SAMPLES_BY_LANG: Record<SupportedLanguage, Sample[]> = {
  "mr-IN": [
    {
      id: "tea",
      label: "☕ चहा टपरी (₹63)",
      sentence: "२ कटिंग चहा, १ वडापाव आणि १ बन मस्का",
      shown: "२ कटिंग चहा, १ वडापाव आणि १ बन मस्का",
      badge: "Tea & Snacks",
    },
    {
      id: "mandi",
      label: "🥬 भाजी मंडई (₹125)",
      sentence: "१ कोथिंबीर जुडी, २ किलो कांदा आणि १ किलो टोमॅटो",
      shown: "१ कोथिंबीर जुडी, २ किलो कांदा आणि १ किलो टोमॅटो",
      badge: "Mandi & Veg",
    },
    {
      id: "kirana",
      label: "🛒 किराणा स्टोअर (₹537)",
      sentence: "१ किलो साखर, २ वाघबकरी चहा पावडर पुडे, २ किलो गूळ आणि १ जेमिनी तेल पुडा",
      shown: "१ किलो साखर, २ वाघबकरी चहा, २ किलो गूळ आणि १ जेमिनी तेल",
      badge: "Kirana & FMCG",
    },
    {
      id: "pharmacy",
      label: "💊 मेडिकल / फार्मसी (₹151)",
      sentence: "२ डोलो ६५० स्ट्रिप, १ ओआरएस पाकीट आणि १ विक्स इनहेलर",
      shown: "२ डोलो ६५०, १ ओआरएस आणि १ विक्स इनहेलर",
      badge: "Pharmacy",
    },
    {
      id: "hardware",
      label: "🔧 हार्डवेअर / इलेक्ट्रिक (₹350)",
      sentence: "२ एलईडी बल्ब, १ इन्स्युलेशन टेप आणि १ फेव्हिकॉल डबा",
      shown: "२ एलईडी बल्ब, १ इन्स्युलेशन टेप आणि १ फेव्हिकॉल",
      badge: "Hardware",
    },
    {
      id: "services",
      label: "💈 सलून आणि सर्व्हिस (₹150)",
      sentence: "१ हेअरकट आणि १ दाढी शेव्हिंग",
      shown: "१ हेअरकट आणि १ दाढी शेव्हिंग",
      badge: "Salon & Services",
    },
    {
      id: "fuel_reverse",
      label: "⛽ २०० चे पेट्रोल (Reverse ₹200)",
      sentence: "२०० रुपयांचे पेट्रोल",
      shown: "२०० रुपयांचे पेट्रोल (Reverse 1.92 Ltr @ ₹104/L)",
      badge: "Reverse Engine",
    },
    {
      id: "fuel_combo",
      label: "⛽ २L पेट्रोल + १L डिझेल (₹300)",
      sentence: "२ लिटर पेट्रोल आणि १ लिटर डिझेल",
      shown: "२ लिटर पेट्रोल आणि १ लिटर डिझेल (₹300)",
      badge: "Multi Fuel",
    },
    {
      id: "summary",
      label: "📊 आजचा गल्ला (Ask Astra)",
      sentence: "आजचा एकूण गल्ला आणि बँक सेटलमेंट किती झाले?",
      shown: "आजचा एकूण गल्ला आणि बँक सेटलमेंट किती झाले?",
      badge: "Settlement",
    },
  ],
  "hi-IN": [
    {
      id: "tea",
      label: "☕ चाय टपरी (₹63)",
      sentence: "2 कटिंग चाय, 1 वड़ापाव और 1 बन मस्का",
      shown: "2 कटिंग चाय, 1 वड़ापाव और 1 बन मस्का",
      badge: "Tea & Snacks",
    },
    {
      id: "mandi",
      label: "🥬 सब्जी मंडी (₹125)",
      sentence: "1 धनिया पत्ती, 2 किलो प्याज और 1 किलो टमाटर",
      shown: "1 धनिया पत्ती, 2 किलो प्याज और 1 किलो टमाटर",
      badge: "Mandi & Veg",
    },
    {
      id: "kirana",
      label: "🛒 किराना स्टोर (₹537)",
      sentence: "1 किलो चीनी, 2 वाघ बकरी चाय, 2 किलो गुड़ और 1 जेमिनी तेल",
      shown: "1 किलो चीनी, 2 वाघ बकरी चाय, 2 किलो गुड़ और 1 जेमिनी तेल",
      badge: "Kirana & FMCG",
    },
    {
      id: "pharmacy",
      label: "💊 मेडिकल / फार्मेसी (₹151)",
      sentence: "2 डोलो 650 स्ट्रिप, 1 ओआरएस पाकेट और 1 विक्स इनहेलर",
      shown: "2 डोलो 650, 1 ओआरएस और 1 विक्स इनहेलर",
      badge: "Pharmacy",
    },
    {
      id: "hardware",
      label: "🔧 हार्डवेयर / इलेक्ट्रिक (₹350)",
      sentence: "2 एलईडी बल्ब, 1 इन्स्युलेशन टेप और 1 फेविकोल डब्बा",
      shown: "2 एलईडी बल्ब, 1 टेप और 1 फेविकोल",
      badge: "Hardware",
    },
    {
      id: "services",
      label: "💈 सैलून और सर्विस (₹150)",
      sentence: "1 हेयरकट और 1 दाढ़ी शेविंग",
      shown: "1 हेयरकट और 1 दाढ़ी शेविंग",
      badge: "Salon & Services",
    },
    {
      id: "fuel_reverse",
      label: "⛽ 200 का पेट्रोल (Reverse ₹200)",
      sentence: "200 रुपये का पेट्रोल",
      shown: "200 रुपये का पेट्रोल (Reverse 1.92 Ltr @ ₹104/L)",
      badge: "Reverse Engine",
    },
    {
      id: "fuel_combo",
      label: "⛽ 2L पेट्रोल + 1L डीजल (₹300)",
      sentence: "2 लीटर पेट्रोल और 1 लीटर डीजल",
      shown: "2 लीटर पेट्रोल और 1 लीटर डीजल (₹300)",
      badge: "Multi Fuel",
    },
    {
      id: "summary",
      label: "📊 आज का गल्ला (Ask Astra)",
      sentence: "आज का कुल गल्ला और बैंक सेटलमेंट कितना हुआ?",
      shown: "आज का कुल गल्ला और बैंक सेटलमेंट कितना हुआ?",
      badge: "Settlement",
    },
  ],
  "en-IN": [
    {
      id: "tea",
      label: "☕ Tea Stall & Cafe (₹63)",
      sentence: "2 cutting chai, 1 vada pav and 1 bun maska",
      shown: "2 cutting chai, 1 vada pav and 1 bun maska",
      badge: "Tea & Snacks",
    },
    {
      id: "mandi",
      label: "🥬 Farmer Mandi (₹125)",
      sentence: "1 coriander bunch, 2 kg onion and 1 kg tomato",
      shown: "1 coriander bunch, 2 kg onion and 1 kg tomato",
      badge: "Mandi & Veg",
    },
    {
      id: "kirana",
      label: "🛒 Kirana Store (₹537)",
      sentence: "1 kg sugar, 2 wagh bakri tea, 2 kg jaggery and 1 gemini oil",
      shown: "1 kg sugar, 2 wagh bakri tea, 2 kg jaggery and 1 gemini oil",
      badge: "Kirana & FMCG",
    },
    {
      id: "pharmacy",
      label: "💊 Pharmacy & Chemist (₹151)",
      sentence: "2 dolo 650 strip, 1 electral ors and 1 vicks inhaler",
      shown: "2 dolo 650, 1 ors pack and 1 vicks inhaler",
      badge: "Pharmacy",
    },
    {
      id: "hardware",
      label: "🔧 Hardware & Agro (₹350)",
      sentence: "2 led bulb, 1 insulation tape and 1 fevicol pack",
      shown: "2 led bulb, 1 tape and 1 fevicol",
      badge: "Hardware",
    },
    {
      id: "services",
      label: "💈 Salon & Services (₹150)",
      sentence: "1 haircut and 1 beard shaving",
      shown: "1 haircut and 1 beard shaving",
      badge: "Salon & Services",
    },
    {
      id: "fuel_reverse",
      label: "⛽ ₹200 Petrol (Reverse ₹200)",
      sentence: "200 rupees petrol",
      shown: "200 Rupees Petrol (Reverse 1.92 Ltr @ ₹104/L)",
      badge: "Reverse Engine",
    },
    {
      id: "fuel_combo",
      label: "⛽ 2L Petrol + 1L Diesel (₹300)",
      sentence: "2 liters petrol and 1 liter diesel",
      shown: "2 Liters Petrol + 1 Liter Diesel (₹300)",
      badge: "Multi Fuel",
    },
    {
      id: "summary",
      label: "📊 Today's Total (Ask Astra)",
      sentence: "What is today's total collection and settlement?",
      shown: "What is today's total collection and settlement?",
      badge: "Settlement",
    },
  ],
};

export function getSamples(lang: SupportedLanguage = "hi-IN"): Sample[] {
  return SAMPLES_BY_LANG[lang] ?? SAMPLES_BY_LANG["hi-IN"];
}

export function getSamplesCaption(lang: SupportedLanguage = "hi-IN"): string {
  if (lang === "hi-IN") return "जजेस के लिए 7 प्रमुख भारतीय व्यापार सैम्पल (1-क्लिक करें या माइक में बोलें — तुरंत Paytm Dynamic QR बनेगा):";
  if (lang === "en-IN") return "1-Click Multi-Business Samples for Judges (Petrol Pump, Tea Stall, Mandi, Kirana, Pharmacy, Hardware, Salon):";
  return "जजेससाठी भारतातील ७ प्रमुख व्यापार सॅम्पल्स (१-क्लिक करा किंवा माईकमध्ये बोला — थेट Paytm Dynamic QR तयार होतो):";
}

export const SAMPLES = SAMPLES_BY_LANG["hi-IN"];
export const SAMPLES_CAPTION = getSamplesCaption("hi-IN");

// Backward compatibility for tests and eval scripts
export const SAMPLE_SENTENCE = "1 किलो साखर, 2 वाघबकरी चहा पावडर पुडे, 2 किलो गूळ आणि 1 जेमिनी तेल पुडा";
export const SAMPLE_CASH = "2 वाघबकरी चहा आणि 4 किलो गूळ रोख पैसे";
export const SAMPLE_LATER = "5 किलो तांदूळ रमेश दादांच्या खात्यावर लिहा";
export const SAMPLE_SUMMARY = "आजचा एकूण गल्ला आणि बँक सेटलमेंट किती झाले?";
