import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { GameHeader } from "@/components/GameHeader";
import { Confetti } from "@/components/Confetti";
import { useSpeech } from "@/hooks/use-speech";
import { ArrowUp, ArrowDown, RefreshCw, CheckCircle2 } from "lucide-react";

const BUBBLE_COLORS = [
  "bg-kid-blue",
  "bg-kid-pink",
  "bg-kid-green",
  "bg-kid-orange",
  "bg-kid-purple",
  "bg-kid-yellow",
];

function generateNumbers(): number[] {
  const count = 6 + Math.floor(Math.random() * 3);
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

/** A draggable number in the source pool */
function DraggableNumber({ value, colorIndex, id }: { value: number; colorIndex: number; id: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  return (
    <motion.div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`
        ${BUBBLE_COLORS[colorIndex % BUBBLE_COLORS.length]} text-primary-foreground
        w-14 h-14 md:w-18 md:h-18
        rounded-2xl flex items-center justify-center
        text-2xl md:text-3xl font-black
        cursor-grab active:cursor-grabbing
        select-none shadow-lg
        ${isDragging ? "opacity-30 scale-75" : "hover:scale-110 hover:-translate-y-1 hover:shadow-xl"}
        transition-all duration-200
      `}
    >
      {value}
    </motion.div>
  );
}

/** A droppable slot in the target row */
function DropSlot({ index, value, total, isOver }: { index: number; value: number | null; total: number; isOver: boolean }) {
  const { setNodeRef, isOver: dndIsOver } = useDroppable({ id: `slot-${index}` });
  const highlight = isOver || dndIsOver;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        ref={setNodeRef}
        className={`
          w-14 h-14 md:w-18 md:h-18
          rounded-2xl flex items-center justify-center
          text-2xl md:text-3xl font-black
          transition-all duration-200
          ${
            value !== null
              ? `${BUBBLE_COLORS[value % BUBBLE_COLORS.length]} text-primary-foreground shadow-lg`
              : highlight
              ? "border-4 border-dashed border-primary bg-primary/10 scale-110 shadow-md"
              : "border-4 border-dashed border-border bg-muted/50"
          }
        `}
      >
        {value !== null ? value : ""}
      </div>
      {/* <span className="text-xs font-bold text-muted-foreground">{index + 1}.</span> */}
    </div>
  );
}

