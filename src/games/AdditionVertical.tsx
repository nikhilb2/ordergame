import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameHeader } from "@/components/GameHeader";
import { Confetti } from "@/components/Confetti";
import { RefreshCw, Delete } from "lucide-react";

const GERMAN: Record<number, string> = {
  0: "null", 1: "eins", 2: "zwei", 3: "drei", 4: "vier", 5: "fünf",
  6: "sechs", 7: "sieben", 8: "acht", 9: "neun", 10: "zehn",
  11: "elf", 12: "zwölf", 13: "dreizehn", 14: "vierzehn", 15: "fünfzehn",
  16: "sechzehn", 17: "siebzehn", 18: "achtzehn", 19: "neunzehn", 20: "zwanzig",
  21: "einundzwanzig", 22: "zweiundzwanzig", 23: "dreiundzwanzig", 24: "vierundzwanzig",
  25: "fünfundzwanzig", 26: "sechsundzwanzig", 27: "siebenundzwanzig", 28: "achtundzwanzig",
  29: "neunundzwanzig", 30: "dreißig", 31: "einunddreißig", 32: "zweiundreißig",
  33: "dreiundreißig", 34: "vierundreißig", 35: "fünfundreißig", 36: "sechsundreißig",
  37: "siebenundreißig", 38: "achtundreißig", 39: "neunundreißig", 40: "vierzig",
  41: "einundvierzig", 42: "zweiundvierzig", 43: "dreiundvierzig", 44: "vierundvierzig",
  45: "fünfundvierzig", 46: "sechsundvierzig", 47: "siebenundvierzig", 48: "achtundvierzig",
  49: "neunundvierzig", 50: "fünfzig",
};

function g(n: number): string {
  return GERMAN[n] ?? String(n);
}

function speakGerman(text: string, onEnd?: () => void) {
  if (!window.speechSynthesis) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "de-DE";
  utt.rate = 0.85;
  if (onEnd) utt.onend = onEnd;
  window.speechSynthesis.speak(utt);
}

type Step = {
  speech: string;
  highlightCol: "none" | "ones" | "tens" | "all";
  showOnesAnswer?: boolean;
  showTensAnswer?: boolean;
  showCarry?: boolean;
};

type Problem = {
  a: number;
  b: number;
  answer: number;
  hasCarry: boolean;
  onesA: number;
  tensA: number;
  onesB: number;
  tensB: number;
  onesSum: number;
  carry: number;
  tensResult: number;
  steps: Step[];
};

// ── On-screen numpad ──────────────────────────────────────────────────────────
function Numpad({ onDigit, onDelete }: { onDigit: (d: number) => void; onDelete: () => void }) {
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "del"] as const;
  return (
    <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto mt-4">
      {keys.map((k, i) =>
        k === null ? (
          <div key={i} />
        ) : k === "del" ? (
          <motion.button
            key="del"
            whileTap={{ scale: 0.9 }}
            onClick={onDelete}
            className="h-14 rounded-2xl bg-muted text-foreground font-bold flex items-center justify-center shadow"
          >
            <Delete size={20} />
          </motion.button>
        ) : (
          <motion.button
            key={k}
            whileTap={{ scale: 0.9 }}
            onClick={() => onDigit(k)}
            className="h-14 rounded-2xl bg-kid-blue text-primary-foreground text-2xl font-black shadow"
          >
            {k}
          </motion.button>
        )
      )}
    </div>
  );
}

