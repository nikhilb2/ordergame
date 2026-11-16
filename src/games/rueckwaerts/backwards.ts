import { shuffle, type Rng } from "../daily/tasks";
import { createStagedStore } from "../training/stagedStore";

// Rückwärts-Training: saying the number sequence backwards, the base of
// subtraction and of every "nach links" task. Her parent saw her struggle with
// it, and the log shows where: going the wrong way on the left side of a
// sequence (46, 50, 54 → 57), copying the given numbers into the left blanks,
// 36 − 8 → 30, and the ten below 75 → 60. The rows cross a ten on purpose
// (51, 50, 49), since that is where counting back breaks. A frog says each
// number while she hops; later rows have no help.

export type Stage = 1 | 2 | 3 | 4 | 5;
export type Unit = 1 | 2 | 5 | 10;

export const STAGES: { stage: Stage; title: string; example: string; units: Unit[]; max: number }[] = [
  { stage: 1, title: "Countdown bis 20", example: "12, 11, 10, 9", units: [1], max: 20 },
  { stage: 2, title: "Über den Zehner rückwärts", example: "52, 51, 50, 49", units: [1], max: 100 },
  { stage: 3, title: "In Zehnerschritten rückwärts", example: "84, 74, 64", units: [10], max: 100 },
  { stage: 4, title: "In 2er- und 5er-Schritten rückwärts", example: "53, 51, 49", units: [2, 5], max: 100 },
  { stage: 5, title: "Alles gemischt", example: "100, 99, 98", units: [1, 10, 2, 5], max: 100 },
];

export type Section = "frosch" | "countdown" | "davor" | "blitz";

export const SECTIONS: Record<Section, { title: string; emoji: string }> = {
  frosch: { title: "Mit dem Frosch rückwärts", emoji: "🐸" },
  countdown: { title: "Countdown", emoji: "🚀" },
  davor: { title: "Was kommt davor?", emoji: "⬅️" },
  blitz: { title: "Blitz-Countdown", emoji: "⚡" },
};

interface TaskBase {
  goal: "rueckwaerts";
  section: Section;
  /** The stage. Named `level` so the round report prints it. */
  level: Stage;
  prompt: string;
  speech?: string;
  /** The right answers, in blank order. */
  answers: number[];
  /** The question in one line, for the Telegram report. */
  detail: string;
}

export type BackTask = TaskBase &
  (
    /** A row counting down by `unit`; the numbers at `blanks` are hers to fill in, in order. */
    | { kind: "back-row"; numbers: number[]; unit: Unit; blanks: number[] }
    /** The number `unit` below n. */
    | { kind: "back-before"; n: number; unit: Unit }
  );

const range = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, i) => min + i);
const tensOf = (n: number) => Math.floor(n / 10);
const pick = <T,>(rng: Rng, items: T[]): T => items[Math.floor(rng() * items.length)];

/** Counting down from a to b changes the ten (50 → 49, 53 → 48), the place where she slips. */
export const changesTen = (a: number, b: number) => tensOf(a) !== tensOf(b);

/** `length` numbers counting down from `start` in steps of `unit`. */
export const countdown = (start: number, unit: Unit, length: number) => range(0, length - 1).map((i) => start - i * unit);

/**
 * Where a countdown of `length` numbers starts, so that it stays between 0
 * and `max`. Mostly it changes the ten on the way; in steps of 10 that always
 * happens, so there it mostly starts off a Zehnerzahl (84, 74) instead.
 */
export function countdownStart(rng: Rng, unit: Unit, length: number, max: number, avoid: Set<number> = new Set()): number {
  const all = range(unit * (length - 1), max);
  const unused = all.filter((s) => !avoid.has(s));
  const starts = unused.length > 0 ? unused : all;
  const preferred =
    unit === 10
      ? starts.filter((s) => s % 10 !== 0)
      : starts.filter((s) => countdown(s, unit, length).some((n, i, row) => i > 0 && changesTen(row[i - 1], n)));
  return pick(rng, preferred.length > 0 && rng() < 0.8 ? preferred : starts);
}

const base = (section: Section, level: Stage, prompt: string, answers: number[], detail: string, speech?: string): TaskBase => ({
  goal: "rueckwaerts",
  section,
  level,
  prompt,
  answers,
  detail,
  ...(speech ? { speech } : {}),
});

const stepName = (unit: Unit) => (unit === 1 ? "" : ` in ${unit}er-Schritten`);

export function rowTask(section: Exclude<Section, "davor">, numbers: number[], unit: Unit, blanks: number[], level: Stage): BackTask {
  const sorted = [...blanks].sort((a, b) => a - b);
  const prompt = {
    frosch: `Zähle rückwärts${stepName(unit)} von ${numbers[0]}. Lass den Frosch hüpfen und hör gut zu.`,
    countdown: `Countdown${stepName(unit)}! Welche Zahlen fehlen?`,
    blitz: `Zähle rückwärts${stepName(unit)} von ${numbers[0]}.`,
  }[section];
  const shown = numbers.map((n, i) => (sorted.includes(i) ? "__" : String(n)));
  const given = numbers.filter((_, i) => !sorted.includes(i)).join(", ");
  return {
    ...base(section, level, prompt, sorted.map((i) => numbers[i]), shown.join(", "), section === "frosch" ? undefined : `${prompt} ${given}.`),
    kind: "back-row",
    numbers,
    unit,
    blanks: sorted,
  };
}

