# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A children's math learning game app for first-graders (~ages 6-7). The UI is in **German**. Built with Lovable and uses React + TypeScript + Vite.

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
