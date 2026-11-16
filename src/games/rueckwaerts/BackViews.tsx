import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { speak } from "@/lib/speech";
import { CheckButton, useBlanks, type Report } from "../daily/TaskViews";
import { FrogLine, HopLine, JumpHint, Line, NumberChip, Sentence, Slots, Word } from "../schritte/StepViews";
import { hintStep, type BackTask } from "./backwards";

const BIG = "w-20 h-16 md:w-24 md:h-16 text-3xl";
const isTen = (n: number) => n % 10 === 0;

/** "−1" between each pair of neighbouring slots, so every step reads as one less. */
function MinusLabels({ count, unit }: { count: number; unit: number }) {
  return (
    <div className="flex gap-1 md:gap-2" aria-hidden>
      <div className="flex-[0.5]" />
      {Array.from({ length: count - 1 }, (_, i) => (
        <div key={i} className="flex-1 min-w-0 text-center text-sm md:text-base font-black text-kid-purple">
          −{unit}
        </div>
      ))}
      <div className="flex-[0.5]" />
    </div>
  );
}

function Rocket() {
  return (
    <motion.div
      initial={{ y: 0, opacity: 1 }}
      animate={{ y: -500, opacity: 0 }}
      transition={{ duration: 1.6, ease: "easeIn" }}
      className="absolute left-1/2 -translate-x-1/2 bottom-0 text-6xl pointer-events-none"
      aria-hidden
    >
      🚀
    </motion.div>
  );
}

function RowView({ task, report }: { task: Extract<BackTask, { kind: "back-row" }>; report: Report }) {
  const [launched, setLaunched] = useState(false);
  const wrapped: Report = (correct, given) => {
    const outcome = report(correct, given);
    if (outcome === "correct" && task.section !== "frosch") setLaunched(true);
    return outcome;
  };
  const { blank, check, closed, container, complete } = useBlanks(task.answers, wrapped);
  const start = task.numbers[0];
  const hops = Math.min(task.numbers.length, Math.floor(start / task.unit));
  return (
    <div ref={container} className="relative space-y-4">
      {task.section === "frosch" && (
        <FrogLine
          start={start}
          dir={-1}
          unit={task.unit}
          lo={start - hops * task.unit}
          hi={start}
          label={(n) => n === start || (task.unit === 1 && isTen(n))}
        />
      )}
      <div>
        <MinusLabels count={task.numbers.length} unit={task.unit} />
        <Slots numbers={task.numbers} blankAt={(i) => (task.blanks.includes(i) ? task.blanks.indexOf(i) : null)} blank={blank} />
      </div>
      {!closed && <CheckButton onClick={check} disabled={!complete} />}
      <AnimatePresence>{launched && <Rocket />}</AnimatePresence>
    </div>
  );
}

function BeforeView({ task, report }: { task: Extract<BackTask, { kind: "back-before" }>; report: Report }) {
  const { blank, check, closed, container, complete } = useBlanks(task.answers, report);
  return (
    <div ref={container}>
      {task.unit === 1 ? (
        <Sentence>
          <Word>Vor</Word> <NumberChip n={task.n} /> <Word>kommt</Word> {blank(0, BIG)}
        </Sentence>
      ) : (
        <Sentence>
          <NumberChip n={task.n} /> <Word>−</Word> <NumberChip n={task.unit} /> <Word>=</Word> {blank(0, BIG)}
        </Sentence>
      )}
      {!closed && <CheckButton onClick={check} disabled={!complete} />}
    </div>
  );
}

export function BackTaskBody({ task, report }: { task: BackTask; report: Report }): ReactNode {
  switch (task.kind) {
    case "back-row": return <RowView task={task} report={report} />;
    case "back-before": return <BeforeView task={task} report={report} />;
  }
}

// --- How it goes, shown after a wrong answer ---

function ListenButton({ row }: { row: number[] }) {
  return (
    <button onClick={() => speak(`${row.join(", ")}, und dann?`)} className="bg-kid-blue/15 text-foreground font-bold px-4 py-2 rounded-2xl">
      🔊 Anhören
    </button>
  );
}

export function BackHint({ task, given, reveal }: { task: BackTask; given: number[]; reveal: boolean }) {
  const { from, to, unit, row } = hintStep(task, given);
  const open = reveal ? to : "?";

  if (unit === 2 || unit === 5) return <JumpHint from={from} to={to} ask="result" step={unit} showStep reveal={reveal} />;

  const tens = Math.floor(from / 10);
  const ones = from % 10;
  return (
    <div className="bg-kid-yellow/15 rounded-2xl p-4 mt-5 space-y-2 text-center">
      <p className="font-black text-foreground">💡 So geht es:</p>
      {unit === 1 ? (
        <>
          <HopLine
            lo={Math.max(0, to - 3)}
            hi={Math.min(100, from + 3)}
            path={[from, to]}
            label={(n) => n === from || (n === to ? reveal : isTen(n))}
          />
          {isTen(from) && from > 0 ? (
            <>
              <Line>
                Vor {from} kommt {open}
                {reveal && "."}
              </Line>
              <Line>Der Zehner wird um 1 kleiner, und die Einer fangen wieder bei 9 an.</Line>
            </>
          ) : (
            <>
              <Line>Rückwärts heisst: immer 1 weniger.</Line>
              <Line>
                Vor {from} kommt {open}
                {reveal && "."}
              </Line>
            </>
          )}
        </>
      ) : (
        <>
          <HopLine lo={to >= 10 ? to - 10 : to} hi={from <= 90 ? from + 10 : from} unit={10} path={[from, to]} label={(n) => n === from || (n === to && reveal)} />
          <Line>10 weniger: Der Zehner wird um 1 kleiner, die Einer bleiben gleich.</Line>
          <Line>
            {from} = {tens} Zehner und {ones} Einer
          </Line>
          <Line>
            {tens - 1} Zehner und {ones} Einer = {open}
          </Line>
        </>
      )}
      <ListenButton row={row} />
    </div>
  );
}
