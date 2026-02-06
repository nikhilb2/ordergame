import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameHeader } from "@/components/GameHeader";
import { Confetti } from "@/components/Confetti";
import { useSpeech } from "@/hooks/use-speech";
import { RefreshCw, Check, Plus } from "lucide-react";

function generateTarget(): number {
  return Math.floor(Math.random() * 15) + 6; // 6–20
}

function getValidPairs(target: number): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let a = 1; a <= Math.floor(target / 2); a++) {
    const b = target - a;
    if (b >= a) {
      pairs.push([a, b]);
    }
  }
  return pairs.slice(0, 10);
}

export default function MakeTheNumber() {
  const { replay } = useSpeech(
    "Finde alle Zahlenpaare, die zusammen die Zahl ergeben!"
  );
  const [target, setTarget] = useState(generateTarget);
  const [validPairs, setValidPairs] = useState(() => getValidPairs(target));
  const [foundPairs, setFoundPairs] = useState<Array<[number, number]>>([]);
  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [feedback, setFeedback] = useState<
    "correct" | "wrong" | "duplicate" | null
  >(null);
  const [roundComplete, setRoundComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [shaking, setShaking] = useState(false);

  const inputARef = useRef<HTMLInputElement>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Focus first input on mount and new round
  useEffect(() => {
    inputARef.current?.focus();
  }, [target]);

  const clearFeedbackAfter = (ms: number) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
    }, ms);
  };

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const handleSubmit = useCallback(() => {
    if (roundComplete) return;

    const a = parseInt(inputA, 10);
    const b = parseInt(inputB, 10);

    if (isNaN(a) || isNaN(b) || a < 1 || b < 1) {
      setFeedback("wrong");
      triggerShake();
      clearFeedbackAfter(800);
      return;
    }

    const normalized: [number, number] = [Math.min(a, b), Math.max(a, b)];

    if (normalized[0] + normalized[1] !== target) {
      setFeedback("wrong");
      triggerShake();
      clearFeedbackAfter(800);
      return;
    }

    if (
      foundPairs.some(
        ([x, y]) => x === normalized[0] && y === normalized[1]
      )
    ) {
      setFeedback("duplicate");
      triggerShake();
      clearFeedbackAfter(800);
      return;
    }

    // Valid new pair
    const newFound = [...foundPairs, normalized];
    setFoundPairs(newFound);
    setInputA("");
    setInputB("");
    setFeedback("correct");
    clearFeedbackAfter(1200);

    if (newFound.length === validPairs.length) {
      setRoundComplete(true);
      setScore((s) => s + 1);
      setTotal((t) => t + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
    } else {
      setTimeout(() => inputARef.current?.focus(), 50);
    }
  }, [inputA, inputB, target, foundPairs, validPairs, roundComplete]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const nextRound = () => {
    if (!roundComplete) {
      // Skipping — count as total only
      setTotal((t) => t + 1);
    }
    const t = generateTarget();
    setTarget(t);
    setValidPairs(getValidPairs(t));
    setFoundPairs([]);
    setInputA("");
    setInputB("");
    setFeedback(null);
    setRoundComplete(false);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  };

  const progressPercent =
    validPairs.length > 0 ? (foundPairs.length / validPairs.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Confetti show={showConfetti} />
      <div className="max-w-3xl mx-auto">
        <GameHeader
          title="Zahl bilden"
          emoji="➕"
          score={score}
          total={total}
          onReplay={replay}
        />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card rounded-3xl p-6 md:p-8 shadow-lg"
        >
          <p className="text-center text-muted-foreground mb-4">
            Finde alle Zahlenpaare, die zusammen ergeben...
          </p>

          {/* Target number */}
          <motion.div
            key={target}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-gradient-fun text-primary-foreground w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-5xl md:text-6xl font-black mx-auto mb-6 shadow-lg"
          >
            {target}
          </motion.div>

          {/* Progress bar */}
          <div className="max-w-xs mx-auto mb-6">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>
                {foundPairs.length} von {validPairs.length} Paaren
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-fun rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              />
            </div>
          </div>

          {/* Input row */}
          <motion.div
            className="flex items-center justify-center gap-3 mb-6"
            animate={shaking ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
            transition={
              shaking ? { duration: 0.4, ease: "easeInOut" } : undefined
            }
          >
            <input
              ref={inputARef}
              type="number"
              inputMode="numeric"
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={roundComplete}
              placeholder="?"
              className="no-spinner w-20 h-20 md:w-24 md:h-24 text-3xl md:text-4xl font-black text-center rounded-2xl border-4 border-kid-blue bg-kid-blue/10 text-foreground focus:outline-none focus:ring-4 focus:ring-kid-blue/30 disabled:opacity-50 disabled:cursor-default"
            />
            <Plus size={28} className="text-muted-foreground flex-shrink-0" />
            <input
              type="number"
              inputMode="numeric"
              value={inputB}
              onChange={(e) => setInputB(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={roundComplete}
              placeholder="?"
              className="no-spinner w-20 h-20 md:w-24 md:h-24 text-3xl md:text-4xl font-black text-center rounded-2xl border-4 border-kid-pink bg-kid-pink/10 text-foreground focus:outline-none focus:ring-4 focus:ring-kid-pink/30 disabled:opacity-50 disabled:cursor-default"
            />
            <motion.button
              whileHover={!roundComplete ? { scale: 1.1 } : {}}
              whileTap={!roundComplete ? { scale: 0.9 } : {}}
              onClick={handleSubmit}
              disabled={roundComplete}
              className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center shadow-md disabled:opacity-50 disabled:cursor-default flex-shrink-0"
            >
              <Check size={28} strokeWidth={3} />
            </motion.button>
          </motion.div>

          {/* Found pairs */}
          <div className="flex flex-wrap justify-center gap-2 mb-6 min-h-[3rem]">
            <AnimatePresence>
              {foundPairs.map(([a, b], idx) => (
                <motion.div
                  key={`${a}-${b}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                    delay: idx === foundPairs.length - 1 ? 0 : 0,
                  }}
                  className="bg-muted rounded-xl px-3 py-2 flex items-center gap-1 text-lg md:text-xl font-bold"
                >
                  <span className="bg-kid-blue text-primary-foreground w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center text-base md:text-lg">
                    {a}
                  </span>
                  <Plus size={14} className="text-muted-foreground" />
                  <span className="bg-kid-pink text-primary-foreground w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center text-base md:text-lg">
                    {b}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Feedback */}
          <AnimatePresence mode="wait">
            {feedback === "correct" && !roundComplete && (
              <motion.div
                key="correct"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="text-center text-2xl font-black text-accent mb-4"
              >
                Richtig!
              </motion.div>
            )}
            {feedback === "wrong" && (
              <motion.div
                key="wrong"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="text-center text-2xl font-black text-destructive mb-4"
              >
                Das stimmt nicht!
              </motion.div>
            )}
            {feedback === "duplicate" && (
              <motion.div
                key="duplicate"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="text-center text-2xl font-black text-destructive mb-4"
              >
                Schon gefunden!
              </motion.div>
            )}
            {roundComplete && (
              <motion.div
                key="complete"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="text-center text-2xl font-black text-accent mb-4"
              >
                Super! Alle Paare gefunden!
              </motion.div>
            )}
          </AnimatePresence>

          {/* Weiter button */}
          <div className="flex justify-center mt-2">
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
