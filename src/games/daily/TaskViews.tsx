import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { clueText, type Cell, type Task } from "./tasks";

export type Outcome = "correct" | "retry" | "revealed";
export type Report = (correct: boolean) => Outcome;

type Mark = "idle" | "ok" | "wrong";

const markClasses: Record<Mark, string> = {
  idle: "bg-card border-kid-blue",
  ok: "bg-kid-green/20 border-kid-green",
  wrong: "bg-destructive/15 border-destructive",
};

function CheckButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className="bg-gradient-forest text-primary-foreground font-bold px-8 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-lg mx-auto mt-6 disabled:opacity-40"
    >
      <Check size={22} /> Prüfen
    </motion.button>
  );
}

// Shared state for every task answered by typing into one or more blanks.
function useBlanks(answers: number[], report: Report) {
  const [values, setValues] = useState(() => answers.map(() => ""));
  const [marks, setMarks] = useState<Mark[]>(() => answers.map(() => "idle"));
  const [closed, setClosed] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  const focusFirst = (test: (i: number) => boolean) => {
    const index = answers.findIndex((_, i) => test(i));
    container.current?.querySelector<HTMLInputElement>(`input[data-blank="${index}"]`)?.focus();
  };

  const check = () => {
    if (closed) return;
    if (values.some((v) => v === "")) {
      focusFirst((i) => values[i] === "");
      return;
    }
    const nextMarks = answers.map((a, i): Mark => (Number(values[i]) === a ? "ok" : "wrong"));
    const outcome = report(nextMarks.every((m) => m === "ok"));
    if (outcome === "retry") {
      setMarks(nextMarks);
      setTimeout(() => focusFirst((i) => nextMarks[i] === "wrong"));
      return;
    }
    setClosed(true);
    setValues(answers.map(String));
    setMarks(answers.map(() => "ok"));
  };

  const blank = (index: number, className: string) => (
    <input
      key={`blank-${index}`}
      data-blank={index}
      type="tel"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={3}
      autoFocus={index === 0}
      autoComplete="off"
      aria-label="Antwort"
      value={values[index]}
      disabled={closed || marks[index] === "ok"}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        setValues((v) => v.map((old, i) => (i === index ? digits : old)));
        setMarks((m) => m.map((old, i) => (i === index && old === "wrong" ? "idle" : old)));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") check();
      }}
      className={`${className} ${markClasses[marks[index]]} border-4 rounded-xl text-center font-black outline-none focus:ring-4 focus:ring-kid-yellow disabled:opacity-100 p-0`}
    />
  );

  return { blank, check, closed, container, complete: values.every((v) => v !== "") };
}

