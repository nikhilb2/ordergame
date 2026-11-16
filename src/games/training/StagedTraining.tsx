import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Play, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GameHeader } from "@/components/GameHeader";
import { Confetti } from "@/components/Confetti";
import { Progress } from "@/components/ui/progress";
import { useSpeech } from "@/hooks/use-speech";
import { dayKey } from "../daily/progress";
import type { Outcome, Report } from "../daily/TaskViews";
import { flushAttempts, logAttempt, logSessionComplete, logSessionStart, type Game, type Given } from "../daily/attemptLog";
import type { StagedStore, StagedStoreApi } from "./stagedStore";

// A training with stages and 10-task rounds (Halbieren, Schritte). Each one
// brings its tasks, views and hints; the round, the stage list and the log
// are the same for all.

export interface TrainingTask {
  goal: string;
  section: string;
  prompt: string;
  speech?: string;
}

export interface TrainingConfig<T extends TrainingTask, S extends number> {
  game: Game;
  /** Short name for the header during a round. */
  name: string;
  emoji: string;
  /** Title on the start screen. */
  title: string;
  /** Start-screen text before the first round: what she practises. */
  intro: string;
  /** Heading of the stage list, as an "Ich kann …" goal. */
  goal: string;
  gradient: string;
  stages: { stage: S; title: string; example: string }[];
  sections: Record<string, { title: string; emoji: string }>;
  store: StagedStoreApi<T, S>;
  Body: (props: { task: T; report: Report }) => ReactNode;
  /** Shown after a wrong answer; `reveal` is true once the answer is shown. */
  Hint: (props: { task: T; given: number[]; reveal: boolean }) => ReactNode;
  retryText: string;
}

function TaskScreen<T extends TrainingTask, S extends number>({
  config, task, position, total, score, onFinish, onNext,
}: {
  config: TrainingConfig<T, S>;
  task: T;
  position: number;
  total: number;
  score: number;
  onFinish: (firstTry: boolean) => void;
  onNext: () => void;
}) {
  const { Body, Hint } = config;
  const { replay } = useSpeech(task.speech ?? task.prompt);
  const wrongs = useRef(0);
  const shownAt = useRef(Date.now());
  const [feedback, setFeedback] = useState<Outcome | null>(null);
  const [wrongGiven, setWrongGiven] = useState<number[] | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const section = config.sections[task.section];

  const report: Report = (correct, given: Given) => {
    const attempt = wrongs.current + 1;
    let outcome: Outcome;
    if (correct) outcome = "correct";
    else outcome = ++wrongs.current >= 2 ? "revealed" : "retry";
    logAttempt({ task, game: config.game, given, correct, attempt, outcome, ms: Date.now() - shownAt.current });
    setFeedback(outcome);
    if (!correct) setWrongGiven(Array.isArray(given) ? given : [Number(given)]);
    if (outcome === "correct") {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
    }
    if (outcome !== "retry") onFinish(wrongs.current === 0);
    return outcome;
  };

  const finished = feedback === "correct" || feedback === "revealed";
  const showHint = wrongGiven !== null && (feedback === "retry" || feedback === "revealed");

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Confetti show={showConfetti} />
      <div className="max-w-3xl mx-auto w-full">
        <GameHeader title={config.name} emoji={config.emoji} score={score} total={position} onReplay={replay} />
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

          <Body task={task} report={report} />

          <AnimatePresence>
            {feedback && (
              <motion.div
                key={feedback}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`text-center text-2xl font-black mt-5 ${feedback === "correct" ? "text-accent" : "text-destructive"}`}
              >
                {feedback === "correct" && "🎉 Richtig!"}
                {feedback === "retry" && config.retryText}
                {feedback === "revealed" && "😊 So geht es. Das schaffst du beim nächsten Mal!"}
              </motion.div>
            )}
          </AnimatePresence>

          {showHint && <Hint task={task} given={wrongGiven} reveal={feedback === "revealed"} />}

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

function StageList<T extends TrainingTask, S extends number>({
  config, store, onPick,
}: {
  config: TrainingConfig<T, S>;
  store: StagedStore<T, S>;
  onPick: (stage: S) => void;
}) {
  return (
    <section className="bg-card rounded-3xl p-5 md:p-8 shadow-lg">
      <h2 className="text-xl md:text-2xl font-black text-foreground mb-1">{config.goal}</h2>
      <p className="text-muted-foreground font-semibold mb-4">8 von 10 auf Anhieb richtig, dann geht es zur nächsten Stufe.</p>
      <ul className="space-y-2">
        {config.stages.map(({ stage, title, example }) => {
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

export function StagedTraining<T extends TrainingTask, S extends number>({ config }: { config: TrainingConfig<T, S> }) {
  const navigate = useNavigate();
  const { store: api, game } = config;
  const [store, setStore] = useState<StagedStore<T, S>>(api.load);
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
  const currentStage = config.stages.find((s) => s.stage === store.stage) ?? config.stages[0];

  useEffect(() => {
    void flushAttempts();
  }, []);

  const update = (next: StagedStore<T, S>) => {
    setStore(next);
    api.save(next);
  };

  const start = () => {
    const next = api.start(store, today);
    logSessionStart({
      mode: inProgress ? "resume" : playedToday ? "again" : "new",
      position: next.round!.index,
      taskCount: next.round!.tasks.length,
      game,
    });
    update(next);
    setPosition(next.round!.index);
    setCelebrate(false);
    setPlaying(true);
  };

  const pickStage = (stage: S) => update({ ...store, stage, round: null });

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
        config={config}
        task={round.tasks[position]}
        position={position}
        total={round.tasks.length}
        score={round.score}
        onFinish={(firstTry) => {
          const after = api.record(store, firstTry);
          update(after);
          const r = after.round!;
          if (r.index >= r.tasks.length) logSessionComplete({ score: r.score, total: r.index, game });
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

        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`${config.gradient} rounded-3xl p-6 md:p-8 shadow-lg text-center text-primary-foreground`}
        >
          <div className="text-6xl mb-3">{movedUp ? "🏆" : config.emoji}</div>
          <h1 className="text-3xl md:text-4xl font-black mb-2">{movedUp ? `Stufe ${lastResult!.stage} geschafft!` : config.title}</h1>
          <p className="font-semibold text-lg mb-5">
            {lastResult
              ? `Du hast ${lastResult.score} von ${lastResult.total} Aufgaben auf Anhieb richtig gelöst.${movedUp ? ` Weiter geht es mit Stufe ${store.stage}.` : ""}`
              : inProgress
                ? `Du bist bei Aufgabe ${round!.index + 1} von ${round!.tasks.length}.`
                : `${config.intro} Stufe ${store.stage}: ${currentStage.title}.`}
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

        <StageList config={config} store={store} onPick={pickStage} />
      </div>
    </div>
  );
}
