import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameHeader } from "@/components/GameHeader";
import { Confetti } from "@/components/Confetti";
import { useSpeech } from "@/hooks/use-speech";
import { RefreshCw } from "lucide-react";

const GERMAN_NUMBERS: Record<number, string> = {
  1: "eins", 2: "zwei", 3: "drei", 4: "vier", 5: "fünf",
  6: "sechs", 7: "sieben", 8: "acht", 9: "neun", 10: "zehn",
  11: "elf", 12: "zwölf", 13: "dreizehn", 14: "vierzehn", 15: "fünfzehn",
  16: "sechzehn", 17: "siebzehn", 18: "achtzehn", 19: "neunzehn", 20: "zwanzig",
};

function rollDice() {
  const die1 = Math.floor(Math.random() * 10) + 1;
  const die2 = Math.floor(Math.random() * 10) + 1;
  return { die1, die2 };
}

function speakEquation(a: number, b: number, sum: number) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const text = `${GERMAN_NUMBERS[a]} plus ${GERMAN_NUMBERS[b]} gleich ${GERMAN_NUMBERS[sum]}`;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

export default function DiceAddition() {
  const { replay } = useSpeech("Was ergibt die Summe der beiden Würfel?");
  const [dice, setDice] = useState(rollDice);
  const [userAnswer, setUserAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const correctSum = dice.die1 + dice.die2;

  useEffect(() => {
    if (!submitted) {
      inputRef.current?.focus();
    }
  }, [submitted, dice]);

  const handleSubmit = useCallback(() => {
    if (submitted || userAnswer.trim() === "") return;
    setSubmitted(true);
    setTotal((t) => t + 1);

    if (parseInt(userAnswer, 10) === correctSum) {
      setScore((s) => s + 1);
      setFeedback("correct");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
      speakEquation(dice.die1, dice.die2, correctSum);
    } else {
      setFeedback("wrong");
    }
  }, [submitted, userAnswer, correctSum, dice]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const nextRound = () => {
    setDice(rollDice());
    setUserAnswer("");
    setFeedback(null);
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Confetti show={showConfetti} />
      <div className="max-w-3xl mx-auto">
        <GameHeader title="Würfeln & Addieren" emoji="🎲" score={score} total={total} onReplay={replay} />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card rounded-3xl p-6 md:p-8 shadow-lg"
        >
          <p className="text-center text-muted-foreground mb-8">
            Was ergibt die Summe?
          </p>

          <div className="flex items-center justify-center gap-3 md:gap-6 mb-8 flex-wrap">
            <motion.div
              key={`d1-${dice.die1}-${total}`}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="bg-kid-blue text-primary-foreground w-20 h-20 md:w-28 md:h-28 rounded-3xl flex items-center justify-center text-4xl md:text-5xl font-black shadow-lg"
            >
              {dice.die1}
            </motion.div>

            <span className="text-4xl font-black text-muted-foreground">+</span>

            <motion.div
              key={`d2-${dice.die2}-${total}`}
              initial={{ scale: 0, rotate: 20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
              className="bg-kid-pink text-primary-foreground w-20 h-20 md:w-28 md:h-28 rounded-3xl flex items-center justify-center text-4xl md:text-5xl font-black shadow-lg"
            >
              {dice.die2}
            </motion.div>

            <span className="text-4xl font-black text-muted-foreground">=</span>

            <input
              ref={inputRef}
              type="number"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={submitted}
              className="w-20 h-20 md:w-28 md:h-28 rounded-3xl border-4 border-dashed border-border text-4xl md:text-5xl font-black text-center bg-card no-spinner focus:outline-none focus:border-kid-blue transition-colors disabled:opacity-70"
              placeholder="?"
            />
          </div>

          <div className="flex justify-center mb-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={submitted || userAnswer.trim() === ""}
              className="bg-gradient-ocean text-primary-foreground font-bold px-8 py-3 rounded-2xl shadow-lg text-lg disabled:opacity-50 disabled:cursor-default"
            >
              Prüfen
            </motion.button>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className={`text-center text-2xl font-black ${
                  feedback === "correct" ? "text-accent" : "text-destructive"
                }`}
              >
                {feedback === "correct"
                  ? "🎉 Richtig!"
                  : `😊 Die Antwort ist ${correctSum}`}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-center mt-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={nextRound}
              className="bg-gradient-sunny text-foreground font-bold px-8 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-lg"
            >
              <RefreshCw size={22} /> Weiter
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
