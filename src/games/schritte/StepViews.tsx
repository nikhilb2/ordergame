import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { speak } from "@/lib/speech";
import { CheckButton, useBlanks, type Report } from "../daily/TaskViews";
import { hintJump, jumpWay, type Direction, type StepTask } from "./steps";

// --- The Rechenstrich with the frog ---

const GAP = 44;
const PAD = 28;
const LINE_Y = 46;
/** Lines are drawn at least this many numbers wide, so a short jump is not shown huge. */
const MIN_SPAN = 7;

/**
 * A Rechenstrich from lo to hi with one tick every `unit` numbers (every
 * number by default). `path` is where the frog has been, one hop per tick;
 * hops after `split` (the ten on the way) get a second colour, so 47 → 56
 * shows as 3 hops and 6 hops.
 */
export function HopLine({
  lo, hi, path, label, frog, split, unit = 1,
}: {
  lo: number;
  hi: number;
  path: number[];
  label: (n: number) => boolean;
  frog?: number;
  split?: number;
  unit?: number;
}) {
  const ticks = (hi - lo) / unit;
  const width = PAD * 2 + Math.max(ticks, MIN_SPAN) * GAP;
  const offset = (Math.max(ticks, MIN_SPAN) - ticks) * (GAP / 2);
  const x = (n: number) => PAD + offset + ((n - lo) / unit) * GAP;
  const numbers = Array.from({ length: ticks + 1 }, (_, i) => lo + i * unit);
  const dir = path.length > 1 ? Math.sign(path[1] - path[0]) : 1;
  const afterSplit = (n: number) => split !== undefined && (dir > 0 ? n >= split : n <= split);

  return (
    <svg viewBox={`0 0 ${width} ${LINE_Y + 40}`} className="w-full max-w-xl mx-auto block" role="img" aria-label={`Rechenstrich von ${lo} bis ${hi}`}>
      <line x1={x(lo) - 14} x2={x(hi) + 14} y1={LINE_Y} y2={LINE_Y} className="stroke-foreground" strokeWidth={3} strokeLinecap="round" />
      {numbers.map((n) => {
        const ten = n % 10 === 0;
        return <line key={n} x1={x(n)} x2={x(n)} y1={LINE_Y - (ten ? 12 : 7)} y2={LINE_Y + (ten ? 12 : 7)} className="stroke-foreground" strokeWidth={ten ? 4 : 2} />;
      })}
      {path.slice(1).map((to, i) => {
        const from = path[i];
        const mid = (x(from) + x(to)) / 2;
        return (
          <motion.path
            key={`${from}-${to}`}
            d={`M ${x(from)} ${LINE_Y - 4} Q ${mid} ${LINE_Y - 44} ${x(to)} ${LINE_Y - 4}`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.25 }}
            fill="none"
            strokeWidth={4}
            strokeLinecap="round"
            className={afterSplit(from) ? "stroke-kid-orange" : "stroke-kid-blue"}
          />
        );
      })}
      {numbers.map((n) =>
        label(n) || n === frog ? (
          <text
            key={n}
            x={x(n)}
            y={LINE_Y + 34}
            textAnchor="middle"
            fontSize={n === frog ? 26 : 22}
            fontWeight={n % 10 === 0 || n === frog ? 900 : 700}
            className={n === frog ? "fill-kid-purple" : "fill-foreground"}
          >
            {n}
          </text>
        ) : null,
      )}
      {frog !== undefined && (
        <motion.g initial={false} animate={{ x: x(frog) }} transition={{ type: "spring", stiffness: 300, damping: 18 }}>
          <text y={LINE_Y - 6} textAnchor="middle" fontSize={30} aria-hidden>
            🐸
          </text>
        </motion.g>
      )}
    </svg>
  );
}

/** The frog she moves herself, one tick per tap. It says each number it lands on. */
export function FrogLine({
  start, dir, lo, hi, stopAt, label, unit = 1,
}: {
  start: number;
  dir: Direction;
  lo: number;
  hi: number;
  stopAt?: number;
  label: (n: number) => boolean;
  /** How far one hop goes; lo and hi must be start plus or minus whole hops. */
  unit?: number;
}) {
  const [path, setPath] = useState([start]);
  const at = path[path.length - 1];
  const next = at + dir * unit;
  const canHop = at !== stopAt && next >= lo && next <= hi;
  // Hops of one after the first ten on the way get the second colour.
  const split = unit !== 1 ? undefined : dir > 0 ? (Math.floor(start / 10) + 1) * 10 : Math.ceil(start / 10) * 10 - 10;

  return (
    <div className="space-y-3">
      <HopLine lo={lo} hi={hi} path={path} label={label} frog={at} split={split} unit={unit} />
      <div className="flex justify-center gap-3">
        <motion.button
          whileTap={{ scale: canHop ? 0.9 : 1 }}
          disabled={!canHop}
          onClick={() => {
            setPath([...path, next]);
            speak(String(next));
          }}
          className="bg-kid-green text-primary-foreground font-black px-6 py-3 rounded-2xl shadow-md text-lg disabled:opacity-40"
        >
          🐸 Hüpf {dir > 0 ? "→" : "←"}
        </motion.button>
        <button
          disabled={path.length === 1}
          onClick={() => setPath([start])}
          className="bg-muted text-foreground font-bold px-4 py-3 rounded-2xl text-base disabled:opacity-40"
        >
          ↺ Von vorne
        </button>
      </div>
    </div>
  );
}

