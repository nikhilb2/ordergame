import { describe, expect, it } from "vitest";
import {
  ROUND_SIZE,
  STAGES,
  backwardsStoreApi,
  beforeNumber,
  beforeTask,
  buildRound,
  changesTen,
  countdown,
  countdownBlanks,
  countdownStart,
  hintStep,
  rowTask,
  type Stage,
  type Unit,
} from "./backwards";

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

describe("countdowns", () => {
  it("count down by the unit and stay between 0 and the stage's top", () => {
    const rng = seeded(1);
    for (const { units, max } of STAGES) {
      for (const unit of units) {
        for (let i = 0; i < 100; i++) {
          const row = countdown(countdownStart(rng, unit, 6, max), unit, 6);
          expect(row[0]).toBeLessThanOrEqual(max);
          expect(row[row.length - 1]).toBeGreaterThanOrEqual(0);
          row.slice(1).forEach((n, k) => expect(row[k] - n).toBe(unit));
        }
      }
    }
  });

  it("mostly change the ten on the way when counting by ones", () => {
    const rng = seeded(2);
    let turning = 0;
    for (let i = 0; i < 300; i++) {
      const row = countdown(countdownStart(rng, 1, 6, 100), 1, 6);
      if (row.some((n, k) => k > 0 && changesTen(row[k - 1], n))) turning++;
    }
    expect(turning / 300).toBeGreaterThan(0.7);
  });

  it("can start at 100 and cross into the nineties", () => {
    const starts = new Set(Array.from({ length: 400 }, (_, i) => countdownStart(seeded(i), 1, 6, 100)));
    expect(starts.has(100)).toBe(true);
  });

  it("always blank the number right after the ten changes, never the first", () => {
    const rng = seeded(4);
    const row = [52, 51, 50, 49, 48, 47];
    for (let i = 0; i < 50; i++) {
      const blanks = countdownBlanks(rng, row);
      expect(blanks).toHaveLength(3);
      expect(blanks).toContain(3);
      expect(blanks).not.toContain(0);
    }
  });
});

describe("before", () => {
  it("asks one less, or n less in steps", () => {
    expect(beforeTask(70, 1, 2)).toMatchObject({ answers: [69], detail: "Vor 70 kommt __" });
    expect(beforeTask(84, 10, 3)).toMatchObject({ answers: [74], detail: "84 − 10 = __" });
  });

  it("mostly asks where the ten changes", () => {
    const rng = seeded(5);
    for (const unit of [1, 2, 5, 10] as Unit[]) {
      let turning = 0;
      for (let i = 0; i < 200; i++) {
        const n = beforeNumber(rng, unit, 100);
        expect(n - unit).toBeGreaterThanOrEqual(0);
        if (changesTen(n, n - unit)) turning++;
      }
      expect(turning / 200).toBeGreaterThan(0.6);
    }
  });
});

describe("buildRound", () => {
  it("has ten tasks from hearing to doing, all answers between 0 and 100", () => {
    for (const stage of ALL) {
      for (let seed = 0; seed < 30; seed++) {
        const round = buildRound(stage, seeded(seed));
        expect(round).toHaveLength(ROUND_SIZE);
        expect(round.map((t) => t.section)).toEqual(["frosch", "frosch", "countdown", "countdown", "countdown", "davor", "davor", "davor", "blitz", "blitz"]);
        for (const task of round) for (const a of task.answers) expect(a >= 0 && a <= 100 && Number.isInteger(a)).toBe(true);
      }
    }
  });

  it("uses the stage's steps, and an easier stage for the last task", () => {
    for (const stage of ALL) {
      const round = buildRound(stage, seeded(stage * 7));
      for (const task of round.slice(0, -1)) expect(STAGES[stage - 1].units).toContain(task.unit);
      const last = round[round.length - 1];
      const easier = STAGES[(stage === 1 ? 1 : stage === 5 ? 2 : stage - 1) - 1];
      expect(easier.units).toContain(last.unit);
      expect(last.level).toBe(easier.stage);
    }
  });

  it("keeps stage 1 within 20", () => {
    for (let seed = 0; seed < 30; seed++) {
      for (const task of buildRound(1, seeded(seed))) {
        if (task.kind === "back-row") expect(task.numbers[0]).toBeLessThanOrEqual(20);
        else expect(task.n).toBeLessThanOrEqual(20);
      }
    }
  });
});

describe("hintStep", () => {
  it("explains the first wrong blank from the number before it", () => {
    const task = rowTask("countdown", [52, 51, 50, 49, 48, 47], 1, [3, 1, 5], 2);
    expect(task.answers).toEqual([51, 49, 47]);
    expect(hintStep(task, [51, 41, 47])).toEqual({ from: 50, to: 49, unit: 1, row: [52, 51, 50] });
  });

  it("explains a before question from its number", () => {
    expect(hintStep(beforeTask(84, 10, 3), [64])).toEqual({ from: 84, to: 74, unit: 10, row: [84] });
  });
});

describe("stage progress", () => {
  it("moves up at 8 of 10", () => {
    let store = backwardsStoreApi.start(backwardsStoreApi.load(), "2026-11-15", seeded(1));
    for (let i = 0; i < ROUND_SIZE; i++) store = backwardsStoreApi.record(store, i > 1);
    expect(store.stage).toBe(2);
    expect(store.rounds).toEqual([{ date: "2026-11-15", stage: 1, score: 8, total: 10 }]);
  });
});

describe("variety", () => {
  it("does not repeat a task within a round, even in stage 1", () => {
    for (const stage of ALL) {
      for (let seed = 0; seed < 200; seed++) {
        const round = buildRound(stage, seeded(seed));
        const before = round.filter((t) => t.kind === "back-before").map((t) => t.detail);
        const starts = round.filter((t) => t.kind === "back-row").map((t) => (t.kind === "back-row" ? t.numbers[0] : 0));
        expect(new Set(before).size).toBe(before.length);
        expect(new Set(starts).size).toBe(starts.length);
      }
    }
  });
});
