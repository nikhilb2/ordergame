import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StepTraining from "./StepTraining";
import HalvingTraining from "./HalvingTraining";
import { stepsStoreApi } from "./schritte/steps";

const fetchMock = vi.fn();
const sentEntries = () => fetchMock.mock.calls.flatMap(([, options]) => JSON.parse(options.body));

describe("Schritte-Training", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("lets the frog hop to the end, then logs the answer as Schritte-Training", async () => {
    render(
      <MemoryRouter>
        <StepTraining />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Los geht/ }));
    const task = stepsStoreApi.load().round!.tasks[0];
    expect(task.kind).toBe("step-find");
    if (task.kind !== "step-find") return;

    const hop = screen.getByRole("button", { name: /Hüpf/ });
    for (let i = 0; i < task.to - task.from; i++) fireEvent.click(hop);
    expect((hop as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: String(task.to - task.from + 1) } });
    fireEvent.click(screen.getByRole("button", { name: /Prüfen/ }));
    expect(screen.getByText("Zähle die Sprünge, nicht die Zahlen.")).toBeTruthy();

    await waitFor(() => expect(sentEntries().length).toBeGreaterThanOrEqual(2));
    const [start, answer] = sentEntries();
    expect(start).toMatchObject({ type: "session-start", game: "schritte", mode: "new" });
    expect(answer).toMatchObject({ game: "schritte", goal: "schritte", attempt: 1, correct: false, outcome: "retry" });
  });

  it("still opens the Halbieren-Training on the shared page", () => {
    render(
      <MemoryRouter>
        <HalvingTraining />
      </MemoryRouter>,
    );
    expect(screen.getByText("Halbieren-Training")).toBeTruthy();
    expect(screen.getByText("Ich kann halbieren")).toBeTruthy();
  });
});
