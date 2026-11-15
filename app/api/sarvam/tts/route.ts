import { respond } from "@/lib/http";
import { synthesizeSarvamSpeech, prewarmCommonTts } from "@/lib/sarvam";
import type { SupportedLanguage } from "@/lib/types";

export async function POST(req: Request) {
  prewarmCommonTts();
  return respond(async () => {
    const body = (await req.json().catch(() => ({}))) as { text?: string; lang?: SupportedLanguage };
    const text = (body.text ?? "").trim();
    if (!text) return { audio_base64: null, provider: "browser_fallback", lang: body.lang ?? "mr-IN", text: "" };
    return synthesizeSarvamSpeech(text, body.lang ?? "mr-IN");
  });
}
