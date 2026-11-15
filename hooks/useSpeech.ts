"use client";
// Multilingual speech hook for AstraVoice (Merchant & Sales Teammate):
// Supports Marathi (mr-IN), Hindi (hi-IN), and English (en-IN).
// Uses Sarvam AI (Bulbul v3 TTS) when API key is configured, with Web Audio API guaranteed playback.
import { useCallback, useEffect, useRef, useState } from "react";
import type { SupportedLanguage } from "@/lib/types";
import { playAudioBytes } from "@/lib/chime";

type RecognitionLike = {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: ((e: any) => void) | null;
};

type Handlers = {
  onFinal: (text: string) => void;
  onInterim: (text: string) => void;
  onError: (message: string) => void;
  lang?: SupportedLanguage;
};

export function useSpeech(handlers: Handlers) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState<"sarvam" | "fast">("sarvam");
  const [ttsProvider, setTtsProvider] = useState<"sarvam_bulbul_v3" | "sarvam_bulbul_v1" | "browser_fallback">("sarvam_bulbul_v3");
  const recRef = useRef<RecognitionLike | null>(null);
  const wantRef = useRef(false);
  const speakingRef = useRef(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const lang = handlers.lang ?? "hi-IN";

  // Mutual exclusion refs to prevent multiple voices mixing
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioStopFnRef = useRef<(() => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const speakSeqRef = useRef<number>(0);

  const requestMicPermission = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (err) {
      console.warn("Microphone permission check failed:", err);
    }
  }, []);

  const begin = useCallback(() => {
    const rec = recRef.current;
    if (!rec || !wantRef.current) return;
    if (speakingRef.current) return;
    try {
      rec.lang = handlersRef.current.lang ?? "hi-IN";
      rec.start();
      setListening(true);
    } catch {
      /* already started or starting */
    }
  }, []);

  const stopAudioAndSynthesis = useCallback(() => {
    speakSeqRef.current += 1;
    speakingRef.current = false;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (audioStopFnRef.current) {
      audioStopFnRef.current();
      audioStopFnRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    const Ctor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!Ctor) { setSupported(false); return; }
    const rec: RecognitionLike = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    rec.onresult = (e: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          finalTranscript += " " + r[0].transcript;
        } else {
          interimTranscript += " " + r[0].transcript;
        }
      }
      const fullInterim = (finalTranscript + " " + interimTranscript).trim();
      const cleanFinal = finalTranscript.trim();
      if (fullInterim) {
        handlersRef.current.onInterim(fullInterim);
      }
      if (cleanFinal && e.results[e.results.length - 1]?.isFinal) {
        handlersRef.current.onFinal(cleanFinal);
      }
    };
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantRef.current = false;
        setListening(false);
        handlersRef.current.onError("माइक ब्लॉक है। कृपया ब्राउज़र एड्रेस बार में माइक की अनुमति दें (Allow Microphone).");
      } else {
        if (wantRef.current && !speakingRef.current) {
          setTimeout(begin, 80);
        }
      }
    };
    rec.onend = () => {
      setListening(false);
      if (wantRef.current && !speakingRef.current) {
        setTimeout(begin, 80);
      }
    };
    recRef.current = rec;
    return () => {
      try { rec.abort(); } catch {}
    };
  }, [begin, lang]);

  // Restart recognition immediately with new target language when user toggles Hindi / English / Marathi
  useEffect(() => {
    if (recRef.current) {
      recRef.current.lang = lang;
      if (wantRef.current && !speakingRef.current) {
        try {
          recRef.current.abort();
        } catch {
          /* ignore */
        }
        setTimeout(begin, 80);
      }
    }
  }, [begin, lang]);

  const stop = useCallback(() => {
    wantRef.current = false;
    speakingRef.current = false;
    stopAudioAndSynthesis();
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, [stopAudioAndSynthesis]);

  const start = useCallback(async () => {
    wantRef.current = true;
    speakingRef.current = false;
    await requestMicPermission();
    begin();
  }, [begin, requestMicPermission]);

  const toggle = useCallback(() => {
    if (wantRef.current || listening) {
      stop();
    } else {
      void start();
    }
  }, [listening, start, stop]);

  const speak = useCallback((text: string, overrideLang?: SupportedLanguage, forceSarvam?: boolean) => new Promise<void>(async (resolve) => {
    if (!text) return resolve();
    const targetLang = overrideLang ?? handlersRef.current.lang ?? "hi-IN";

    // 1. Immediately abort any prior voice playback or speech to prevent voice mixing
    stopAudioAndSynthesis();
    const currentSeq = speakSeqRef.current;
    speakingRef.current = true;
    const watchdog = setTimeout(() => {
      speakingRef.current = false;
      if (wantRef.current) begin();
    }, 15000);
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }

    // 2. Sarvam AI Bulbul v3 Cloud Neural Voice (Primary)
    // Check if browser actually has a native TTS voice installed for Hindi/Marathi
    const hasNativeVoice =
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      window.speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith(targetLang.slice(0, 2).toLowerCase()));

    if (voiceMode === "sarvam" || forceSarvam || !hasNativeVoice) {
      try {
        const controller = new AbortController();
        abortRef.current = controller;
        const res = await fetch("/api/sarvam/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, lang: targetLang }),
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { audio_base64?: string | null };
          if (data.audio_base64 && currentSeq === speakSeqRef.current) {
            setTtsProvider("sarvam_bulbul_v3");
            const binaryString = atob(data.audio_base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            // 1. Primary: Play via unlocked Web Audio API (immune to browser autoplay policies)
            try {
              const stopAudio = await playAudioBytes(
                bytes,
                () => {
                  clearTimeout(watchdog);
                  speakingRef.current = false;
                  audioStopFnRef.current = null;
                  resolve();
                  if (wantRef.current) setTimeout(begin, 150);
                },
                () => {
                  clearTimeout(watchdog);
                  speakingRef.current = false;
                  audioStopFnRef.current = null;
                  resolve();
                  if (wantRef.current) setTimeout(begin, 150);
                }
              );
              audioStopFnRef.current = stopAudio;
              return;
            } catch (webAudioErr) {
              console.warn("WebAudio decode failed, falling back to HTMLAudioElement:", webAudioErr);
            }

            // 2. Secondary: Fallback to HTML Audio Element
            const blob = new Blob([bytes], { type: "audio/wav" });
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            audio.onended = () => {
              clearTimeout(watchdog);
              URL.revokeObjectURL(audioUrl);
              speakingRef.current = false;
              audioRef.current = null;
              resolve();
              if (wantRef.current) setTimeout(begin, 150);
            };
            audio.onerror = () => {
              clearTimeout(watchdog);
              URL.revokeObjectURL(audioUrl);
              speakingRef.current = false;
              audioRef.current = null;
              resolve();
              if (wantRef.current) setTimeout(begin, 150);
            };
            try {
              await audio.play();
              return;
            } catch (playErr) {
              console.warn("Autoplay blocked or play failed, trying browser synthesis:", playErr);
            }
          }
        }
      } catch {
        // Aborted or failed, fall through to browser synthesis
      }
    }

    // 3. Fallback: Browser SpeechSynthesis
    if (currentSeq !== speakSeqRef.current) {
      speakingRef.current = false;
      return resolve();
    }
    setTtsProvider("browser_fallback");
    if (!("speechSynthesis" in window)) {
      speakingRef.current = false;
      return resolve();
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume?.();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = targetLang;
    u.rate = 1.08;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(watchdog);
      speakingRef.current = false;
      resolve();
      if (wantRef.current) setTimeout(begin, 150);
    };
    const browserWatchdog = setTimeout(done, Math.max(3000, text.length * 100));
    u.onend = () => {
      clearTimeout(browserWatchdog);
      done();
    };
    u.onerror = () => {
      clearTimeout(browserWatchdog);
      done();
    };
    window.speechSynthesis.speak(u);
  }), [begin, stopAudioAndSynthesis, voiceMode]);

  return { supported, listening, start, stop, toggle, speak, ttsProvider, voiceMode, setVoiceMode };
}
