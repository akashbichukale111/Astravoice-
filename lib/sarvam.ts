// Sarvam AI Integration (Bulbul v3 TTS & Saaras v3 STT) with instant cache & fallback
import { getConfig } from "./config";
import type { SupportedLanguage } from "./types";

export type SarvamTtsResult = {
  audio_base64: string | null;
  provider: "sarvam_bulbul_v3" | "sarvam_bulbul_v1" | "browser_fallback";
  lang: SupportedLanguage;
  text: string;
};

// Global in-memory audio cache for instant 0ms playback on repeated Kirana phrases & Soundbox chimes
const ttsMemoryCache = new Map<string, string>();

let prewarmed = false;
export function prewarmCommonTts() {
  if (prewarmed) return;
  prewarmed = true;
  const commonPhrases = [
    { text: "1× पार्ले-जी पुडा — कुल बिल ₹30। क्या Paytm QR बनाएं? (हाँ बोलें)", lang: "hi-IN" as const },
    { text: "१× पारले-जी पुडा — एकूण बिल ₹३०. Paytm QR बनवू का? (हो म्हणा)", lang: "mr-IN" as const },
    { text: "पेटीएम अस्त्रा-शील्ड पर ₹30 प्राप्त हुए!", lang: "hi-IN" as const },
    { text: "पेटीएम अस्त्रा-शील्ड वर ₹30 प्राप्त झाले!", lang: "mr-IN" as const },
    { text: "कुल बिल ₹30। कृपया Paytm QR कोड स्कैन करें।", lang: "hi-IN" as const },
    { text: "एकूण बिल ₹30. कृपया Paytm QR कोड स्कॅन करा.", lang: "mr-IN" as const },
  ];
  setTimeout(async () => {
    for (const p of commonPhrases) {
      try {
        await synthesizeSarvamSpeech(p.text, p.lang);
      } catch {
        /* ignore */
      }
    }
  }, 300);
}

export async function synthesizeSarvamSpeech(text: string, lang: SupportedLanguage = "mr-IN"): Promise<SarvamTtsResult> {
  const cfg = getConfig();
  const apiKey = cfg.sarvamApiKey?.trim();
  if (!apiKey || apiKey === "your_sarvam_api_key_here") {
    return { audio_base64: null, provider: "browser_fallback", lang, text };
  }

  const cleanText = text.trim();
  const cacheKey = `${lang}:${cleanText}`;
  if (ttsMemoryCache.has(cacheKey)) {
    return {
      audio_base64: ttsMemoryCache.get(cacheKey)!,
      provider: "sarvam_bulbul_v3",
      lang,
      text: cleanText,
    };
  }

  try {
    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: [cleanText.slice(0, 490)],
        target_language_code: lang,
        speaker: cfg.sarvamSpeaker || "rupali",
        pitch: 0,
        pace: 1.05,
        loudness: 1.5,
        speech_sample_rate: 16000,
        enable_preprocessing: false, // fast generation (1.8s vs 8.2s)
        model: "bulbul:v3",
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return { audio_base64: null, provider: "browser_fallback", lang, text: cleanText };
    }
    const data = (await res.json()) as { audios?: string[] };
    const audio = data?.audios?.[0] ?? null;
    if (audio) {
      ttsMemoryCache.set(cacheKey, audio);
      // Keep cache at reasonable size
      if (ttsMemoryCache.size > 200) {
        const firstKey = ttsMemoryCache.keys().next().value;
        if (firstKey) ttsMemoryCache.delete(firstKey);
      }
    }
    return {
      audio_base64: audio,
      provider: audio ? "sarvam_bulbul_v3" : "browser_fallback",
      lang,
      text: cleanText,
    };
  } catch (err) {
    console.error("Sarvam TTS error:", err);
    return { audio_base64: null, provider: "browser_fallback", lang, text: cleanText };
  }
}

export async function transcribeSarvamAudio(audioBlob: Blob, lang: SupportedLanguage = "mr-IN"): Promise<{ transcript: string; provider: string }> {
  const cfg = getConfig();
  const apiKey = cfg.sarvamApiKey?.trim();
  if (!apiKey || apiKey === "your_sarvam_api_key_here") {
    throw new Error("SARVAM_API_KEY not configured; using browser Web Speech recognition.");
  }

  const form = new FormData();
  form.append("file", audioBlob, "utterance.wav");
  form.append("model", "saaras:v1");
  form.append("language_code", lang);

  const res = await fetch("https://api.sarvam.ai/speech-to-text", {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
    },
    body: form,
    signal: AbortSignal.timeout(9000),
  });

  if (!res.ok) {
    throw new Error(`Sarvam STT returned ${res.status}`);
  }
  const data = (await res.json()) as { transcript?: string };
  return { transcript: data.transcript ?? "", provider: "sarvam_saaras_v1" };
}
