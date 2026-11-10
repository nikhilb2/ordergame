import type { ReactNode } from "react";
import { CheckButton, useBlanks, type Report } from "../daily/TaskViews";
import { splitForHalving, type HalfTask } from "./halving";

// --- Pictures ---

/** A Zehnerstreifen (or half of one): one strip with a line between the squares. */
function Bar({ squares, tone }: { squares: number; tone: string }) {
  return (
    <div className={`flex flex-col w-4 md:w-5 rounded-md overflow-hidden border-2 border-foreground/30 ${tone}`}>
      {Array.from({ length: squares }, (_, i) => (
        <div key={i} className="h-3 md:h-4 border-b border-white/80 last:border-b-0" />
      ))}
    </div>
  );
}

function Dots({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 gap-1 content-start">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-kid-orange" />
      ))}
    </div>
  );
}

/** One half of n: whole Zehnerstreifen, a Zehner cut in two when the tens are odd, and the ones. */
function HalfSide({ n }: { n: number }) {
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return (
    <div className="flex items-start gap-1.5 justify-center min-h-12 flex-1 py-2">
      {Array.from({ length: Math.floor(tens / 2) }, (_, i) => (
        <Bar key={i} squares={10} tone="bg-kid-blue" />
      ))}
      {tens % 2 === 1 && <Bar squares={5} tone="bg-kid-purple" />}
      {ones > 0 && <Dots count={ones / 2} />}
    </div>
  );
}

/** n laid out with Zehnerstreifen and Einerpunkte, split fairly down the middle. */
export function HalfPicture({ n }: { n: number }) {
  return (
    <figure className="max-w-md mx-auto" aria-label={`${n} in zwei gleiche Hälften geteilt`}>
      <div className="flex items-stretch bg-kid-blue/5 rounded-2xl px-2">
        <HalfSide n={n} />
        <div className="border-l-4 border-dashed border-kid-red mx-1" />
        <HalfSide n={n} />
      </div>
      {Math.floor(n / 10) % 2 === 1 && (
        <figcaption className="text-center text-sm font-bold text-muted-foreground mt-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-kid-purple align-middle" /> Ein Zehner wird in 5 und 5 geteilt.
        </figcaption>
      )}
    </figure>
  );
}

const NOTE_TONES: Record<number, string> = { 100: "bg-kid-blue/70", 50: "bg-kid-green/70", 20: "bg-kid-red/60", 10: "bg-kid-yellow" };

function MoneyPicture({ n }: { n: number }) {
  const pieces: number[] = [];
  let rest = n;
  for (const value of [100, 50, 20, 10, 5, 2, 1]) {
    while (rest >= value) {
      pieces.push(value);
      rest -= value;
    }
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" aria-label={`${n} Franken`}>
      {pieces.map((value, i) =>
        value >= 10 ? (
          <div key={i} className={`${NOTE_TONES[value]} w-20 h-11 rounded-md border-2 border-foreground/20 flex items-center justify-center font-black text-foreground`}>
            {value} Fr.
          </div>
        ) : (
          <div key={i} className="bg-muted w-11 h-11 rounded-full border-2 border-foreground/20 flex items-center justify-center font-black text-foreground">
            {value}
          </div>
        ),
      )}
    </div>
  );
}

function RibbonPicture({ n }: { n: number }) {
  return (
    <div className="max-w-md mx-auto">
      <p className="text-center font-black text-foreground mb-4">{n} cm</p>
      <div className="relative h-5 bg-kid-pink rounded-full">
        <div className="absolute left-1/2 -top-3 -bottom-3 border-l-4 border-dashed border-foreground" />
      </div>
      <p className="text-center text-2xl mt-2" aria-hidden>
        ✂️
      </p>
    </div>
  );
}

function CookiePicture({ n }: { n: number }) {
  return (
    <div className="flex flex-wrap justify-center gap-1 text-3xl max-w-sm mx-auto" aria-label={`${n} Kekse`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i}>🍪</span>
      ))}
    </div>
  );
}

