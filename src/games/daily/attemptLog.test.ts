import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureLogKey, flushAttempts, isLoggingEnabled, logAttempt, type AttemptInput } from "./attemptLog";
import type { Task } from "./tasks";

const task: Task = { goal: "verdoppeln", level: 2, prompt: "Das Doppelte von 12", kind: "riddle", clues: [], answer: 24 };
const input: AttemptInput = { task, given: [23], correct: false, attempt: 1, outcome: "retry", ms: 4200 };
const queued = () => JSON.parse(localStorage.getItem("mathe-log-queue-v1") ?? "[]");
const settle = () => new Promise((resolve) => setTimeout(resolve));

describe("attempt log", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    window.location.hash = "";
  });

  afterEach(() => vi.unstubAllGlobals());

  it("stores the key from the link and removes it from the address bar", () => {
    window.location.hash = "#logkey=abc-123";
    captureLogKey();
    expect(isLoggingEnabled()).toBe(true);
    expect(window.location.hash).toBe("");
  });

  it("sends nothing on a phone without the key", async () => {
    logAttempt(input);
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(queued()).toEqual([]);
  });

  it("sends what she answered, with the key", async () => {
    localStorage.setItem("mathe-log-key", "secret");
    logAttempt(input);
    await settle();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/attempts");
    expect(options.headers.Authorization).toBe("Bearer secret");
    const [sent] = JSON.parse(options.body);
    expect(sent).toMatchObject({ goal: "verdoppeln", given: [23], correct: false, attempt: 1, ms: 4200 });
    expect(sent.task.level).toBe(2);
    expect(queued()).toEqual([]);
  });

  it("keeps answers made offline and sends them later", async () => {
    localStorage.setItem("mathe-log-key", "secret");
    fetchMock.mockRejectedValue(new Error("offline"));
    logAttempt(input);
    await settle();
    expect(queued()).toHaveLength(1);

    fetchMock.mockResolvedValue({ ok: true });
    await flushAttempts();
    expect(queued()).toEqual([]);
  });

  it("keeps the answers if the server rejects them", async () => {
    localStorage.setItem("mathe-log-key", "wrong");
    fetchMock.mockResolvedValue({ ok: false });
    logAttempt(input);
    await settle();
    expect(queued()).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends a long backlog in small batches", async () => {
    localStorage.setItem("mathe-log-key", "secret");
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    localStorage.setItem("mathe-log-queue-v1", JSON.stringify(Array.from({ length: 25 }, (_, i) => ({ id: String(i) }))));
    await flushAttempts();
    expect(queued()).toHaveLength(25);
    await flushAttempts();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toHaveLength(10);
    expect(queued()).toEqual([]);
  });
});
