import { describe, expect, it } from "vitest";
import { PRACTICE_LENGTH, practiceDone, practiceLength, recordPracticeResult, roundsOf, setGoalLevel, startPractice } from "./practice";
import { buildSession, goalStatus, recordResult, type Store } from "./progress";

const empty = (): Store => ({ goals: {}, doneDays: [], session: null });

function play(store: Store, answers: boolean[]): Store {
  return answers.reduce((s, firstTry) => recordPracticeResult(s, firstTry), store);
}

describe("Themen-Training", () => {
  it("gives only tasks of the chosen goal and finishes after the round length", () => {
    let store = startPractice(empty(), "tafel-schritte", "2026-11-13");
    for (let i = 0; i < PRACTICE_LENGTH; i++) {
      const round = store.practice!;
      expect(round.tasks[round.index].goal).toBe("tafel-schritte");
      store = recordPracticeResult(store, true);
    }
    expect(practiceDone(store.practice!)).toBe(true);
    expect(store.practice!.score).toBe(PRACTICE_LENGTH);
  });

  it("raises the level during the round and shares it with the Tagesübung", () => {
    let store = startPractice(empty(), "verdoppeln", "2026-11-13");
    store = play(store, [true, true, true]);
    expect(store.goals.verdoppeln!.level).toBe(2);
    const round = store.practice!;
    expect(round.tasks[round.index].level).toBe(2);
    const daily = buildSession(store, "2026-11-13");
    expect(daily.tasks.find((t) => t.goal === "verdoppeln")!.level).toBe(2);
  });

  it("adds a task after a mistake, at most three times", () => {
    let store = startPractice(empty(), "begriffe", "2026-11-13");
    store = play(store, [false, false, false, false, false]);
    expect(practiceLength(store.practice!)).toBe(PRACTICE_LENGTH + 3);
  });

  it("keeps a record of finished rounds per goal", () => {
    let store = startPractice(empty(), "zahlenband", "2026-11-12");
    store = play(store, [false, ...Array(PRACTICE_LENGTH).fill(true)]);
    expect(practiceDone(store.practice!)).toBe(true);
    store = startPractice(store, "raetsel", "2026-11-13");
    store = play(store, Array(PRACTICE_LENGTH).fill(true));
    expect(roundsOf(store, "zahlenband")).toEqual([{ goal: "zahlenband", date: "2026-11-12", score: 10, total: 11, from: 1, to: 3 }]);
    expect(roundsOf(store, "raetsel")).toHaveLength(1);
    expect(goalStatus(store, "zahlenband")).not.toBe("neu");
  });

  it("resumes an unfinished round of the same goal and replaces it for another goal", () => {
    let store = play(startPractice(empty(), "zehnerzahlen", "2026-11-13"), [true, true]);
    expect(startPractice(store, "zehnerzahlen", "2026-11-13")).toBe(store);
    store = startPractice(store, "begriffe", "2026-11-13");
    expect(store.practice).toMatchObject({ goal: "begriffe", index: 0 });
  });

  it("lets parents set a level, and the Tagesübung keeps the topic history", () => {
    let store = setGoalLevel(empty(), "feld-finden", 3);
    store = startPractice(store, "feld-finden", "2026-11-13");
    expect(store.practice!.tasks[0].level).toBe(3);
    store = play(store, Array(PRACTICE_LENGTH).fill(true));

    const daily = { ...store, session: buildSession(store, "2026-11-13") };
    expect(recordResult(daily, true).practiceLog).toHaveLength(1);
  });
});
