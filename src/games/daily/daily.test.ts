import { beforeEach, describe, expect, it } from "vitest";
import { GOALS, clueMatches, generateTask, relationsOf, type Cell, type Level, type Task } from "./tasks";
import { buildSession, dayKey, goalStatus, loadStore, nextGoalProgress, recordResult, saveStore, startSession, streak, type Store } from "./progress";

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LEVELS: Level[] = [1, 2, 3];
const RUNS = 400;

function forEachTask(check: (task: Task, level: Level) => void) {
  for (const goal of GOALS) {
    for (const level of LEVELS) {
      const rng = seeded(goal.id.length * 1000 + level);
      for (let i = 0; i < RUNS; i++) {
        const task = generateTask(goal.id, level, rng);
        expect(task.goal).toBe(goal.id);
        check(task, level);
      }
    }
  }
}

const inRange = (n: number) => Number.isInteger(n) && n >= 0 && n <= 100;
const value = (cell: Cell) => ("a" in cell ? cell.a : Number(cell.t));

describe("task generators", () => {
  it("covers every goal in the letter", () => {
    expect(GOALS).toHaveLength(12);
    expect(new Set(GOALS.map((g) => g.id)).size).toBe(12);
  });

  it("offers distinct choices including the answer", () => {
    forEachTask((task) => {
      if (task.kind !== "choice") return;
      expect(task.options).toContain(task.answer);
      expect(new Set(task.options).size).toBe(task.options.length);
      expect(task.options.length).toBeGreaterThanOrEqual(2);
      for (const option of task.options) if (/^-?\d+$/.test(option)) expect(Number(option)).toBeGreaterThanOrEqual(0);
    });
  });

  it("has exactly one correct option for vocabulary questions", () => {
    forEachTask((task) => {
      if (task.kind !== "choice") return;
      const nums = task.options.map(Number);
      const count = (test: (n: number) => boolean) => nums.filter(test).length;
      if (task.prompt === "Welche Zahl ist gerade?") expect(count((n) => n % 2 === 0)).toBe(1);
      if (task.prompt === "Welche Zahl ist ungerade?") expect(count((n) => n % 2 === 1)).toBe(1);
      if (task.prompt.includes("Schnapszahl")) expect(count((n) => n < 100 && n % 11 === 0)).toBe(1);
      if (task.prompt.includes("Zehnerzahl")) expect(count((n) => n % 10 === 0)).toBe(1);
      const neighbor = task.prompt.match(/Nachbarzahl von (\d+)/);
      if (neighbor) expect(count((n) => Math.abs(n - Number(neighbor[1])) === 1)).toBe(1);
    });
  });

  it("keeps blanks and fill answers inside the number range", () => {
    forEachTask((task) => {
      if (task.kind === "fill") {
        expect(task.cells.some((c) => "a" in c)).toBe(true);
        for (const cell of task.cells) if ("a" in cell) expect(inRange(cell.a)).toBe(true);
      }
      if (task.kind === "grid") {
        const blanks = task.cells.filter((c) => c !== null && typeof c === "object");
        expect(blanks.length).toBeGreaterThan(0);
        expect(task.cells.some((c) => typeof c === "number")).toBe(true);
      }
    });
  });

  it("writes correct sums", () => {
    forEachTask((task) => {
      if (task.goal !== "zehnerzahlen" && task.goal !== "verdoppeln") return;
      if (task.kind !== "fill") throw new Error("expected fill");
      if (task.goal === "verdoppeln") {
        const numbers = task.cells.map(value).filter((n) => !Number.isNaN(n));
        expect(numbers[numbers.length - 1]).toBe(numbers[0] * 2);
        return;
      }
      const [a, op, b, , c] = task.cells;
      const sign = "t" in op ? op.t : "";
      expect(sign === "+" ? value(a) + value(b) : value(a) - value(b)).toBe(value(c));
      expect(value(a)).toBeGreaterThanOrEqual(0);
      expect(value(c)).toBeGreaterThanOrEqual(0);
    });
  });

  it("makes regular sequences and neighbours", () => {
    forEachTask((task) => {
      if (task.kind !== "fill" || (task.goal !== "rechenstrich-folgen" && !task.prompt.startsWith("Zähle"))) return;
      const numbers = task.cells.map(value);
      const step = numbers[1] - numbers[0];
      expect(step).not.toBe(0);
      numbers.forEach((n, i) => {
        expect(n).toBe(numbers[0] + i * step);
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(100);
      });
    });
  });

  it("gives every riddle exactly one solution", () => {
    forEachTask((task) => {
      if (task.kind !== "riddle") return;
      const solutions = Array.from({ length: 100 }, (_, i) => i + 1).filter((n) => task.clues.every((c) => clueMatches(c, n)));
      expect(solutions).toEqual([task.answer]);
      expect(task.clues.length).toBeGreaterThanOrEqual(2);
      expect(task.clues.length).toBeLessThanOrEqual(4);
    });
  });

  it("gives Zahlenfreunde pairs only one true reason", () => {
    forEachTask((task) => {
      if (task.goal !== "zahlenfreunde" || task.kind !== "choice") return;
      const [a, b] = task.show!.split(" und ").map(Number);
      expect(relationsOf(a, b)).toHaveLength(1);
    });
  });

  it("places hundred-chart pieces correctly", () => {
    forEachTask((task) => {
      if (task.kind !== "grid") return;
      const number = (c: number | { a: number } | null) => (c === null ? null : typeof c === "number" ? c : c.a);
      const rows = task.cells.length / task.cols;
      expect(Number.isInteger(rows)).toBe(true);
      task.cells.forEach((cell, i) => {
        const n = number(cell);
        if (n === null) return;
        expect(inRange(n)).toBe(true);
        const right = task.cells[i + 1];
        if ((i + 1) % task.cols !== 0 && right !== null && right !== undefined) expect(number(right)).toBe(n + 1);
        const below = task.cells[i + task.cols];
        if (below !== null && below !== undefined) expect(number(below)).toBe(n + 10);
      });
    });
  });

  it("keeps Rechenstrich, Band, Feld and Schritte tasks valid", () => {
    forEachTask((task) => {
      if (task.kind === "order") {
        expect(new Set(task.numbers).size).toBe(task.numbers.length);
        expect(task.numbers.every((n) => n >= 1 && n <= 100)).toBe(true);
        expect([...task.numbers].sort((a, b) => a - b)).not.toEqual(task.numbers);
      }
      if (task.kind === "band") expect(task.target - task.from >= 1 && task.target - task.from <= 9).toBe(true);
      if (task.kind === "field") expect(task.target >= 1 && task.target <= 100).toBe(true);
      if (task.kind === "steps") expect(task.start >= 1 && task.start + task.step * task.count <= 100).toBe(true);
    });
  });
});

