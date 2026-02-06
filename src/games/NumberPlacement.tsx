import { useState, useCallback } from "react";
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

const BUBBLE_COLORS = [
  "bg-kid-blue",
  "bg-kid-pink",
  "bg-kid-green",
  "bg-kid-orange",
  "bg-kid-purple",
  "bg-kid-yellow",
];

type Operator = "<" | ">" | "=";

interface PoolItem {
  id: number;
  value: number;
}

interface Problem {
  operator: Operator;
  left: PoolItem | null;
  right: PoolItem | null;
  answerLeft: number;
  answerRight: number;
  solved: boolean;
  shaking: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

const OPERATORS: Operator[] = ["<", ">", "="];

function generatePuzzle(): { problems: Problem[]; pool: PoolItem[] } {
  const problems: Problem[] = [];
  const poolValues: number[] = [];

  for (let i = 0; i < 5; i++) {
    const op = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
    let a: number, b: number;

    if (op === "=") {
      a = randInt(1, 20);
      b = a;
    } else if (op === "<") {
      a = randInt(1, 19);
      b = randInt(a + 1, 20);
    } else {
      b = randInt(1, 19);
      a = randInt(b + 1, 20);
    }

    poolValues.push(a, b);
    problems.push({
      operator: op,
      left: null,
      right: null,
      answerLeft: a,
      answerRight: b,
      solved: false,
      shaking: false,
    });
  }

  const pool: PoolItem[] = poolValues.map((value, idx) => ({
    id: idx,
    value,
  }));

  return { problems, pool: shuffle(pool) };
}

const GERMAN_NUMBERS: Record<number, string> = {
  1: "eins", 2: "zwei", 3: "drei", 4: "vier", 5: "fünf",
  6: "sechs", 7: "sieben", 8: "acht", 9: "neun", 10: "zehn",
  11: "elf", 12: "zwölf", 13: "dreizehn", 14: "vierzehn", 15: "fünfzehn",
  16: "sechzehn", 17: "siebzehn", 18: "achtzehn", 19: "neunzehn", 20: "zwanzig",
};

function speakEquation(left: number, op: Operator, right: number) {
  if (!window.speechSynthesis) return;
  const opWord = op === "=" ? "gleich" : op === "<" ? "kleiner als" : "größer als";
  const text = `${GERMAN_NUMBERS[left]} ${opWord} ${GERMAN_NUMBERS[right]}`;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

/** A draggable number in the pool */
function DraggablePoolNumber({ item }: { item: PoolItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool-${item.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`
        ${BUBBLE_COLORS[item.id % BUBBLE_COLORS.length]} text-primary-foreground
        w-12 h-12 md:w-14 md:h-14
        rounded-2xl flex items-center justify-center
        text-xl md:text-2xl font-black
        cursor-grab active:cursor-grabbing
        select-none shadow-lg
        ${isDragging ? "opacity-30 scale-75" : "hover:scale-110 hover:-translate-y-1 hover:shadow-xl"}
        transition-all duration-200
      `}
    >
      {item.value}
    </div>
  );
}

/** A draggable number in a filled slot — also clickable to return */
function DraggableFilledNumber({
  item,
  problemIdx,
  side,
  solved,
  onReturn,
}: {
  item: PoolItem;
  problemIdx: number;
  side: "left" | "right";
  solved: boolean;
  onReturn: (problemIdx: number, side: "left" | "right") => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `filled-${problemIdx}-${side}`,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onReturn(problemIdx, side)}
      className={`
        ${solved ? "bg-green-500 text-white" : `${BUBBLE_COLORS[item.id % BUBBLE_COLORS.length]} text-primary-foreground`}
        w-12 h-12 md:w-14 md:h-14
        rounded-2xl flex items-center justify-center
        text-xl md:text-2xl font-black
        cursor-grab active:cursor-grabbing
        select-none shadow-lg
        ${isDragging ? "opacity-30 scale-75" : ""}
        transition-all duration-200
      `}
    >
      {item.value}
    </div>
  );
}

/** A droppable slot */
function DropSlot({
  problemIdx,
  side,
  isOver,
}: {
  problemIdx: number;
  side: "left" | "right";
  isOver: boolean;
}) {
  const { setNodeRef, isOver: dndIsOver } = useDroppable({
    id: `slot-${problemIdx}-${side}`,
  });
  const highlight = isOver || dndIsOver;

  return (
    <div
      ref={setNodeRef}
      className={`
        w-12 h-12 md:w-14 md:h-14
        rounded-2xl flex items-center justify-center
        text-xl md:text-2xl font-black
        transition-all duration-200
        ${
          highlight
            ? "border-4 border-dashed border-primary bg-primary/10 scale-110 shadow-md"
            : "border-4 border-dashed border-border bg-muted/50"
        }
      `}
    />
  );
}

/** Pool area droppable zone */
function PoolArea({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: "pool-area" });
  return (
    <div ref={setNodeRef} className="bg-muted/20 rounded-2xl p-3">
      {children}
    </div>
  );
}

