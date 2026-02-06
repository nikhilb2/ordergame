import { useEffect, useCallback, useRef } from "react";

export function useSpeech(text: string) {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 0.9;
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [text]);

  useEffect(() => {
    // Small delay to let voices load on first visit
    const timeout = setTimeout(speak, 300);
    return () => {
      clearTimeout(timeout);
      window.speechSynthesis?.cancel();
    };
  }, [speak]);

  return { replay: speak };
}
