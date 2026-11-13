import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { GameHeader } from "@/components/GameHeader";
import { Confetti } from "@/components/Confetti";
import { Progress } from "@/components/ui/progress";
import { useSpeech } from "@/hooks/use-speech";
import { GOALS, type Task } from "./tasks";
import { TaskBody, type Report, type Outcome } from "./TaskViews";
import { logAttempt, type Game } from "./attemptLog";

/** One task of the Tagesübung or the Themen-Training, with feedback and logging. */
export function TaskScreen({
  task, title, emoji, game, showLevel, position, total, score, answered, onFinish, onNext,
}: {
  task: Task;
  title: string;
  emoji: string;
  /** Left out for the Tagesübung. */
  game?: Game;
  showLevel?: boolean;
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
    logAttempt({ task, game, given, correct, attempt, outcome, ms: Date.now() - shownAt.current });
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
        <GameHeader title={title} emoji={emoji} score={score} total={answered} onReplay={replay} />
        <div className="flex items-center gap-3 mb-4">
          <Progress value={(position / total) * 100} className="h-3 flex-1 bg-muted" />
          <span className="font-bold text-muted-foreground text-sm">
            {position + 1} / {total}
          </span>
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-card rounded-3xl p-4 md:p-8 shadow-lg">
          <p className="text-center text-sm font-bold text-muted-foreground mb-1">
            {goal.emoji} {goal.title}
            {showLevel && task.level && ` · Stufe ${task.level}`}
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
