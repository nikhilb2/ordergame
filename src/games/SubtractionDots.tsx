import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameHeader } from "@/components/GameHeader";
import { Confetti } from "@/components/Confetti";
import { useSpeech } from "@/hooks/use-speech";
import { RefreshCw } from "lucide-react";

const GERMAN_NUMBERS = [
  "null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben",
  "acht", "neun", "zehn", "elf", "zwölf", "dreizehn", "vierzehn",
  "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn", "zwanzig",
];

function speakGerman(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}

const DOT_COLORS = [
  "bg-kid-blue",
  "bg-kid-purple",
  "bg-kid-pink",
  "bg-kid-orange",
  "bg-kid-green",
];

function generateProblem() {
  const a = Math.floor(Math.random() * 19) + 2; // 2–20
  const b = Math.floor(Math.random() * (a - 1)) + 1; // 1–(a-1)
  const answer = a - b;

  const choices = new Set<number>([answer]);
  while (choices.size < 4) {
    const offset = Math.floor(Math.random() * 5) - 2;
    const val = answer + offset;
    if (val >= 0 && val <= 20 && val !== answer) choices.add(val);
  }

  const color = DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)];

  return {
    a,
    b,
    answer,
    color,
    choices: Array.from(choices).sort(() => Math.random() - 0.5),
  };
}

export default function SubtractionDots() {
  const { replay } = useSpeech(
    "Streiche Punkte durch und zähle den Rest!"
  );
  const [problem, setProblem] = useState(generateProblem);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [crossedDots, setCrossedDots] = useState<Set<number>>(new Set());
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const toggleDot = useCallback(
    (index: number) => {
      if (selectedAnswer !== null) return;
      setCrossedDots((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        return next;
      });
    },
    [selectedAnswer]
  );

  const handleSelect = useCallback(
    (val: number) => {
      if (selectedAnswer !== null) return;
      setSelectedAnswer(val);
      setTotal((t) => t + 1);

      if (val === problem.answer) {
        setScore((s) => s + 1);
        setFeedback("correct");
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 100);
        speakGerman(
          `${GERMAN_NUMBERS[problem.a]} minus ${GERMAN_NUMBERS[problem.b]} gleich ${GERMAN_NUMBERS[problem.answer]}`
        );
      } else {
        setFeedback("wrong");
      }
    },
    [problem, selectedAnswer]
  );

  const nextProblem = () => {
    setProblem(generateProblem());
    setCrossedDots(new Set());
    setSelectedAnswer(null);
    setFeedback(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Confetti show={showConfetti} />
      <div className="max-w-3xl mx-auto">
        <GameHeader
          title="Abziehen mit Punkten"
          emoji="➖"
          score={score}
          total={total}
          onReplay={replay}
        />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card rounded-3xl p-6 md:p-8 shadow-lg"
        >
          {/* Problem display */}
          <div className="text-center mb-4">
            <span className="text-4xl md:text-5xl font-black text-foreground">
              {problem.a} − {problem.b} = ?
            </span>
          </div>

          {/* Instruction */}
          <p className="text-center text-muted-foreground mb-6 font-semibold">
            Streiche {problem.b} Punkte durch und zähle den Rest!
          </p>

          {/* Dot grid */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-4 max-w-md mx-auto">
            {Array.from({ length: problem.a }, (_, i) => {
              const isCrossed = crossedDots.has(i);
              return (
                <motion.button
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.03, type: "spring" }}
                  onClick={() => toggleDot(i)}
                  disabled={selectedAnswer !== null}
                  className={`
                    w-10 h-10 md:w-12 md:h-12 rounded-full relative
                    flex items-center justify-center
                    shadow-md transition-colors
                    ${isCrossed ? "opacity-40" : ""}
                    ${problem.color} cursor-pointer
                    disabled:cursor-default
                  `}
                >
                  {isCrossed && (
                    <span className="text-red-600 text-2xl md:text-3xl font-black absolute">
                      ✕
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Crossed counter */}
          <p className="text-center text-muted-foreground mb-6 font-semibold text-lg">
            Durchgestrichen: {crossedDots.size} / {problem.b}
          </p>

          {/* Answer choices */}
          <div className="flex justify-center gap-3 md:gap-4 mb-6">
            {problem.choices.map((val) => {
              const isSelected = selectedAnswer === val;
              const isCorrect = val === problem.answer;
              const showResult = selectedAnswer !== null;

              return (
                <motion.button
                  key={val}
                  whileHover={selectedAnswer === null ? { scale: 1.1 } : {}}
                  whileTap={selectedAnswer === null ? { scale: 0.9 } : {}}
                  onClick={() => handleSelect(val)}
                  disabled={selectedAnswer !== null}
                  className={`
                    w-16 h-16 md:w-20 md:h-20 rounded-2xl text-2xl md:text-3xl font-black shadow-md
                    ${
                      showResult && isCorrect
                        ? "bg-accent text-accent-foreground ring-4 ring-accent/30"
                        : isSelected && !isCorrect
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-kid-purple text-primary-foreground"
                    }
                    disabled:cursor-default
                  `}
                >
                  {val}
                </motion.button>
              );
            })}
          </div>

          {/* Feedback */}
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
                  ? "🎉 Perfekt!"
                  : `😊 Die Antwort ist ${problem.answer}!`}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Next button */}
          <div className="flex justify-center mt-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={nextProblem}
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
