import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameHeader } from "@/components/GameHeader";
import { Confetti } from "@/components/Confetti";
import { useSpeech } from "@/hooks/use-speech";
import { RefreshCw } from "lucide-react";

const EMOJIS = ["🍎", "🌟", "🐱", "🎈", "🌸", "🐠", "🍕", "🎵"];

function generateProblem() {
  const count = Math.floor(Math.random() * 15) + 3;
  const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  const choices = new Set<number>([count]);
  while (choices.size < 4) {
    const offset = Math.floor(Math.random() * 5) - 2;
    const val = count + offset;
    if (val > 0 && val <= 20 && val !== count) choices.add(val);
  }
  return {
    count,
    emoji,
    choices: Array.from(choices).sort(() => Math.random() - 0.5),
  };
}

export default function CountAndMatch() {
  const { replay } = useSpeech("Zähle die Bilder und wähle die richtige Zahl!");
  const [problem, setProblem] = useState(generateProblem);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleSelect = useCallback(
    (val: number) => {
      if (selected !== null) return;
      setSelected(val);
      setTotal((t) => t + 1);

      if (val === problem.count) {
        setScore((s) => s + 1);
        setFeedback("correct");
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 100);
      } else {
        setFeedback("wrong");
      }
    },
    [problem, selected]
  );

  const nextProblem = () => {
    setProblem(generateProblem());
    setSelected(null);
    setFeedback(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Confetti show={showConfetti} />
      <div className="max-w-3xl mx-auto">
        <GameHeader title="Zählen & Zuordnen" emoji="🔢" score={score} total={total} onReplay={replay} />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card rounded-3xl p-6 md:p-8 shadow-lg"
        >
          <p className="text-center text-muted-foreground mb-6">
            Wie viele {problem.emoji} siehst du?
          </p>

          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-8 max-w-md mx-auto">
            {Array.from({ length: problem.count }, (_, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.03, type: "spring" }}
                className="text-3xl md:text-4xl"
              >
                {problem.emoji}
              </motion.span>
            ))}
          </div>

          <div className="flex justify-center gap-3 md:gap-4 mb-6">
            {problem.choices.map((val) => {
              const isSelected = selected === val;
              const isCorrect = val === problem.count;
              const showResult = selected !== null;

              return (
                <motion.button
                  key={val}
                  whileHover={selected === null ? { scale: 1.1 } : {}}
                  whileTap={selected === null ? { scale: 0.9 } : {}}
                  onClick={() => handleSelect(val)}
                  disabled={selected !== null}
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
                  : `😊 Es sind ${problem.count}!`}
              </motion.div>
            )}
          </AnimatePresence>

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
