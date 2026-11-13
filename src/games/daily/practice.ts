import { generateTask, type GoalId, type Level, type Rng, type Task } from "./tasks";
import { nextGoalProgress, type Store } from "./progress";

// Themen-Training: a round of one goal only, so she can practise a single
// topic of the letter. It shares the per-goal levels with the Tagesübung, so
// practice here makes the daily round harder or easier for that goal too.

export const PRACTICE_LENGTH = 10;
const MAX_RETRIES = 3;
const MAX_LOGGED_ROUNDS = 200;

export interface PracticeRound {
  goal: GoalId;
  date: string;
  /** Generated one at a time, so each task uses the level reached so far. */
  tasks: Task[];
  index: number;
  score: number;
  retries: number;
}

export interface PracticeResult {
  goal: GoalId;
  date: string;
  score: number;
  total: number;
  /** Level at the start and at the end of the round. */
  from: Level;
  to: Level;
}

export const practiceLength = (round: PracticeRound) => PRACTICE_LENGTH + round.retries;
export const practiceDone = (round: PracticeRound) => round.index >= practiceLength(round);

export const goalLevel = (store: Store, goal: GoalId): Level => store.goals[goal]?.level ?? 1;

function freshTask(goal: GoalId, level: Level, earlier: Task[], rng: Rng): Task {
  const seen = new Set(earlier.map((t) => JSON.stringify(t)));
  let task = generateTask(goal, level, rng);
  for (let i = 0; i < 5 && seen.has(JSON.stringify(task)); i++) task = generateTask(goal, level, rng);
  return task;
}

/** Continues an unfinished round of the same goal, otherwise starts a new one. */
export function startPractice(store: Store, goal: GoalId, date: string, rng: Rng = Math.random): Store {
  const current = store.practice;
  if (current && current.goal === goal && current.index > 0 && !practiceDone(current)) return store;
  const first = freshTask(goal, goalLevel(store, goal), [], rng);
  return { ...store, practice: { goal, date, tasks: [first], index: 0, score: 0, retries: 0 } };
}

export function recordPracticeResult(store: Store, firstTry: boolean, rng: Rng = Math.random): Store {
  const round = store.practice;
  if (!round || practiceDone(round)) return store;
  const progress = nextGoalProgress(store.goals[round.goal] ?? { level: 1, history: [] }, firstTry);

  // A wrong answer adds one more task, so the round ends on a success.
  const retries = round.retries + (!firstTry && round.retries < MAX_RETRIES ? 1 : 0);
  const next: PracticeRound = { ...round, index: round.index + 1, score: round.score + (firstTry ? 1 : 0), retries };
  let practiceLog = store.practiceLog ?? [];
  if (practiceDone(next)) {
    const result: PracticeResult = { goal: round.goal, date: round.date, score: next.score, total: next.index, from: round.tasks[0].level ?? 1, to: progress.level };
    practiceLog = [...practiceLog, result].slice(-MAX_LOGGED_ROUNDS);
  } else {
    next.tasks = [...round.tasks, freshTask(round.goal, progress.level, round.tasks, rng)];
  }

  return { ...store, goals: { ...store.goals, [round.goal]: progress }, practice: next, practiceLog };
}

export const roundsOf = (store: Store, goal: GoalId) => (store.practiceLog ?? []).filter((r) => r.goal === goal);

/** For parents: move a goal to another level. Its record starts over there. */
export function setGoalLevel(store: Store, goal: GoalId, level: Level): Store {
  const practice = store.practice?.goal === goal ? null : store.practice;
  return { ...store, goals: { ...store.goals, [goal]: { level, history: [] } }, practice };
}
