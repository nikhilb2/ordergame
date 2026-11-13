import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TopicPractice from "./TopicPractice";
import { loadStore } from "./daily/progress";

const fetchMock = vi.fn();
const sentEntries = () => fetchMock.mock.calls.flatMap(([, options]) => JSON.parse(options.body));

function open(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/thema" element={<TopicPractice />} />
        <Route path="/thema/:goal" element={<TopicPractice />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Themen-Training", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("lists all twelve goals", () => {
    open("/thema");
    expect(screen.getByText("Zahlenrätsel")).toBeTruthy();
    expect(screen.getByText("Zehnerzahlen")).toBeTruthy();
  });

  it("logs the round and its answers as Themen-Training of that goal", async () => {
    open("/thema/zehnerzahlen");
    fireEvent.click(screen.getByRole("button", { name: /Los geht/ }));
    const task = loadStore().practice!.tasks[0];
    expect(task.goal).toBe("zehnerzahlen");

    const inputs = screen.getAllByRole("textbox");
    inputs.forEach((input) => fireEvent.change(input, { target: { value: "0" } }));
    fireEvent.click(screen.getByRole("button", { name: /Prüfen/ }));

    await waitFor(() => expect(sentEntries().length).toBeGreaterThanOrEqual(2));
    const [start, answer] = sentEntries();
    expect(start).toMatchObject({ type: "session-start", game: "thema", goal: "zehnerzahlen", mode: "new" });
    expect(answer).toMatchObject({ game: "thema", goal: "zehnerzahlen", attempt: 1 });
    expect(answer.task.level).toBe(1);
  });

  it("sends unknown topics back to the list", () => {
    open("/thema/gibt-es-nicht");
    expect(screen.getByText("Einzeln üben")).toBeTruthy();
  });
});