// --- Rechenweg shown after a wrong answer ---

const Line = ({ children }: { children: ReactNode }) => <p className="text-lg md:text-xl font-bold text-foreground">{children}</p>;

/** How to halve n, step by step. Before the last try the final sum stays open. */
export function Rechenweg({ n, reveal }: { n: number; reveal: boolean }) {
  const parts = splitForHalving(n);
  const result = reveal ? n / 2 : "?";
  return (
    <div className="bg-kid-yellow/15 rounded-2xl p-4 mt-5 space-y-2 text-center">
      <p className="font-black text-foreground">💡 So geht es:</p>
      <HalfPicture n={n} />
      {parts.length > 1 ? (
        <>
          <Line>
            {n} = {parts[0]} + {parts[1]}
          </Line>
          <Line>
            Die Hälfte von {parts[0]} ist {parts[0] / 2}. Die Hälfte von {parts[1]} ist {parts[1] / 2}.
          </Line>
          <Line>
            {parts[0] / 2} + {parts[1] / 2} = {result}
          </Line>
        </>
      ) : (
        <Line>
          Teile {n} in zwei gleiche Teile. Die Hälfte von {n} ist {result}.
        </Line>
      )}
    </div>
  );
}

export function DoublingHint({ half, reveal }: { half: number; reveal: boolean }) {
  return (
    <div className="bg-kid-yellow/15 rounded-2xl p-4 mt-5 space-y-2 text-center">
      <p className="font-black text-foreground">💡 So geht es:</p>
      <Line>Halbieren rückwärts heisst verdoppeln.</Line>
      <Line>
        {half} + {half} = {reveal ? half * 2 : "?"}
      </Line>
    </div>
  );
}

// --- Task views ---

const NumberChip = ({ n }: { n: number | string }) => (
  <span className="min-w-14 h-14 md:min-w-16 md:h-16 px-2 bg-kid-blue text-primary-foreground rounded-xl inline-flex items-center justify-center text-2xl md:text-3xl font-black">
    {n}
  </span>
);
const Word = ({ children }: { children: ReactNode }) => <span className="text-xl md:text-2xl font-black text-foreground">{children}</span>;
const Sentence = ({ children }: { children: ReactNode }) => <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">{children}</div>;

const BIG = "w-20 h-16 md:w-24 md:h-16 text-3xl";
const SMALL = "w-16 h-14 md:w-20 md:h-16 text-2xl md:text-3xl";

function SplitView({ task, report }: { task: Extract<HalfTask, { kind: "half-split" }>; report: Report }) {
  const { blank, check, closed, container, complete } = useBlanks(task.answers, report);
  const [first, second] = task.parts;
  return (
    <div ref={container} className="space-y-4">
      <HalfPicture n={task.n} />
      {second !== undefined ? (
        <>
          <Sentence>
            <NumberChip n={task.n} /> <Word>=</Word> <NumberChip n={first} /> <Word>+</Word> <NumberChip n={second} />
          </Sentence>
          <Sentence>
            <Word>Die Hälfte von {first} ist</Word> {blank(0, SMALL)}
          </Sentence>
          <Sentence>
            <Word>Die Hälfte von {second} ist</Word> {blank(1, SMALL)}
          </Sentence>
          <Sentence>
            <Word>Die Hälfte von {task.n} ist</Word> {blank(2, SMALL)}
          </Sentence>
        </>
      ) : (
        <Sentence>
          <Word>Die Hälfte von</Word> <NumberChip n={task.n} /> <Word>ist</Word> {blank(0, BIG)}
        </Sentence>
      )}
      {!closed && <CheckButton onClick={check} disabled={!complete} />}
    </div>
  );
}

