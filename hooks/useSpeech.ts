"use client";
// Multilingual speech hook for AstraVoice (Merchant & Sales Teammate):
// Supports Marathi (mr-IN), Hindi (hi-IN), and English (en-IN).
// Uses Sarvam AI (Bulbul v3 TTS) when API key is configured, with Web Audio API guaranteed playback.
import { useCallback, useEffect, useRef, useState } from "react";
import type { SupportedLanguage } from "@/lib/types";
import { playAudioBytes } from "@/lib/chime";

type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: any) => void) | null;
  onstart?: (() => void) | null;
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
  const isStartingRef = useRef(false);
  const restartingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakingRef = useRef(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const lang = handlers.lang ?? "mr-IN";

  // Mutual exclusion refs to prevent multiple voices mixing
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioStopFnRef = useRef<(() => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const speakSeqRef = useRef<number>(0);

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

  const begin = useCallback(() => {
    const rec = recRef.current;
    if (!rec || !wantRef.current || speakingRef.current) return;
    if (isStartingRef.current) return;

    try {
      rec.lang = handlersRef.current.lang ?? "mr-IN";
      isStartingRef.current = true;
      rec.start();
    } catch (err: any) {
      isStartingRef.current = false;
      if (err?.name !== "InvalidStateError") {
        console.warn("[Speech] rec.start warning:", err);
      }
    }
  }, []);

  const scheduleRestart = useCallback((delayMs = 120) => {
    if (restartingTimerRef.current) {
      clearTimeout(restartingTimerRef.current);
      restartingTimerRef.current = null;
    }
    if (!wantRef.current || speakingRef.current) return;
    restartingTimerRef.current = setTimeout(() => {
      restartingTimerRef.current = null;
      begin();
    }, delayMs);
  }, [begin]);

  // Initialize SpeechRecognition once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }

    const rec: RecognitionLike = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onstart = () => {
      isStartingRef.current = false;
      setListening(true);
    };

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
      isStartingRef.current = false;
      const err = e?.error || "unknown";

      if (err === "not-allowed" || err === "service-not-allowed") {
        wantRef.current = false;
        setListening(false);
        handlersRef.current.onError("माइक ब्लॉक आहे. कृपया ब्राउझर ॲड्रेस बारमध्ये माइक Allow करा.");
        return;
      }

      if (err === "no-speech") {
        // Normal silence timeout in Chrome - gently restart
        scheduleRestart(100);
        return;
      }

      if (err === "aborted") {
        if (wantRef.current && !speakingRef.current) {
          scheduleRestart(200);
        }
        return;
      }

      if (wantRef.current && !speakingRef.current) {
        scheduleRestart(400);
      }
    };

    rec.onend = () => {
      isStartingRef.current = false;
      setListening(false);
      if (wantRef.current && !speakingRef.current) {
        scheduleRestart(120);
      }
    };

    recRef.current = rec;

    return () => {
      if (restartingTimerRef.current) clearTimeout(restartingTimerRef.current);
      try {
        rec.abort();
      } catch {}
    };
  }, [scheduleRestart, lang]);

  // Dynamic language updates
  useEffect(() => {
    if (recRef.current) {
      recRef.current.lang = lang;
      if (wantRef.current && !speakingRef.current) {
        try {
          recRef.current.abort();
        } catch {}
        scheduleRestart(120);
      }
    }
  }, [lang, scheduleRestart]);

  const start = useCallback(() => {
    wantRef.current = true;
    speakingRef.current = false;
    begin();
  }, [begin]);

  const stop = useCallback(() => {
    wantRef.current = false;
    speakingRef.current = false;
    if (restartingTimerRef.current) {
      clearTimeout(restartingTimerRef.current);
      restartingTimerRef.current = null;
    }
    stopAudioAndSynthesis();
    try {
      recRef.current?.abort();
    } catch {}
    setListening(false);
  }, [stopAudioAndSynthesis]);

  const toggle = useCallback(() => {
    if (wantRef.current || listening) {
      stop();
    } else {
      start();
    }
  }, [listening, start, stop]);

  const speak = useCallback(
    (text: string, overrideLang?: SupportedLanguage, forceSarvam?: boolean) =>
      new Promise<void>(async (resolve) => {
        if (!text) return resolve();
        const targetLang = overrideLang ?? handlersRef.current.lang ?? "mr-IN";

        // Stop prior audio
        stopAudioAndSynthesis();
        const currentSeq = speakSeqRef.current;

        // Try Sarvam TTS first
        if (voiceMode === "sarvam" || forceSarvam) {
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

                // Mute mic only during actual playback
                speakingRef.current = true;
                try {
                  recRef.current?.abort();
                } catch {}
                setListening(false);

                const binaryString = atob(data.audio_base64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }

                const onDone = () => {
                  speakingRef.current = false;
                  audioStopFnRef.current = null;
                  resolve();
                  if (wantRef.current) scheduleRestart(150);
                };

                try {
                  const stopAudio = await playAudioBytes(bytes, onDone, onDone);
                  audioStopFnRef.current = stopAudio;
                  return;
                } catch (webAudioErr) {
                  console.warn("[Speech] playAudioBytes failed, fallback to Audio element:", webAudioErr);
                  const blob = new Blob([bytes], { type: "audio/wav" });
                  const audioUrl = URL.createObjectURL(blob);
                  const audio = new Audio(audioUrl);
                  audioRef.current = audio;
                  audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    onDone();
                  };
                  audio.onerror = () => {
                    URL.revokeObjectURL(audioUrl);
                    onDone();
                  };
                  await audio.play();
                  return;
                }
              }
            }
          } catch (e) {
            console.warn("[Speech] Sarvam TTS call failed, falling back to browser synthesis:", e);
          }
        }

        // Browser SpeechSynthesis fallback
        if (currentSeq !== speakSeqRef.current) {
          speakingRef.current = false;
          return resolve();
        }

        setTtsProvider("browser_fallback");
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          speakingRef.current = false;
          return resolve();
        }

        speakingRef.current = true;
        try {
          recRef.current?.abort();
        } catch {}
        setListening(false);

        window.speechSynthesis.cancel();
        window.speechSynthesis.resume?.();

        const u = new SpeechSynthesisUtterance(text);
        u.lang = targetLang;
        u.rate = 1.05;

        let finished = false;
        const done = () => {
          if (finished) return;
          finished = true;
          speakingRef.current = false;
          resolve();
          if (wantRef.current) scheduleRestart(150);
        };

        const timeoutId = setTimeout(done, Math.max(3000, text.length * 80));
        u.onend = () => {
          clearTimeout(timeoutId);
          done();
        };
        u.onerror = () => {
          clearTimeout(timeoutId);
          done();
        };

        window.speechSynthesis.speak(u);
      }),
    [begin, scheduleRestart, stopAudioAndSynthesis, voiceMode]
  );

  return { supported, listening, start, stop, toggle, speak, ttsProvider, voiceMode, setVoiceMode };
}
