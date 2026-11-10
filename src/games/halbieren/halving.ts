import { shuffle, type Rng } from "../daily/tasks";

// Halbieren-Training: a focused practice round, separate from the Tagesübung.
// The order of the stages follows the Schweizer Zahlenbuch 2 and Lehrplan 21
// (MA.1.A.3.b "halbieren (10er Zahlen)"), then goes on to every even number up
// to 100, as in the 2nd-class Lernkontrollen ("Zahl | die Hälfte").
// Every answer is typed, so she cannot guess it from a list.

export type Stage = 1 | 2 | 3 | 4 | 5;

const range = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, i) => min + i);
const tensDigit = (n: number) => Math.floor(n / 10);
const onesDigit = (n: number) => n % 10;
const isEven = (n: number) => n % 2 === 0;

export const STAGES: { stage: Stage; title: string; example: string; pool: number[] }[] = [
  { stage: 1, title: "Zahlen bis 20", example: "14 → 7", pool: range(2, 18).filter(isEven) },
  { stage: 2, title: "Gerade Zehnerzahlen", example: "60 → 30", pool: [20, 40, 60, 80, 100] },
  {
    stage: 3,
    title: "Gerade Zehner und Einer",
    example: "48 → 24",
    pool: range(22, 88).filter((n) => isEven(tensDigit(n)) && isEven(onesDigit(n)) && onesDigit(n) !== 0),
  },
  // 10 → 5 is already learnt with the small numbers.
  { stage: 4, title: "Ungerade Zehnerzahlen", example: "50 → 25", pool: [30, 50, 70, 90] },
  {
    stage: 5,
    title: "Alle geraden Zahlen bis 100",
    example: "76 → 38",
    pool: range(32, 98).filter((n) => !isEven(tensDigit(n)) && isEven(onesDigit(n)) && onesDigit(n) !== 0),
  },
];

export const poolFor = (stage: Stage) => STAGES[stage - 1].pool;

/**
 * How a number is split to halve it, the way it is taught in school:
 * 76 = 70 + 6, 50 = 40 + 10, 14 = 10 + 4. Numbers whose half is known
 * by heart (up to 10, and even Zehnerzahlen) are not split.
 */
export function splitForHalving(n: number): number[] {
  if (n <= 10) return [n];
  const tens = tensDigit(n) * 10;
  const ones = onesDigit(n);
  if (ones === 0) return isEven(tensDigit(n)) ? [n] : [n - 10, 10];
  return [tens, ones];
}

export type Section = "rechenweg" | "tabelle" | "umkehr" | "sachaufgabe" | "blitz";

export const SECTIONS: Record<Section, { title: string; emoji: string }> = {
  rechenweg: { title: "Mit Rechenweg", emoji: "✂️" },
  tabelle: { title: "Halbiere", emoji: "📋" },
  umkehr: { title: "Halbieren und Verdoppeln", emoji: "🔄" },
  sachaufgabe: { title: "Sachaufgabe", emoji: "🧺" },
  blitz: { title: "Blitzrechnen", emoji: "⚡" },
};

export type Story = "geld" | "band" | "kekse";

interface TaskBase {
  goal: "halbieren";
  section: Section;
  /** The stage the numbers come from. Named `level` so the round report prints it. */
  level: Stage;
  prompt: string;
  speech?: string;
  /** The right answers, in blank order. */
  answers: number[];
  /** The question in one line, for the Telegram report. */
  detail: string;
}

export type HalfTask = TaskBase &
  (
    | { kind: "half-split"; n: number; parts: number[] }
    | { kind: "half-table"; numbers: number[] }
    | { kind: "half-chain"; n: number }
    | { kind: "half-reverse"; half: number }
    | { kind: "half-story"; n: number; story: Story; unit: string }
    | { kind: "half-quick"; n: number }
  );

const base = (section: Section, level: Stage, prompt: string, answers: number[], detail: string, speech?: string): TaskBase => ({
  goal: "halbieren",
  section,
  level,
  prompt,
  answers,
  detail,
  ...(speech ? { speech } : {}),
});

export function splitTask(n: number, level: Stage): HalfTask {
  const parts = splitForHalving(n);
  const answers = parts.length > 1 ? [...parts.map((p) => p / 2), n / 2] : [n / 2];
  const detail = parts.length > 1 ? `${n} = ${parts.join(" + ")} → __ + __ = __` : `Hälfte von ${n} = __`;
  const prompt = parts.length > 1 ? `Halbiere ${n}. Zerlege die Zahl und halbiere jeden Teil.` : `Halbiere ${n}. Teile gerecht in zwei Hälften.`;
  return { ...base("rechenweg", level, prompt, answers, detail), kind: "half-split", n, parts };
}

export function tableTask(numbers: number[], level: Stage): HalfTask {
  return {
    ...base("tabelle", level, "Halbiere. Schreibe die Hälfte in die Tabelle.", numbers.map((n) => n / 2), numbers.map((n) => `${n} → __`).join(", ")),
    kind: "half-table",
    numbers,
  };
}

export function chainTask(n: number, level: Stage): HalfTask {
  return {
    ...base("umkehr", level, `Halbiere ${n}. Verdopple dann das Ergebnis.`, [n / 2, n], `${n} → halbieren → __ → verdoppeln → __`),
    kind: "half-chain",
    n,
  };
}

export function reverseTask(half: number, level: Stage): HalfTask {
  return {
    ...base("umkehr", level, `Von welcher Zahl ist ${half} die Hälfte?`, [half * 2], `Die Hälfte von __ ist ${half}`),
    kind: "half-reverse",
    half,
  };
}

const NAMES: [string, string][] = [
  ["Lea", "Noah"],
  ["Mia", "Luca"],
  ["Emma", "Elias"],
  ["Lina", "Leon"],
  ["Sofia", "Nico"],
];

