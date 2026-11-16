import { shuffle, type Rng } from "../daily/tasks";
import { createStagedStore } from "../training/stagedStore";

// Schritte-Training: counting in steps of 2 to 10 on the Rechenstrich, forwards
// and backwards. She solved most "__ __ 47 56 65 __ __" tasks in the
// Tagesübung only after 5 to 11 minutes, and filled in the left side wrongly,
// so this round teaches what a step is before asking for one: a frog hops one
// number at a time, so the step from 47 to 56 is the number of hops, not the
// number of numbers. Crossing a ten is split in two (47 → 50 → 56), as in the
// Zahlenbuch. The support fades during the round: hopping with the frog, then
// sequences with arcs, then Blitzrechnen with no picture.

export type Stage = 1 | 2 | 3 | 4 | 5;

export const STAGES: { stage: Stage; title: string; example: string; steps: number[] }[] = [
  { stage: 1, title: "2er-, 5er- und 10er-Schritte", example: "20, 22, 24", steps: [2, 5, 10] },
  { stage: 2, title: "3er- und 4er-Schritte", example: "21, 25, 29", steps: [3, 4] },
  { stage: 3, title: "6er- und 8er-Schritte", example: "46, 54, 62", steps: [6, 8] },
  { stage: 4, title: "7er- und 9er-Schritte", example: "47, 56, 65", steps: [7, 9] },
  { stage: 5, title: "Alle Schritte gemischt", example: "82, 76, 70", steps: [3, 4, 6, 7, 8, 9] },
];

export const stepsFor = (stage: Stage) => STAGES[stage - 1].steps;

export type Section = "finden" | "huepfen" | "boegen" | "blitz";

export const SECTIONS: Record<Section, { title: string; emoji: string }> = {
  finden: { title: "Wie gross ist der Schritt?", emoji: "🔍" },
  huepfen: { title: "Mit dem Frosch hüpfen", emoji: "🐸" },
  boegen: { title: "Zahlenfolge mit Bögen", emoji: "🌈" },
  blitz: { title: "Blitzrechnen", emoji: "⚡" },
};

export type Direction = 1 | -1;

interface TaskBase {
  goal: "schritte";
  section: Section;
  /** The stage the step comes from. Named `level` so the round report prints it. */
  level: Stage;
  prompt: string;
  speech?: string;
  /** The right answers, in blank order. */
  answers: number[];
  /** The question in one line, for the Telegram report. */
  detail: string;
}

export type StepTask = TaskBase &
  (
    | { kind: "step-find"; from: number; to: number }
    | { kind: "step-hop"; start: number; step: number; dir: Direction }
    /** Seven numbers on the Rechenstrich; the middle three are given. Blanks: the step, then the two on the left, then the two on the right. */
    | { kind: "step-row"; numbers: number[]; step: number }
    /** Five numbers; two are missing on one side. */
    | { kind: "step-quick"; numbers: number[]; step: number; side: "left" | "right" }
  );

const range = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, i) => min + i);
const tensOf = (n: number) => Math.floor(n / 10);
const pick = <T,>(rng: Rng, items: T[]): T => items[Math.floor(rng() * items.length)];

/** True when going from a to b passes a ten on the way (47 → 56 passes 50; 40 → 50 does not). */
export const crossesTen = (a: number, b: number) => jumpWay(a, b).length > 1;

/**
 * How a jump is done on the Rechenstrich: up to the next ten first, then on.
 * 47 → 56 is [[47, 50], [50, 56]]; 56 → 47 is [[56, 50], [50, 47]]; 20 → 24 stays one jump.
 */
export function jumpWay(from: number, to: number): [number, number][] {
  if (from === to) return [[from, to]];
  const ten = to > from ? (tensOf(from) + 1) * 10 : Math.ceil(from / 10) * 10 - 10;
  const passes = to > from ? ten < to : ten > to;
  return passes ? [[from, ten], [ten, to]] : [[from, to]];
}

/**
 * A start for a jump of `step` in `dir` that stays within 1 to 100. Three
 * times in four the jump passes a ten, because that is where she slips.
 */
export function jumpStart(rng: Rng, step: number, dir: Direction): number {
  const starts = range(1, 100).filter((s) => s + dir * step >= 1 && s + dir * step <= 100);
  const crossing = starts.filter((s) => crossesTen(s, s + dir * step));
  return pick(rng, crossing.length > 0 && rng() < 0.75 ? crossing : starts);
}

/** `count` numbers in steps of `step`, all between 1 and 100. */
function sequence(rng: Rng, step: number, count: number): number[] {
  const first = 1 + Math.floor(rng() * (100 - (count - 1) * step));
  return range(0, count - 1).map((i) => first + i * step);
}

const base = (section: Section, level: Stage, prompt: string, answers: number[], detail: string, speech?: string): TaskBase => ({
  goal: "schritte",
  section,
  level,
  prompt,
  answers,
  detail,
  ...(speech ? { speech } : {}),
});

const sign = (dir: Direction) => (dir > 0 ? "+" : "−");

export function findTask(from: number, to: number, level: Stage): StepTask {
  return {
    ...base(
      "finden",
      level,
      `Wie gross ist der Schritt von ${from} bis ${to}?`,
      [to - from],
      `${from} + __ = ${to}`,
      `Wie gross ist der Schritt von ${from} bis ${to}? Lass den Frosch hüpfen und zähle seine Sprünge.`,
    ),
    kind: "step-find",
    from,
    to,
  };
}

