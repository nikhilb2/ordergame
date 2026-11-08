import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelSpeech, pickGermanVoice, speak } from "./speech";

const voice = (name: string, lang: string, localService = true) =>
  ({ name, lang, localService, default: false, voiceURI: name }) as SpeechSynthesisVoice;

describe("pickGermanVoice", () => {
  it("ignores non-German voices", () => {
    expect(pickGermanVoice([voice("Samantha", "en-US")])).toBeUndefined();
  });

  it("recognises Android-style language codes", () => {
    const german = voice("Deutsch", "de_DE");
    expect(pickGermanVoice([voice("English", "en_US"), german])).toBe(german);
  });

  it("prefers de-DE over other German variants", () => {
    const germany = voice("Anna", "de-DE");
    expect(pickGermanVoice([voice("Swiss", "de-CH"), germany])).toBe(germany);
  });

  it("prefers a normal voice over a novelty voice", () => {
    const anna = voice("Anna", "de-DE");
    expect(pickGermanVoice([voice("Eddy (Deutsch (Deutschland))", "de-DE"), anna])).toBe(anna);
  });

  it("prefers an on-device voice over a network voice", () => {
    const local = voice("de-de-x-local", "de-DE");
    expect(pickGermanVoice([voice("de-de-x-network", "de-DE", false), local])).toBe(local);
  });
});

describe("speak", () => {
  let voices: SpeechSynthesisVoice[];
  const synth = {
    getVoices: () => voices,
    speak: vi.fn(),
    cancel: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    voices = [];
    vi.stubGlobal("speechSynthesis", synth);
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        constructor(public text: string) {}
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("assigns the German voice, not just the language", () => {
    const german = voice("Anna", "de-DE");
    voices = [voice("Samantha", "en-US"), german];
    speak("Hallo");
    const utterance = synth.speak.mock.calls[0][0];
    expect(utterance.voice).toBe(german);
    expect(utterance.lang).toBe("de-DE");
  });

  it("waits for voices that load late", () => {
    speak("Hallo");
    expect(synth.speak).not.toHaveBeenCalled();
    const german = voice("Anna", "de-DE");
    voices = [german];
    synth.addEventListener.mock.calls[0][1]();
    expect(synth.speak.mock.calls[0][0].voice).toBe(german);
  });

  it("still speaks if the voices never load", () => {
    speak("Hallo");
    vi.advanceTimersByTime(1000);
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it("drops a waiting request when speech is cancelled", () => {
    speak("Hallo");
    cancelSpeech();
    vi.advanceTimersByTime(1000);
    expect(synth.speak).not.toHaveBeenCalled();
  });
});
