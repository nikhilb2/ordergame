// Setting only utterance.lang leaves the choice of voice to the phone, and some
// phones then read the German text with their default English voice. So we pick
// an installed German voice ourselves.

const VOICE_LOAD_TIMEOUT_MS = 1000;

// Apple's joke-style voices are also listed as German.
const NOVELTY_VOICE = /\b(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b/i;

// Some Android browsers report languages as "de_DE".
const normalizedLang = (voice: SpeechSynthesisVoice) =>
  voice.lang.replace("_", "-").toLowerCase();

const isGerman = (voice: SpeechSynthesisVoice) => {
  const lang = normalizedLang(voice);
  return lang === "de" || lang.startsWith("de-");
};

const voiceScore = (voice: SpeechSynthesisVoice) =>
  (NOVELTY_VOICE.test(voice.name) ? 0 : 4) +
  (normalizedLang(voice) === "de-de" ? 2 : 0) +
  (voice.localService ? 1 : 0);

export function pickGermanVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  return voices
    .filter(isGerman)
    .reduce<SpeechSynthesisVoice | undefined>(
      (best, voice) => (!best || voiceScore(voice) > voiceScore(best) ? voice : best),
      undefined,
    );
}

/** Voices load asynchronously on many phones, and getVoices() is empty until then. */
function whenVoicesLoaded(callback: () => void) {
  const synth = window.speechSynthesis;
  if (synth.getVoices().length > 0) {
    callback();
    return;
  }
  const done = () => {
    clearTimeout(timer);
    synth.removeEventListener?.("voiceschanged", done);
    callback();
  };
  // Not every browser fires voiceschanged, so never wait forever.
  const timer = setTimeout(done, VOICE_LOAD_TIMEOUT_MS);
  synth.addEventListener?.("voiceschanged", done);
}

let cancelCount = 0;
// Chrome can garbage-collect an utterance mid-speech, which silently drops onend.
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function cancelSpeech() {
  cancelCount += 1;
  window.speechSynthesis?.cancel();
}

type SpeakOptions = {
  rate?: number;
  onEnd?: () => void;
  /** Play after whatever is already speaking instead of interrupting it. */
  queue?: boolean;
};

export function speak(text: string, { rate = 0.9, onEnd, queue = false }: SpeakOptions = {}) {
  const synth = window.speechSynthesis;
  if (!synth) {
    onEnd?.();
    return;
  }
  if (!queue) cancelSpeech();
  const cancelCountAtRequest = cancelCount;

  whenVoicesLoaded(() => {
    if (cancelCountAtRequest !== cancelCount) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = rate;
    const voice = pickGermanVoice(synth.getVoices());
    if (voice) utterance.voice = voice;
    if (onEnd) utterance.onend = onEnd;
    currentUtterance = utterance;
    synth.speak(utterance);
  });
}
