import { useEffect, useCallback } from "react";
import { cancelSpeech, speak } from "@/lib/speech";

export function useSpeech(text: string) {
  const replay = useCallback(() => speak(text), [text]);

  useEffect(() => {
    const timeout = setTimeout(replay, 300);
    return () => {
      clearTimeout(timeout);
      cancelSpeech();
    };
  }, [replay]);

  return { replay };
}