// --- Pieces of the task views ---

export const NumberChip = ({ n }: { n: number | string }) => (
  <span className="min-w-14 h-14 md:min-w-16 md:h-16 px-2 bg-kid-blue text-primary-foreground rounded-xl inline-flex items-center justify-center text-2xl md:text-3xl font-black">
    {n}
  </span>
);
export const Word = ({ children }: { children: ReactNode }) => <span className="text-2xl md:text-3xl font-black text-foreground">{children}</span>;
export const Sentence = ({ children }: { children: ReactNode }) => <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">{children}</div>;

const BIG = "w-20 h-16 md:w-24 md:h-16 text-3xl";
const SLOT = "w-full h-12 md:h-14 text-lg md:text-2xl";
const isTen = (n: number) => n % 10 === 0;
const hops = (n: number | string) => `${n} ${n === 1 ? "Sprung" : "Sprünge"}`;

function FindView({ task, report }: { task: Extract<StepTask, { kind: "step-find" }>; report: Report }) {
  const { blank, check, closed, container, complete } = useBlanks(task.answers, report);
  return (
    <div ref={container} className="space-y-5">
      <p className="text-center font-bold text-muted-foreground">Tippe auf «Hüpf» und zähle die Sprünge.</p>
      <FrogLine start={task.from} dir={1} lo={task.from} hi={task.to} stopAt={task.to} label={(n) => n === task.from || n === task.to || isTen(n)} />
      <Sentence>
        <NumberChip n={task.from} /> <Word>+</Word> {blank(0, BIG)} <Word>=</Word> <NumberChip n={task.to} />
      </Sentence>
      {!closed && <CheckButton onClick={check} disabled={!complete} />}
    </div>
  );
}

function HopView({ task, report }: { task: Extract<StepTask, { kind: "step-hop" }>; report: Report }) {
  const { blank, check, closed, container, complete } = useBlanks(task.answers, report);
  const reach = task.step + 2;
  const lo = task.dir > 0 ? task.start : Math.max(0, task.start - reach);
  const hi = task.dir > 0 ? Math.min(100, task.start + reach) : task.start;
  return (
    <div ref={container} className="space-y-5">
      <p className="text-center font-bold text-muted-foreground">
        Der Frosch macht {task.step} Sprünge {task.dir > 0 ? "nach rechts" : "nach links"}. Zähle mit!
      </p>
      <FrogLine start={task.start} dir={task.dir} lo={lo} hi={hi} label={(n) => n === task.start || isTen(n)} />
      <Sentence>
        <NumberChip n={task.start} /> <Word>{task.dir > 0 ? "+" : "−"}</Word> <NumberChip n={task.step} /> <Word>=</Word> {blank(0, BIG)}
      </Sentence>
      {!closed && <CheckButton onClick={check} disabled={!complete} />}
    </div>
  );
}

