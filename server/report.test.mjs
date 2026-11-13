import { describe, expect, it } from "vitest";
import { buildReport } from "./report.mjs";

const day = "2026-11-08";
const device = "phone-abcd";
const start = (id, at, mode = "new") => ({ id, at, day, device, type: "session-start", mode });
const complete = (id, at, score, total) => ({ id, at, day, device, type: "session-complete", score, total });
const doubling = { goal: "verdoppeln", level: 2, prompt: "Verdopple die Zahl 7.", kind: "fill", layout: "plain", cells: [{ t: "Das Doppelte von 7 =" }, { a: 14 }] };
const attempt = (id, task, given, correct, outcome) => ({ id, at: "2026-11-08T19:05:00.000Z", day, device, goal: task.goal, task, given, correct, outcome });

describe("buildReport", () => {
  it("names the phone and keeps other phones' answers out", () => {
    const end = complete("c", "2026-11-08T19:09:00.000Z", 1, 1);
    const other = { ...attempt("x", doubling, [99], false, "revealed"), device: "other-phone" };
    const text = buildReport([start("s", "2026-11-08T19:00:00.000Z"), other, attempt("b", doubling, [14], true, "correct"), end], end);
    expect(text).toContain("Phone abcd");
    expect(text).toContain("No mistakes");
    expect(text).not.toContain("99");
  });

  it("lists what she answered and what was correct", () => {
    const end = complete("c", "2026-11-08T19:09:00.000Z", 0, 1);
    const text = buildReport(
      [start("s", "2026-11-08T19:00:00.000Z"), attempt("a", doubling, [12], false, "retry"), attempt("b", doubling, [16], false, "revealed"), end],
      end,
    );
    expect(text).toContain("First try: 0 of 1 correct");
    expect(text).toContain("9 min");
    expect(text).toContain("8 Nov");
    expect(text).toContain("20:09");
    expect(text).toContain("1. Verdopple die Zahl 7. (level 2)");
    expect(text).toContain("Das Doppelte von 7 = __");
    expect(text).toContain("Her answers: 12 → 16");
    expect(text).toContain("Correct: 14 (shown to her)");
  });

  it("does not repeat earlier rounds from the same day", () => {
    const first = complete("c1", "2026-11-08T10:00:00.000Z", 0, 1);
    const end = complete("c2", "2026-11-08T19:09:00.000Z", 1, 1);
    const text = buildReport(
      [
        start("s1", "2026-11-08T09:50:00.000Z"),
        attempt("a", doubling, [12], false, "revealed"),
        first,
        start("s2", "2026-11-08T19:00:00.000Z", "again"),
        attempt("b", doubling, [14], true, "correct"),
        end,
      ],
      end,
    );
    expect(text).toContain("(extra round)");
    expect(text).toContain("No mistakes");
    expect(text).not.toContain("Her answers");
  });

  it("includes tasks answered before she left and resumed", () => {
    const end = complete("c", "2026-11-08T19:09:00.000Z", 0, 2);
    const other = { ...doubling, prompt: "Verdopple die Zahl 8.", cells: [{ a: 16 }] };
    const text = buildReport(
      [
        start("s1", "2026-11-08T09:00:00.000Z"),
        attempt("a", doubling, [12], false, "revealed"),
        start("s2", "2026-11-08T19:00:00.000Z", "resume"),
        attempt("b", other, [15], false, "revealed"),
        end,
      ],
      end,
    );
    expect(text).toContain("die Zahl 7.");
    expect(text).toContain("die Zahl 8.");
  });

  it("ignores repeated entries from a network retry", () => {
    const end = complete("c", "2026-11-08T19:09:00.000Z", 0, 1);
    const wrong = attempt("a", doubling, [12], false, "revealed");
    const text = buildReport([start("s", "2026-11-08T19:00:00.000Z"), wrong, wrong, end, end], end);
    expect(text.match(/Her answers/g)).toHaveLength(1);
  });

  it("says when some tasks were not logged", () => {
    const end = complete("c", "2026-11-08T19:09:00.000Z", 3, 5);
    const text = buildReport([attempt("b", doubling, [14], true, "correct"), end], end);
    expect(text).toContain("Only 1 of 5 tasks were logged");
  });

  it("works out the correct answer for each task type", () => {
    const cases = [
      [{ kind: "choice", options: ["a", "b"], answer: "b" }, "x", "Correct: b"],
      [{ kind: "riddle", clues: [], answer: 42 }, [24], "Correct: 42"],
      [{ kind: "grid", cols: 2, compact: false, cells: [1, { a: 2 }, null, { a: 4 }] }, [3, 4], "Correct: 2, 4"],
      [{ kind: "order", numbers: [30, 10, 20] }, [10, 30, 20], "Correct: 10, 20, 30"],
      [{ kind: "band", from: 1, target: 7, labelEvery: 5 }, 6, "Correct: 7"],
      [{ kind: "field", target: 55, hints: true, fastMs: 3000 }, 56, "Correct: 55"],
      [{ kind: "steps", start: 10, step: 5, count: 3 }, [15, 21], "Correct: 15, 20, 25"],
    ];
    for (const [kind, given, expected] of cases) {
      const task = { goal: "raetsel", prompt: "Frage", ...kind };
      const end = complete("c", "2026-11-08T19:09:00.000Z", 0, 1);
      expect(buildReport([attempt("a", task, given, false, "revealed"), end], end)).toContain(expected);
    }
  });

  it("stays within Telegram's message limit", () => {
    const entries = Array.from({ length: 80 }, (_, i) => attempt(`a${i}`, { ...doubling, prompt: "x".repeat(100) }, [1], false, "revealed"));
    const end = complete("c", "2026-11-08T19:09:00.000Z", 0, 80);
    expect(buildReport([...entries, end], end).length).toBeLessThanOrEqual(4096);
  });

  it("reports a Halbieren-Training round on its own, with its answers", () => {
    const halving = { goal: "halbieren", level: 5, kind: "half-quick", n: 76, prompt: "Was ist die Hälfte von 76?", answers: [38], detail: "Die Hälfte von 76 ist __" };
    const game = (entry) => ({ ...entry, game: "halbieren" });
    const end = game(complete("c2", "2026-11-08T19:30:00.000Z", 0, 1));
    const text = buildReport(
      [
        start("s1", "2026-11-08T19:00:00.000Z"),
        attempt("a", doubling, [12], false, "revealed"),
        game(start("s2", "2026-11-08T19:20:00.000Z")),
        game(attempt("b", halving, [33], false, "retry")),
        attempt("x", doubling, [13], false, "retry"),
        game(attempt("c", halving, [38], true, "correct")),
        end,
      ],
      end,
    );
    expect(text).toContain("Halbieren-Training finished");
    expect(text).toContain("10 min");
    expect(text).toContain("Die Hälfte von 76 ist __");
    expect(text).toContain("Her answers: 33 → 38");
    expect(text).toContain("Correct: 38");
    expect(text).not.toContain("Verdopple");
  });

  it("names the topic of a Themen-Training round", () => {
    const thema = (entry) => ({ ...entry, game: "thema" });
    const end = thema({ ...complete("c", "2026-11-08T19:09:00.000Z", 0, 1), goal: "verdoppeln", topic: "Verdoppeln" });
    const text = buildReport([thema(start("s", "2026-11-08T19:00:00.000Z")), thema(attempt("a", doubling, [12], false, "revealed")), end], end);
    expect(text).toContain("Themen-Training: Verdoppeln finished");
    expect(text).toContain("Her answers: 12");
  });
});