export function beforeTask(n: number, unit: Unit, level: Stage): BackTask {
  return unit === 1
    ? { ...base("davor", level, `Welche Zahl kommt direkt vor ${n}?`, [n - 1], `Vor ${n} kommt __`), kind: "back-before", n, unit }
    : { ...base("davor", level, `Was ist ${unit} weniger als ${n}?`, [n - unit], `${n} − ${unit} = __`), kind: "back-before", n, unit };
}

/**
 * A number to ask "what comes before" about. In steps of 1 it is mostly a
 * Zehnerzahl or 100 (vor 70 kommt 69); in steps of 2 or 5 the answer is in the
 * ten below (52 − 5 = 47); in steps of 10 any number from 10 up.
 */
export function beforeNumber(rng: Rng, unit: Unit, max: number, avoid: Set<number> = new Set()): number {
  const unused = range(unit, max).filter((n) => !avoid.has(n));
  const all = unused.length > 0 ? unused : range(unit, max);
  const preferred = unit === 10 ? all.filter((n) => n % 10 !== 0) : all.filter((n) => changesTen(n, n - unit));
  return pick(rng, preferred.length > 0 && rng() < 0.75 ? preferred : all);
}

/** Countdown blanks: the number right after the ten changes, plus two others; never the first number. */
export function countdownBlanks(rng: Rng, numbers: number[]): number[] {
  const turn = numbers.findIndex((n, i) => i > 0 && changesTen(numbers[i - 1], n));
  const first = turn > 0 ? [turn] : [];
  const rest = shuffle(rng, range(1, numbers.length - 1).filter((i) => !first.includes(i)));
  return [...first, ...rest].slice(0, 3);
}

/** The number before the first wrong blank, and the number she should have said after it. */
export function hintStep(task: BackTask, given: number[]): { from: number; to: number; unit: Unit; row: number[] } {
  if (task.kind === "back-before") return { from: task.n, to: task.n - task.unit, unit: task.unit, row: [task.n] };
  const wrong = task.blanks.find((_, k) => given[k] !== task.answers[k]) ?? task.blanks[0];
  return { from: task.numbers[wrong - 1], to: task.numbers[wrong], unit: task.unit, row: task.numbers.slice(0, wrong) };
}

/** Draws from a list without repeating until it runs out. */
function drawer<T>(rng: Rng, items: T[]) {
  let bag: T[] = [];
  return () => {
    if (bag.length === 0) bag = shuffle(rng, items);
    return bag.pop()!;
  };
}

export const ROUND_SIZE = 10;

/**
 * One round, from hearing to doing: two rows with the talking frog, three
 * countdowns with gaps, three "what comes before" questions, and two
 * countdowns with only the start given. The last uses an easier stage, so the
 * round ends on a success.
 */
export function buildRound(stage: Stage, rng: Rng = Math.random): BackTask[] {
  const { units, max } = STAGES[stage - 1];
  const unit = drawer(rng, units);
  // No task twice in a round: starts and "davor" numbers already used are left out.
  const usedStarts = new Set<number>();
  const usedBefore = new Set<number>();
  const fresh = (used: Set<number>, n: number) => (used.add(n), n);
  const row = (section: Exclude<Section, "davor">, u: Unit, length: number, top: number, level: Stage) => {
    const numbers = countdown(fresh(usedStarts, countdownStart(rng, u, length, top, usedStarts)), u, length);
    const blanks = section === "countdown" ? countdownBlanks(rng, numbers) : range(1, length - 1);
    return rowTask(section, numbers, u, blanks, level);
  };
  const before = () => {
    const u = unit();
    return beforeTask(fresh(usedBefore, beforeNumber(rng, u, max, usedBefore)), u, stage);
  };
  const easier = STAGES[(stage === 1 ? 1 : stage === 5 ? 2 : stage - 1) - 1];
  return [
    row("frosch", unit(), 5, max, stage),
    row("frosch", unit(), 5, max, stage),
    row("countdown", unit(), 6, max, stage),
    row("countdown", unit(), 6, max, stage),
    row("countdown", unit(), 6, max, stage),
    before(),
    before(),
    before(),
    row("blitz", unit(), 5, max, stage),
    row("blitz", pick(rng, easier.units), 5, easier.max, easier.stage),
  ];
}

export const backwardsStoreApi = createStagedStore<BackTask, Stage>({ storageKey: "mathe-rueckwaerts-v1", maxStage: 5, buildRound });