export function hopTask(start: number, step: number, dir: Direction, level: Stage): StepTask {
  const way = dir > 0 ? "vorwärts" : "rückwärts";
  return {
    ...base(
      "huepfen",
      level,
      `Starte bei ${start}. Mache einen ${step}er-Schritt ${way}.`,
      [start + dir * step],
      `${start} ${sign(dir)} ${step} = __`,
      `Starte bei ${start}. Mache einen ${step}er-Schritt ${way}. Der Frosch macht ${step} Sprünge.`,
    ),
    kind: "step-hop",
    start,
    step,
    dir,
  };
}

export function rowTask(numbers: number[], level: Stage): StepTask {
  const step = numbers[1] - numbers[0];
  const shown = numbers.map((n, i) => (i >= 2 && i <= 4 ? String(n) : "__")).join(" ");
  return {
    ...base(
      "boegen",
      level,
      "Finde zuerst den Schritt. Setze dann die Zahlenfolge nach links und nach rechts fort.",
      [step, numbers[0], numbers[1], numbers[5], numbers[6]],
      `${shown} (Schritt: __)`,
    ),
    kind: "step-row",
    numbers,
    step,
  };
}

export function quickTask(numbers: number[], side: "left" | "right", level: Stage): StepTask {
  const hidden = side === "left" ? [0, 1] : [3, 4];
  const shown = numbers.map((n, i) => (hidden.includes(i) ? "__" : String(n)));
  const given = shown.filter((s) => s !== "__").join(", ");
  return {
    ...base(
      "blitz",
      level,
      side === "left" ? "Setze die Zahlenfolge nach links fort." : "Setze die Zahlenfolge nach rechts fort.",
      hidden.map((i) => numbers[i]),
      shown.join(", "),
      `${side === "left" ? "Setze die Zahlenfolge nach links fort" : "Setze die Zahlenfolge nach rechts fort"}: ${given}.`,
    ),
    kind: "step-quick",
    numbers,
    step: numbers[1] - numbers[0],
    side,
  };
}

/** The jump the hint should explain, given what she typed. `ask` says which end is the answer. */
export function hintJump(task: StepTask, given: number[]): { from: number; to: number; ask: "step" | "result"; step: number } {
  switch (task.kind) {
    case "step-find":
      return { from: task.from, to: task.to, ask: "step", step: task.to - task.from };
    case "step-hop":
      return { from: task.start, to: task.start + task.dir * task.step, ask: "result", step: task.step };
    case "step-row": {
      const n = task.numbers;
      if (given[0] !== task.step) return { from: n[2], to: n[3], ask: "step", step: task.step };
      // Blanks 1–4 hold n[0], n[1], n[5], n[6]. Explain the one next to the given numbers first.
      const checks: [number, number, number][] = [
        [2, 2, 1],
        [3, 4, 5],
        [1, 1, 0],
        [4, 5, 6],
      ];
      const wrong = checks.find(([blank, , target]) => given[blank] !== n[target]) ?? checks[0];
      return { from: n[wrong[1]], to: n[wrong[2]], ask: "result", step: task.step };
    }
    case "step-quick": {
      const n = task.numbers;
      const pairs: [number, number][] = task.side === "right" ? [[2, 3], [3, 4]] : [[2, 1], [1, 0]];
      const blankOf = (target: number) => (task.side === "right" ? target - 3 : target);
      const wrong = pairs.find(([, target]) => given[blankOf(target)] !== n[target]) ?? pairs[0];
      return { from: n[wrong[0]], to: n[wrong[1]], ask: "result", step: task.step };
    }
  }
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
 * One round, from seeing to doing: find the step with the frog, hop a step
 * forwards and backwards, continue sequences with arcs, then Blitzrechnen.
 * Half the sequences go to the left, the side she gets wrong. The last task
 * uses a step from an easier stage, so the round ends on a success.
 */
export function buildRound(stage: Stage, rng: Rng = Math.random): StepTask[] {
  const step = drawer(rng, stepsFor(stage));
  const easierStage = (stage > 1 ? stage - 1 : 1) as Stage;
  const easyStep = pick(rng, stepsFor(stage === 5 ? 2 : easierStage));
  const find = () => {
    const s = step();
    const from = jumpStart(rng, s, 1);
    return findTask(from, from + s, stage);
  };
  const hop = (dir: Direction) => {
    const s = step();
    return hopTask(jumpStart(rng, s, dir), s, dir, stage);
  };
  return [
    find(),
    find(),
    hop(1),
    hop(-1),
    rowTask(sequence(rng, step(), 7), stage),
    rowTask(sequence(rng, step(), 7), stage),
    quickTask(sequence(rng, step(), 5), "right", stage),
    quickTask(sequence(rng, step(), 5), "left", stage),
    quickTask(sequence(rng, step(), 5), "left", stage),
    quickTask(sequence(rng, easyStep, 5), "right", stage === 5 ? 2 : easierStage),
  ];
}

export const stepsStoreApi = createStagedStore<StepTask, Stage>({ storageKey: "mathe-schritte-v1", maxStage: 5, buildRound });
