import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, RefreshCw } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Confetti } from "@/components/Confetti";
import { GOALS, type GoalId, type Level } from "./daily/tasks";
import { dayKey, goalStatus, loadStore, saveStore, type Store } from "./daily/progress";
import { PRACTICE_LENGTH, goalLevel, practiceDone, practiceLength, recordPracticeResult, roundsOf, setGoalLevel, startPractice } from "./daily/practice";
import { TaskScreen } from "./daily/TaskScreen";
import { flushAttempts, logSessionComplete, logSessionStart } from "./daily/attemptLog";
import { STATUS } from "./DailyExercise";

const GAME = "thema";
const LEVELS: Level[] = [1, 2, 3];

function formatDay(day: string) {
  if (day === dayKey()) return "Heute";
  const [y, m, d] = day.split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
}

function BackButton({ to }: { to: string }) {
  const navigate = useNavigate();
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => navigate(to)}
      className="flex items-center gap-2 bg-card rounded-full px-4 py-2 shadow-md font-bold text-foreground"
    >
      <ArrowLeft size={20} />
      Zurück
    </motion.button>
  );
}

function TopicList() {
  const navigate = useNavigate();
  const store = loadStore();
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <BackButton to="/" />
        <section className="bg-gradient-ocean rounded-3xl p-6 md:p-8 shadow-lg text-center text-primary-foreground">
          <div className="text-6xl mb-3">🎯</div>
          <h1 className="text-3xl md:text-4xl font-black mb-2">Einzeln üben</h1>
          <p className="font-semibold text-lg">Such dir ein Thema aus und übe nur das. {PRACTICE_LENGTH} Aufgaben pro Runde.</p>
        </section>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
          {GOALS.map((goal, i) => {
            const status = STATUS[goalStatus(store, goal.id)];
            return (
              <motion.button
                key={goal.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/thema/${goal.id}`)}
                className="relative bg-card rounded-3xl p-4 shadow-lg text-center"
              >
                <span className="absolute top-2 right-3 text-base" role="img" aria-label={status.label} title={status.label}>
                  {status.icon}
                </span>
                <span className="block text-4xl md:text-5xl mb-2">{goal.emoji}</span>
                <span className="block font-black text-foreground text-base md:text-lg leading-tight">{goal.title}</span>
              </motion.button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          ⚪ Noch nicht geübt · 🟡 Am Üben · ✅ Sitzt. Die Stufen gelten auch für die Tagesübung.
        </p>
      </div>
    </div>
  );
}

function Topic({ goalId }: { goalId: GoalId }) {
  const goal = GOALS.find((g) => g.id === goalId)!;
  const [store, setStore] = useState<Store>(loadStore);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [celebrate, setCelebrate] = useState(false);

  const today = dayKey();
  const round = store.practice?.goal === goalId ? store.practice : null;
  const inProgress = !!round && round.index > 0 && !practiceDone(round);
  const finishedRound = !!round && practiceDone(round);
  const level = goalLevel(store, goalId);
  const startLevel = round?.tasks[0]?.level ?? level;
  const status = STATUS[goalStatus(store, goalId)];
  const rounds = roundsOf(store, goalId);

  useEffect(() => {
    void flushAttempts();
  }, []);

  const update = (next: Store) => {
    setStore(next);
    saveStore(next);
  };

  const start = () => {
    const next = startPractice(store, goalId, today);
    const r = next.practice!;
    logSessionStart({
      mode: inProgress ? "resume" : round?.date === today ? "again" : "new",
      position: r.index,
      taskCount: practiceLength(r),
      game: GAME,
      goal: goalId,
    });
    update(next);
    setPosition(r.index);
    setCelebrate(false);
    setPlaying(true);
  };

  const next = () => {
    const current = store.practice!;
    if (practiceDone(current)) {
      setPlaying(false);
      setCelebrate(true);
    } else {
      setPosition(current.index);
    }
  };

  if (playing && round && position < round.tasks.length) {
    return (
      <TaskScreen
        key={position}
        task={round.tasks[position]}
        title={goal.title}
        emoji={goal.emoji}
        game={GAME}
        showLevel
        position={position}
        total={practiceLength(round)}
        score={round.score}
        answered={round.index}
        onFinish={(firstTry) => {
          const after = recordPracticeResult(store, firstTry);
          update(after);
          const r = after.practice!;
          if (practiceDone(r)) logSessionComplete({ score: r.score, total: r.index, game: GAME, goal: goalId, topic: goal.title });
        }}
        onNext={next}
      />
    );
  }

  const movedUp = finishedRound && level > startLevel;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Confetti show={celebrate} />
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <BackButton to="/thema" />

        <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-gradient-ocean rounded-3xl p-6 md:p-8 shadow-lg text-center text-primary-foreground">
          <div className="text-6xl mb-3">{finishedRound ? "🏆" : goal.emoji}</div>
          <h1 className="text-3xl md:text-4xl font-black mb-2">{finishedRound ? "Runde geschafft!" : goal.title}</h1>
          <p className="font-semibold text-lg mb-5">
            {finishedRound
              ? `Du hast ${round!.score} von ${round!.index} Aufgaben auf Anhieb richtig gelöst.${movedUp ? ` Jetzt bist du auf Stufe ${level}!` : ""}`
              : inProgress
                ? `Du bist bei Aufgabe ${round!.index + 1} von ${practiceLength(round!)}.`
                : goal.text}
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

        {rounds.length > 0 && (
          <section className="bg-card rounded-3xl p-5 md:p-8 shadow-lg">
            <h2 className="text-xl font-black text-foreground mb-1">Deine Runden</h2>
            <p className="text-muted-foreground font-semibold mb-3">
              {rounds.length} {rounds.length === 1 ? "Runde" : "Runden"} geübt · beste Runde {Math.max(...rounds.map((r) => r.score))} richtig auf Anhieb
            </p>
            <ul className="space-y-1">
              {rounds.slice(-5).reverse().map((r, i) => (
                <li key={rounds.length - i} className="flex justify-between gap-3 text-foreground">
                  <span className="font-semibold">{formatDay(r.date)}</span>
                  <span>
                    {r.score} von {r.total} · Stufe {r.from === r.to ? r.to : `${r.from} → ${r.to}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="bg-card rounded-3xl p-5 md:p-8 shadow-lg">
          <p className="font-bold text-foreground mb-1">
            {status.icon} {status.label} · Stufe {level} von 3
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Drei richtige Antworten hintereinander: eine Stufe höher. Zwei Fehler hintereinander: eine Stufe tiefer.
          </p>
          <p className="text-xs text-muted-foreground mb-2">Für Eltern: Tippe auf eine Stufe, um dort zu üben. Das gilt auch für die Tagesübung.</p>
          <div className="flex gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => update(setGoalLevel(store, goalId, l))}
                aria-pressed={l === level}
                className={`flex-1 rounded-2xl px-3 py-2 font-bold ${l === level ? "bg-kid-yellow/40 text-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
              >
                Stufe {l}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function TopicPractice() {
  const { goal } = useParams();
  if (!goal) return <TopicList />;
  if (!GOALS.some((g) => g.id === goal)) return <Navigate to="/thema" replace />;
  return <Topic key={goal} goalId={goal as GoalId} />;
}
