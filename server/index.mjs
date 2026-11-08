// Serves the built app and appends the Tagesübung answers to a log file.
// Answers can only be added here: the log is read with kubectl, so nothing on
// the public site exposes it.

import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import compression from "compression";
import serveHandler from "serve-handler";
import { buildReport } from "./report.mjs";

const PORT = Number(process.env.PORT ?? 80);
const DIST_DIR = process.env.DIST_DIR ?? "/app/dist";
const LOG_DIR = process.env.LOG_DIR ?? "/data";
const LOG_FILE = path.join(LOG_DIR, "attempts.jsonl");

// The endpoint needs no password so that phones work without setup. These
// limits stop anyone who finds it from filling the disk or spamming Telegram.
const MAX_BODY_BYTES = 128 * 1024;
const MAX_ATTEMPTS_PER_REQUEST = 20;
const MAX_LOG_BYTES = 50 * 1024 * 1024;
const MAX_ENTRIES_PER_MINUTE = 120;
const MAX_REPORTS_PER_DAY = 20;

const compress = compression();
const staticConfig = {
  public: DIST_DIR,
  etag: true,
  rewrites: [{ source: "**", destination: "/index.html" }],
};

let rateWindowStart = 0;
let entriesInWindow = 0;

function isOverRateLimit(count) {
  const now = Date.now();
  if (now - rateWindowStart >= 60_000) {
    rateWindowStart = now;
    entriesInWindow = 0;
  }
  entriesInWindow += count;
  return entriesInWindow > MAX_ENTRIES_PER_MINUTE;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function isLogEntry(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.id === "string" &&
    value.id.length <= 64 &&
    typeof value.device === "string" &&
    value.device.length <= 64 &&
    typeof value.at === "string" &&
    (value.type === "session-start" ||
      (value.type === "session-complete" &&
        typeof value.day === "string" &&
        Number.isInteger(value.score) &&
        Number.isInteger(value.total)) ||
      (typeof value.goal === "string" && typeof value.correct === "boolean"))
  );
}

function parseAttempts(body) {
  try {
    const attempts = JSON.parse(body);
    const valid =
      Array.isArray(attempts) &&
      attempts.length > 0 &&
      attempts.length <= MAX_ATTEMPTS_PER_REQUEST &&
      attempts.every(isLogEntry);
    return valid ? attempts : null;
  } catch {
    return null;
  }
}

async function logSize() {
  try {
    return (await stat(LOG_FILE)).size;
  } catch {
    return 0;
  }
}

function send(res, status) {
  res.writeHead(status, { "Content-Length": 0 });
  res.end();
}

async function readLog() {
  const lines = (await readFile(LOG_FILE, "utf8")).split("\n").filter(Boolean);
  return lines.flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
}

async function sendTelegram(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    console.error("Telegram credentials are not configured");
    return;
  }
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) console.error("Telegram API rejected the report", response.status);
}

// A lost response makes the phone resend, which must not send a second report.
const reportedRounds = new Set();
let reportDay = "";
let reportsToday = 0;

function isReportAllowed() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== reportDay) {
    reportDay = today;
    reportsToday = 0;
  }
  reportsToday += 1;
  return reportsToday <= MAX_REPORTS_PER_DAY;
}

async function reportRound(complete) {
  if (reportedRounds.has(complete.id)) return;
  if (!isReportAllowed()) {
    console.error("Daily Telegram report limit reached");
    return;
  }
  reportedRounds.add(complete.id);
  await sendTelegram(buildReport(await readLog(), complete));
}

async function handleAttempts(req, res) {
  if (req.method !== "POST") return send(res, 405);

  const body = await readBody(req);
  if (body === null) return send(res, 413);
  const attempts = parseAttempts(body);
  if (!attempts) return send(res, 400);
  if (isOverRateLimit(attempts.length)) return send(res, 429);
  if ((await logSize()) >= MAX_LOG_BYTES) return send(res, 507);

  await appendFile(LOG_FILE, attempts.map((a) => `${JSON.stringify(a)}\n`).join(""));
  send(res, 204);

  // The answers are already saved, so a failed report must not fail the request.
  for (const entry of attempts.filter((a) => a.type === "session-complete")) {
    await reportRound(entry).catch((error) => {
      console.error(`Could not send the report: ${error.message}`);
    });
  }
}

await mkdir(LOG_DIR, { recursive: true }).catch((error) => {
  console.error(`Cannot create ${LOG_DIR}: ${error.message}`);
});

const server = createServer((req, res) => {
  if (req.url?.split("?")[0] === "/api/attempts") {
    handleAttempts(req, res).catch((error) => {
      console.error(`Could not save attempts: ${error.message}`);
      if (!res.headersSent) send(res, 500);
      else res.end();
    });
    return;
  }
  compress(req, res, () => serveHandler(req, res, staticConfig));
});

server.listen(PORT, () => console.log(`Listening on ${PORT}`));

// Node ignores SIGTERM as PID 1 unless it is handled, which would stall every deploy.
process.on("SIGTERM", () => server.close(() => process.exit(0)));
