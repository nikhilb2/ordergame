import type { Rng } from "../daily/tasks";

// Progress of a training with stages (Halbieren, Schritte), kept on the phone.
// A round has a fixed list of tasks; 8 of 10 on the first try passes a stage.

export interface StagedRound<T, S extends number = number> {
  date: string;
  stage: S;
  tasks: T[];
  index: number;
  score: number;
}

export interface StagedStore<T, S extends number = number> {
  stage: S;
  /** The highest stage she has passed, 0 for none. */
  passed: number;
  rounds: { date: string; stage: S; score: number; total: number }[];
  round: StagedRound<T, S> | null;
}

/** 8 of 10 on the first try passes a stage; 4 or fewer goes back one. */
export function nextStage<S extends number>(stage: S, score: number, total: number, maxStage: number): { stage: S; passed: boolean } {
  const passed = score >= Math.ceil(total * 0.8);
  if (passed) return { stage: Math.min(stage + 1, maxStage) as S, passed };
  if (score <= Math.floor(total * 0.4)) return { stage: Math.max(stage - 1, 1) as S, passed };
  return { stage, passed };
}

export function createStagedStore<T, S extends number>(options: {
  storageKey: string;
  maxStage: number;
  buildRound: (stage: S, rng: Rng) => T[];
}) {
  const empty = (): StagedStore<T, S> => ({ stage: 1 as S, passed: 0, rounds: [], round: null });

  function load(): StagedStore<T, S> {
    try {
      const raw = localStorage.getItem(options.storageKey);
      return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
    } catch {
      return empty();
    }
  }

  function save(store: StagedStore<T, S>) {
    try {
      localStorage.setItem(options.storageKey, JSON.stringify(store));
    } catch {
      // Private mode or blocked storage: the round still works until the page closes.
    }
  }

  function start(store: StagedStore<T, S>, date: string, rng: Rng = Math.random): StagedStore<T, S> {
    const { round } = store;
    if (round && round.index < round.tasks.length) return store;
    return { ...store, round: { date, stage: store.stage, tasks: options.buildRound(store.stage, rng), index: 0, score: 0 } };
  }

  function record(store: StagedStore<T, S>, firstTry: boolean): StagedStore<T, S> {
    const round = store.round;
    if (!round) return store;
    const next = { ...round, index: round.index + 1, score: round.score + (firstTry ? 1 : 0) };
    if (next.index < next.tasks.length) return { ...store, round: next };

    const result = nextStage(round.stage, next.score, next.tasks.length, options.maxStage);
    return {
      stage: result.stage,
      passed: result.passed ? Math.max(store.passed, round.stage) : store.passed,
      rounds: [...store.rounds, { date: round.date, stage: round.stage, score: next.score, total: next.tasks.length }].slice(-100),
      round: next,
    };
  }

  return { load, save, start, record };
}

export type StagedStoreApi<T, S extends number> = ReturnType<typeof createStagedStore<T, S>>;
