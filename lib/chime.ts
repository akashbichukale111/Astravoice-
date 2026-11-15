// Web Audio & Soft Chime for AstraVoice (Merchant & Sales Teammate)
// Provides guaranteed unlocked audio playback that bypasses browser autoplay restrictions.
let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = ctx ?? new Ctor();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    return ctx;
  } catch {
    return null;
  }
}

// Must be called from a user gesture once (e.g. mic start, tap, button click)
export function unlockAudio() {
  getAudioContext();
}

export function playChime() {
  const ac = getAudioContext();
  if (!ac) return;
  const now = ac.currentTime;
  [659.25, 987.77].forEach((freq, i) => {
    // E5 then B5, a gentle fifth
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + i * 0.12);
    gain.gain.linearRampToValueAtTime(0.16, now + i * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.9);
    osc.connect(gain).connect(ac.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 1);
  });
}

// Play decoded WAV bytes directly via unlocked AudioContext (never blocked by autoplay policies)
export async function playAudioBytes(
  bytes: Uint8Array,
  onEnded: () => void,
  onError: () => void
): Promise<() => void> {
  const ac = getAudioContext();
  if (!ac) throw new Error("AudioContext not supported");
  if (ac.state === "suspended") await ac.resume();

  const bufferCopy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(bufferCopy).set(bytes);
  const audioBuffer = await ac.decodeAudioData(bufferCopy);
  const source = ac.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ac.destination);

  let stopped = false;
  source.onended = () => {
    if (!stopped) {
      stopped = true;
      onEnded();
    }
  };

  source.start(0);

  return () => {
    if (!stopped) {
      stopped = true;
      try {
        source.stop();
        source.disconnect();
      } catch {
        /* ignore */
      }
    }
  };
}
