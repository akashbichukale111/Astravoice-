import { respond } from "@/lib/http";
import { transcribeSarvamAudio } from "@/lib/sarvam";
import type { SupportedLanguage } from "@/lib/types";

export async function POST(req: Request) {
  return respond(async () => {
    const form = await req.formData();
    const file = form.get("file");
    const lang = (form.get("lang") as SupportedLanguage) || "mr-IN";
    if (!file || !(file instanceof Blob)) throw new Error("Missing audio file.");
    return transcribeSarvamAudio(file, lang);
  });
}
