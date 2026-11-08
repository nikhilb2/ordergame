import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Flame, Play, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GameHeader } from "@/components/GameHeader";
import { Confetti } from "@/components/Confetti";
import { Progress } from "@/components/ui/progress";
import { useSpeech } from "@/hooks/use-speech";
import { GOALS, type Task } from "./daily/tasks";
import { dayKey, goalStatus, loadStore, recordResult, saveStore, startSession, streak, type GoalStatus, type Store } from "./daily/progress";
import { TaskBody, type Report, type Outcome } from "./daily/TaskViews";
import { flushAttempts, isLoggingEnabled, logAttempt, logSessionComplete, logSessionStart } from "./daily/attemptLog";

const STATUS: Record<GoalStatus, { icon: string; label: string }> = {
  neu: { icon: "⚪", label: "Noch nicht geübt" },
  ueben: { icon: "🟡", label: "Am Üben" },
  sicher: { icon: "✅", label: "Sitzt" },
};

function TaskScreen({
  task, position, total, score, answered, onFinish, onNext,
}: {
  task: Task;
  position: number;
  total: number;
  score: number;
  answered: number;
  onFinish: (firstTry: boolean) => void;
  onNext: () => void;
}) {
  const { replay } = useSpeech(task.speech ?? task.prompt);
  const wrongs = useRef(0);
  const shownAt = useRef(Date.now());
  const [feedback, setFeedback] = useState<Outcome | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const goal = GOALS.find((g) => g.id === task.goal)!;

  const report: Report = (correct, given) => {
    const attempt = wrongs.current + 1;
    let outcome: Outcome;
    if (correct) outcome = "correct";
    else outcome = ++wrongs.current >= 2 ? "revealed" : "retry";
    logAttempt({ task, given, correct, attempt, outcome, ms: Date.now() - shownAt.current });
    setFeedback(outcome);
    if (outcome === "correct") {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
    }
    if (outcome !== "retry") onFinish(wrongs.current === 0);
    return outcome;
  };

  const finished = feedback === "correct" || feedback === "revealed";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Confetti show={showConfetti} />
      <div className="max-w-3xl mx-auto w-full">
        <GameHeader title="Tagesübung" emoji="📅" score={score} total={answered} onReplay={replay} />
        <div className="flex items-center gap-3 mb-4">
          <Progress value={(position / total) * 100} className="h-3 flex-1 bg-muted" />
          <span className="font-bold text-muted-foreground text-sm">
            {position + 1} / {total}
          </span>
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-card rounded-3xl p-4 md:p-8 shadow-lg">
          <p className="text-center text-sm font-bold text-muted-foreground mb-1">
            {goal.emoji} {goal.title}
          </p>
          <p className="text-center text-xl md:text-2xl font-black text-foreground mb-6">{task.prompt}</p>

          <TaskBody task={task} report={report} />

          <AnimatePresence>
            {feedback && (
              <motion.div
                key={feedback}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`text-center text-2xl font-black mt-5 ${feedback === "correct" ? "text-accent" : "text-destructive"}`}
              >
                {feedback === "correct" && "🎉 Richtig!"}
                {feedback === "retry" && "😊 Fast! Schau nochmal genau."}
                {feedback === "revealed" && "😊 So geht es. Das üben wir gleich nochmal!"}
              </motion.div>
            )}
          </AnimatePresence>

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

