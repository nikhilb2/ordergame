import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameHeader } from "@/components/GameHeader";
import { Confetti } from "@/components/Confetti";
import { RefreshCw } from "lucide-react";

function generateProblem() {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const answer = a > b ? ">" : a < b ? "<" : "=";
  return { a, b, answer };
}

export default function CompareNumbers() {
  const [problem, setProblem] = useState(generateProblem);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const handleChoice = useCallback(
    (choice: string) => {
      if (selected) return;
      setSelected(choice);
      setTotal((t) => t + 1);

      if (choice === problem.answer) {
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
    setFeedback(null);
    setSelected(null);
  };

  const symbols = ["<", ">", "="];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Confetti show={showConfetti} />
      <div className="max-w-3xl mx-auto">
        <GameHeader title="Compare Numbers" emoji="⚖️" score={score} total={total} />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card rounded-3xl p-6 md:p-8 shadow-lg"
        >
          <p className="text-center text-muted-foreground mb-8">
            Which symbol goes between the numbers?
          </p>

          <div className="flex items-center justify-center gap-4 md:gap-8 mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
              className="bg-kid-blue text-primary-foreground w-20 h-20 md:w-28 md:h-28 rounded-3xl flex items-center justify-center text-4xl md:text-5xl font-black shadow-lg"
            >
              {problem.a}
            </motion.div>

            <div className="w-20 h-20 md:w-28 md:h-28 rounded-3xl border-4 border-dashed border-border flex items-center justify-center text-4xl md:text-5xl font-black text-muted-foreground">
              {selected || "?"}
            </div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="bg-kid-pink text-primary-foreground w-20 h-20 md:w-28 md:h-28 rounded-3xl flex items-center justify-center text-4xl md:text-5xl font-black shadow-lg"
            >
              {problem.b}
            </motion.div>
          </div>

          <div className="flex justify-center gap-4 md:gap-6 mb-6">
            {symbols.map((sym) => (
              <motion.button
                key={sym}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleChoice(sym)}
                disabled={!!selected}
                className={`
                  w-16 h-16 md:w-20 md:h-20 rounded-2xl text-3xl md:text-4xl font-black shadow-md
                  transition-colors
                  ${
                    selected === sym
                      ? feedback === "correct"
                        ? "bg-accent text-accent-foreground"
                        : "bg-destructive text-destructive-foreground"
                      : "bg-kid-yellow text-foreground hover:brightness-110"
                  }
                  disabled:cursor-default
                `}
              >
                {sym}
              </motion.button>
            ))}
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
                  ? "🎉 Correct!"
                  : `😊 The answer is "${problem.answer}"`}
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
              <RefreshCw size={22} /> Next
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
