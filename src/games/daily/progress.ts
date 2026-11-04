import { GOALS, generateTask, shuffle, type GoalId, type Level, type Rng, type Task } from "./tasks";

const STORAGE_KEY = "mathe-tagesuebung-v1";
const EXTRA_TASKS = 3;
const MAX_RETRIES = 4;

export interface GoalProgress {
  level: Level;
  // First-try results at the current level, newest last.
  history: boolean[];
}

export interface Session {
  date: string;
  tasks: Task[];
  index: number;
  score: number;
  retries: number;
}

export interface Store {
  goals: Partial<Record<GoalId, GoalProgress>>;
  doneDays: string[];
  session: Session | null;
}

export type GoalStatus = "neu" | "ueben" | "sicher";

const emptyStore = (): Store => ({ goals: {}, doneDays: [], session: null });

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...emptyStore(), ...JSON.parse(raw) } : emptyStore();
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: Store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Private mode or blocked storage: the session still works until the page closes.
  }
}

export function dayKey(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const goalProgress = (store: Store, goal: GoalId): GoalProgress => store.goals[goal] ?? { level: 1, history: [] };

export function goalStatus(store: Store, goal: GoalId): GoalStatus {
  const { level, history } = goalProgress(store, goal);
  if (level === 1 && history.length === 0) return "neu";
  const recent = history.slice(-5);
  const hits = recent.filter(Boolean).length;
  return level === 3 && recent.length === 5 && hits >= 4 ? "sicher" : "ueben";
}

export function nextGoalProgress(progress: GoalProgress, firstTry: boolean): GoalProgress {
  const history = [...progress.history, firstTry].slice(-10);
  const last = history.slice(-3);
  if (progress.level < 3 && last.length === 3 && last.every(Boolean)) {
    return { level: (progress.level + 1) as Level, history: [] };
  }
  if (progress.level > 1 && history.length >= 2 && !history[history.length - 1] && !history[history.length - 2]) {
    return { level: (progress.level - 1) as Level, history: [] };
  }
  return { level: progress.level, history };
}

function weakestGoals(store: Store, rng: Rng): GoalId[] {
  const weakness = (goal: GoalId) => {
    const { level, history } = goalProgress(store, goal);
    const accuracy = history.length ? history.filter(Boolean).length / history.length : 0.5;
    return (goalStatus(store, goal) === "sicher" ? 10 : 0) + level + accuracy;
  };
  return shuffle(rng, GOALS.map((g) => g.id)).sort((a, b) => weakness(a) - weakness(b));
}

// Every goal once, plus extra practice on whatever is shakiest right now.
export function buildSession(store: Store, date: string, rng: Rng = Math.random): Session {
  const goals = [...GOALS.map((g) => g.id), ...weakestGoals(store, rng).slice(0, EXTRA_TASKS)];
  const seen = new Set<string>();
  const tasks = shuffle(rng, goals).map((goal) => {
    const level = goalProgress(store, goal).level;
    let task = generateTask(goal, level, rng);
    for (let i = 0; i < 5 && seen.has(JSON.stringify(task)); i++) task = generateTask(goal, level, rng);
    seen.add(JSON.stringify(task));
    return task;
  });
  return { date, tasks, index: 0, score: 0, retries: 0 };
}

export function startSession(store: Store, date: string, rng: Rng = Math.random): Store {
  const { session } = store;
  if (session && session.date === date && session.index < session.tasks.length) return store;
  return { ...store, session: buildSession(store, date, rng) };
}

export function recordResult(store: Store, firstTry: boolean, rng: Rng = Math.random): Store {
  const session = store.session;
  if (!session) return store;
  const task = session.tasks[session.index];
  const progress = nextGoalProgress(goalProgress(store, task.goal), firstTry);
  const goals = { ...store.goals, [task.goal]: progress };

  // A wrong answer comes back later as a fresh problem, so the day ends on a success.
  const retry = !firstTry && session.retries < MAX_RETRIES;
  const tasks = retry ? [...session.tasks, generateTask(task.goal, progress.level, rng)] : session.tasks;
  const index = session.index + 1;
  const done = index >= tasks.length;

  return {
    goals,
    doneDays: done && !store.doneDays.includes(session.date) ? [...store.doneDays, session.date] : store.doneDays,
    session: { ...session, tasks, index, score: session.score + (firstTry ? 1 : 0), retries: session.retries + (retry ? 1 : 0) },
  };
}

export function streak(doneDays: string[], today: Date = new Date()): number {
  const done = new Set(doneDays);
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // Today not done yet does not break the streak until the day is over.
  if (!done.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (done.has(dayKey(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