function GoalList({ store }: { store: Store }) {
  const safe = GOALS.filter((g) => goalStatus(store, g.id) === "sicher").length;
  return (
    <section className="bg-card rounded-3xl p-5 md:p-8 shadow-lg">
      <h2 className="text-xl md:text-2xl font-black text-foreground">Lernziele 2. Quintal</h2>
      <p className="text-muted-foreground font-semibold mb-4">
        {safe} von {GOALS.length} sitzen · {store.doneDays.length} {store.doneDays.length === 1 ? "Tag" : "Tage"} geübt
      </p>
      <ul className="space-y-3">
        {GOALS.map((goal) => {
          const status = STATUS[goalStatus(store, goal.id)];
          return (
            <li key={goal.id} className="flex items-start gap-3">
              <span className="text-lg leading-6" role="img" aria-label={status.label} title={status.label}>
                {status.icon}
              </span>
              <span className="text-sm md:text-base text-foreground">{goal.text}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground mt-4">
        ⚪ Noch nicht geübt · 🟡 Am Üben · ✅ Sitzt: auf der schwersten Stufe mindestens 4 von 5 Aufgaben auf Anhieb richtig
      </p>
    </section>
  );
}

export default function DailyExercise() {
  const navigate = useNavigate();
  const [store, setStore] = useState<Store>(loadStore);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [celebrate, setCelebrate] = useState(false);

  const today = dayKey();
  const session = store.session?.date === today ? store.session : null;
  const inProgress = !!session && session.index > 0 && session.index < session.tasks.length;
  const finishedRound = !!session && session.index >= session.tasks.length;
  const doneToday = store.doneDays.includes(today);
  const days = streak(store.doneDays);

  useEffect(() => {
    void flushAttempts();
  }, []);

  const update = (next: Store) => {
    setStore(next);
    saveStore(next);
  };

  const start = () => {
    const next = startSession(store, today);
    logSessionStart({
      mode: inProgress ? "resume" : doneToday ? "again" : "new",
      position: next.session!.index,
      taskCount: next.session!.tasks.length,
    });
    update(next);
    setPosition(next.session!.index);
    setCelebrate(false);
    setPlaying(true);
  };

  const next = () => {
    const current = store.session!;
    if (current.index >= current.tasks.length) {
      setPlaying(false);
      setCelebrate(true);
    } else {
      setPosition(current.index);
    }
  };

  if (playing && store.session) {
    const current = store.session;
    return (
      <TaskScreen
        key={position}
        task={current.tasks[position]}
        position={position}
        total={current.tasks.length}
        score={current.score}
        answered={current.index}
        onFinish={(firstTry) => {
          const after = recordResult(store, firstTry);
          update(after);
          const round = after.session!;
          if (round.index >= round.tasks.length) logSessionComplete({ score: round.score, total: round.index });
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

        <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-gradient-fun rounded-3xl p-6 md:p-8 shadow-lg text-center text-primary-foreground">
          <div className="text-6xl mb-3">{doneToday ? "🏆" : "📅"}</div>
          <h1 className="text-3xl md:text-4xl font-black mb-2">{doneToday ? "Heute geschafft!" : "Tagesübung"}</h1>
          <p className="font-semibold text-lg mb-5">
            {finishedRound
              ? `Du hast ${session.score} von ${session.index} Aufgaben auf Anhieb richtig gelöst.`
              : inProgress
                ? `Du bist bei Aufgabe ${session.index + 1} von ${session.tasks.length}.`
                : "Jeden Tag ein bisschen von allem. Das dauert etwa 10 Minuten."}
          </p>
          {days > 0 && (
            <p className="flex items-center justify-center gap-2 font-black text-xl mb-5">
              <Flame size={24} /> {days} {days === 1 ? "Tag" : "Tage"} in Folge
            </p>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={start}
            className={`${doneToday && !inProgress ? "bg-card/90" : "bg-card"} text-foreground font-black px-8 py-4 rounded-2xl shadow-lg inline-flex items-center gap-2 text-xl`}
          >
            {doneToday && !inProgress ? <RefreshCw size={24} /> : <Play size={24} />}
            {inProgress ? "Weitermachen" : doneToday ? "Noch eine Runde" : "Los geht's"}
          </motion.button>
        </motion.section>

        <GoalList store={store} />
        {isLoggingEnabled() && <p className="text-center text-xs text-muted-foreground">📝 Antworten werden gespeichert</p>}
      </div>
    </div>
  );
}
