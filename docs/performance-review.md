# Reviewing her performance and building exercises

Follow this when asked to review her performance or make exercises for her mistakes.
The goal is practice aimed at mistakes she really makes, so start from the log, not from guesses.

## 1. Read the log

```bash
kubectl -n nikhil exec deploy/mathgame -- cat /data/attempts.jsonl > /tmp/attempts.jsonl
```

If the command fails, the file does not exist yet, which means no entries have arrived.
A tab left open keeps running the old version, so close it and reload the site on her phone.

- Save the copy outside the repo. **Never commit the log**: it is a child's learning data.
- The log is on one node's disk (`local-path-small`), so it is lost with that node. Offer to keep a dated copy each time.
- Remove duplicates by `id` first. A network retry can repeat an entry.
- Separate phones by `device`, and ask which one is hers. Anyone using the site is logged, including test rounds, and the endpoint has no password, so ignore entries that look wrong.
- Separate exercises by `game`: entries from the Halbieren-Training (`/halbieren`) have `game: "halbieren"`, entries from Einzeln üben (`/thema/<goal>`) have `game: "thema"`, and Tagesübung entries have no `game`. Topic rounds share the goal ids and levels of the Tagesübung, so per-goal accuracy can combine both; just note that ten tasks in a row of one topic are easier than mixed practice. Halbieren tasks list their right answers in `answers`, and `level` is the stage (1–5).
- Wait for enough data: about a week, or at least 5 finished rounds. With less, report what is there and call it early.

### What each line contains

| Entry | Fields |
| --- | --- |
| Answer (no `type`) | `goal`, `task` (the whole question, including `level`), `given`, `correct`, `attempt` (1 or 2), `outcome` (`correct`, `retry`, `revealed`), `ms` (since the task appeared), `at`, `day` |
| `type: "session-start"` | `mode` (`new`, `resume`, `again`), `position`, `taskCount`, `at`, `day` |
| `type: "session-complete"` | `score`, `total`, `at`, `day` |

`given` depends on the task `kind`:

| Kind | `given` |
| --- | --- |
| `choice` | The option she tapped |
| `band`, `field` | The number she tapped |
| `fill`, `grid`, `riddle` | The numbers she typed, in blank order |
| `order` | The numbers in the order she placed them |
| `steps` | The numbers tapped so far, ending with the last tap |

`correctAnswer` in `server/report.mjs` works out the right answer for each kind.

## 2. Find the patterns

Count her **first tries** (`attempt: 1`), because a second try has already had a hint.

1. Accuracy per goal and level, and how it changes from day to day.
2. Compare `given` with the correct answer. Accuracy per goal says where she struggles; this says why.
3. Look at slow correct answers using `ms`. Right but slow means not yet automatic, which is worth practice too.

Patterns to look for:

| Pattern | Example | Points to |
| --- | --- | --- |
| Swapped digits | 34 ↔ 43 | Tens and ones place value |
| Forgotten carry when doubling | Double of 37 is 64 | Doubling ones past 10 |
| Off by one | Neighbour of 40 is 42 | Counting boundaries |
| Off by ten | 55 instead of 45 | Rows versus columns on the Hundertertafel |
| Mistakes at tens boundaries | 39 → 50, or 90 → 100 | Crossing a ten |
| Wrong direction | Counts forward when asked backward | Reading the prompt, or direction on the number line |
| Mixed-up terms | Even versus odd, double versus half | Vocabulary (`begriffe`) |

Treat something as a pattern only if it appears **at least 3 times on at least 2 different days**.
One bad day or tired evening is not a pattern. Say how many cases each finding rests on.

## 3. Agree on the plan first

Before writing code, show the user the top 2 or 3 patterns with real examples and the exercises you propose, then let them choose.
For `zahlenfreunde`, ask what the teacher means first: that goal's content is an interpretation that has not been confirmed.

## 4. Build the exercises

The code is in `src/games/daily/`.

- **Prefer changing an existing generator** in `tasks.ts`. `GENERATORS` has one function per goal, `(rng, level) => Task`, and steering its numbers toward the weak spot is often enough.
- **Do not add entries to `GOALS` for practice.** That list mirrors the school's letter.
- **A focused round per goal exists**: `/thema/<goal>` (`practice.ts`). Steering a generator toward a weak spot changes both the Tagesübung and that topic round. `buildSession` in `progress.ts` also adds 3 extra tasks for her weakest goals.
- **A new task `kind`** needs four changes: the `Task` type, a view in `TaskViews.tsx` that passes `given` to `report`, a case in `TaskBody`, and a case in `correctAnswer`.
- Add tests in `daily.test.ts`. Use Swiss spelling (ss, never ß) in new German text.
- Keep it encouraging. A round takes about 10 minutes and ends on a success, and she should never see a list of her mistakes.

## 5. Deploy and check

Use the next unused image tag, and update `image:` in `k8s/10-deployment.yaml` to match. From the repo root:

```bash
./k8s/build-and-push.sh registry.kube.nikhilbhatia.com/ordergame vN && \
kubectl apply -f k8s/10-deployment.yaml && \
kubectl -n nikhil rollout status deploy/mathgame --timeout=240s
```

Claude's permission check has blocked production deploys before, so the user may need to run this.

At the next review, compare the targeted pattern against the numbers from before the change, and tell the user whether it improved.
