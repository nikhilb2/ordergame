import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Play, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GameHeader } from "@/components/GameHeader";
import { Confetti } from "@/components/Confetti";
import { Progress } from "@/components/ui/progress";
import { useSpeech } from "@/hooks/use-speech";
import { dayKey } from "./daily/progress";
import type { Outcome, Report } from "./daily/TaskViews";
import { flushAttempts, logAttempt, logSessionComplete, logSessionStart, type Given } from "./daily/attemptLog";
import {
  SECTIONS,
  STAGES,
  hintNumber,
  loadHalvingStore,
  recordHalvingResult,
  saveHalvingStore,
  startRound,
  type HalfTask,
  type HalvingStore,
  type Stage,
} from "./halbieren/halving";
import { DoublingHint, HalfTaskBody, Rechenweg } from "./halbieren/HalvingViews";

const GAME = "halbieren";

function TaskScreen({
  task, position, total, score, onFinish, onNext,
}: {
  task: HalfTask;
  position: number;
  total: number;
  score: number;
  onFinish: (firstTry: boolean) => void;
  onNext: () => void;
}) {
  const { replay } = useSpeech(task.speech ?? task.prompt);
  const wrongs = useRef(0);
  const shownAt = useRef(Date.now());
  const [feedback, setFeedback] = useState<Outcome | null>(null);
  const [hintFor, setHintFor] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const section = SECTIONS[task.section];

  const report: Report = (correct, given: Given) => {
    const attempt = wrongs.current + 1;
    let outcome: Outcome;
    if (correct) outcome = "correct";
    else outcome = ++wrongs.current >= 2 ? "revealed" : "retry";
    logAttempt({ task, game: GAME, given, correct, attempt, outcome, ms: Date.now() - shownAt.current });
    setFeedback(outcome);
    if (!correct) setHintFor(hintNumber(task, Array.isArray(given) ? given : [Number(given)]));
    if (outcome === "correct") {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
    }
    if (outcome !== "retry") onFinish(wrongs.current === 0);
    return outcome;
  };

  const finished = feedback === "correct" || feedback === "revealed";
  const showHint = hintFor !== null && (feedback === "retry" || feedback === "revealed");

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Confetti show={showConfetti} />
      <div className="max-w-3xl mx-auto w-full">
        <GameHeader title="Halbieren" emoji="✂️" score={score} total={position} onReplay={replay} />
        <div className="flex items-center gap-3 mb-4">
          <Progress value={(position / total) * 100} className="h-3 flex-1 bg-muted" />
          <span className="font-bold text-muted-foreground text-sm">
            {position + 1} / {total}
          </span>
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-card rounded-3xl p-4 md:p-8 shadow-lg">
          <p className="text-center text-sm font-bold text-muted-foreground mb-1">
            {section.emoji} {section.title}
          </p>
          <p className="text-center text-xl md:text-2xl font-black text-foreground mb-6">{task.prompt}</p>

          <HalfTaskBody task={task} report={report} />

          <AnimatePresence>
            {feedback && (
              <motion.div
                key={feedback}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`text-center text-2xl font-black mt-5 ${feedback === "correct" ? "text-accent" : "text-destructive"}`}
              >
                {feedback === "correct" && "🎉 Richtig!"}
                {feedback === "retry" && "😊 Fast! Schau dir den Rechenweg an."}
                {feedback === "revealed" && "😊 So geht es. Das schaffst du beim nächsten Mal!"}
              </motion.div>
            )}
          </AnimatePresence>

          {showHint &&
            (task.kind === "half-reverse" ? (
              <DoublingHint half={task.half} reveal={feedback === "revealed"} />
            ) : (
              <Rechenweg n={hintFor} reveal={feedback === "revealed"} />
            ))}

          {finished && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onNext}
              className="bg-gradient-sunny text-foreground font-bold px-8 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-lg mx-auto mt-5"
            >
              Weiter <ArrowRight size={22} />
            </motion.button>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function StageList({ store, onPick }: { store: HalvingStore; onPick: (stage: Stage) => void }) {
  return (
    <section className="bg-card rounded-3xl p-5 md:p-8 shadow-lg">
      <h2 className="text-xl md:text-2xl font-black text-foreground mb-1">Ich kann halbieren</h2>
      <p className="text-muted-foreground font-semibold mb-4">8 von 10 auf Anhieb richtig, dann geht es zur nächsten Stufe.</p>
      <ul className="space-y-2">
        {STAGES.map(({ stage, title, example }) => {
          const icon = store.passed >= stage ? "✅" : store.stage === stage ? "👉" : "⚪";
          return (
            <li key={stage}>
              <button
                onClick={() => onPick(stage)}
                className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-left ${store.stage === stage ? "bg-kid-yellow/25" : "hover:bg-muted"}`}
              >
                <span className="text-lg">{icon}</span>
                <span className="flex-1 font-bold text-foreground">
                  Stufe {stage}: {title}
                </span>
                <span className="text-muted-foreground font-semibold whitespace-nowrap">{example}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground mt-4">Für Eltern: Tippe auf eine Stufe, um dort zu üben.</p>
    </section>
  );
}

export default function HalvingTraining() {
  const navigate = useNavigate();
  const [store, setStore] = useState<HalvingStore>(loadHalvingStore);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [celebrate, setCelebrate] = useState(false);

  const today = dayKey();
  const round = store.round;
  const inProgress = !!round && round.index > 0 && round.index < round.tasks.length;
  const finishedRound = !!round && round.index >= round.tasks.length;
  const playedToday = store.rounds.some((r) => r.date === today);
  const lastResult = finishedRound ? store.rounds[store.rounds.length - 1] : null;
  const movedUp = !!lastResult && store.stage > lastResult.stage;

  useEffect(() => {
    void flushAttempts();
  }, []);

  const update = (next: HalvingStore) => {
    setStore(next);
    saveHalvingStore(next);
  };

  const start = () => {
    const next = startRound(store, today);
    logSessionStart({
      mode: inProgress ? "resume" : playedToday ? "again" : "new",
      position: next.round!.index,
      taskCount: next.round!.tasks.length,
      game: GAME,
    });
    update(next);
    setPosition(next.round!.index);
    setCelebrate(false);
    setPlaying(true);
  };

  const pickStage = (stage: Stage) => update({ ...store, stage, round: null });

  const next = () => {
    const current = store.round!;
    if (current.index >= current.tasks.length) {
      setPlaying(false);
      setCelebrate(true);
    } else {
      setPosition(current.index);
    }
  };

  if (playing && round) {
    return (
      <TaskScreen
        key={position}
        task={round.tasks[position]}
        position={position}
        total={round.tasks.length}
        score={round.score}
        onFinish={(firstTry) => {
          const after = recordHalvingResult(store, firstTry);
          update(after);
          const r = after.round!;
          if (r.index >= r.tasks.length) logSessionComplete({ score: r.score, total: r.index, game: GAME });
        }}
        onNext={next}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Confetti show={celebrate} />
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate("/")}
          className="flex items-center gap-2 bg-card rounded-full px-4 py-2 shadow-md font-bold text-foreground"
        >
          <ArrowLeft size={20} />
          Zurück
        </motion.button>

        <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-gradient-candy rounded-3xl p-6 md:p-8 shadow-lg text-center text-primary-foreground">
          <div className="text-6xl mb-3">{movedUp ? "🏆" : "✂️"}</div>
          <h1 className="text-3xl md:text-4xl font-black mb-2">{movedUp ? `Stufe ${lastResult!.stage} geschafft!` : "Halbieren-Training"}</h1>
          <p className="font-semibold text-lg mb-5">
            {lastResult
              ? `Du hast ${lastResult.score} von ${lastResult.total} Aufgaben auf Anhieb richtig gelöst.${movedUp ? ` Weiter geht es mit Stufe ${store.stage}.` : ""}`
              : inProgress
                ? `Du bist bei Aufgabe ${round!.index + 1} von ${round!.tasks.length}.`
                : `Halbieren mit Rechenweg, wie in der Schule. Stufe ${store.stage}: ${STAGES[store.stage - 1].title}.`}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={start}
            className="bg-card text-foreground font-black px-8 py-4 rounded-2xl shadow-lg inline-flex items-center gap-2 text-xl"
          >
            {finishedRound ? <RefreshCw size={24} /> : <Play size={24} />}
            {inProgress ? "Weitermachen" : finishedRound ? "Noch eine Runde" : "Los geht's"}
          </motion.button>
        </motion.section>

        <StageList store={store} onPick={pickStage} />
      </div>
    </div>
  );
}