describe("progress", () => {
  beforeEach(() => localStorage.clear());

  it("levels up after three first-try answers and down after two misses", () => {
    let p = nextGoalProgress({ level: 1, history: [] }, true);
    p = nextGoalProgress(p, true);
    p = nextGoalProgress(p, true);
    expect(p).toEqual({ level: 2, history: [] });
    p = nextGoalProgress(p, false);
    p = nextGoalProgress(p, false);
    expect(p).toEqual({ level: 1, history: [] });
    expect(nextGoalProgress({ level: 1, history: [false] }, false).level).toBe(1);
  });

  it("marks a goal sicher only at the top level with a solid record", () => {
    const store = (level: Level, history: boolean[]): Store => ({ goals: { verdoppeln: { level, history } }, doneDays: [], session: null });
    expect(goalStatus(store(1, []), "verdoppeln")).toBe("neu");
    expect(goalStatus(store(2, [true, true]), "verdoppeln")).toBe("ueben");
    expect(goalStatus(store(3, [true, true, true, true]), "verdoppeln")).toBe("ueben");
    expect(goalStatus(store(3, [true, true, false, true, true]), "verdoppeln")).toBe("sicher");
    expect(goalStatus(store(3, [true, false, false, true, true]), "verdoppeln")).toBe("ueben");
  });

  it("builds a session with every goal plus three extras from the weakest", () => {
    const store: Store = { goals: { raetsel: { level: 1, history: [false, false] } }, doneDays: [], session: null };
    const session = buildSession(store, "2026-11-04", seeded(1));
    expect(session.tasks).toHaveLength(15);
    expect(new Set(session.tasks.map((t) => t.goal)).size).toBe(12);
    expect(session.tasks.filter((t) => t.goal === "raetsel")).toHaveLength(2);
  });

  it("resumes an unfinished session on the same day and starts fresh otherwise", () => {
    const first = startSession({ goals: {}, doneDays: [], session: null }, "2026-11-04", seeded(2));
    const partway = recordResult(first, true, seeded(3));
    expect(startSession(partway, "2026-11-04", seeded(4)).session).toBe(partway.session);
    expect(startSession(partway, "2026-11-05", seeded(4)).session!.date).toBe("2026-11-05");
    expect(startSession(partway, "2026-11-05", seeded(4)).session!.index).toBe(0);
  });

  it("re-queues wrong answers with a cap and completes the day at the end", () => {
    let store = startSession({ goals: {}, doneDays: [], session: null }, "2026-11-04", seeded(5));
    for (let i = 0; i < 6; i++) store = recordResult(store, false, seeded(i));
    expect(store.session!.tasks).toHaveLength(19);
    expect(store.session!.retries).toBe(4);
    while (store.session!.index < store.session!.tasks.length) store = recordResult(store, true, seeded(9));
    expect(store.doneDays).toEqual(["2026-11-04"]);
    expect(store.session!.score).toBe(13);
  });

  it("round-trips through storage and survives corrupt data", () => {
    const store = startSession({ goals: {}, doneDays: [], session: null }, "2026-11-04", seeded(6));
    saveStore(store);
    expect(loadStore().session!.tasks).toEqual(store.session!.tasks);
    localStorage.setItem("mathe-tagesuebung-v1", "{not json");
    expect(loadStore()).toEqual({ goals: {}, doneDays: [], session: null });
  });

  it("counts streaks across month ends and forgives an unfinished today", () => {
    const today = new Date(2026, 10, 2);
    expect(dayKey(today)).toBe("2026-11-02");
    expect(streak(["2026-10-31", "2026-11-01"], today)).toBe(2);
    expect(streak(["2026-10-31", "2026-11-01", "2026-11-02"], today)).toBe(3);
    expect(streak(["2026-10-30", "2026-11-01"], today)).toBe(1);
    expect(streak(["2026-10-30"], today)).toBe(0);
  });
});
