import type { Task } from "./tasks";
import { dayKey } from "./progress";

// Answers are sent to the server so her mistakes can be reviewed. Only a phone
// that opened the /daily#logkey=... link once sends anything, so the key never
// appears in the public site code. Logging must never get in the way of the
// game, so every failure here is silent and the answer stays queued.

const KEY_STORAGE = "mathe-log-key";
const QUEUE_STORAGE = "mathe-log-queue-v1";
const MAX_QUEUED = 500;
// Browsers refuse keepalive requests over 64 KB.
const BATCH_SIZE = 10;

export type Given = string | number | number[];

export interface AttemptInput {
  task: Task;
  given: Given;
  correct: boolean;
  /** 1 for her first try at this task, 2 for the second. */
  attempt: number;
  outcome: "correct" | "retry" | "revealed";
  /** Time since the task appeared. */
  ms: number;
}

export interface SessionStartInput {
  /** What the button did: a first round today, continuing one, or an extra round. */
  mode: "new" | "resume" | "again";
  position: number;
  taskCount: number;
}

interface LogEntry {
  id: string;
  at: string;
  day: string;
  [field: string]: unknown;
}

function readLogKey(): string | null {
  try {
    return localStorage.getItem(KEY_STORAGE);
  } catch {
    return null;
  }
}

export const isLoggingEnabled = () => readLogKey() !== null;

export function captureLogKey(): boolean {
  const match = window.location.hash.match(/^#logkey=([\w-]+)$/);
  if (!match) return false;
  try {
    localStorage.setItem(KEY_STORAGE, match[1]);
  } catch {
    return false;
  }
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return true;
}

function readQueue(): LogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_STORAGE) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue: LogEntry[]): boolean {
  try {
    localStorage.setItem(QUEUE_STORAGE, JSON.stringify(queue.slice(-MAX_QUEUED)));
    return true;
  } catch {
    return false;
  }
}

let flushing = false;

export async function flushAttempts() {
  const key = readLogKey();
  if (!key || flushing) return;
  flushing = true;
  try {
    for (;;) {
      const batch = readQueue().slice(0, BATCH_SIZE);
      if (batch.length === 0) return;
      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(batch),
        keepalive: true,
      });
      if (!response.ok) return;
      if (!writeQueue(readQueue().slice(batch.length))) return;
    }
  } catch {
    // Offline or server down: the queue is sent on the next answer or visit.
  } finally {
    flushing = false;
  }
}

function enqueue(fields: Record<string, unknown>) {
  if (!readLogKey()) return;
  const now = new Date();
  writeQueue([
    ...readQueue(),
    {
      ...fields,
      id: `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
      at: now.toISOString(),
      day: dayKey(now),
    },
  ]);
  void flushAttempts();
}

export function logAttempt(input: AttemptInput) {
  enqueue({ ...input, goal: input.task.goal });
}

export function logSessionStart(input: SessionStartInput) {
  enqueue({ ...input, type: "session-start" });
}

/** The server answers this entry by sending the round's report to Telegram. */
export function logSessionComplete(result: { score: number; total: number }) {
  enqueue({ ...result, type: "session-complete" });
}