export function storyTask(rng: Rng, n: number, level: Stage): HalfTask {
  const stories: Story[] = n <= 20 ? ["geld", "band", "kekse"] : ["geld", "band"];
  const story = stories[Math.floor(rng() * stories.length)];
  const [a, b] = NAMES[Math.floor(rng() * NAMES.length)];
  const text: Record<Story, { prompt: string; unit: string }> = {
    geld: { prompt: `${a} und ${b} teilen ${n} Franken gerecht. Wie viel bekommt jedes Kind?`, unit: "Fr." },
    band: { prompt: `Ein Band ist ${n} cm lang. ${a} schneidet es genau in der Mitte durch. Wie lang ist ein Stück?`, unit: "cm" },
    kekse: { prompt: `${a} legt ${n} Kekse gerecht auf zwei Teller. Wie viele Kekse liegen auf einem Teller?`, unit: "Kekse" },
  };
  return {
    ...base("sachaufgabe", level, text[story].prompt, [n / 2], `${text[story].prompt} __ ${text[story].unit}`),
    kind: "half-story",
    n,
    story,
    unit: text[story].unit,
  };
}

export function quickTask(n: number, level: Stage): HalfTask {
  return { ...base("blitz", level, `Was ist die Hälfte von ${n}?`, [n / 2], `Die Hälfte von ${n} ist __`), kind: "half-quick", n };
}

/** The number whose halving the hint should explain, given what she typed. */
export function hintNumber(task: HalfTask, given: number[]): number {
  switch (task.kind) {
    case "half-table": {
      const wrong = task.numbers.findIndex((n, i) => given[i] !== n / 2);
      return task.numbers[Math.max(wrong, 0)];
    }
    case "half-reverse":
      return task.half * 2;
    default:
      return task.n;
  }
}

/** Draws numbers from a pool without repeating until the pool runs out. */
function drawer(rng: Rng, pool: number[]) {
  let bag: number[] = [];
  return () => {
    if (bag.length === 0) bag = shuffle(rng, pool);
    return bag.pop()!;
  };
}

export const ROUND_SIZE = 10;

/**
 * One round in the order of a Lernkontrolle: understand it (Rechenweg), the
 * table, the link to doubling, a Sachaufgabe, and Blitzrechnen without a
 * Rechenweg. About a third of the numbers come from easier stages, and the
 * last task is an easy one, so the round ends on a success.
 */
export function buildRound(stage: Stage, rng: Rng = Math.random): HalfTask[] {
  const current = drawer(rng, poolFor(stage));
  const easierPool = STAGES.filter((s) => s.stage < stage).flatMap((s) => s.pool);
  const easier = easierPool.length ? drawer(rng, easierPool) : current;
  const easierStage = (n: number): Stage => STAGES.find((s) => s.pool.includes(n))?.stage ?? stage;

  const tableNumbers = shuffle(rng, [current(), current(), current(), easier()]);
  const lastEasy = easier();
  return [
    splitTask(current(), stage),
    splitTask(current(), stage),
    tableTask(tableNumbers, stage),
    chainTask(current(), stage),
    reverseTask(current() / 2, stage),
    storyTask(rng, current(), stage),
    quickTask(current(), stage),
    quickTask(easier(), stage),
    quickTask(current(), stage),
    quickTask(lastEasy, easierStage(lastEasy)),
  ];
}

// --- Progress, kept on the phone ---

const STORAGE_KEY = "mathe-halbieren-v1";

export interface HalvingRound {
  date: string;
  stage: Stage;
  tasks: HalfTask[];
  index: number;
  score: number;
}

export interface HalvingStore {
  stage: Stage;
  /** The highest stage she has passed, 0 for none. */
  passed: number;
  rounds: { date: string; stage: Stage; score: number; total: number }[];
  round: HalvingRound | null;
}

const emptyStore = (): HalvingStore => ({ stage: 1, passed: 0, rounds: [], round: null });

export function loadHalvingStore(): HalvingStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...emptyStore(), ...JSON.parse(raw) } : emptyStore();
  } catch {
    return emptyStore();
  }
}

export function saveHalvingStore(store: HalvingStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Private mode or blocked storage: the round still works until the page closes.
  }
}

/** 8 of 10 on the first try passes a stage; 4 or fewer goes back one. */
export function stageAfterRound(stage: Stage, score: number, total: number): { stage: Stage; passed: boolean } {
  const passed = score >= Math.ceil(total * 0.8);
  if (passed) return { stage: Math.min(stage + 1, 5) as Stage, passed };
  if (score <= Math.floor(total * 0.4)) return { stage: Math.max(stage - 1, 1) as Stage, passed };
  return { stage, passed };
}

export function startRound(store: HalvingStore, date: string, rng: Rng = Math.random): HalvingStore {
  const { round } = store;
  if (round && round.index < round.tasks.length) return store;
  return { ...store, round: { date, stage: store.stage, tasks: buildRound(store.stage, rng), index: 0, score: 0 } };
}

export function recordHalvingResult(store: HalvingStore, firstTry: boolean): HalvingStore {
  const round = store.round;
  if (!round) return store;
  const next = { ...round, index: round.index + 1, score: round.score + (firstTry ? 1 : 0) };
  if (next.index < next.tasks.length) return { ...store, round: next };

  const result = stageAfterRound(round.stage, next.score, next.tasks.length);
  return {
    stage: result.stage,
    passed: result.passed ? Math.max(store.passed, round.stage) : store.passed,
    rounds: [...store.rounds, { date: round.date, stage: round.stage, score: next.score, total: next.tasks.length }].slice(-100),
    round: next,
  };
}
