# GitHub Copilot Instructions

## Project Overview

**Mathe Abenteuer** — A children's math learning game for first-graders (~ages 6–7). The app name and all UI text are entirely in **German**. Built with React + TypeScript + Vite.

## Commands

```bash
npm run dev          # Dev server at localhost:8080
npm run build        # Production build → dist/
npm run lint         # ESLint (flat config, ESLint 9+)
npm run test         # Vitest single run
npm run test:watch   # Vitest watch mode
npm run preview      # Preview built dist/
```

## Architecture

**Routing** (`src/App.tsx`): BrowserRouter with the following routes:

| Route | Component | Description |
|---|---|---|
| `/` | Index | Game menu |
| `/ordering` | NumberOrdering | Drag-and-drop number sorting |
| `/compare` | CompareNumbers | Choose <, >, or = between two numbers |
| `/make-number` | MakeTheNumber | Find pairs that sum to a target |
| `/count` | CountAndMatch | Count emojis, select correct number |
| `/placement` | NumberPlacement | Drag numbers into comparison equation slots |
| `/dice` | DiceAddition | Sum two dice values |
| `/subtract` | SubtractionDots | Cross out dots to visualize subtraction |

**Games** live in `src/games/`. Each game is a fully self-contained page component — no global state, no shared store.

**Shared components** (`src/components/`):
- `GameHeader` — Title, emoji, score/total badge, back button, speech replay button. Props: `title`, `emoji`, `score`, `total`, `onReplay?`
- `Confetti` — 30-piece burst animation (2.5 s). Props: `show: boolean`
- `NavLink` — Styled router link for the game menu

**UI primitives**: `src/components/ui/` contains shadcn/ui components built on Radix UI — use them for any new UI needs, but they are mostly unused in the games themselves.

## New Game Pattern

All games follow this exact structure:

```tsx
// 1. State
const [problem, setProblem] = useState(generateProblem);
const [score, setScore] = useState(0);
const [total, setTotal] = useState(0);
const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
const [showConfetti, setShowConfetti] = useState(false);

// 2. Puzzle generation — numbers typically in range 1–20
function generateProblem() { /* return { answer, ...displayData } */ }

// 3. Check answer
const check = (userAnswer: number) => {
  setTotal(t => t + 1);
  if (userAnswer === problem.answer) {
    setScore(s => s + 1);
    setFeedback("correct");
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 100);
  } else {
    setFeedback("wrong");
  }
};

// 4. Next round
const next = () => { setProblem(generateProblem()); setFeedback(null); };

// 5. Render
return (
  <div className="min-h-screen bg-gradient-fun flex flex-col">
    <GameHeader title="Spielname" emoji="🎯" score={score} total={total} onReplay={...} />
    <Confetti show={showConfetti} />
    {/* game UI */}
    {feedback === "correct" && <p>🎉 Richtig!</p>}
    {feedback === "wrong" && <p>😊 Die Antwort ist {problem.answer}</p>}
  </div>
);
```

**Speech**: use `useSpeech` (`src/hooks/use-speech.ts`) to speak German instructions on mount and on replay.

**Register new games** in both `src/App.tsx` (Route) and `src/pages/Index.tsx` (menu card).

## Styling

**Tailwind custom color tokens** (defined in `src/index.css`, used as `bg-kid-*`, `text-kid-*`):

| Token | Color |
|---|---|
| `kid-yellow` | Bright yellow |
| `kid-orange` | Warm orange |
| `kid-pink` | Vibrant pink |
| `kid-purple` | Playful purple |
| `kid-green` | Fresh green |
| `kid-blue` | Bright blue |
| `kid-red` | Accent red |

**Gradient utilities** (use as `bg-gradient-*`):
`gradient-fun`, `gradient-sunny`, `gradient-ocean`, `gradient-forest`, `gradient-candy`, `gradient-dice`, `gradient-subtract`

**Font**: Nunito (all weights 400–900). **Rounded corners**: base radius 1 rem. **Hide number spinners**: `.no-spinner` class.

## Key Dependencies

| Package | Purpose |
|---|---|
| `framer-motion` | Spring animations, `AnimatePresence` |
| `@dnd-kit/core` | Drag-and-drop (NumberOrdering, NumberPlacement) |
| `lucide-react` | Icons (`ArrowLeft`, `RefreshCw`, `Volume2`, etc.) |
| `react-router-dom` v6 | Client-side routing |
| `@radix-ui/*` | Accessible UI primitives (via shadcn/ui) |

Several packages are installed but not actively used in games: `@tanstack/react-query`, `date-fns`, `recharts`, `embla-carousel-react`, `sonner`.

## TypeScript & Linting

TypeScript is configured in **loose mode** — `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals: false`. Do not enable strict mode. Path alias `@/*` → `src/*`.

ESLint uses **flat config** (`eslint.config.js`) — ESLint 9+. Run `npm run lint` to check.

## Testing

Vitest with jsdom. Test files match `src/**/*.{test,spec}.{ts,tsx}`. Setup file: `src/test/setup.ts` (polyfills `window.matchMedia`). Run `npm run test` before finishing any feature.

## Deployment

Docker + Nginx (`Dockerfile`, `nginx.conf`). Kubernetes manifests in `k8s/`. Build and push via `k8s/build-and-push.sh`.