// ── Answer cell ───────────────────────────────────────────────────────────────
function AnswerCell({ value, active, correct, wrong }: { value: string; active: boolean; correct?: boolean; wrong?: boolean }) {
  return (
    <div
      className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl border-4 flex items-center justify-center text-3xl md:text-4xl font-black transition-all duration-300
        ${correct ? "bg-kid-green/20 border-kid-green text-foreground" :
          wrong ? "bg-destructive/20 border-destructive text-destructive" :
          active ? "border-kid-blue ring-4 ring-kid-blue/30 bg-kid-blue/10 text-foreground" :
          "border-dashed border-muted-foreground/30 bg-muted/20 text-muted-foreground/40"}`}
    >
      {value !== "" ? value : active ? "_" : "?"}
    </div>
  );
}

function generateProblem(level: 1 | 2): Problem {
  let a: number, b: number;
  let attempts = 0;
  do {
    a = Math.floor(Math.random() * 31) + 10; // 10–40
    b = Math.floor(Math.random() * 20) + 1;  // 1–20
    attempts++;
    if (attempts > 200) break;
  } while (
    a + b > 50 ||
    (level === 1 && (a % 10 + b % 10) >= 10)
  );

  const answer = a + b;
  const onesA = a % 10;
  const tensA = Math.floor(a / 10);
  const onesB = b % 10;
  const tensB = Math.floor(b / 10);
  const onesSum = onesA + onesB;
  const hasCarry = onesSum >= 10;
  const carry = hasCarry ? 1 : 0;
  const tensResult = tensA + tensB + carry;

  const steps: Step[] = [
    {
      speech: `Hier ist die Aufgabe! ${g(a)} plus ${g(b)}. Ich zeige dir, wie du das rechnest!`,
      highlightCol: "all",
    },
    {
      speech: hasCarry
        ? `Schau auf die Einerstelle! ${g(onesA)} plus ${g(onesB)} macht ${g(onesSum)}. Wir schreiben ${g(onesSum - 10)} hin und merken uns die Eins!`
        : `Schau auf die Einerstelle! ${g(onesA)} plus ${g(onesB)} macht ${g(onesSum)}. Wir schreiben ${g(onesSum)} hin.`,
      highlightCol: "ones",
      showOnesAnswer: true,
      showCarry: hasCarry,
    },
    {
      speech: hasCarry
        ? `Jetzt die Zehnerstelle! ${g(tensA)} plus ${g(tensB)} und die gemerkte Eins macht ${g(tensResult)}.`
        : `Jetzt die Zehnerstelle! ${g(tensA)} plus ${g(tensB)} macht ${g(tensResult)}.`,
      highlightCol: "tens",
      showOnesAnswer: true,
      showCarry: hasCarry,
      showTensAnswer: true,
    },
    {
      speech: `Das Ergebnis ist ${g(answer)}! Super!`,
      highlightCol: "all",
      showOnesAnswer: true,
      showCarry: hasCarry,
      showTensAnswer: true,
    },
  ];

  return {
    a, b, answer, hasCarry,
    onesA, tensA, onesB, tensB,
    onesSum, carry, tensResult,
    steps,
  };
}

export default function AdditionVertical() {
  const [level, setLevel] = useState<1 | 2>(1);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [hasSeenExplanation, setHasSeenExplanation] = useState(false);
  // teachProblem: used only for the walkthrough display
  const [teachProblem, setTeachProblem] = useState<Problem>(() => generateProblem(1));
  // practiceProblem: the independent exercise the child solves
  const [practiceProblem, setPracticeProblem] = useState<Problem>(() => generateProblem(1));
  const [phase, setPhase] = useState<"teaching" | "practice">("teaching");
  const [stepIndex, setStepIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  // Numpad input state
  const [carryInput, setCarryInput] = useState<"" | "0" | "1">("");
  const [answerDigits, setAnswerDigits] = useState<[string, string]>(["", ""]);
  const [inputFocus, setInputFocus] = useState<"carry" | "tens" | "ones" | "done">("tens");
  const [submitted, setSubmitted] = useState(false);
  const currentSpeechRef = useRef<string>("");
  const levelRef = useRef<1 | 2>(1);

  // Keep levelRef in sync for use inside setCorrectStreak callback
  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  const replay = useCallback(() => {
    if (currentSpeechRef.current) speakGerman(currentSpeechRef.current);
  }, []);

  // Reset practice input when entering practice phase
  useEffect(() => {
    if (phase !== "practice") return;
    const startFocus = practiceProblem.hasCarry ? "carry" : "tens";
    setCarryInput("");
    setAnswerDigits(["", ""]);
    setInputFocus(startFocus);
    setSubmitted(false);
    setFeedback(null);
    speakGerman(
      practiceProblem.hasCarry
        ? "Jetzt bist du dran! Rechne erst die Einerstelle. Vergiss den Übertrag nicht!"
        : "Jetzt bist du dran! Löse die Aufgabe Schritt für Schritt."
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, practiceProblem]);

  // Auto-advance teaching steps
  useEffect(() => {
    if (phase !== "teaching") return;
    const step = teachProblem.steps[stepIndex];
    if (!step) return;

    let aborted = false;
    currentSpeechRef.current = step.speech;
    const isLast = stepIndex === teachProblem.steps.length - 1;

    speakGerman(step.speech, () => {
      if (aborted) return;
      setTimeout(() => {
        if (aborted) return;
        if (isLast) {
          speakGerman("Super! Jetzt löse selbst eine ähnliche Aufgabe!", () => {
            if (!aborted) { setHasSeenExplanation(true); setPhase("practice"); }
          });
        } else {
          setStepIndex((i) => i + 1);
        }
      }, 800);
    });

    return () => {
      aborted = true;
      window.speechSynthesis?.cancel();
    };
  }, [stepIndex, phase, teachProblem]);

  const handleExplainAgain = useCallback(() => {
    window.speechSynthesis?.cancel();
    speakGerman("Kein Problem! Lass uns das nochmal anschauen.", () => {
      setStepIndex(0);
      setPhase("teaching");
    });
  }, []);

  const handleDigit = useCallback((d: number) => {
    if (submitted) return;

    if (inputFocus === "carry") {
      if (d === 0 || d === 1) {
        setCarryInput(d === 1 ? "1" : "0");
        setInputFocus("tens");
        speakGerman(d === 1 ? "Eins gemerkt! Jetzt die Zehnerstelle." : "Kein Übertrag. Jetzt die Zehnerstelle.");
      }
      return;
    }

    if (inputFocus === "tens") {
      setAnswerDigits(([, ones]) => [String(d), ones]);
      setInputFocus("ones");
      return;
    }

    if (inputFocus === "ones") {
      const onesStr = String(d);
      setInputFocus("done");
      setSubmitted(true);
      setAnswerDigits(([tens]) => {
        const enteredNum = parseInt(tens + onesStr, 10);
        const p = practiceProblem;
        const isCorrect = enteredNum === p.answer;
        const carryOk = !p.hasCarry || carryInput === "1";

        setTotal((t) => t + 1);
        if (isCorrect && carryOk) {
          setScore((s) => s + 1);
          setFeedback("correct");
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 100);
          speakGerman(`${g(p.a)} plus ${g(p.b)} gleich ${g(p.answer)}`);
          setCorrectStreak((streak) => {
            const next = streak + 1;
            if (next >= 3 && levelRef.current === 1) {
              setLevel(2);
              setShowLevelUp(true);
              setTimeout(() => setShowLevelUp(false), 3000);
              setTimeout(() => speakGerman("Sehr gut! Jetzt kommen schwerere Aufgaben mit Übertrag!"), 1200);
              return 0;
            }
            return next;
          });
        } else {
          setFeedback("wrong");
          speakGerman(`Nicht ganz. Die Antwort ist ${g(p.answer)}`);
        }
        return [tens, onesStr];
      });
    }
  }, [submitted, inputFocus, practiceProblem, carryInput]);

  const handleDelete = useCallback(() => {
    if (submitted) return;
    if (inputFocus === "done" || inputFocus === "ones") {
      setAnswerDigits(([t]) => [t, ""]);
      setInputFocus("ones");
    } else if (inputFocus === "tens") {
      setAnswerDigits(["", ""]);
      if (practiceProblem.hasCarry) setInputFocus("carry");
    } else if (inputFocus === "carry") {
      setCarryInput("");
    }
  }, [submitted, inputFocus, practiceProblem.hasCarry]);

  const nextRound = useCallback(() => {
    const newTeach = generateProblem(levelRef.current);
    const newPractice = generateProblem(levelRef.current);
    setTeachProblem(newTeach);
    setPracticeProblem(newPractice);
    setStepIndex(0);
    // Skip teaching after user has seen it at least once
    setPhase(hasSeenExplanation ? "practice" : "teaching");
    setFeedback(null);
  }, [hasSeenExplanation]);

  const currentStep = teachProblem.steps[Math.min(stepIndex, teachProblem.steps.length - 1)];
  const highlightOnes =
    phase === "teaching" &&
    (currentStep.highlightCol === "ones" || currentStep.highlightCol === "all");
  const highlightTens =
    phase === "teaching" &&
    (currentStep.highlightCol === "tens" || currentStep.highlightCol === "all");
  const showOnesAns = !!currentStep.showOnesAnswer;
  const showTensAns = !!currentStep.showTensAnswer;
  const showCarryIndicator = teachProblem.hasCarry && !!currentStep.showCarry;

  const onesAnswerDigit = teachProblem.answer % 10;
  const tensAnswerDigit = Math.floor(teachProblem.answer / 10);

  // Practice derived values
  const isConsolidated = submitted;
  const correctTens = isConsolidated && answerDigits[0] === String(Math.floor(practiceProblem.answer / 10));
  const correctOnes = isConsolidated && answerDigits[1] === String(practiceProblem.answer % 10);
  const correctCarry = !practiceProblem.hasCarry || carryInput === "1";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Confetti show={showConfetti} />
      <div className="max-w-xl mx-auto">
        <GameHeader
          title="Addieren lernen"
          emoji="➕"
          score={score}
          total={total}
          onReplay={replay}
        />

        {/* Level indicator */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <span
            className={`px-4 py-1 rounded-full font-bold text-sm ${
              level === 1
                ? "bg-kid-green text-primary-foreground"
                : "bg-kid-orange text-primary-foreground"
            }`}
          >
            {level === 1 ? "Level 1 – Ohne Übertrag" : "Level 2 – Mit Übertrag"}
          </span>
          {level === 1 && (
            <span className="text-muted-foreground text-sm font-semibold">
              {correctStreak}/3 ⭐
            </span>
          )}
        </div>

        {/* Level-up banner */}
        <AnimatePresence>
          {showLevelUp && (
            <motion.div
              initial={{ scale: 0, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: -20 }}
              className="bg-kid-orange text-primary-foreground text-center font-black text-xl rounded-2xl p-4 mb-4 shadow-lg"
            >
              🎉 Neues Level! Jetzt mit Übertrag!
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card rounded-3xl p-6 md:p-8 shadow-lg"
        >
          {/* Step progress dots */}
          {phase === "teaching" && (
            <div className="flex justify-center gap-2 mb-6">
              {teachProblem.steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                    i === stepIndex
                      ? "bg-kid-blue"
                      : i < stepIndex
                      ? "bg-kid-green"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
          )}

          {/* ── Vertical arithmetic layout (teaching problem, only during walkthrough) ── */}
          {phase === "teaching" && <div className="flex flex-col items-center mb-8">
            {/* Carry indicator row */}
            <div className="flex gap-2 mb-1" style={{ minHeight: "1.75rem" }}>
              <div className="w-8" />
              <div className="w-16 md:w-20 flex items-end justify-center">
                <AnimatePresence>
                  {showCarryIndicator && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="text-kid-red font-black text-xl leading-none"
                    >
                      1
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="w-16 md:w-20" />
            </div>

            {/* Row A */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8" />
              {/* Tens A */}
              <div
                className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-kid-blue/10 border-4 flex items-center justify-center text-3xl md:text-4xl font-black text-foreground transition-all duration-300 ${
                  highlightTens
                    ? "border-kid-blue ring-4 ring-kid-blue/30 scale-105"
                    : "border-transparent"
                }`}
              >
                {Math.floor(teachProblem.a / 10) || ""}
              </div>
              {/* Ones A */}
              <div
                className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-kid-orange/10 border-4 flex items-center justify-center text-3xl md:text-4xl font-black text-foreground transition-all duration-300 ${
                  highlightOnes
                    ? "border-kid-orange ring-4 ring-kid-orange/30 scale-105"
                    : "border-transparent"
                }`}
              >
                {teachProblem.onesA}
              </div>
            </div>

            {/* Row B */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 text-3xl font-black text-muted-foreground flex items-center justify-center">
                +
              </div>
              {/* Tens B */}
              <div
                className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-kid-blue/10 border-4 flex items-center justify-center text-3xl md:text-4xl font-black text-foreground transition-all duration-300 ${
                  highlightTens
                    ? "border-kid-blue ring-4 ring-kid-blue/30 scale-105"
                    : "border-transparent"
                }`}
              >
                {Math.floor(teachProblem.b / 10) || ""}
              </div>
              {/* Ones B */}
              <div
                className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-kid-orange/10 border-4 flex items-center justify-center text-3xl md:text-4xl font-black text-foreground transition-all duration-300 ${
                  highlightOnes
                    ? "border-kid-orange ring-4 ring-kid-orange/30 scale-105"
                    : "border-transparent"
                }`}
              >
                {teachProblem.onesB}
              </div>
            </div>

            {/* Separator */}
            <div className="w-44 md:w-52 h-1 bg-border rounded-full mb-3" />

            {/* Answer row */}
            <div className="flex items-center gap-2">
              <div className="w-8" />
              {/* Tens answer */}
              <motion.div
                animate={showTensAns ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.3 }}
                className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl border-4 flex items-center justify-center text-3xl md:text-4xl font-black transition-all duration-500 ${
                  showTensAns
                    ? "bg-kid-green/20 border-kid-green text-foreground"
                    : "bg-muted/40 border-dashed border-muted-foreground/20 text-transparent"
                }`}
              >
                {tensAnswerDigit}
              </motion.div>
              {/* Ones answer */}
              <motion.div
                animate={showOnesAns ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.3 }}
                className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl border-4 flex items-center justify-center text-3xl md:text-4xl font-black transition-all duration-500 ${
                  showOnesAns
                    ? "bg-kid-green/20 border-kid-green text-foreground"
                    : "bg-muted/40 border-dashed border-muted-foreground/20 text-transparent"
                }`}
              >
                {onesAnswerDigit}
              </motion.div>
            </div>

            {/* Column labels */}
            <div className="flex gap-2 mt-2">
              <div className="w-8" />
              <div className="w-16 md:w-20 text-center text-xs font-bold text-kid-blue/60 uppercase tracking-wide">
                Zehner
              </div>
              <div className="w-16 md:w-20 text-center text-xs font-bold text-kid-orange/60 uppercase tracking-wide">
                Einer
              </div>
            </div>
          </div>}

          {/* Teaching speech bubble */}
          {phase === "teaching" && (
            <AnimatePresence mode="wait">
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="bg-kid-blue/10 border-2 border-kid-blue/20 rounded-2xl p-4 text-center text-base md:text-lg font-bold text-foreground mb-6"
              >
                🗣️ {currentStep.speech}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Practice phase — child solves a different problem independently */}
          {phase === "practice" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-center font-black text-lg md:text-xl text-kid-blue mb-4">
                🎯 Jetzt du! Löse diese Aufgabe:
              </p>

              {/* Practice problem vertical layout */}
              <div className="flex flex-col items-center mb-4">
                {/* Carry input row */}
                <div className="flex gap-2 mb-1" style={{ minHeight: "1.75rem" }}>
                  <div className="w-8" />
                  <div className="w-16 md:w-20 flex items-end justify-center">
                    {practiceProblem.hasCarry && (
                      <motion.div
                        whileTap={!submitted ? { scale: 0.9 } : {}}
                        onClick={() => { if (!submitted) setInputFocus("carry"); }}
                        className={`w-10 h-8 rounded-xl border-4 flex items-center justify-center text-lg font-black cursor-pointer transition-all duration-200
                          ${carryInput === "1"
                            ? (isConsolidated ? (correctCarry ? "bg-kid-green/20 border-kid-green text-foreground" : "bg-destructive/20 border-destructive text-destructive") : "bg-kid-red/20 border-kid-red text-kid-red")
                            : inputFocus === "carry"
                            ? "border-kid-red ring-2 ring-kid-red/30 bg-kid-red/10 text-kid-red"
                            : "border-dashed border-muted-foreground/30 bg-muted/20 text-muted-foreground/40"}`}
                      >
                        {carryInput === "1" ? "1" : inputFocus === "carry" ? "_" : ""}
                      </motion.div>
                    )}
                  </div>
                  <div className="w-16 md:w-20" />
                </div>

                {/* Row A */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8" />
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-kid-blue/10 border-4 border-transparent flex items-center justify-center text-3xl md:text-4xl font-black text-foreground">
                    {Math.floor(practiceProblem.a / 10) || ""}
                  </div>
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-kid-orange/10 border-4 border-transparent flex items-center justify-center text-3xl md:text-4xl font-black text-foreground">
                    {practiceProblem.onesA}
                  </div>
                </div>
                {/* Row B */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 text-3xl font-black text-muted-foreground flex items-center justify-center">+</div>
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-kid-blue/10 border-4 border-transparent flex items-center justify-center text-3xl md:text-4xl font-black text-foreground">
                    {Math.floor(practiceProblem.b / 10) || ""}
                  </div>
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-kid-orange/10 border-4 border-transparent flex items-center justify-center text-3xl md:text-4xl font-black text-foreground">
                    {practiceProblem.onesB}
                  </div>
                </div>
                <div className="w-44 md:w-52 h-1 bg-border rounded-full mb-3" />
                {/* Answer row */}
                <div className="flex items-center gap-2">
                  <div className="w-8" />
                  <AnswerCell
                    value={answerDigits[0]}
                    active={!submitted && inputFocus === "tens"}
                    correct={isConsolidated && correctTens}
                    wrong={isConsolidated && !correctTens}
                  />
                  <AnswerCell
                    value={answerDigits[1]}
                    active={!submitted && inputFocus === "ones"}
                    correct={isConsolidated && correctOnes}
                    wrong={isConsolidated && !correctOnes}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="w-8" />
                  <div className="w-16 md:w-20 text-center text-xs font-bold text-kid-blue/60 uppercase tracking-wide">Zehner</div>
                  <div className="w-16 md:w-20 text-center text-xs font-bold text-kid-orange/60 uppercase tracking-wide">Einer</div>
                </div>
              </div>

              {/* Input hint */}
              {!submitted && (
                <p className="text-center text-sm font-semibold text-muted-foreground mb-1">
                  {inputFocus === "carry" ? "Schreibe den Übertrag (0 oder 1):" :
                   inputFocus === "tens" ? "Schreibe die Zehnerstelle:" :
                   inputFocus === "ones" ? "Schreibe die Einerstelle:" : ""}
                </p>
              )}

              {/* Numpad */}
              {!submitted && <Numpad onDigit={handleDigit} onDelete={handleDelete} />}

              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className={`text-center text-2xl font-black mt-5 mb-2 ${
                      feedback === "correct" ? "text-accent" : "text-destructive"
                    }`}
                  >
                    {feedback === "correct"
                      ? "🎉 Richtig! Super gemacht!"
                      : `😊 Die Antwort ist ${practiceProblem.answer}`}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleExplainAgain}
                  className="bg-gradient-sunny text-foreground font-bold px-6 py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-base"
                >
                  💡 Nochmal erklären
                </motion.button>

                <AnimatePresence>
                  {feedback && (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={nextRound}
                      className="bg-gradient-ocean text-primary-foreground font-bold px-6 py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-base"
                    >
                      <RefreshCw size={20} /> Nächste Aufgabe
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
