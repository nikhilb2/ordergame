import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameHeader } from "@/components/GameHeader";
import { Confetti } from "@/components/Confetti";
import { RefreshCw, Plus } from "lucide-react";

function generateTarget(): number {
  return Math.floor(Math.random() * 19) + 2;
}

function generateOptions(target: number): Array<[number, number]> {
  const correct: Array<[number, number]> = [];
  const wrong: Array<[number, number]> = [];

  for (let i = 0; i <= Math.min(target, 20); i++) {
    const j = target - i;
    if (j >= 0 && j <= 20 && i <= j) {
      correct.push([i, j]);
    }
  }

  while (wrong.length < 2) {
    const a = Math.floor(Math.random() * 15) + 1;
    const b = Math.floor(Math.random() * 15) + 1;
    if (a + b !== target && !wrong.some(([x, y]) => x === a && y === b)) {
      wrong.push([a, b]);
    }
  }

  const correctPick = correct.sort(() => Math.random() - 0.5).slice(0, 2);
  const all = [...correctPick, ...wrong].sort(() => Math.random() - 0.5);
  return all;
}

export default function MakeTheNumber() {
  const [target, setTarget] = useState(generateTarget);
  const [options, setOptions] = useState(() => generateOptions(target));
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleSelect = useCallback(
    (idx: number) => {
      if (selected !== null) return;
      setSelected(idx);
      setTotal((t) => t + 1);

      const [a, b] = options[idx];
      if (a + b === target) {
        setScore((s) => s + 1);
        setFeedback("correct");
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 100);
      } else {
        setFeedback("wrong");
      }
    },
    [options, target, selected]
  );

  const nextRound = () => {
    const t = generateTarget();
    setTarget(t);
    setOptions(generateOptions(t));
    setSelected(null);
    setFeedback(null);
  };

  const pairColors = [
    ["bg-kid-blue", "bg-kid-pink"],
    ["bg-kid-green", "bg-kid-orange"],
    ["bg-kid-purple", "bg-kid-yellow"],
    ["bg-kid-red", "bg-kid-blue"],
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Confetti show={showConfetti} />
      <div className="max-w-3xl mx-auto">
        <GameHeader title="Zahl bilden" emoji="➕" score={score} total={total} />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card rounded-3xl p-6 md:p-8 shadow-lg"
        >
          <p className="text-center text-muted-foreground mb-4">
            Welche zwei Zahlen ergeben zusammen...
          </p>

          <motion.div
            key={target}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-gradient-fun text-primary-foreground w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-5xl md:text-6xl font-black mx-auto mb-8 shadow-lg"
          >
            {target}
          </motion.div>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
            {options.map(([a, b], idx) => {
              const isSelected = selected === idx;
              const isCorrect = a + b === target;
              const showResult = selected !== null;

              return (
                <motion.button
                  key={idx}
                  whileHover={selected === null ? { scale: 1.05 } : {}}
                  whileTap={selected === null ? { scale: 0.95 } : {}}
                  onClick={() => handleSelect(idx)}
                  disabled={selected !== null}
                  className={`
                    p-4 rounded-2xl shadow-md flex items-center justify-center gap-2 text-xl md:text-2xl font-bold
                    transition-all
                    ${
                      showResult && isCorrect
                        ? "bg-accent text-accent-foreground ring-4 ring-accent/30"
                        : isSelected && !isCorrect
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-muted text-foreground"
                    }
                    disabled:cursor-default
                  `}
                >
                  <span className={`${pairColors[idx % 4][0]} text-primary-foreground w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center`}>
                    {a}
                  </span>
                  <Plus size={20} className="text-muted-foreground" />
                  <span className={`${pairColors[idx % 4][1]} text-primary-foreground w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center`}>
                    {b}
                  </span>
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
                {feedback === "correct" ? "🎉 Richtig!" : "🤔 Nicht ganz!"}
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
