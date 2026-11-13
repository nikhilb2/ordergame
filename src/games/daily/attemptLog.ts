import { dayKey } from "./progress";

// Answers are sent to the server so her mistakes can be reviewed. Each phone
// creates its own ID the first time something is logged, which keeps phones
// apart in the log. Logging must never get in the way of the game, so every
// failure here is silent and the answer stays queued.

const DEVICE_STORAGE = "mathe-device-id";
const QUEUE_STORAGE = "mathe-log-queue-v1";
const MAX_QUEUED = 500;
// Browsers refuse keepalive requests over 64 KB.
const BATCH_SIZE = 10;

export type Given = string | number | number[];

/** Which exercise an entry comes from. Tagesübung entries leave it out. "thema" is the Themen-Training of one goal. */
export type Game = "halbieren" | "thema";

export interface AttemptInput {
  task: { goal: string };
  game?: Game;
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
  game?: Game;
  /** Themen-Training only: the goal being practised. */
  goal?: string;
}

interface LogEntry {
  id: string;
  at: string;
  day: string;
  device: string;
  [field: string]: unknown;
}

const newId = (now: Date = new Date()) => `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function deviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_STORAGE);
    if (existing) return existing;
    const created = newId();
    localStorage.setItem(DEVICE_STORAGE, created);
    return created;
  } catch {
    return "unknown";
  }
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
  if (flushing) return;
  flushing = true;
  try {
    for (;;) {
      const batch = readQueue().slice(0, BATCH_SIZE);
      if (batch.length === 0) return;
      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  const now = new Date();
  writeQueue([...readQueue(), { ...fields, id: newId(now), at: now.toISOString(), day: dayKey(now), device: deviceId() }]);
  void flushAttempts();
}

export function logAttempt(input: AttemptInput) {
  enqueue({ ...input, goal: input.task.goal });
}

export function logSessionStart(input: SessionStartInput) {
  enqueue({ ...input, type: "session-start" });
}

/** The server answers this entry by sending the round's report to Telegram. */
export function logSessionComplete(result: { score: number; total: number; game?: Game; goal?: string; topic?: string }) {
  enqueue({ ...result, type: "session-complete" });
}
