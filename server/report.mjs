// Turns the logged answers of one finished round into a Telegram message.
// Entries carry `game` for the Halbieren-Training; Tagesübung entries have none.

const TIME_ZONE = "Europe/Zurich";
const TELEGRAM_MAX_LENGTH = 4096;
const GAME_TITLES = { daily: "Tagesübung", halbieren: "Halbieren-Training" };
const gameOf = (entry) => entry.game ?? "daily";

function correctAnswer(task) {
  switch (task.kind) {
    case "choice":
    case "riddle":
      return [task.answer];
    case "fill":
      return task.cells.filter((cell) => "a" in cell).map((cell) => cell.a);
    case "grid":
      return task.cells.filter((cell) => cell !== null && typeof cell === "object").map((cell) => cell.a);
    case "order":
      return [...task.numbers].sort((a, b) => a - b);
    case "band":
    case "field":
      return [task.target];
    case "steps":
      return Array.from({ length: task.count }, (_, i) => task.start + (i + 1) * task.step);
    default:
      // Halbieren-Training tasks list their answers.
      return task.answers ?? [];
  }
}

function questionDetail(task) {
  if (task.kind === "choice") return task.show ?? null;
  if (task.kind === "fill") return task.cells.map((cell) => ("a" in cell ? "__" : cell.t)).join(" ");
  return task.detail ?? null;
}

const formatGiven = (given) => (Array.isArray(given) ? given.join(", ") : String(given));

function uniqueById(entries) {
  const seen = new Set();
  return entries.filter((entry) => !seen.has(entry.id) && seen.add(entry.id));
}

function roundEntries(entries, complete) {
  const unique = uniqueById(
    entries.filter((entry) => entry.day === complete.day && entry.device === complete.device && gameOf(entry) === gameOf(complete)),
  );
  const end = unique.findIndex((entry) => entry.id === complete.id);
  const before = end === -1 ? unique : unique.slice(0, end);
  let start = before.length - 1;
  while (start >= 0) {
    const { type, mode } = before[start];
    if (type === "session-complete" || (type === "session-start" && mode !== "resume")) break;
    start -= 1;
  }
  // A finished round before this one is a boundary, not part of this round.
  return before[start]?.type === "session-complete" ? before.slice(start + 1) : before.slice(Math.max(start, 0));
}

/** Each task's tries, in order. A task ends when it is solved or the answer is shown. */
function groupByTask(round) {
  const groups = [];
  let current = [];
  for (const entry of round) {
    if (entry.type) continue;
    current.push(entry);
    if (entry.outcome !== "retry") {
      groups.push(current);
      current = [];
    }
  }
  return groups;
}

function describeMistake(tries, number) {
  const { task } = tries[0];
  const level = task.level ? ` (level ${task.level})` : "";
  const detail = questionDetail(task);
  const solved = tries[tries.length - 1].correct;
  return [
    `${number}. ${task.prompt}${level}`,
    ...(detail ? [`   ${detail}`] : []),
    `   Her answers: ${tries.map((t) => formatGiven(t.given)).join(" → ")}`,
    `   Correct: ${correctAnswer(task).join(", ")}${solved ? "" : " (shown to her)"}`,
  ].join("\n");
}

function headline(complete, round) {
  const finished = new Date(complete.at);
  const when = finished.toLocaleString("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const start = round.find((entry) => entry.type === "session-start");
  const minutes = start ? Math.max(1, Math.round((finished - new Date(start.at)) / 60000)) : null;
  const extra = start?.mode === "again" ? " (extra round)" : "";
  const phone = `Phone ${complete.device.slice(-4)}`;
  const title = GAME_TITLES[gameOf(complete)] ?? gameOf(complete);
  return [`📊 ${title} finished${extra}`, [when, minutes && `${minutes} min`, phone].filter(Boolean).join(" · ")];
}

export function buildReport(entries, complete) {
  const round = roundEntries(entries, complete);
  const tasks = groupByTask(round);
  const mistakes = tasks.filter((tries) => tries.some((t) => !t.correct));

  const lines = [...headline(complete, round), `First try: ${complete.score} of ${complete.total} correct`];
  if (tasks.length < complete.total) {
    lines.push(`(Only ${tasks.length} of ${complete.total} tasks were logged.)`);
  }
  lines.push("");
  if (mistakes.length === 0) lines.push("🎉 No mistakes in the logged tasks!");
  else lines.push(`❌ ${mistakes.length} with mistakes:`, "", mistakes.map((tries, i) => describeMistake(tries, i + 1)).join("\n\n"));

  const text = lines.join("\n");
  return text.length <= TELEGRAM_MAX_LENGTH ? text : `${text.slice(0, TELEGRAM_MAX_LENGTH - 2)}\n…`;
}
