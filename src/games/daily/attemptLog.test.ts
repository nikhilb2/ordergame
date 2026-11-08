import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushAttempts, logAttempt, logSessionStart, type AttemptInput } from "./attemptLog";
import type { Task } from "./tasks";

const task: Task = { goal: "verdoppeln", level: 2, prompt: "Das Doppelte von 12", kind: "riddle", clues: [], answer: 24 };
const input: AttemptInput = { task, given: [23], correct: false, attempt: 1, outcome: "retry", ms: 4200 };
const queued = () => JSON.parse(localStorage.getItem("mathe-log-queue-v1") ?? "[]");
const sent = () => fetchMock.mock.calls.flatMap(([, options]) => JSON.parse(options.body));
const settle = () => new Promise((resolve) => setTimeout(resolve));
const fetchMock = vi.fn();

describe("attempt log", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("needs no setup: the first press creates the phone's ID and sends it", async () => {
    expect(localStorage.getItem("mathe-device-id")).toBeNull();
    logSessionStart({ mode: "new", position: 0, taskCount: 15 });
    await settle();
    const id = localStorage.getItem("mathe-device-id");
    expect(id).toBeTruthy();
    expect(sent()[0]).toMatchObject({ type: "session-start", mode: "new", device: id });
  });

  it("keeps the same ID for later entries", async () => {
    logSessionStart({ mode: "new", position: 0, taskCount: 15 });
    logAttempt(input);
    await settle();
    const devices = new Set(sent().map((entry) => entry.device));
    expect(devices.size).toBe(1);
  });

  it("sends what she answered", async () => {
    logAttempt(input);
    await settle();
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/attempts");
    expect(sent()[0]).toMatchObject({ goal: "verdoppeln", given: [23], correct: false, attempt: 1, ms: 4200 });
    expect(sent()[0].task.level).toBe(2);
    expect(queued()).toEqual([]);
  });

  it("keeps answers made offline and sends them later", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    logAttempt(input);
    await settle();
    expect(queued()).toHaveLength(1);

    fetchMock.mockResolvedValue({ ok: true });
    await flushAttempts();
    expect(queued()).toEqual([]);
  });

  it("keeps the answers if the server refuses them", async () => {
    fetchMock.mockResolvedValue({ ok: false });
    logAttempt(input);
    await settle();
    expect(queued()).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends a long backlog in small batches", async () => {
    localStorage.setItem("mathe-log-queue-v1", JSON.stringify(Array.from({ length: 25 }, (_, i) => ({ id: String(i) }))));
    await flushAttempts();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toHaveLength(10);
    expect(queued()).toEqual([]);
  });
});
