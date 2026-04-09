import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameHeader } from "@/components/GameHeader";
import { Confetti } from "@/components/Confetti";
import { RefreshCw } from "lucide-react";

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
  showBorrow?: boolean;
};

type Problem = {
  a: number;
  b: number;
  answer: number;
  hasBorrow: boolean;
  onesA: number;
  tensA: number;
  onesB: number;
  tensB: number;
  // Effective values after borrow adjustment
  onesAEff: number;
  tensAEff: number;
  onesResult: number;
  tensResult: number;
  steps: Step[];
};

// ── Input cell (single digit, keyboard-driven, phone-friendly) ───────────────
function InputCell({
  value, onChange, onKeyDown, inputRef, correct, wrong, disabled,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  correct?: boolean;
  wrong?: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      ref={inputRef}
      type="tel"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={1}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      disabled={disabled}
      autoComplete="off"
      className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl border-4 text-center text-3xl md:text-4xl font-black transition-all duration-300 outline-none caret-transparent disabled:opacity-100
        ${
          correct
            ? "bg-kid-green/20 border-kid-green text-foreground"
            : wrong
            ? "bg-destructive/20 border-destructive text-destructive"
            : "border-kid-blue/30 bg-muted/20 text-foreground focus:border-kid-blue focus:ring-4 focus:ring-kid-blue/30 focus:bg-kid-blue/10"
        }`}
    />
  );
}

function generateProblem(level: 1 | 2): Problem {
  let a: number, b: number;
  let attempts = 0;
  do {
    a = Math.floor(Math.random() * 36) + 15; // 15–50
    b = Math.floor(Math.random() * 16) + 5;  // 5–20
    attempts++;
    if (attempts > 200) break;
  } while (
    a - b < 5 ||
    b >= a ||
    (level === 1 && a % 10 < b % 10)
  );

  const answer = a - b;
  const onesA = a % 10;
  const tensA = Math.floor(a / 10);
  const onesB = b % 10;
  const tensB = Math.floor(b / 10);
  const hasBorrow = onesA < onesB;

  const onesAEff = hasBorrow ? onesA + 10 : onesA;
  const tensAEff = hasBorrow ? tensA - 1 : tensA;
  const onesResult = onesAEff - onesB;
  const tensResult = tensAEff - tensB;

  const steps: Step[] = [];

  // Step 1: introduce problem
  steps.push({
    speech: `Hier ist die Aufgabe! ${g(a)} minus ${g(b)}. Ich zeige dir, wie du das rechnest!`,
    highlightCol: "all",
  });

  if (!hasBorrow) {
    // Step 2: ones, no borrow
    steps.push({
      speech: `Schau auf die Einerstelle! ${g(onesA)} minus ${g(onesB)} macht ${g(onesResult)}. Wir schreiben ${g(onesResult)} hin.`,
      highlightCol: "ones",
      showOnesAnswer: true,
    });
  } else {
    // Step 2: borrowing needed
    steps.push({
      speech: `Schau auf die Einerstelle! ${g(onesA)} minus ${g(onesB)} geht nicht! Wir borgen zehn von den Zehnern.`,
      highlightCol: "ones",
      showBorrow: true,
    });
    // Step 3: compute ones with borrowed 10
    steps.push({
      speech: `Jetzt haben wir ${g(onesAEff)} minus ${g(onesB)} macht ${g(onesResult)}. Wir schreiben ${g(onesResult)} hin.`,
      highlightCol: "ones",
      showOnesAnswer: true,
      showBorrow: true,
    });
  }

  // Tens step
  steps.push({
    speech: hasBorrow
      ? `Jetzt die Zehnerstelle! Wir haben noch ${g(tensAEff)} übrig, minus ${g(tensB)} macht ${g(tensResult)}.`
      : `Jetzt die Zehnerstelle! ${g(tensA)} minus ${g(tensB)} macht ${g(tensResult)}.`,
    highlightCol: "tens",
    showOnesAnswer: true,
    showTensAnswer: true,
    showBorrow: hasBorrow,
  });

  // Final reveal
  steps.push({
    speech: `Das Ergebnis ist ${g(answer)}! Toll gemacht!`,
    highlightCol: "all",
    showOnesAnswer: true,
    showTensAnswer: true,
    showBorrow: hasBorrow,
  });

  return {
    a, b, answer, hasBorrow,
    onesA, tensA, onesB, tensB,
    onesAEff, tensAEff,
    onesResult, tensResult,
    steps,
  };
}

export default function SubtractionVertical() {
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
  // Keyboard input state
  const [borrowInput, setBorrowInput] = useState<"" | "0" | "1">("");
  const [answerDigits, setAnswerDigits] = useState<[string, string]>(["", ""]);
  const [submitted, setSubmitted] = useState(false);
  const currentSpeechRef = useRef<string>("");
  const borrowInputRef = useRef<HTMLInputElement>(null);
  const tensInputRef = useRef<HTMLInputElement>(null);
  const onesInputRef = useRef<HTMLInputElement>(null);
  const levelRef = useRef<1 | 2>(1);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  const replay = useCallback(() => {
    if (currentSpeechRef.current) speakGerman(currentSpeechRef.current);
  }, []);

  // Reset practice input when entering practice phase
  useEffect(() => {
    if (phase !== "practice") return;
    setBorrowInput("");
    setAnswerDigits(["", ""]);
    setSubmitted(false);
    setFeedback(null);
    speakGerman("Jetzt bist du dran! Fang bei der Einerstelle an.");
    setTimeout(() => {
      onesInputRef.current?.focus();
    }, 150);
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
    setTeachProblem(practiceProblem);
    speakGerman("Kein Problem! Lass uns das nochmal anschauen.", () => {
      setStepIndex(0);
      setPhase("teaching");
    });
  }, [practiceProblem]);

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    const p = practiceProblem;
    const [tens, ones] = answerDigits;
    const enteredNum = parseInt((tens || "0") + (ones || "0"), 10);
    const isCorrect = enteredNum === p.answer;
    const borrowOk = !p.hasBorrow || borrowInput === "1";
    setSubmitted(true);
    setTotal((t) => t + 1);
    if (isCorrect && borrowOk) {
      setScore((s) => s + 1);
      setFeedback("correct");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
      speakGerman(`${g(p.a)} minus ${g(p.b)} gleich ${g(p.answer)}`);
      setCorrectStreak((streak) => {
        const next = streak + 1;
        if (next >= 3 && levelRef.current === 1) {
          setLevel(2);
          setShowLevelUp(true);
          setTimeout(() => setShowLevelUp(false), 3000);
          setTimeout(() => speakGerman("Sehr gut! Jetzt kommen schwerere Aufgaben mit Borgen!"), 1200);
          return 0;
        }
        return next;
      });
    } else {
      setFeedback("wrong");
      speakGerman(`Nicht ganz. Die Antwort ist ${g(p.answer)}`);
    }
  }, [submitted, practiceProblem, answerDigits, borrowInput]);

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
  const showBorrowVisual = teachProblem.hasBorrow && !!currentStep.showBorrow;

  const onesAnswerDigit = teachProblem.answer % 10;
  const tensAnswerDigit = Math.floor(teachProblem.answer / 10);

  // Practice derived values
  const isConsolidated = submitted;
  const correctTens = isConsolidated && answerDigits[0] === String(Math.floor(practiceProblem.answer / 10));
  const correctOnes = isConsolidated && answerDigits[1] === String(practiceProblem.answer % 10);
  const correctBorrow = !practiceProblem.hasBorrow || borrowInput === "1";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Confetti show={showConfetti} />
      <div className="max-w-xl mx-auto">
        <GameHeader
          title="Subtrahieren lernen"
          emoji="➖"
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
            {level === 1 ? "Level 1 – Ohne Borgen" : "Level 2 – Mit Borgen"}
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
              🎉 Neues Level! Jetzt mit Borgen!
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

          {/* Vertical arithmetic layout (teaching problem, only during walkthrough) */}
          {phase === "teaching" && <div className="flex flex-col items-center mb-8">
            {/* Row A — with borrow visual when active */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8" />
              {/* Tens A */}
              <div
                className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-kid-blue/10 border-4 flex items-center justify-center font-black text-foreground transition-all duration-300 ${
                  highlightTens
                    ? "border-kid-blue ring-4 ring-kid-blue/30 scale-105"
                    : "border-transparent"
                }`}
              >
                <AnimatePresence mode="wait">
                  {showBorrowVisual ? (
                    <motion.span
                      key="borrowed-tens"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-baseline gap-0.5"
                    >
                      <span className="text-muted-foreground line-through text-xl md:text-2xl">
                        {teachProblem.tensA}
                      </span>
                      <span className="text-kid-red font-black text-2xl md:text-3xl">
                        {teachProblem.tensAEff}
                      </span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="normal-tens"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-3xl md:text-4xl"
                    >
                      {teachProblem.tensA || ""}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              {/* Ones A */}
              <div
                className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-kid-orange/10 border-4 flex items-center justify-center font-black text-foreground transition-all duration-300 ${
                  highlightOnes
                    ? "border-kid-orange ring-4 ring-kid-orange/30 scale-105"
                    : "border-transparent"
                }`}
              >
                <AnimatePresence mode="wait">
                  {showBorrowVisual && teachProblem.hasBorrow ? (
                    <motion.span
                      key="borrowed-ones"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-kid-red font-black text-2xl md:text-3xl"
                    >
                      {teachProblem.onesAEff}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="normal-ones"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-3xl md:text-4xl"
                    >
                      {teachProblem.onesA}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Row B */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 text-3xl font-black text-muted-foreground flex items-center justify-center">
                −
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
                {/* Borrow input row */}
                <div className="flex gap-2 mb-1" style={{ minHeight: "1.75rem" }}>
                  <div className="w-8" />
                  <div className="w-16 md:w-20 flex items-end justify-center">
                    {practiceProblem.hasBorrow && (
                      <input
                        ref={borrowInputRef}
                        type="tel"
                        inputMode="numeric"
                        pattern="[01]*"
                        maxLength={1}
                        value={borrowInput}
                        disabled={submitted}
                        autoComplete="off"
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^01]/g, "").slice(-1) as "" | "0" | "1";
                          setBorrowInput(val);
                          if (val) {
                            speakGerman(val === "1" ? "Gut geborgt! Jetzt die Zehnerstelle." : "Kein Borgen. Jetzt die Zehnerstelle.");
                            tensInputRef.current?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !borrowInput) onesInputRef.current?.focus();
                          if (e.key === "Enter") { handleSubmit(); return; }
                        }}
                        className={`w-10 h-8 rounded-xl border-4 text-center text-base font-black outline-none caret-transparent transition-all duration-200 disabled:opacity-100
                          ${
                            submitted
                              ? correctBorrow
                                ? "bg-kid-green/20 border-kid-green text-foreground"
                                : "bg-destructive/20 border-destructive text-destructive"
                              : "border-kid-red/50 bg-kid-red/5 text-kid-red focus:border-kid-red focus:ring-2 focus:ring-kid-red/30"
                          }`}
                      />
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
                  <div className="w-8 text-3xl font-black text-muted-foreground flex items-center justify-center">−</div>
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
                  <InputCell
                    inputRef={tensInputRef}
                    value={answerDigits[0]}
                    correct={isConsolidated && correctTens}
                    wrong={isConsolidated && !correctTens}
                    disabled={submitted}
                    onChange={(e) => {
                      if (submitted) return;
                      const val = e.target.value.replace(/[^0-9]/g, "").slice(-1);
                      setAnswerDigits(([, ones]) => [val, ones]);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { handleSubmit(); return; }
                      if (e.key === "Backspace" && !answerDigits[0])
                        (practiceProblem.hasBorrow ? borrowInputRef : onesInputRef).current?.focus();
                    }}
                  />
                  <InputCell
                    inputRef={onesInputRef}
                    value={answerDigits[1]}
                    correct={isConsolidated && correctOnes}
                    wrong={isConsolidated && !correctOnes}
                    disabled={submitted}
                    onChange={(e) => {
                      if (submitted) return;
                      const val = e.target.value.replace(/[^0-9]/g, "").slice(-1);
                      setAnswerDigits(([t]) => [t, val]);
                      if (val) {
                        if (practiceProblem.hasBorrow) borrowInputRef.current?.focus();
                        else tensInputRef.current?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { handleSubmit(); return; }
                    }}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="w-8" />
                  <div className="w-16 md:w-20 text-center text-xs font-bold text-kid-blue/60 uppercase tracking-wide">Zehner</div>
                  <div className="w-16 md:w-20 text-center text-xs font-bold text-kid-orange/60 uppercase tracking-wide">Einer</div>
                </div>
              </div>

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
                  {!submitted && answerDigits[1] !== "" && (
                    <motion.button
                      key="prufen"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSubmit}
                      className="bg-kid-green text-primary-foreground font-bold px-6 py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-base"
                    >
                      ✅ Prüfen
                    </motion.button>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {feedback && (
                    <motion.button
                      key="next"
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