/** Numbers on a line, one slot each; `blankAt` maps a slot to its blank index. */
export function Slots({ numbers, blankAt, blank }: { numbers: number[]; blankAt: (i: number) => number | null; blank: (index: number, className: string) => ReactNode }) {
  return (
    <div className="relative pb-5">
      <div className="absolute left-0 right-0 bottom-2 h-1 bg-foreground rounded-full" />
      <div className="flex gap-1 md:gap-2">
        {numbers.map((n, i) => {
          const b = blankAt(i);
          return (
            <div key={i} className="flex-1 min-w-0 flex flex-col items-center">
              {b === null ? (
                <div className="w-full h-12 md:h-14 bg-kid-blue text-primary-foreground rounded-xl flex items-center justify-center text-lg md:text-2xl font-black">{n}</div>
              ) : (
                blank(b, SLOT)
              )}
              <div className="w-1 h-3 bg-foreground mt-1" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Arcs between neighbouring slots, drawn above them. */
function Arcs({ count }: { count: number }) {
  const w = 100;
  return (
    <svg viewBox={`0 0 ${count * w} 40`} preserveAspectRatio="none" className="w-full h-8 md:h-10 block" aria-hidden>
      {Array.from({ length: count - 1 }, (_, i) => {
        const a = i * w + w / 2;
        const b = a + w;
        return (
          <path
            key={i}
            d={`M ${a + 8} 38 Q ${(a + b) / 2} 0 ${b - 8} 38`}
            fill="none"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
            className={i === 2 ? "stroke-kid-purple" : "stroke-kid-blue/50"}
          />
        );
      })}
    </svg>
  );
}

function RowView({ task, report }: { task: Extract<StepTask, { kind: "step-row" }>; report: Report }) {
  const { blank, check, closed, container, complete } = useBlanks(task.answers, report);
  const slotBlank: Record<number, number> = { 0: 1, 1: 2, 5: 3, 6: 4 };
  const n = task.numbers;
  return (
    <div ref={container} className="space-y-3">
      <Sentence>
        <Word>Von {n[2]} bis {n[3]}: +</Word> {blank(0, "w-16 h-14 text-2xl md:text-3xl")}
      </Sentence>
      <div>
        <Arcs count={7} />
        <Slots numbers={n} blankAt={(i) => slotBlank[i] ?? null} blank={blank} />
        <div className="flex justify-between text-sm md:text-base font-bold text-muted-foreground">
          <span>◀ minus Schritt</span>
          <span>plus Schritt ▶</span>
        </div>
      </div>
      {!closed && <CheckButton onClick={check} disabled={!complete} />}
    </div>
  );
}

function QuickView({ task, report }: { task: Extract<StepTask, { kind: "step-quick" }>; report: Report }) {
  const { blank, check, closed, container, complete } = useBlanks(task.answers, report);
  const blankAt = (i: number) => (task.side === "left" ? (i < 2 ? i : null) : i >= 3 ? i - 3 : null);
  return (
    <div ref={container} className="space-y-3">
      <Slots numbers={task.numbers} blankAt={blankAt} blank={blank} />
      {!closed && <CheckButton onClick={check} disabled={!complete} />}
    </div>
  );
}

export function StepTaskBody({ task, report }: { task: StepTask; report: Report }): ReactNode {
  switch (task.kind) {
    case "step-find": return <FindView task={task} report={report} />;
    case "step-hop": return <HopView task={task} report={report} />;
    case "step-row": return <RowView task={task} report={report} />;
    case "step-quick": return <QuickView task={task} report={report} />;
  }
}

// --- How it goes, shown after a wrong answer ---

export const Line = ({ children }: { children: ReactNode }) => <p className="text-lg md:text-xl font-bold text-foreground">{children}</p>;

export function StepHint({ task, given, reveal }: { task: StepTask; given: number[]; reveal: boolean }) {
  return <JumpHint {...hintJump(task, given)} showStep={task.kind !== "step-hop"} reveal={reveal} />;
}

/** A jump drawn hop by hop, split at the ten, with the sums. Before the last try the answer stays open. */
export function JumpHint({
  from, to, ask, step, showStep, reveal,
}: {
  from: number;
  to: number;
  /** "step": the size of the jump is the answer; "result": where it lands is. */
  ask: "step" | "result";
  step: number;
  showStep: boolean;
  reveal: boolean;
}) {
  const dir = to > from ? 1 : -1;
  const way = jumpWay(from, to);
  const path = Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => from + dir * i);
  const op = dir > 0 ? "+" : "−";
  const size = (a: number, b: number) => Math.abs(b - a);
  // A short jump gets a few numbers around it, so the picture is not tiny.
  const margin = Math.abs(to - from) < 5 ? 2 : 0;
  const open = (value: number) => (reveal ? value : "?");
  // The start and the tens are always labelled; the end only when it is not the answer, or once it is shown.
  const label = (n: number) => n === from || (n === to ? ask === "step" || reveal : isTen(n));

  return (
    <div className="bg-kid-yellow/15 rounded-2xl p-4 mt-5 space-y-2 text-center">
      <p className="font-black text-foreground">💡 So geht es:</p>
      <HopLine
        lo={Math.max(0, Math.min(from, to) - margin)}
        hi={Math.min(100, Math.max(from, to) + margin)}
        path={path}
        label={label}
        split={way.length > 1 ? way[0][1] : undefined}
      />
      {ask === "step" ? (
        <>
          <Line>Zähle die Sprünge, nicht die Zahlen.</Line>
          {way.length > 1 ? (
            <>
              <Line>
                Von {way[0][0]} bis {way[0][1]}: {hops(size(...way[0]))}. Von {way[1][0]} bis {way[1][1]}: {hops(size(...way[1]))}.
              </Line>
              <Line>
                {size(...way[0])} + {size(...way[1])} = {open(step)}
              </Line>
            </>
          ) : (
            <Line>
              Von {from} bis {to} sind es {reveal ? hops(step) : "? Sprünge"}.
            </Line>
          )}
        </>
      ) : (
        <>
          {showStep && <Line>Der Schritt ist {step}.</Line>}
          {way.length > 1 ? (
            <>
              <Line>Zuerst bis zum Zehner, dann weiter.</Line>
              <Line>
                {from} {op} {size(...way[0])} = {way[0][1]}
              </Line>
              <Line>
                {way[1][0]} {op} {size(...way[1])} = {open(to)}
              </Line>
            </>
          ) : (
            <Line>
              {from} {op} {step} = {open(to)}
            </Line>
          )}
        </>
      )}
    </div>
  );
}
