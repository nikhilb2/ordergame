import { describe, expect, it } from "vitest";
import { ROUND_SIZE, STAGES, buildRound, crossesTen, hintJump, jumpStart, jumpWay, quickTask, rowTask, stepsStoreApi, type Stage } from "./steps";

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

describe("jumpWay", () => {
  it("goes to the next ten first when a jump passes one", () => {
    expect(jumpWay(47, 56)).toEqual([[47, 50], [50, 56]]);
    expect(jumpWay(56, 47)).toEqual([[56, 50], [50, 47]]);
    expect(jumpWay(95, 100)).toEqual([[95, 100]]);
  });

  it("keeps a jump whole when it stays within a ten or lands on one", () => {
    expect(jumpWay(20, 24)).toEqual([[20, 24]]);
    expect(jumpWay(40, 50)).toEqual([[40, 50]]);
    expect(jumpWay(50, 41)).toEqual([[50, 41]]);
    expect(jumpWay(46, 40)).toEqual([[46, 40]]);
    expect(crossesTen(47, 57)).toBe(true);
  });

  it("splits into two parts that add up to the jump", () => {
    for (let from = 1; from <= 91; from++) {
      for (const step of [3, 4, 6, 7, 8, 9]) {
        if (from + step > 100) continue;
        const way = jumpWay(from, from + step);
        expect(way[0][0]).toBe(from);
        expect(way[way.length - 1][1]).toBe(from + step);
        expect(way.reduce((sum, [a, b]) => sum + (b - a), 0)).toBe(step);
      }
    }
  });
});

describe("jumpStart", () => {
  it("stays within 1 to 100 and mostly passes a ten", () => {
    const rng = seeded(3);
    let crossing = 0;
    for (let i = 0; i < 400; i++) {
      const step = [3, 4, 6, 7, 8, 9][i % 6];
      const dir = i % 2 === 0 ? 1 : -1;
      const start = jumpStart(rng, step, dir);
      expect(start + dir * step).toBeGreaterThanOrEqual(1);
      expect(start + dir * step).toBeLessThanOrEqual(100);
      if (crossesTen(start, start + dir * step)) crossing++;
    }
    expect(crossing / 400).toBeGreaterThan(0.6);
  });
});

describe("buildRound", () => {
  it("has ten tasks from seeing to doing, all within 1 to 100", () => {
    for (const stage of ALL) {
      for (let seed = 0; seed < 30; seed++) {
        const round = buildRound(stage, seeded(seed));
        expect(round).toHaveLength(ROUND_SIZE);
        expect(round.map((t) => t.section)).toEqual(["finden", "finden", "huepfen", "huepfen", "boegen", "boegen", "blitz", "blitz", "blitz", "blitz"]);
        for (const task of round) {
          for (const a of task.answers) {
            expect(Number.isInteger(a)).toBe(true);
            expect(a).toBeGreaterThanOrEqual(1);
            expect(a).toBeLessThanOrEqual(100);
          }
          if (task.kind === "step-row" || task.kind === "step-quick") {
            for (const n of task.numbers) expect(n).toBeGreaterThanOrEqual(1);
            expect(task.numbers[task.numbers.length - 1]).toBeLessThanOrEqual(100);
          }
        }
      }
    }
  });

  it("uses the steps of the stage, and an easier step for the last task", () => {
    for (const stage of ALL) {
      const steps = STAGES[stage - 1].steps;
      const round = buildRound(stage, seeded(stage));
      const stepOf = (t: (typeof round)[number]) =>
        t.kind === "step-find" ? t.to - t.from : t.step;
      for (const task of round.slice(0, -1)) expect(steps).toContain(stepOf(task));
      const last = round[round.length - 1];
      const easier = STAGES[(stage === 5 ? 2 : Math.max(stage - 1, 1)) - 1].steps;
      expect(easier).toContain(stepOf(last));
    }
  });

  it("hops one step forwards and one backwards", () => {
    const round = buildRound(3, seeded(9));
    const hops = round.filter((t) => t.kind === "step-hop");
    expect(hops.map((t) => t.kind === "step-hop" && t.dir)).toEqual([1, -1]);
  });
});

describe("hintJump", () => {
  const row = rowTask([12, 16, 20, 24, 28, 32, 36], 2);

  it("explains the step when the step is wrong", () => {
    expect(row.answers).toEqual([4, 12, 16, 32, 36]);
    expect(hintJump(row, [5, 12, 16, 32, 36])).toEqual({ from: 20, to: 24, ask: "step", step: 4 });
  });

  it("explains the first wrong number next to the given ones", () => {
    expect(hintJump(row, [4, 10, 14, 32, 36])).toEqual({ from: 20, to: 16, ask: "result", step: 4 });
    expect(hintJump(row, [4, 12, 16, 33, 36])).toEqual({ from: 28, to: 32, ask: "result", step: 4 });
    expect(hintJump(row, [4, 12, 16, 32, 35])).toEqual({ from: 32, to: 36, ask: "result", step: 4 });
  });

  it("works on both sides of a Blitz sequence", () => {
    const left = quickTask([58, 64, 70, 76, 82], "left", 3);
    expect(left.answers).toEqual([58, 64]);
    expect(hintJump(left, [70, 76])).toEqual({ from: 70, to: 64, ask: "result", step: 6 });
    expect(hintJump(left, [56, 64])).toEqual({ from: 64, to: 58, ask: "result", step: 6 });
    const right = quickTask([21, 25, 29, 33, 37], "right", 2);
    expect(hintJump(right, [33, 38])).toEqual({ from: 33, to: 37, ask: "result", step: 4 });
  });
});

describe("stage progress", () => {
  it("plays a round through and moves up at 8 of 10", () => {
    let store = stepsStoreApi.start(stepsStoreApi.load(), "2026-11-14", seeded(1));
    for (let i = 0; i < ROUND_SIZE; i++) store = stepsStoreApi.record(store, i !== 0);
    expect(store.stage).toBe(2);
    expect(store.passed).toBe(1);
    expect(store.rounds).toEqual([{ date: "2026-11-14", stage: 1, score: 9, total: 10 }]);
  });
});