function TableView({ task, report }: { task: Extract<HalfTask, { kind: "half-table" }>; report: Report }) {
  const { blank, check, closed, container, complete } = useBlanks(task.answers, report);
  return (
    <div ref={container}>
      <table className="mx-auto border-separate border-spacing-1.5">
        <thead>
          <tr>
            <th className="px-4 py-2 bg-kid-blue/15 rounded-lg text-lg font-black text-foreground">Zahl</th>
            <th className="px-4 py-2 bg-kid-blue/15 rounded-lg text-lg font-black text-foreground">die Hälfte</th>
          </tr>
        </thead>
        <tbody>
          {task.numbers.map((n, i) => (
            <tr key={i}>
              <td className="text-center text-3xl font-black text-foreground bg-card border-2 border-muted rounded-lg w-24 h-16">{n}</td>
              <td className="text-center">{blank(i, SMALL)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!closed && <CheckButton onClick={check} disabled={!complete} />}
    </div>
  );
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-kid-purple font-black text-lg">
      <span className="text-3xl leading-none">↓</span> {label}
    </div>
  );
}

function ChainView({ task, report }: { task: Extract<HalfTask, { kind: "half-chain" }>; report: Report }) {
  const { blank, check, closed, container, complete } = useBlanks(task.answers, report);
  return (
    <div ref={container} className="flex flex-col items-center gap-2">
      <NumberChip n={task.n} />
      <Arrow label="halbieren" />
      {blank(0, BIG)}
      <Arrow label="verdoppeln" />
      {blank(1, BIG)}
      {closed && <p className="text-center font-bold text-muted-foreground mt-2">Verdoppeln macht das Halbieren wieder rückgängig.</p>}
      {!closed && <CheckButton onClick={check} disabled={!complete} />}
    </div>
  );
}

function ReverseView({ task, report }: { task: Extract<HalfTask, { kind: "half-reverse" }>; report: Report }) {
  const { blank, check, closed, container, complete } = useBlanks(task.answers, report);
  return (
    <div ref={container}>
      <Sentence>
        <Word>Die Hälfte von</Word> {blank(0, BIG)} <Word>ist</Word> <NumberChip n={task.half} />
      </Sentence>
      {!closed && <CheckButton onClick={check} disabled={!complete} />}
    </div>
  );
}

function StoryView({ task, report }: { task: Extract<HalfTask, { kind: "half-story" }>; report: Report }) {
  const { blank, check, closed, container, complete } = useBlanks(task.answers, report);
  return (
    <div ref={container} className="space-y-5">
      {task.story === "geld" && <MoneyPicture n={task.n} />}
      {task.story === "band" && <RibbonPicture n={task.n} />}
      {task.story === "kekse" && <CookiePicture n={task.n} />}
      <Sentence>
        <Word>Antwort:</Word> {blank(0, BIG)} <Word>{task.unit}</Word>
      </Sentence>
      {!closed && <CheckButton onClick={check} disabled={!complete} />}
    </div>
  );
}

function QuickView({ task, report }: { task: Extract<HalfTask, { kind: "half-quick" }>; report: Report }) {
  const { blank, check, closed, container, complete } = useBlanks(task.answers, report);
  return (
    <div ref={container}>
      <Sentence>
        <Word>Die Hälfte von</Word> <NumberChip n={task.n} /> <Word>ist</Word> {blank(0, BIG)}
      </Sentence>
      {!closed && <CheckButton onClick={check} disabled={!complete} />}
    </div>
  );
}

export function HalfTaskBody({ task, report }: { task: HalfTask; report: Report }): ReactNode {
  switch (task.kind) {
    case "half-split": return <SplitView task={task} report={report} />;
    case "half-table": return <TableView task={task} report={report} />;
    case "half-chain": return <ChainView task={task} report={report} />;
    case "half-reverse": return <ReverseView task={task} report={report} />;
    case "half-story": return <StoryView task={task} report={report} />;
    case "half-quick": return <QuickView task={task} report={report} />;
  }
}