export default function NumberOrdering() {
  const [mode, setMode] = useState<"ascending" | "descending">("ascending");
  const { replay } = useSpeech(
    mode === "ascending"
      ? "Ordne die Zahlen von klein nach groß!"
      : "Ordne die Zahlen von groß nach klein!"
  );
  const [numbers, setNumbers] = useState(() => generateNumbers());
  const [pool, setPool] = useState(() => shuffle(numbers));
  const [slots, setSlots] = useState<(number | null)[]>(() => new Array(numbers.length).fill(null));
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeValue, setActiveValue] = useState<number | null>(null);
  const [overSlot, setOverSlot] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  );

  // Safety net: restore body styles on unmount in case they were set externally
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    if (id.startsWith("pool-")) {
      setActiveValue(parseInt(id.replace("pool-", "")));
    } else if (id.startsWith("filled-")) {
      const slotIdx = parseInt(id.replace("filled-", ""));
      setActiveValue(slots[slotIdx]);
    }
  };

  const handleDragOver = (event: any) => {
    const overId = event.over?.id as string | undefined;
    if (overId?.startsWith("slot-")) {
      setOverSlot(parseInt(overId.replace("slot-", "")));
    } else {
      setOverSlot(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveValue(null);
    setOverSlot(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Dragging from pool to a slot
    if (activeId.startsWith("pool-") && overId.startsWith("slot-")) {
      const value = parseInt(activeId.replace("pool-", ""));
      const slotIdx = parseInt(overId.replace("slot-", ""));
      if (slots[slotIdx] !== null) return; // slot occupied

      setPool((p) => p.filter((v) => v !== value));
      setSlots((s) => {
        const next = [...s];
        next[slotIdx] = value;
        return next;
      });
    }

    // Dragging from filled slot back to pool
    if (activeId.startsWith("filled-") && overId === "pool-area") {
      const slotIdx = parseInt(activeId.replace("filled-", ""));
      const value = slots[slotIdx];
      if (value === null) return;
      setSlots((s) => {
        const next = [...s];
        next[slotIdx] = null;
        return next;
      });
      setPool((p) => [...p, value]);
    }
  };

  const handleDragCancel = () => {
    setActiveValue(null);
    setOverSlot(null);
  };

  const checkAnswer = useCallback(() => {
    if (slots.some((s) => s === null)) return; // not all placed

    const sorted =
      mode === "ascending"
        ? [...numbers].sort((a, b) => a - b)
        : [...numbers].sort((a, b) => b - a);

    const isCorrect = slots.every((v, i) => v === sorted[i]);
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
  }, [slots, numbers, mode]);

  const newRound = () => {
    const newNums = generateNumbers();
    setNumbers(newNums);
    setPool(shuffle(newNums));
    setSlots(new Array(newNums.length).fill(null));
    setFeedback(null);
    setMode(Math.random() > 0.5 ? "ascending" : "descending");
  };

  // Click a filled slot to return to pool
  const returnToPool = (slotIdx: number) => {
    const value = slots[slotIdx];
    if (value === null) return;
    setSlots((s) => {
      const next = [...s];
      next[slotIdx] = null;
      return next;
    });
    setPool((p) => [...p, value]);
  };

  const allPlaced = slots.every((s) => s !== null);

  return (
    <div className="h-screen bg-background p-4 md:p-8 flex flex-col overflow-hidden touch-none">
      <Confetti show={showConfetti} />
      <div className="max-w-3xl mx-auto w-full flex flex-col flex-1 min-h-0">
        <GameHeader title="Zahlen ordnen" emoji="🔢" score={score} total={total} onReplay={replay} />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card rounded-3xl p-4 md:p-6 shadow-lg flex flex-col flex-1 min-h-0"
        >
          <div className="text-center mb-3">
            <div className="inline-flex items-center gap-2 bg-muted rounded-full px-5 py-2 mb-2">
              {mode === "ascending" ? (
                <ArrowUp className="text-accent" />
              ) : (
                <ArrowDown className="text-secondary" />
              )}
              <span className="font-bold text-lg text-foreground">
                {mode === "ascending" ? "Kleinste → Größte" : "Größte → Kleinste"}
              </span>
            </div>
            <p className="text-muted-foreground">Ziehe die Zahlen in die Felder!</p>
          </div>

          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            {/* Target row - drop slots */}
            <div className="mb-3">
              <p className="text-sm font-bold text-muted-foreground mb-1 text-center">
                📥 Hier einsortieren:
              </p>
              <div className="flex flex-wrap justify-center gap-2 md:gap-3 min-h-[64px] items-center bg-muted/30 rounded-2xl p-3">
                {slots.map((value, i) => (
                  <div key={`slot-${i}`} onClick={() => returnToPool(i)} className="cursor-pointer">
                    <DropSlot index={i} value={value} total={slots.length} isOver={overSlot === i} />
                  </div>
                ))}
              </div>
            </div>

            {/* Source pool row */}
            <PoolArea>
              <p className="text-sm font-bold text-muted-foreground mb-1 text-center">
                🎲 Zahlen zum Ziehen:
              </p>
              <div className="flex flex-wrap justify-center gap-2 md:gap-3 min-h-[64px] items-center">
                {pool.length === 0 ? (
                  <span className="text-muted-foreground font-semibold">Alle platziert! ✅</span>
                ) : (
                  pool.map((num) => (
                    <DraggableNumber key={`pool-${num}`} id={`pool-${num}`} value={num} colorIndex={num} />
                  ))
                )}
              </div>
            </PoolArea>

            <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
              {activeValue !== null ? (
                <div
                  className={`
                    ${BUBBLE_COLORS[activeValue % BUBBLE_COLORS.length]} text-primary-foreground
                    w-14 h-14 md:w-18 md:h-18
                    rounded-2xl flex items-center justify-center
                    text-2xl md:text-3xl font-black
                    shadow-2xl select-none rotate-3
                    ring-4 ring-primary/40
                  `}
                >
                  {activeValue}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className={`text-center mt-4 text-2xl font-black ${
                  feedback === "correct" ? "text-accent" : "text-destructive"
                }`}
              >
                {feedback === "correct" ? "🎉 Super gemacht!" : "🤔 Versuch es nochmal!"}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-center gap-4 mt-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={checkAnswer}
              disabled={!allPlaced}
              className={`font-bold px-8 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-lg transition-opacity ${
                allPlaced
                  ? "bg-gradient-ocean text-primary-foreground"
                  : "bg-muted text-muted-foreground opacity-60 cursor-not-allowed"
              }`}
            >
              <CheckCircle2 size={22} /> Prüfen
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={newRound}
              className="bg-gradient-sunny text-foreground font-bold px-8 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-lg"
            >
              <RefreshCw size={22} /> Neu
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/** Wraps the pool area as a droppable zone so items can be returned */
function PoolArea({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: "pool-area" });
  return (
    <div ref={setNodeRef} className="bg-muted/20 rounded-2xl p-3">
      {children}
    </div>
  );
}
