# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A children's math learning game app for first-graders (~ages 6-7). The UI is in **German**. Built with React + TypeScript + Vite.

## Commands

```bash
npm run dev          # Dev server at localhost:8080
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (single run)
npm run test:watch   # Vitest (watch mode)
```

## Architecture

**Routing** (`src/App.tsx`): BrowserRouter with routes for each game:
- `/` — Game menu (Index page)
- `/ordering` — NumberOrdering (drag-and-drop number sorting with @dnd-kit)
- `/compare` — CompareNumbers (compare two numbers with <, >, =)
- `/make-number` — MakeTheNumber (find two numbers that sum to a target)
- `/count` — CountAndMatch (count emojis and select the correct number)
- `/daily` — DailyExercise (daily session covering the school's Quintal goals; generators and localStorage progress live in `src/games/daily/`)
- `/thema` and `/thema/:goal` — TopicPractice ("Einzeln üben"): a 10-task round of one Quintal goal. It shares the per-goal levels with `/daily` (same localStorage store) and keeps finished rounds in `practiceLog`; logic in `src/games/daily/practice.ts`
- `/halbieren` — HalvingTraining (focused halving practice in 5 stages, in the format of Swiss 2nd-class Lernkontrollen; all answers typed; code in `src/games/halbieren/`)
- `/schritte` — StepTraining (counting in steps of 2–10 forwards and backwards in 5 stages; a frog hops one number at a time on the Rechenstrich, jumps are split at the ten; code in `src/games/schritte/`)
- `/rueckwaerts` — BackwardsTraining (counting backwards in 5 stages: to 20, across tens by 1, by 10, by 2 and 5, mixed; the frog says each number; code in `src/games/rueckwaerts/`)

The three trainings run on the shared page and progress store in `src/games/training/` (`StagedTraining`, `createStagedStore`): 10-task rounds, 8 of 10 on the first try passes a stage.

**Answer log**: `/daily`, `/thema`, `/halbieren`, `/schritte` and `/rueckwaerts` send each answer to `POST /api/attempts` (`src/games/daily/attemptLog.ts`), and `server/index.mjs` appends it to `/data/attempts.jsonl` on the cluster. Halbieren entries carry `game: "halbieren"`, Schritte entries carry `game: "schritte"`, Rückwärts entries carry `game: "rueckwaerts"`, topic rounds carry `game: "thema"` (their session entries also carry `goal`, and the Telegram report names the topic); Tagesübung entries have no `game`. Each phone creates its own `device` ID automatically, with no setup; the endpoint has no password and relies on rate and size limits. Read the log with `kubectl -n nikhil exec deploy/mathgame -- cat /data/attempts.jsonl` (entries can repeat after a network retry, so dedupe by `id`). When a round finishes, the server sends a report built in `server/report.mjs` to Telegram, using the `hire-me-online-telegram` Secret. To review her performance or create exercises for her mistakes, follow `docs/performance-review.md`.

**Game components** live in `src/games/`. Each game is a self-contained page component managing its own state with React hooks. There is no shared game state or global store — each game independently handles scoring, round progression, feedback animations, and confetti.

**Shared components**: `GameHeader` (navigation + score display), `Confetti` (celebration animation). The `src/components/ui/` directory contains shadcn/ui components built on Radix UI primitives.

**Styling**: Tailwind CSS with custom kid-friendly color tokens (`kid-yellow`, `kid-blue`, etc.) and gradient utilities defined in `src/index.css`. Font is Nunito. The theme uses HSL CSS variables.

**Path alias**: `@/*` maps to `src/*`.

## Key Patterns

- Each game generates a new puzzle via local state, tracks `score`/`total`, and shows `Confetti` on correct answers
- NumberOrdering uses `@dnd-kit/core` with `PointerSensor` + `TouchSensor` for mobile drag-and-drop support
- Animations use Framer Motion (`framer-motion`) and Tailwind keyframes
- TypeScript config is loose (no strict mode, unused variables allowed)
- ESLint uses flat config format (ESLint 9+)
