import { beforeEach, describe, expect, it } from "vitest";
import {
  ROUND_SIZE,
  STAGES,
  buildRound,
  hintNumber,
  loadHalvingStore,
  poolFor,
  recordHalvingResult,
  splitForHalving,
  stageAfterRound,
  startRound,
  tableTask,
  type HalvingStore,
  type Stage,
} from "./halving";

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

const ALL: Stage[] = [1, 2, 3, 4, 5];

describe("stages", () => {
  it("holds only even numbers up to 100, with no number in two stages", () => {
    const all = STAGES.flatMap((s) => s.pool);
    expect(all.every((n) => n % 2 === 0 && n >= 2 && n <= 100)).toBe(true);
    expect(new Set(all).size).toBe(all.length);
  });

  it("covers every even number from 2 to 100", () => {
    const all = new Set(STAGES.flatMap((s) => s.pool));
    for (let n = 2; n <= 100; n += 2) expect(all.has(n)).toBe(true);
  });

  it("follows the school order: tens before odd tens before everything", () => {
    expect(poolFor(2)).toEqual([20, 40, 60, 80, 100]);
    expect(poolFor(3)).toContain(48);
    expect(poolFor(4)).toContain(50);
    expect(poolFor(5)).toContain(76);
    expect(poolFor(5)).not.toContain(48);
  });
});

describe("splitForHalving", () => {
  it.each([
    [76, [70, 6]],
    [48, [40, 8]],
    [50, [40, 10]],
    [14, [10, 4]],
    [60, [60]],
    [8, [8]],
    [10, [10]],
  ])("splits %i into %j", (n, parts) => {
    expect(splitForHalving(n)).toEqual(parts);
  });

  it("always gives parts that add up and halve evenly or in fives", () => {
    for (const n of STAGES.flatMap((s) => s.pool)) {
      const parts = splitForHalving(n);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(n);
      expect(parts.every((p) => Number.isInteger(p / 2))).toBe(true);
    }
  });
});

describe("buildRound", () => {
  it("has ten tasks in Lernkontrolle order with whole-number answers", () => {
    for (const stage of ALL) {
      const rng = seeded(stage);
      for (let i = 0; i < 200; i++) {
        const round = buildRound(stage, rng);
        expect(round).toHaveLength(ROUND_SIZE);
        expect(round.map((t) => t.section)).toEqual([
          "rechenweg", "rechenweg", "tabelle", "umkehr", "umkehr", "sachaufgabe", "blitz", "blitz", "blitz", "blitz",
        ]);
        for (const task of round) {
          expect(task.answers.length).toBeGreaterThan(0);
          expect(task.answers.every((a) => Number.isInteger(a) && a >= 1 && a <= 100)).toBe(true);
          expect(task.detail).toContain("__");
        }
      }
    }
  });

  it("asks mostly about the current stage", () => {
    const round = buildRound(5, seeded(42));
    const split = round[0];
    expect(split.kind === "half-split" && poolFor(5).includes(split.n)).toBe(true);
  });

  it("ends on a number from an easier stage", () => {
    for (const stage of [2, 3, 4, 5] as Stage[]) {
      const rng = seeded(stage * 7);
      for (let i = 0; i < 50; i++) {
        const last = buildRound(stage, rng)[ROUND_SIZE - 1];
        expect(last.kind).toBe("half-quick");
        if (last.kind === "half-quick") expect(poolFor(stage)).not.toContain(last.n);
      }
    }
  });

  it("only uses cookies for small numbers", () => {
    for (const stage of ALL) {
      const rng = seeded(stage * 13);
      for (let i = 0; i < 100; i++) {
        const story = buildRound(stage, rng)[5];
        if (story.kind === "half-story" && story.story === "kekse") expect(story.n).toBeLessThanOrEqual(20);
      }
    }
  });
});

describe("hintNumber", () => {
  it("explains the first wrong row of a table", () => {
    const task = tableTask([24, 76, 50, 8], 5);
    expect(hintNumber(task, [12, 38, 30, 4])).toBe(50);
  });
});

describe("stage progress", () => {
  beforeEach(() => localStorage.clear());

  it("moves up at 8 of 10, back at 4 of 10, and stays otherwise", () => {
    expect(stageAfterRound(3, 8, 10)).toEqual({ stage: 4, passed: true });
    expect(stageAfterRound(5, 10, 10)).toEqual({ stage: 5, passed: true });
    expect(stageAfterRound(3, 6, 10)).toEqual({ stage: 3, passed: false });
    expect(stageAfterRound(3, 4, 10)).toEqual({ stage: 2, passed: false });
    expect(stageAfterRound(1, 0, 10)).toEqual({ stage: 1, passed: false });
  });

  it("plays a round through, records it and unlocks the next stage", () => {
    let store: HalvingStore = startRound(loadHalvingStore(), "2026-11-10", seeded(1));
    expect(store.round!.tasks).toHaveLength(ROUND_SIZE);
    for (let i = 0; i < ROUND_SIZE; i++) store = recordHalvingResult(store, i !== 3);
    expect(store.rounds).toEqual([{ date: "2026-11-10", stage: 1, score: 9, total: 10 }]);
    expect(store.stage).toBe(2);
    expect(store.passed).toBe(1);

    const again = startRound(store, "2026-11-10", seeded(2));
    expect(again.round!.stage).toBe(2);
    expect(again.round!.index).toBe(0);
  });

  it("resumes an unfinished round instead of starting a new one", () => {
    let store = startRound(loadHalvingStore(), "2026-11-10", seeded(1));
    store = recordHalvingResult(store, true);
    expect(startRound(store, "2026-11-10", seeded(9)).round).toBe(store.round);
  });
});
