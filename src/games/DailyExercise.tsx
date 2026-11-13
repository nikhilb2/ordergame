import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Flame, Play, RefreshCw, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Confetti } from "@/components/Confetti";
import { GOALS } from "./daily/tasks";
import { dayKey, goalStatus, loadStore, recordResult, saveStore, startSession, streak, type GoalStatus, type Store } from "./daily/progress";
import { TaskScreen } from "./daily/TaskScreen";
import { flushAttempts, logSessionComplete, logSessionStart } from "./daily/attemptLog";

export const STATUS: Record<GoalStatus, { icon: string; label: string }> = {
  neu: { icon: "⚪", label: "Noch nicht geübt" },
  ueben: { icon: "🟡", label: "Am Üben" },
  sicher: { icon: "✅", label: "Sitzt" },
};

function GoalList({ store }: { store: Store }) {
  const navigate = useNavigate();
  const safe = GOALS.filter((g) => goalStatus(store, g.id) === "sicher").length;
  return (
    <section className="bg-card rounded-3xl p-5 md:p-8 shadow-lg">
      <h2 className="text-xl md:text-2xl font-black text-foreground">Lernziele 2. Quintal</h2>
      <p className="text-muted-foreground font-semibold mb-4">
        {safe} von {GOALS.length} sitzen · {store.doneDays.length} {store.doneDays.length === 1 ? "Tag" : "Tage"} geübt
      </p>
      <ul className="space-y-1">
        {GOALS.map((goal) => {
          const status = STATUS[goalStatus(store, goal.id)];
          return (
            <li key={goal.id}>
              <button
                onClick={() => navigate(`/thema/${goal.id}`)}
                className="w-full flex items-start gap-3 rounded-2xl px-2 py-2 text-left hover:bg-muted"
              >
                <span className="text-lg leading-6" role="img" aria-label={status.label} title={status.label}>
                  {status.icon}
                </span>
                <span className="flex-1 text-sm md:text-base text-foreground">{goal.text}</span>
                <ChevronRight className="shrink-0 text-muted-foreground mt-0.5" size={20} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground mt-4">
        Tippe auf ein Lernziel, um nur dieses Thema zu üben.
        <br />
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
        title="Tagesübung"
        emoji="📅"
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
      </div>
    </div>
  );
}
