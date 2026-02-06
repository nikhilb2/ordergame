import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { NumberBubble, DragOverlayBubble } from "@/components/NumberBubble";
import { GameHeader } from "@/components/GameHeader";
import { Confetti } from "@/components/Confetti";
import { ArrowUp, ArrowDown, RefreshCw, CheckCircle2 } from "lucide-react";

function generateNumbers(): number[] {
  const count = 4 + Math.floor(Math.random() * 3);
  const set = new Set<number>();
  while (set.size < count) set.add(Math.floor(Math.random() * 20) + 1);
  return Array.from(set);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function NumberOrdering() {
  const [mode, setMode] = useState<"ascending" | "descending">("ascending");
  const [numbers, setNumbers] = useState(() => generateNumbers());
  const [items, setItems] = useState(() => shuffle(numbers));
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIdx = prev.findIndex((_, i) => `item-${i}` === active.id);
        const newIdx = prev.findIndex((_, i) => `item-${i}` === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const handleDragCancel = () => setActiveId(null);

  const activeIndex = activeId ? items.findIndex((_, i) => `item-${i}` === activeId) : -1;
  const activeValue = activeIndex >= 0 ? items[activeIndex] : 0;

  const checkAnswer = useCallback(() => {
    const sorted =
      mode === "ascending"
        ? [...numbers].sort((a, b) => a - b)
        : [...numbers].sort((a, b) => b - a);

    const isCorrect = items.every((v, i) => v === sorted[i]);
    setTotal((t) => t + 1);

    if (isCorrect) {
      setScore((s) => s + 1);
      setFeedback("correct");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
    } else {
      setFeedback("wrong");
    }

    setTimeout(() => setFeedback(null), 1500);
  }, [items, numbers, mode]);

  const newRound = () => {
    const newNums = generateNumbers();
    setNumbers(newNums);
    setItems(shuffle(newNums));
    setFeedback(null);
    setMode(Math.random() > 0.5 ? "ascending" : "descending");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Confetti show={showConfetti} />
      <div className="max-w-3xl mx-auto">
        <GameHeader title="Number Order" emoji="🔢" score={score} total={total} />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card rounded-3xl p-6 md:p-8 shadow-lg"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-muted rounded-full px-5 py-2 mb-4">
              {mode === "ascending" ? (
                <ArrowUp className="text-accent" />
              ) : (
                <ArrowDown className="text-secondary" />
              )}
              <span className="font-bold text-lg text-foreground">
                Arrange in {mode === "ascending" ? "Smallest → Biggest" : "Biggest → Smallest"} order
              </span>
            </div>
            <p className="text-muted-foreground">Drag the numbers to rearrange them!</p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={items.map((_, i) => `item-${i}`)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex flex-wrap justify-center gap-3 md:gap-4 min-h-[100px] items-center">
                {items.map((num, i) => (
                  <NumberBubble key={`item-${i}`} id={`item-${i}`} value={num} index={i} />
                ))}
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
              {activeId ? (
                <DragOverlayBubble value={activeValue} index={activeIndex} />
              ) : null}
            </DragOverlay>
          </DndContext>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className={`text-center mt-6 text-2xl font-black ${
                  feedback === "correct" ? "text-accent" : "text-destructive"
                }`}
              >
                {feedback === "correct" ? "🎉 Amazing! Great job!" : "🤔 Try again!"}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-center gap-4 mt-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={checkAnswer}
              className="bg-gradient-ocean text-primary-foreground font-bold px-8 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-lg"
            >
              <CheckCircle2 size={22} /> Check
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={newRound}
              className="bg-gradient-sunny text-foreground font-bold px-8 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-lg"
            >
              <RefreshCw size={22} /> New
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
