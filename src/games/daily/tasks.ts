export type Rng = () => number;
export type Level = 1 | 2 | 3;

export type GoalId =
  | "zahlenband"
  | "rechenstrich-eintragen"
  | "rechenstrich-folgen"
  | "zahlenfreunde"
  | "begriffe"
  | "verdoppeln"
  | "raetsel"
  | "tafel-aufbau"
  | "feld-finden"
  | "tafel-schritte"
  | "tafel-ausschnitt"
  | "zehnerzahlen";

// One entry per line of the school's Quintal overview, in the letter's wording.
export const GOALS: { id: GoalId; title: string; emoji: string; text: string }[] = [
  { id: "zahlenband", title: "Zahlenband", emoji: "🎀", text: "Ich kann am Zahlenband Zahlen zeigen, in Einer- und Zehner-Schritten vorwärts und rückwärts zählen und Nachbarzahlen und Nachbarzehner nennen." },
  { id: "rechenstrich-eintragen", title: "Rechenstrich", emoji: "📏", text: "Ich kann Zahlen auf dem Rechenstrich der Reihe nach eintragen." },
  { id: "rechenstrich-folgen", title: "Zahlenfolgen", emoji: "➡️", text: "Ich kann mit Hilfe des Rechenstrichs Zahlen ordnen und Zahlenfolgen in regelmässigen Schritten nach links und rechts fortsetzen." },
  { id: "zahlenfreunde", title: "Zahlenfreunde", emoji: "🤝", text: "Ich erkenne, warum gewisse Zahlen gut zueinander passen und kann daher weitere «Zahlenfreunde» notieren." },
  { id: "begriffe", title: "Begriffe", emoji: "💬", text: "Ich kenne die Begriffe: Ziffer, gerade und ungerade Zahl, Nachbarzahl, Umkehrzahl, Schnapszahl, Zehnerzahl, Zehner und Einer, das Doppelte, die Hälfte, verdoppeln, halbieren." },
  { id: "verdoppeln", title: "Verdoppeln", emoji: "✌️", text: "Ich kann Zahlen verdoppeln." },
  { id: "raetsel", title: "Zahlenrätsel", emoji: "🕵️", text: "Ich kann Zahlenrätsel lösen." },
  { id: "tafel-aufbau", title: "Hundertertafel", emoji: "🔟", text: "Ich kenne den Aufbau der Hundertertafel und kann fehlende Zahlen ergänzen." },
  { id: "feld-finden", title: "Hunderterfeld", emoji: "⚡", text: "Ich kann eine gesuchte Zahl im Hunderterfeld schnell finden und zeigen." },
  { id: "tafel-schritte", title: "Schritte zählen", emoji: "👣", text: "Ich kann auf der Hundertertafel in regelmässigen Schritten vorwärts zählen." },
  { id: "tafel-ausschnitt", title: "Ausschnitte", emoji: "🧩", text: "Ich kann fehlende Zahlen in Ausschnitten der Hundertertafel ergänzen." },
  { id: "zehnerzahlen", title: "Zehnerzahlen", emoji: "🧮", text: "Ich kann Plus und Minusrechnungen mit Zehnerzahlen lösen." },
];

export type Cell = { t: string } | { a: number };

export type RiddleClue =
  | { type: "between"; from: number; to: number }
  | { type: "even" }
  | { type: "odd" }
  | { type: "tens"; n: number }
  | { type: "ones"; n: number }
  | { type: "schnaps" }
  | { type: "zehner" }
  | { type: "reverse"; n: number }
  | { type: "double"; n: number }
  | { type: "half"; n: number }
  | { type: "neighbor"; n: number }
  | { type: "digitSum"; n: number };

export type Task = { goal: GoalId; prompt: string; speech?: string } & (
  | { kind: "choice"; show?: string; highlight?: number; options: string[]; answer: string }
  | { kind: "fill"; layout: "plain" | "row" | "line"; cells: Cell[]; note?: string[] }
  | { kind: "riddle"; clues: RiddleClue[]; answer: number }
  | { kind: "order"; numbers: number[] }
  | { kind: "band"; from: number; target: number; labelEvery: number }
  | { kind: "field"; target: number; hints: boolean; fastMs: number }
  | { kind: "steps"; start: number; step: number; count: number }
  | { kind: "grid"; cols: number; compact: boolean; cells: (number | { a: number } | null)[] }
);