function FillView({ task, report }: { task: Extract<Task, { kind: "fill" }>; report: Report }) {
  const answers = task.cells.filter((c): c is { a: number } => "a" in c).map((c) => c.a);
  const { blank, check, closed, container, complete } = useBlanks(answers, report);
  let blankIndex = -1;
  const line = task.layout === "line";
  const row = line || task.layout === "row";

  const renderCell = (cell: Cell, i: number) => {
    if ("a" in cell) {
      blankIndex++;
      return blank(blankIndex, row ? "w-full h-12 md:h-14 text-lg md:text-2xl" : "w-20 h-16 md:w-24 md:h-20 text-3xl md:text-4xl");
    }
    if (row) {
      return (
        <div key={i} className="w-full h-12 md:h-14 bg-kid-blue text-primary-foreground rounded-xl flex items-center justify-center text-lg md:text-2xl font-black">
          {cell.t}
        </div>
      );
    }
    if (/^\d+$/.test(cell.t)) {
      return (
        <div key={i} className="min-w-16 h-16 md:min-w-20 md:h-20 px-2 bg-kid-blue text-primary-foreground rounded-xl flex items-center justify-center text-3xl md:text-4xl font-black">
          {cell.t}
        </div>
      );
    }
    return (
      <span key={i} className={`font-black text-foreground ${cell.t.length > 1 ? "text-xl md:text-2xl" : "text-3xl md:text-4xl"}`}>
        {cell.t}
      </span>
    );
  };

  return (
    <div ref={container}>
      {task.note && (
        <div className="flex flex-wrap justify-center gap-3 mb-5">
          {task.note.map((line) => (
            <span key={line} className="bg-kid-pink/15 text-foreground rounded-2xl px-4 py-2 text-xl font-black">
              🤝 {line}
            </span>
          ))}
        </div>
      )}
      {row ? (
        <div className={`relative ${line ? "pb-5" : ""}`}>
          {line && <div className="absolute left-0 right-0 bottom-2 h-1 bg-foreground rounded-full" />}
          <div className="flex gap-1 md:gap-2">
            {task.cells.map((cell, i) => (
              <div key={i} className="flex-1 min-w-0 flex flex-col items-center">
                {renderCell(cell, i)}
                {line && <div className="w-1 h-5 bg-foreground -mb-5 mt-1" />}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">{task.cells.map(renderCell)}</div>
      )}
      {!closed && <CheckButton onClick={check} disabled={!complete} />}
    </div>
  );
}

function RiddleView({ task, report }: { task: Extract<Task, { kind: "riddle" }>; report: Report }) {
  const { blank, check, closed, container, complete } = useBlanks([task.answer], report);
  return (
    <div ref={container}>
      <ul className="space-y-2 mb-5">
        {task.clues.map((clue) => (
          <li key={clueText(clue)} className="bg-kid-purple/10 rounded-2xl px-4 py-3 text-lg md:text-xl font-bold text-foreground">
            🔎 {clueText(clue)}
          </li>
        ))}
      </ul>
      <div className="flex justify-center">{blank(0, "w-24 h-20 text-4xl")}</div>
      {!closed && <CheckButton onClick={check} disabled={!complete} />}
    </div>
  );
}

function GridView({ task, report }: { task: Extract<Task, { kind: "grid" }>; report: Report }) {
  const answers = task.cells.filter((c): c is { a: number } => c !== null && typeof c === "object").map((c) => c.a);
  const { blank, check, closed, container, complete } = useBlanks(answers, report);
  let blankIndex = -1;
  const size = task.compact ? "w-full aspect-square" : "w-16 h-16 md:w-20 md:h-20";
  const text = task.compact ? "text-xs md:text-base" : "text-2xl md:text-3xl";

  return (
    <div ref={container}>
      <div
        className={`grid mx-auto ${task.compact ? "gap-0.5 max-w-md" : "gap-1.5 w-fit"}`}
        style={{ gridTemplateColumns: `repeat(${task.cols}, minmax(0, 1fr))` }}
      >
        {task.cells.map((cell, i) => {
          if (cell === null) return <div key={i} />;
          if (typeof cell === "object") {
            blankIndex++;
            // 16px text keeps iOS from zooming the page when the blank is focused.
            return blank(blankIndex, `${size} ${task.compact ? "text-base !rounded-md !border-2" : text}`);
          }
          return (
            <div key={i} className={`${size} ${text} bg-kid-blue/10 text-foreground rounded-md flex items-center justify-center font-bold`}>
              {cell}
            </div>
          );
        })}
      </div>
      {!closed && <CheckButton onClick={check} disabled={!complete} />}
    </div>
  );
}

function ChoiceView({ task, report }: { task: Extract<Task, { kind: "choice" }>; report: Report }) {
  const [wrong, setWrong] = useState<string[]>([]);
  const [closed, setClosed] = useState(false);
  const wide = task.options.some((o) => o.length > 4);

  const choose = (option: string) => {
    if (closed || wrong.includes(option)) return;
    const outcome = report(option === task.answer);
    if (outcome === "retry") setWrong((w) => [...w, option]);
    else {
      if (option !== task.answer) setWrong((w) => [...w, option]);
      setClosed(true);
    }
  };

  return (
    <div>
      {task.show && <div className="text-center text-5xl md:text-6xl font-black text-kid-blue mb-6">{task.show}</div>}
      {task.highlight && (
        <div className="mb-6">
          <TafelGrid classFor={(n) => (n === task.highlight ? "bg-kid-yellow font-black" : "bg-kid-blue/10")} />
        </div>
      )}
      <div className={`grid gap-3 max-w-md mx-auto ${wide ? "grid-cols-1" : "grid-cols-2"}`}>
        {task.options.map((option) => {
          const isWrong = wrong.includes(option);
          const isRight = closed && option === task.answer;
          return (
            <motion.button
              key={option}
              whileTap={{ scale: 0.95 }}
              onClick={() => choose(option)}
              disabled={closed || isWrong}
              className={`rounded-2xl font-black shadow-md py-4 px-3 ${wide ? "text-lg md:text-xl" : "text-3xl md:text-4xl"} ${
                isRight ? "bg-accent text-accent-foreground" : isWrong ? "bg-destructive text-destructive-foreground" : "bg-kid-yellow text-foreground"
              }`}
            >
              {option}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function OrderView({ task, report }: { task: Extract<Task, { kind: "order" }>; report: Report }) {
  const sorted = [...task.numbers].sort((a, b) => a - b);
  const [placed, setPlaced] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);
  const [closed, setClosed] = useState(false);

  const check = () => {
    const outcome = report(placed.every((n, i) => n === sorted[i]));
    if (outcome === "retry") setWrong(true);
    else {
      setPlaced(sorted);
      setWrong(false);
      setClosed(true);
    }
  };

  return (
    <div>
      <div className="relative pb-5 mb-6">
        <div className="absolute left-0 right-0 bottom-2 h-1 bg-foreground rounded-full" />
        <div className="flex gap-1 md:gap-2">
          {sorted.map((right, i) => {
            const value = placed[i];
            const mark: Mark = closed ? "ok" : wrong && value !== undefined && value !== right ? "wrong" : "idle";
            return (
              <div key={i} className="flex-1 min-w-0 flex flex-col items-center">
                <button
                  onClick={() => {
                    if (closed || value === undefined) return;
                    setWrong(false);
                    setPlaced((p) => p.filter((_, index) => index !== i));
                  }}
                  aria-label={value === undefined ? `Platz ${i + 1} ist leer` : `${value} wieder wegnehmen`}
                  className={`w-full h-14 md:h-16 rounded-xl border-4 text-xl md:text-3xl font-black text-foreground ${
                    value === undefined ? "border-dashed border-border bg-card" : markClasses[mark]
                  }`}
                >
                  {value ?? ""}
                </button>
                <div className="w-1 h-5 bg-foreground -mb-5 mt-1" />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3 min-h-16">
        {task.numbers
          .filter((n) => !placed.includes(n))
          .map((n) => (
            <motion.button
              key={n}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setWrong(false);
                setPlaced((p) => [...p, n]);
              }}
              className="w-16 h-16 bg-kid-yellow text-foreground rounded-2xl text-2xl font-black shadow-md"
            >
              {n}
            </motion.button>
          ))}
      </div>
      {wrong && <p className="text-center font-bold text-muted-foreground mt-2">Tippe auf eine Zahl, um sie wegzunehmen.</p>}
      {!closed && <CheckButton onClick={check} disabled={placed.length !== sorted.length} />}
    </div>
  );
}

function BandView({ task, report }: { task: Extract<Task, { kind: "band" }>; report: Report }) {
  const [tapped, setTapped] = useState<number | null>(null);
  const [closed, setClosed] = useState(false);
  const numbers = Array.from({ length: 11 }, (_, i) => task.from + i);

  const tap = (n: number) => {
    if (closed) return;
    setTapped(n);
    if (report(n === task.target) !== "retry") setClosed(true);
  };

  return (
    <div className="flex max-w-2xl mx-auto">
      {numbers.map((n) => {
        const labelled = n % task.labelEvery === 0;
        const showRight = closed && n === task.target;
        const showWrong = tapped === n && n !== task.target;
        // The tape changes colour every five so groups can be seen at a glance.
        const tape = Math.floor((n - 1) / 5) % 2 === 0 ? "bg-kid-blue/25" : "bg-kid-pink/25";
        return (
          <button
            key={n}
            onClick={() => tap(n)}
            aria-label={`Feld ${n - task.from + 1}`}
            className={`flex-1 min-w-0 h-20 border-y-4 border-r-2 first:border-l-4 last:border-r-4 border-foreground/40 text-xs md:text-lg font-black text-foreground ${
              showRight ? "bg-kid-green text-primary-foreground" : showWrong ? "bg-destructive text-destructive-foreground" : tape
            }`}
          >
            {labelled || showRight || showWrong ? n : ""}
          </button>
        );
      })}
    </div>
  );
}

function FieldView({ task, report }: { task: Extract<Task, { kind: "field" }>; report: Report }) {
  const startedAt = useRef(Date.now());
  const [tapped, setTapped] = useState<number | null>(null);
  const [closed, setClosed] = useState(false);
  const [fast, setFast] = useState(false);

  const tap = (n: number) => {
    if (closed) return;
    setTapped(n);
    if (report(n === task.target) === "retry") return;
    setClosed(true);
    setFast(n === task.target && Date.now() - startedAt.current < task.fastMs);
  };

  const rows = Array.from({ length: 10 }, (_, r) => r);
  return (
    <div className="max-w-md mx-auto">
      {rows.map((r) => (
        <div key={r} className={`flex items-center ${r === 4 ? "mb-2" : "mb-0.5"}`}>
          {rows.map((c) => {
            const n = r * 10 + c + 1;
            const showRight = closed && n === task.target;
            const showWrong = tapped === n && n !== task.target;
            return (
              <button
                key={c}
                onClick={() => tap(n)}
                aria-label={`Punkt in Reihe ${r + 1}, Spalte ${c + 1}`}
                className={`flex-1 aspect-square flex items-center justify-center ${c === 4 ? "mr-2" : "mr-0.5"}`}
              >
                <span
                  className={`w-full h-full rounded-full flex items-center justify-center text-xs font-black ${
                    showRight ? "bg-kid-green text-primary-foreground" : showWrong ? "bg-destructive text-destructive-foreground" : c < 5 ? "bg-kid-blue/70" : "bg-kid-pink/70"
                  }`}
                >
                  {showRight || showWrong ? n : ""}
                </span>
              </button>
            );
          })}
          {task.hints && <span className="w-7 text-right text-xs font-black text-muted-foreground">{(r + 1) * 10}</span>}
        </div>
      ))}
      {fast && <p className="text-center text-xl font-black text-kid-orange mt-3">⚡ Blitzschnell!</p>}
    </div>
  );
}

function TafelGrid({ classFor, onTap }: { classFor: (n: number) => string; onTap?: (n: number) => void }) {
  return (
    <div className="grid grid-cols-10 gap-0.5 max-w-md mx-auto">
      {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => {
        const className = `aspect-square rounded-md flex items-center justify-center text-xs md:text-base font-bold text-foreground ${classFor(n)}`;
        return onTap ? (
          <button key={n} onClick={() => onTap(n)} className={className}>
            {n}
          </button>
        ) : (
          <div key={n} className={className}>
            {n}
          </div>
        );
      })}
    </div>
  );
}

function StepsView({ task, report }: { task: Extract<Task, { kind: "steps" }>; report: Report }) {
  const path = Array.from({ length: task.count }, (_, i) => task.start + (i + 1) * task.step);
  const [found, setFound] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const [closed, setClosed] = useState(false);

  const tap = (n: number) => {
    if (closed || n === task.start || path.slice(0, found).includes(n)) return;
    if (n !== path[found]) {
      setWrong(n);
      if (report(false) === "revealed") {
        setFound(task.count);
        setClosed(true);
      }
      return;
    }
    setWrong(null);
    setFound(found + 1);
    if (found + 1 === task.count && report(true) !== "retry") setClosed(true);
  };

  const classFor = (n: number) => {
    if (n === task.start) return "bg-kid-yellow font-black";
    if (path.slice(0, found).includes(n)) return "bg-kid-green text-primary-foreground font-black";
    if (n === wrong) return "bg-destructive text-destructive-foreground";
    return "bg-kid-blue/10";
  };

  return <TafelGrid classFor={classFor} onTap={tap} />;
}

export function TaskBody({ task, report }: { task: Task; report: Report }): ReactNode {
  switch (task.kind) {
    case "choice": return <ChoiceView task={task} report={report} />;
    case "fill": return <FillView task={task} report={report} />;
    case "riddle": return <RiddleView task={task} report={report} />;
    case "grid": return <GridView task={task} report={report} />;
    case "order": return <OrderView task={task} report={report} />;
    case "band": return <BandView task={task} report={report} />;
    case "field": return <FieldView task={task} report={report} />;
    case "steps": return <StepsView task={task} report={report} />;
  }
}