export default function NumberPlacement() {
  const { replay } = useSpeech("Setze die Zahlen richtig ein!");

  const [{ problems: initialProblems, pool: initialPool }] = useState(generatePuzzle);
  const [problems, setProblems] = useState<Problem[]>(initialProblems);
  const [pool, setPool] = useState<PoolItem[]>(initialPool);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeValue, setActiveValue] = useState<number | null>(null);
  const [overSlotId, setOverSlotId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  );

  const allSolved = problems.every((p) => p.solved);

  const returnToPool = useCallback((problemIdx: number, side: "left" | "right") => {
    const item = problems[problemIdx][side];
    if (!item) return;
    const newProblems = [...problems];
    newProblems[problemIdx] = { ...newProblems[problemIdx], [side]: null, solved: false };
    setProblems(newProblems);
    setPool((pp) => [...pp, item]);
  }, [problems]);

  const checkProblem = useCallback(
    (problemIdx: number, updatedProblems: Problem[]) => {
      const p = updatedProblems[problemIdx];
      if (!p.left || !p.right || p.solved) return;

      const l = p.left.value;
      const r = p.right.value;
      let correct = false;
      if (p.operator === "=" && l === r) correct = true;
      if (p.operator === "<" && l < r) correct = true;
      if (p.operator === ">" && l > r) correct = true;

      if (correct) {
        const next = [...updatedProblems];
        next[problemIdx] = { ...p, solved: true };
        setProblems(next);
        speakEquation(l, p.operator, r);

        if (next.every((pr) => pr.solved)) {
          setScore((s) => s + 1);
          setTotal((t) => t + 1);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 100);
        }
      } else {
        const next = [...updatedProblems];
        next[problemIdx] = { ...p, shaking: true };
        setProblems(next);

        setTimeout(() => {
          setProblems((prev) => {
            const n = [...prev];
            const returnItems: PoolItem[] = [];
            if (n[problemIdx].left) returnItems.push(n[problemIdx].left!);
            if (n[problemIdx].right) returnItems.push(n[problemIdx].right!);
            n[problemIdx] = { ...n[problemIdx], left: null, right: null, shaking: false };
            setPool((pp) => [...pp, ...returnItems]);
            return n;
          });
        }, 500);
      }
    },
    []
  );

  const handleDragStart = (event: DragStartEvent) => {
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const id = event.active.id as string;
    if (id.startsWith("pool-")) {
      const poolId = parseInt(id.replace("pool-", ""));
      const item = pool.find((p) => p.id === poolId);
      if (item) setActiveValue(item.value);
    } else if (id.startsWith("filled-")) {
      const parts = id.replace("filled-", "").split("-");
      const pIdx = parseInt(parts[0]);
      const side = parts[1] as "left" | "right";
      const item = problems[pIdx][side];
      if (item) setActiveValue(item.value);
    }
  };

  const handleDragOver = (event: { over?: { id: string | number } | null }) => {
    const overId = event.over?.id as string | undefined;
    setOverSlotId(overId?.startsWith("slot-") ? overId : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
    setActiveValue(null);
    setOverSlotId(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Pool → slot (swap if occupied, un-solve if needed)
    if (activeId.startsWith("pool-") && overId.startsWith("slot-")) {
      const poolId = parseInt(activeId.replace("pool-", ""));
      const item = pool.find((p) => p.id === poolId);
      if (!item) return;

      const slotParts = overId.replace("slot-", "").split("-");
      const pIdx = parseInt(slotParts[0]);
      const side = slotParts[1] as "left" | "right";

      let newPool = pool.filter((p) => p.id !== poolId);

      // If slot is already occupied, return existing item to pool
      const existing = problems[pIdx][side];
      if (existing) {
        newPool = [...newPool, existing];
      }

      setPool(newPool);

      const newProblems = [...problems];
      newProblems[pIdx] = { ...newProblems[pIdx], [side]: item, solved: false };
      setProblems(newProblems);

      if (newProblems[pIdx].left && newProblems[pIdx].right) {
        setTimeout(() => checkProblem(pIdx, newProblems), 100);
      }
    }

    // Filled → pool-area (return, un-solve if needed)
    if (activeId.startsWith("filled-") && overId === "pool-area") {
      const parts = activeId.replace("filled-", "").split("-");
      const pIdx = parseInt(parts[0]);
      const side = parts[1] as "left" | "right";

      const item = problems[pIdx][side];
      if (!item) return;

      const newProblems = [...problems];
      newProblems[pIdx] = { ...newProblems[pIdx], [side]: null, solved: false };
      setProblems(newProblems);
      setPool((pp) => [...pp, item]);
    }

    // Filled → different slot (move between slots, un-solve affected rows)
    if (activeId.startsWith("filled-") && overId.startsWith("slot-")) {
      const srcParts = activeId.replace("filled-", "").split("-");
      const srcIdx = parseInt(srcParts[0]);
      const srcSide = srcParts[1] as "left" | "right";

      const item = problems[srcIdx][srcSide];
      if (!item) return;

      const dstParts = overId.replace("slot-", "").split("-");
      const dstIdx = parseInt(dstParts[0]);
      const dstSide = dstParts[1] as "left" | "right";

      const newProblems = [...problems];

      // Remove from source, un-solve source row
      newProblems[srcIdx] = { ...newProblems[srcIdx], [srcSide]: null, solved: false };

      // If destination is occupied, swap existing back to pool
      const existing = problems[dstIdx][dstSide];
      if (existing) {
        setPool((pp) => [...pp, existing]);
      }

      // Place in destination, un-solve destination row
      newProblems[dstIdx] = { ...newProblems[dstIdx], [dstSide]: item, solved: false };
      setProblems(newProblems);

      if (newProblems[dstIdx].left && newProblems[dstIdx].right) {
        setTimeout(() => checkProblem(dstIdx, newProblems), 100);
      }
    }
  };

  const handleDragCancel = () => {
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
    setActiveValue(null);
    setOverSlotId(null);
  };

  const newRound = () => {
    if (!allSolved) {
      setTotal((t) => t + 1);
    }
    const { problems: newProblems, pool: newPool } = generatePuzzle();
    setProblems(newProblems);
    setPool(newPool);
  };

  const operatorDisplay = (op: Operator) => {
    if (op === "<") return "<";
    if (op === ">") return ">";
    return "=";
  };

  return (
    <div className="h-screen bg-background p-3 md:p-4 flex flex-col overflow-hidden">
      <Confetti show={showConfetti} />
      <div className="max-w-3xl mx-auto w-full flex flex-col flex-1 min-h-0">
        <GameHeader
          title="Zahlen einsetzen"
          emoji="🧩"
          score={score}
          total={total}
          onReplay={replay}
        />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card rounded-3xl p-4 md:p-6 shadow-lg flex flex-col flex-1 min-h-0"
        >
          <p className="text-base md:text-lg font-bold text-foreground text-center mb-3">
            Setze die Zahlen richtig ein!
          </p>

          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            {/* Problem rows */}
            <div className="space-y-2 mb-3 flex-1 min-h-0 flex flex-col justify-center">
              {problems.map((problem, pIdx) => (
                <motion.div
                  key={pIdx}
                  animate={
                    problem.shaking
                      ? { x: [0, -10, 10, -10, 10, 0] }
                      : { x: 0 }
                  }
                  transition={
                    problem.shaking
                      ? { duration: 0.4 }
                      : {}
                  }
                  className={`
                    flex items-center justify-center gap-2 md:gap-3
                    rounded-2xl px-3 py-2 transition-colors duration-300
                    ${problem.solved ? "bg-green-100" : "bg-muted/30"}
                  `}
                >
                  {/* Left slot */}
                  {problem.left ? (
                    <DraggableFilledNumber
                      item={problem.left}
                      problemIdx={pIdx}
                      side="left"
                      solved={problem.solved}
                      onReturn={returnToPool}
                    />
                  ) : (
                    <DropSlot
                      problemIdx={pIdx}
                      side="left"
                      isOver={overSlotId === `slot-${pIdx}-left`}
                    />
                  )}

                  {/* Operator */}
                  <span
                    className={`text-3xl md:text-4xl font-black select-none min-w-[2rem] text-center ${
                      problem.solved ? "text-green-600" : "text-foreground"
                    }`}
                  >
                    {operatorDisplay(problem.operator)}
                  </span>

                  {/* Right slot */}
                  {problem.right ? (
                    <DraggableFilledNumber
                      item={problem.right}
                      problemIdx={pIdx}
                      side="right"
                      solved={problem.solved}
                      onReturn={returnToPool}
                    />
                  ) : (
                    <DropSlot
                      problemIdx={pIdx}
                      side="right"
                      isOver={overSlotId === `slot-${pIdx}-right`}
                    />
                  )}

                  {/* Solved checkmark */}
                  {problem.solved && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xl ml-1"
                    >
                      ✅
                    </motion.span>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Pool area */}
            <PoolArea>
              <p className="text-sm font-bold text-muted-foreground mb-1 text-center">
                🎲 Zahlen zum Ziehen:
              </p>
              <div className="flex flex-wrap justify-center gap-2 md:gap-3 min-h-[56px] items-center">
                {pool.length === 0 ? (
                  <span className="text-muted-foreground font-semibold">
                    Alle platziert! ✅
                  </span>
                ) : (
                  pool.map((item) => (
                    <DraggablePoolNumber key={`pool-${item.id}`} item={item} />
                  ))
                )}
              </div>
            </PoolArea>

            <DragOverlay
              dropAnimation={{ duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" }}
            >
              {activeValue !== null ? (
                <div
                  className="bg-kid-blue text-primary-foreground
                    w-12 h-12 md:w-14 md:h-14
                    rounded-2xl flex items-center justify-center
                    text-xl md:text-2xl font-black
                    shadow-2xl select-none rotate-3
                    ring-4 ring-primary/40"
                >
                  {activeValue}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Status message + Weiter button */}
          <AnimatePresence>
            {allSolved && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="text-center mt-3 text-xl font-black text-accent"
              >
                🎉 Super! Alle richtig!
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-center mt-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={newRound}
              className="bg-gradient-candy text-primary-foreground font-bold px-8 py-2.5 rounded-2xl shadow-lg text-lg"
            >
              Weiter
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