const int = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
const pick = <T,>(rng: Rng, items: T[]): T => items[int(rng, 0, items.length - 1)];
const range = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, i) => min + i);

export function shuffle<T>(rng: Rng, items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = int(rng, 0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const tens = (n: number) => Math.floor(n / 10);
const ones = (n: number) => n % 10;
const isSchnaps = (n: number) => n > 10 && n < 100 && n % 11 === 0;
const isTens = (n: number) => n % 10 === 0;
// Only two-digit numbers without a zero have a reversal, and Schnapszahlen reverse to themselves.
const reversible = (n: number) => n > 10 && n < 100 && !isTens(n) && !isSchnaps(n);
const reverse = (n: number) => ones(n) * 10 + tens(n);
const SCHNAPS = range(11, 99).filter(isSchnaps);
const TWO_DIGIT = range(11, 99);

function choice(
  rng: Rng,
  goal: GoalId,
  prompt: string,
  answer: number | string,
  distractors: (number | string)[],
  extra: { show?: string; highlight?: number; speech?: string } = {}
): Task {
  const right = String(answer);
  const wrong = [...new Set(distractors.map(String))].filter((d) => d !== right).slice(0, 3);
  return { goal, prompt, kind: "choice", answer: right, options: shuffle(rng, [right, ...wrong]), ...extra };
}

// --- Zahlenband ---

function countingRow(rng: Rng, level: Level): Task {
  const step = pick(rng, [1, 10]);
  const dir = level === 1 ? 1 : pick(rng, [1, -1]);
  const span = 4 * step;
  let start: number;
  if (step === 1 && level === 3) {
    // Over the tens boundary, where most counting mistakes happen.
    const boundary = int(rng, 2, 9) * 10;
    start = boundary - 2 * dir;
  } else if (step === 10 && level === 3) {
    start = dir > 0 ? pick(rng, range(1, 100 - span).filter((n) => !isTens(n))) : pick(rng, range(1 + span, 99).filter((n) => !isTens(n)));
  } else if (step === 10) {
    start = 10 * (dir > 0 ? int(rng, 1, 6) : int(rng, 5, 10));
  } else {
    start = dir > 0 ? int(rng, 1, 100 - span) : int(rng, 1 + span, 100);
  }
  const way = dir > 0 ? "vorwärts" : "rückwärts";
  const steps = step === 1 ? "Einer-Schritten" : "Zehner-Schritten";
  const cells: Cell[] = range(0, 4).map((i) => {
    const value = start + dir * step * i;
    return i < 2 ? { t: String(value) } : { a: value };
  });
  return { goal: "zahlenband", kind: "fill", layout: "row", prompt: `Zähle ${way} in ${steps}.`, cells };
}

function zahlenband(rng: Rng, level: Level): Task {
  const max = level === 1 ? 59 : 99;
  const n = pick(rng, range(11, max).filter((x) => !isTens(x)));
  switch (pick(rng, ["show", "count", "count", "neighbors", "tensNeighbors"])) {
    case "show": {
      const from = tens(n) * 10;
      return {
        goal: "zahlenband",
        kind: "band",
        prompt: `Zeige die Zahl ${n} auf dem Zahlenband.`,
        from,
        target: n,
        labelEvery: level === 1 ? 5 : 10,
      };
    }
    case "neighbors":
      return {
        goal: "zahlenband",
        kind: "fill",
        layout: "plain",
        prompt: `Wie heissen die Nachbarzahlen von ${n}?`,
        cells: [{ a: n - 1 }, { t: String(n) }, { a: n + 1 }],
      };
    case "tensNeighbors":
      return {
        goal: "zahlenband",
        kind: "fill",
        layout: "plain",
        prompt: `Wie heissen die Nachbarzehner von ${n}?`,
        cells: [{ a: tens(n) * 10 }, { t: String(n) }, { a: (tens(n) + 1) * 10 }],
      };
    default:
      return countingRow(rng, level);
  }
}

// --- Rechenstrich ---

function unsorted(rng: Rng, numbers: number[]): number[] {
  const sorted = [...numbers].sort((a, b) => a - b);
  let out = shuffle(rng, numbers);
  while (out.every((n, i) => n === sorted[i])) out = shuffle(rng, numbers);
  return out;
}

function rechenstrichEintragen(rng: Rng, level: Level): Task {
  let numbers: number[];
  if (level === 1) {
    const start = int(rng, 1, 96);
    numbers = range(start, start + 3);
  } else if (level === 2) {
    const start = int(rng, 2, 9) * 10 - int(rng, 1, 4);
    numbers = range(start, start + 4);
  } else {
    const step = pick(rng, [2, 5, 10]);
    const start = int(rng, 1, 100 - 4 * step);
    numbers = range(0, 4).map((i) => start + i * step);
  }
  return {
    goal: "rechenstrich-eintragen",
    kind: "order",
    prompt: "Trage die Zahlen der Reihe nach auf dem Rechenstrich ein. Die kleinste Zahl kommt nach links.",
    numbers: unsorted(rng, numbers),
  };
}

function rechenstrichOrdnen(rng: Rng, level: Level): Task {
  const count = level + 3;
  const max = level === 1 ? 50 : 100;
  let numbers = shuffle(rng, range(1, max)).slice(0, count);
  if (level === 3) {
    // Reversal pairs such as 46 and 64 are the classic trap when ordering.
    const a = pick(rng, TWO_DIGIT.filter(reversible));
    numbers = [a, reverse(a), ...numbers.filter((n) => n !== a && n !== reverse(a))].slice(0, count);
  }
  return {
    goal: "rechenstrich-folgen",
    kind: "order",
    prompt: "Ordne die Zahlen auf dem Rechenstrich. Die kleinste Zahl kommt nach links.",
    numbers: unsorted(rng, numbers),
  };
}

function zahlenfolge(rng: Rng, level: Level): Task {
  const step = pick(rng, level === 1 ? [2, 5, 10] : level === 2 ? [2, 3, 4, 5, 10] : [3, 4, 6, 7, 8, 9]);
  const outer = level === 1 ? 1 : 2;
  const length = 3 + 2 * outer;
  const start = int(rng, 1, 100 - (length - 1) * step);
  const cells: Cell[] = range(0, length - 1).map((i) => {
    const value = start + i * step;
    return i < outer || i >= length - outer ? { a: value } : { t: String(value) };
  });
  return {
    goal: "rechenstrich-folgen",
    kind: "fill",
    layout: "line",
    prompt: "Setze die Zahlenfolge nach links und nach rechts fort.",
    cells,
  };
}

// --- Zahlenfreunde ---

export type Relation = "umkehr" | "nachbar" | "schnaps" | "doppelt" | "hundert";

const RELATION_LABELS: Record<Relation, string> = {
  umkehr: "Es sind Umkehrzahlen",
  nachbar: "Es sind Nachbarzahlen",
  schnaps: "Es sind Schnapszahlen",
  doppelt: "Eine ist das Doppelte der anderen",
  hundert: "Zusammen ergeben sie 100",
};

export function relationsOf(a: number, b: number): Relation[] {
  const out: Relation[] = [];
  if (reversible(a) && reverse(a) === b) out.push("umkehr");
  if (Math.abs(a - b) === 1) out.push("nachbar");
  if (a !== b && isSchnaps(a) && isSchnaps(b)) out.push("schnaps");
  if (a * 2 === b || b * 2 === a) out.push("doppelt");
  if (a !== b && a + b === 100) out.push("hundert");
  return out;
}

function friendPair(rng: Rng, relation: Relation): [number, number] {
  switch (relation) {
    case "umkehr": {
      const a = pick(rng, TWO_DIGIT.filter(reversible));
      return [a, reverse(a)];
    }
    case "nachbar": {
      const a = int(rng, 10, 98);
      return [a, a + 1];
    }
    case "schnaps": {
      const [a, b] = shuffle(rng, SCHNAPS);
      return [a, b];
    }
    case "doppelt": {
      const a = int(rng, 3, 50);
      return [a, a * 2];
    }
    case "hundert": {
      const a = pick(rng, [10, 20, 30, 40, 60, 70, 80, 90, 25, 75, 35, 65]);
      return [a, 100 - a];
    }
  }
}

function whyFriends(rng: Rng, level: Level): Task {
  const pool: Relation[] = level === 1 ? ["umkehr", "nachbar", "schnaps"] : ["umkehr", "nachbar", "schnaps", "doppelt", "hundert"];
  const relation = pick(rng, pool);
  let pair = friendPair(rng, relation);
  // 11 and 22 are both Schnapszahlen and doubles: only one reason may be true.
  while (relationsOf(pair[0], pair[1]).length !== 1) pair = friendPair(rng, relation);
  const [a, b] = shuffle(rng, pair);
  const wrong = shuffle(rng, (Object.keys(RELATION_LABELS) as Relation[]).filter((r) => r !== relation));
  return choice(
    rng,
    "zahlenfreunde",
    `Warum passen ${a} und ${b} gut zusammen?`,
    RELATION_LABELS[relation],
    wrong.map((r) => RELATION_LABELS[r]),
    { show: `${a} und ${b}` }
  );
}

function nextFriend(rng: Rng): Task {
  type Rule = { sources: number[]; friend: (x: number) => number };
  const rules: Rule[] = [
    { sources: TWO_DIGIT.filter(reversible), friend: reverse },
    { sources: range(5, 25), friend: (x) => x * 2 },
    { sources: range(10, 98), friend: (x) => x + 1 },
    { sources: [10, 20, 30, 40, 60, 70, 80, 90], friend: (x) => 100 - x },
    { sources: range(11, 89).filter((x) => !isTens(x)), friend: (x) => x + 10 },
  ];
  const rule = pick(rng, rules);
  const [first, second, query] = shuffle(rng, rule.sources);
  const note = [first, second].map((x) => `${x} und ${rule.friend(x)}`);
  return {
    goal: "zahlenfreunde",
    kind: "fill",
    layout: "plain",
    prompt: `Diese Zahlen sind Freunde. Wer ist der Freund von ${query}?`,
    speech: `${note[0]} sind Freunde. ${note[1]} sind Freunde. Wer ist der Freund von ${query}?`,
    note,
    cells: [{ t: String(query) }, { t: "und" }, { a: rule.friend(query) }],
  };
}

function zahlenfreunde(rng: Rng, level: Level): Task {
  if (level === 1) return whyFriends(rng, level);
  return rng() < (level === 2 ? 0.5 : 0.7) ? nextFriend(rng) : whyFriends(rng, level);
}

// --- Begriffe ---

function begriffe(rng: Rng, level: Level): Task {
  const goal: GoalId = "begriffe";
  const max = level === 1 ? 50 : 100;
  const others = (test: (n: number) => boolean, from = 1) => shuffle(rng, range(from, max).filter(test));
  const two = pick(rng, range(12, max - 1).filter((n) => reversible(n) && reverse(n) <= 99));

  switch (pick(rng, ["even", "odd", "schnaps", "zehner", "umkehr", "tens", "ones", "build", "digits", "neighbor", "double", "half", "word"])) {
    case "even":
      return choice(rng, goal, "Welche Zahl ist gerade?", others((n) => n % 2 === 0)[0], others((n) => n % 2 === 1));
    case "odd":
      return choice(rng, goal, "Welche Zahl ist ungerade?", others((n) => n % 2 === 1)[0], others((n) => n % 2 === 0));
    case "schnaps":
      return choice(rng, goal, "Welche Zahl ist eine Schnapszahl?", pick(rng, SCHNAPS.filter((n) => n <= max)), others((n) => !isSchnaps(n) && !isTens(n), 12));
    case "zehner":
      return choice(rng, goal, "Welche Zahl ist eine Zehnerzahl?", pick(rng, range(1, max / 10)) * 10, others((n) => !isTens(n), 11));
    case "umkehr":
      return choice(rng, goal, `Was ist die Umkehrzahl von ${two}?`, reverse(two), [two, reverse(two) + 1, two + 1, reverse(two) - 1], { show: String(two) });
    case "tens":
      return choice(rng, goal, `Wie viele Zehner hat die Zahl ${two}?`, tens(two), [ones(two), two, tens(two) + 1, tens(two) + 2], { show: String(two) });
    case "ones":
      return choice(rng, goal, `Wie viele Einer hat die Zahl ${two}?`, ones(two), [tens(two), two, ones(two) + 1, ones(two) + 2], { show: String(two) });
    case "build":
      return choice(rng, goal, `Welche Zahl hat ${tens(two)} Zehner und ${ones(two)} Einer?`, two, [reverse(two), tens(two) * 10, ones(two) * 10, tens(two) + ones(two)]);
    case "digits": {
      const n = pick(rng, [int(rng, 1, 9), two, two, 100]);
      return choice(rng, goal, `Wie viele Ziffern hat die Zahl ${n}?`, String(n).length, [1, 2, 3], { show: String(n) });
    }
    case "neighbor": {
      const n = int(rng, 12, 89);
      const near = (x: number) => x >= 1 && Math.abs(x - n) !== 1 && x !== n;
      return choice(rng, goal, `Welche Zahl ist eine Nachbarzahl von ${n}?`, n + pick(rng, [-1, 1]), [n + 10, n - 10, n + 2, n - 2].filter(near), { show: String(n) });
    }
    case "double": {
      const n = int(rng, 2, level === 1 ? 10 : level === 2 ? 25 : 50);
      return choice(rng, goal, `Was ist das Doppelte von ${n}?`, n * 2, [n, n * 2 + 1, n * 2 - 1, n + 2, n * 2 + 10], { show: String(n) });
    }
    case "half": {
      const n = int(rng, 2, level === 1 ? 10 : level === 2 ? 25 : 50);
      return choice(rng, goal, `Was ist die Hälfte von ${n * 2}?`, n, [n * 2, n + 1, n - 1, n + 2, n + 3].filter((x) => x >= 1), { show: String(n * 2) });
    }
    default: {
      const n = int(rng, 3, level === 1 ? 10 : 25);
      return rng() < 0.5
        ? choice(rng, goal, `Aus ${n} wird ${n * 2}. Was ist passiert?`, "Die Zahl wurde verdoppelt", ["Die Zahl wurde halbiert"])
        : choice(rng, goal, `Aus ${n * 2} wird ${n}. Was ist passiert?`, "Die Zahl wurde halbiert", ["Die Zahl wurde verdoppelt"]);
    }
  }
}

// --- Verdoppeln ---

function verdoppeln(rng: Rng, level: Level): Task {
  if (level === 1) {
    const n = pick(rng, [...range(1, 10), 20, 30, 40]);
    return { goal: "verdoppeln", kind: "fill", layout: "plain", prompt: `Verdopple die Zahl ${n}.`, cells: [{ t: String(n) }, { t: "+" }, { t: String(n) }, { t: "=" }, { a: n * 2 }] };
  }
  // Level 2 stays below the tens carry (24 → 48), level 3 needs it (27 → 54).
  const pool = range(11, 49).filter((n) => !isTens(n) && (level === 2 ? ones(n) < 5 : ones(n) >= 5));
  const n = pick(rng, pool);
  return { goal: "verdoppeln", kind: "fill", layout: "plain", prompt: `Verdopple die Zahl ${n}.`, cells: [{ t: "Das Doppelte von" }, { t: String(n) }, { t: "ist" }, { a: n * 2 }] };
}

// --- Zahlenrätsel ---

const digitSum = (n: number) => String(n).split("").reduce((sum, d) => sum + Number(d), 0);

export function clueMatches(clue: RiddleClue, n: number): boolean {
  switch (clue.type) {
    case "between": return n > clue.from && n < clue.to;
    case "even": return n % 2 === 0;
    case "odd": return n % 2 === 1;
    case "tens": return tens(n) === clue.n;
    case "ones": return ones(n) === clue.n;
    case "schnaps": return isSchnaps(n);
    case "zehner": return isTens(n);
    case "reverse": return reversible(n) && reverse(n) === clue.n;
    case "double": return n === clue.n * 2;
    case "half": return n * 2 === clue.n;
    case "neighbor": return Math.abs(n - clue.n) === 1;
    case "digitSum": return digitSum(n) === clue.n;
  }
}

export function clueText(clue: RiddleClue): string {
  switch (clue.type) {
    case "between": return `Ich liege zwischen ${clue.from} und ${clue.to}.`;
    case "even": return "Ich bin eine gerade Zahl.";
    case "odd": return "Ich bin eine ungerade Zahl.";
    case "tens": return `Ich habe ${clue.n} Zehner.`;
    case "ones": return `Ich habe ${clue.n} Einer.`;
    case "schnaps": return "Ich bin eine Schnapszahl.";
    case "zehner": return "Ich bin eine Zehnerzahl.";
    case "reverse": return `Meine Umkehrzahl ist ${clue.n}.`;
    case "double": return `Ich bin das Doppelte von ${clue.n}.`;
    case "half": return `Ich bin die Hälfte von ${clue.n}.`;
    case "neighbor": return `Eine Nachbarzahl von mir ist ${clue.n}.`;
    case "digitSum": return `Meine Ziffern ergeben zusammen ${clue.n}.`;
  }
}

function raetsel(rng: Rng, level: Level): Task {
  const candidates = range(1, 100);
  const countMatches = (clues: RiddleClue[]) => candidates.filter((n) => clues.every((c) => clueMatches(c, n))).length;

  for (;;) {
    const target = int(rng, 11, 99);
    const from = isTens(target) ? target - 10 : tens(target) * 10;
    const parity: RiddleClue = target % 2 === 0 ? { type: "even" } : { type: "odd" };
    const pool: RiddleClue[] = [{ type: "between", from, to: from + (isTens(target) ? 20 : 10) }, parity];
    if (isSchnaps(target)) pool.push({ type: "schnaps" });
    if (isTens(target)) pool.push({ type: "zehner" });
    if (level === 1) pool.push({ type: "ones", n: ones(target) }, { type: "tens", n: tens(target) });
    if (level >= 2) {
      pool.push({ type: "neighbor", n: target + pick(rng, [-1, 1]) });
      if (reversible(target)) pool.push({ type: "reverse", n: reverse(target) });
      if (target % 2 === 0) pool.push({ type: "double", n: target / 2 });
      if (target <= 50) pool.push({ type: "half", n: target * 2 });
    }
    if (level === 3) pool.push({ type: "digitSum", n: digitSum(target) });
    else if (level === 2) pool.push({ type: "ones", n: ones(target) });

    let clues: RiddleClue[] = [];
    for (const clue of shuffle(rng, pool)) {
      if (countMatches([...clues, clue]) < countMatches(clues)) clues.push(clue);
      if (countMatches(clues) === 1) break;
    }
    if (countMatches(clues) !== 1) continue;
    if (clues.length === 1) clues = [parity, ...clues];
    if (clues.length > 4) continue;

    // Broad clues first, so the riddle narrows down as it is read aloud.
    const breadth = (clue: RiddleClue) => countMatches([clue]);
    clues.sort((a, b) => breadth(b) - breadth(a));
    return {
      goal: "raetsel",
      kind: "riddle",
      prompt: "Welche Zahl bin ich?",
      speech: `${clues.map(clueText).join(" ")} Welche Zahl bin ich?`,
      clues,
      answer: target,
    };
  }
}

// --- Hundertertafel ---

function tafelAufbau(rng: Rng, level: Level): Task {
  if (rng() < 0.5) {
    const hidden = shuffle(rng, range(1, 99)).slice(0, level === 1 ? 1 : level === 2 ? 3 : 5);
    return {
      goal: "tafel-aufbau",
      kind: "grid",
      cols: 10,
      compact: true,
      prompt: hidden.length === 1 ? "Welche Zahl fehlt auf der Hundertertafel?" : "Welche Zahlen fehlen auf der Hundertertafel?",
      cells: range(1, 100).map((n) => (hidden.includes(n) ? { a: n } : n)),
    };
  }
  // Rows 2–9, columns 2–9: every direction has a neighbour on the same row or column.
  const n = int(rng, 1, 8) * 10 + int(rng, 2, 9);
  const directions = [
    { word: "unter", value: n + 10 },
    { word: "über", value: n - 10 },
    { word: "rechts neben", value: n + 1 },
    { word: "links neben", value: n - 1 },
  ];
  const asked = pick(rng, directions);
  return choice(
    rng,
    "tafel-aufbau",
    `Welche Zahl steht auf der Hundertertafel direkt ${asked.word} ${n}?`,
    asked.value,
    directions.filter((d) => d !== asked).map((d) => d.value),
    level === 1 ? { highlight: n } : { show: String(n) }
  );
}

function feldFinden(rng: Rng, level: Level): Task {
  const target = int(rng, 1, 100);
  return {
    goal: "feld-finden",
    kind: "field",
    prompt: `Zeige die Zahl ${target} im Hunderterfeld.`,
    target,
    hints: level === 1,
    fastMs: level === 1 ? 10000 : level === 2 ? 7000 : 5000,
  };
}

function tafelSchritte(rng: Rng, level: Level): Task {
  const step = pick(rng, level === 1 ? [2, 5, 10] : level === 2 ? [2, 3, 4, 5, 10] : [3, 4, 6, 7, 8, 9]);
  const count = level === 1 ? 4 : 5;
  const last = 100 - step * count;
  const start = level === 1 ? pick(rng, range(1, last).filter((n) => n % step === 0)) : int(rng, 1, last);
  return {
    goal: "tafel-schritte",
    kind: "steps",
    prompt: `Starte bei ${start}. Zähle in ${step}er-Schritten und tippe die nächsten ${count} Zahlen an.`,
    start,
    step,
    count,
  };
}

const SHAPES: { cols: number; rows: number; at: [number, number][] }[] = [
  { cols: 2, rows: 2, at: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { cols: 3, rows: 3, at: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
  { cols: 2, rows: 3, at: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { cols: 3, rows: 3, at: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]] },
  { cols: 3, rows: 2, at: [[0, 0], [0, 1], [0, 2], [1, 1]] },
];

function tafelAusschnitt(rng: Rng, level: Level): Task {
  const shape = pick(rng, SHAPES);
  const top = int(rng, 0, 10 - shape.rows);
  const left = int(rng, 0, 10 - shape.cols);
  const given = level === 1 ? shape.at.length - 2 : level === 2 ? 2 : 1;
  const shown = new Set(shuffle(rng, shape.at).slice(0, given));
  const cells: (number | { a: number } | null)[] = Array(shape.cols * shape.rows).fill(null);
  for (const pos of shape.at) {
    const value = (top + pos[0]) * 10 + left + pos[1] + 1;
    cells[pos[0] * shape.cols + pos[1]] = shown.has(pos) ? value : { a: value };
  }
  return {
    goal: "tafel-ausschnitt",
    kind: "grid",
    cols: shape.cols,
    compact: false,
    prompt: "Das ist ein Stück aus der Hundertertafel. Welche Zahlen fehlen?",
    cells,
  };
}

// --- Plus und Minus mit Zehnerzahlen ---

function zehnerzahlen(rng: Rng, level: Level): Task {
  const plus = rng() < 0.5;
  const big = int(rng, 2, 9);
  const prompt = "Löse die Rechnung.";
  const goal: GoalId = "zehnerzahlen";
  const eq = (a: Cell, op: string, b: Cell, c: Cell): Task => ({ goal, prompt, kind: "fill", layout: "plain", cells: [a, { t: op }, b, { t: "=" }, c] });
  const given = (n: number): Cell => ({ t: String(n) });

  if (level === 3) {
    // A two-digit number and a Zehnerzahl: 34 + 20, 76 - 30.
    const n = pick(rng, range(21, 79).filter((x) => !isTens(x)));
    const t = int(rng, 1, plus ? tens(100 - n) : tens(n)) * 10;
    return plus ? eq(given(n), "+", given(t), { a: n + t }) : eq(given(n), "-", given(t), { a: n - t });
  }
  const a = big * 10;
  const b = int(rng, 1, plus ? 10 - big : big - 1) * 10;
  const result = plus ? a + b : a - b;
  if (level === 1) return eq(given(a), plus ? "+" : "-", given(b), { a: result });
  return rng() < 0.5
    ? eq(given(a), plus ? "+" : "-", { a: b }, given(result))
    : eq({ a }, plus ? "+" : "-", given(b), given(result));
}

const GENERATORS: Record<GoalId, (rng: Rng, level: Level) => Task> = {
  zahlenband,
  "rechenstrich-eintragen": rechenstrichEintragen,
  "rechenstrich-folgen": (rng, level) => (rng() < 0.5 ? rechenstrichOrdnen(rng, level) : zahlenfolge(rng, level)),
  zahlenfreunde,
  begriffe,
  verdoppeln,
  raetsel,
  "tafel-aufbau": tafelAufbau,
  "feld-finden": feldFinden,
  "tafel-schritte": tafelSchritte,
  "tafel-ausschnitt": tafelAusschnitt,
  zehnerzahlen,
};

export const generateTask = (goal: GoalId, level: Level, rng: Rng = Math.random): Task => GENERATORS[goal](rng, level);
