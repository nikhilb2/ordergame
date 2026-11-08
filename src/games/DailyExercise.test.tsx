import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DailyExercise from "./DailyExercise";
import { dayKey } from "./daily/progress";
import type { Task } from "./daily/tasks";

const fetchMock = vi.fn();

function startWith(task: Task) {
  localStorage.setItem(
    "mathe-tagesuebung-v1",
    JSON.stringify({
      goals: {},
      doneDays: [],
      session: { date: dayKey(), tasks: [task, task], index: 0, score: 0, retries: 0 },
    }),
  );
  render(
    <MemoryRouter>
      <DailyExercise />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Los geht/ }));
}

const sentEntries = () => fetchMock.mock.calls.flatMap(([, options]) => JSON.parse(options.body));
const sentAttempts = () => sentEntries().filter((entry) => !entry.type);

describe("Tagesübung answer logging", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("records pressing the start button before any answer", async () => {
    startWith({ goal: "verdoppeln", level: 1, prompt: "Das Doppelte von 7?", kind: "choice", options: ["12", "14"], answer: "14" });

    await waitFor(() => expect(sentEntries()).toHaveLength(1));
    expect(sentEntries()[0]).toMatchObject({ type: "session-start", mode: "new", position: 0, taskCount: 2, day: dayKey() });
  });

  it("logs a wrong multiple-choice answer, then the correct retry", async () => {
    startWith({ goal: "verdoppeln", level: 1, prompt: "Das Doppelte von 7?", kind: "choice", options: ["12", "14"], answer: "14" });

    fireEvent.click(screen.getByRole("button", { name: "12" }));
    await waitFor(() => expect(sentAttempts()).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: "14" }));
    await waitFor(() => expect(sentAttempts()).toHaveLength(2));

    const [first, second] = sentAttempts();
    expect(first).toMatchObject({ goal: "verdoppeln", given: "12", correct: false, attempt: 1, outcome: "retry" });
    expect(first.task.level).toBe(1);
    expect(second).toMatchObject({ given: "14", correct: true, attempt: 2, outcome: "correct" });
  });

  it("marks the round as finished only after the last task", async () => {
    startWith({ goal: "verdoppeln", level: 1, prompt: "Das Doppelte von 7?", kind: "choice", options: ["12", "14"], answer: "14" });
    const finished = () => sentEntries().filter((entry) => entry.type === "session-complete");

    fireEvent.click(screen.getByRole("button", { name: "14" }));
    await waitFor(() => expect(sentAttempts()).toHaveLength(1));
    expect(finished()).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: /Weiter/ }));
    fireEvent.click(screen.getByRole("button", { name: "14" }));

    await waitFor(() => expect(finished()).toHaveLength(1));
    expect(finished()[0]).toMatchObject({ score: 2, total: 2, day: dayKey() });
  });

  it("logs the numbers she typed", async () => {
    startWith({ goal: "tafel-aufbau", level: 2, prompt: "Ergänze", kind: "riddle", clues: [], answer: 42 });

    fireEvent.change(screen.getByLabelText("Antwort"), { target: { value: "24" } });
    fireEvent.click(screen.getByRole("button", { name: /Prüfen/ }));

    await waitFor(() => expect(sentAttempts()).toHaveLength(1));
    expect(sentAttempts()[0]).toMatchObject({ given: [24], correct: false, attempt: 1 });
  });
});
