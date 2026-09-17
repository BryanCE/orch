/**
 * The one logger is the contract.
 *
 * A diagnosis channel, never the user-output channel: `process.stdout.write` stays
 * what the human asked to see, and nothing here writes to it. Records are JSONL
 * because they are queried, not read top to bottom — the acceptance test for the
 * whole design is that `grep <dispatchId>` returns the entire life of one dispatch.
 *
 * A leaf on purpose: it reads no config and opens no store, so the daemon, the CLI
 * and an in-process bridge can all import it without dragging a dependency graph
 * behind them.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { LOG_LEVELS, type LogContext, type LogLevel, type LogRecord, type LogValue, type Logger, type LoggerOptions, type OrchDir } from "./types/core.ts";

export function logFile(orchDir: OrchDir): string { return join(orchDir, "orch.log"); }

export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === "string" && LOG_LEVELS.some((level) => level === value);
}

function isLogValue(value: unknown): value is LogValue {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function isFields(value: unknown): value is Readonly<Record<string, LogValue>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every(isLogValue);
}

/**
 * Verify the claim rather than assert it. A line read back off disk is external
 * data (`unknown`), and a guard that does not check is worse than a cast because
 * the bug hides behind a name that says it is safe.
 */
export function isLogRecord(value: unknown): value is LogRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate: Record<string, unknown> = { ...value };
  if (typeof candidate.proc !== "string" || (candidate.proc !== "orchd" && candidate.proc !== "cli")) return false;
  if (typeof candidate.pid !== "number" || !Number.isInteger(candidate.pid)) return false;
  if (typeof candidate.at !== "number" || !Number.isFinite(candidate.at)) return false;
  if (!isLogLevel(candidate.level)) return false;
  if (typeof candidate.event !== "string" || candidate.event.length === 0) return false;
  if (candidate.correlationId !== undefined && typeof candidate.correlationId !== "string") return false;
  if (candidate.agentId !== undefined && typeof candidate.agentId !== "string") return false;
  if (candidate.fields !== undefined && !isFields(candidate.fields)) return false;
  return true;
}

function severity(level: LogLevel): number {
  return LOG_LEVELS.indexOf(level);
}

export function createLogger(options: LoggerOptions, base: LogContext = {}): Logger {
  const now = options.now ?? Date.now;
  let threshold = severity(options.level);
  const pid = process.pid;
  const emit = (record: LogRecord): void => {
    try { mkdirSync(dirname(options.file), { recursive: true }); appendFileSync(options.file, `${JSON.stringify(record)}\n`); }
    catch { /* logging must never break the operation */ }
  };
  const make = (bound: LogContext): Logger => {
    const write = (level: LogLevel, event: string, fields?: Readonly<Record<string, LogValue>>, context?: LogContext): void => {
      if (severity(level) > threshold) return;
      const correlationId = context?.correlationId ?? bound.correlationId;
      const agentId = context?.agentId ?? bound.agentId;
      emit({ proc: options.proc, pid, at: now(), level, event,
        ...(correlationId === undefined ? {} : { correlationId }),
        ...(agentId === undefined ? {} : { agentId }),
        ...(fields === undefined ? {} : { fields }) });
    };
    return {
      setLevel: (level) => { threshold = severity(level); },
      error: (event, fields, context) => write("error", event, fields, context),
      warn: (event, fields, context) => write("warn", event, fields, context),
      info: (event, fields, context) => write("info", event, fields, context),
      debug: (event, fields, context) => write("debug", event, fields, context),
      trace: (event, fields, context) => write("trace", event, fields, context),
      forCorrelation: (id) => make({ ...bound, correlationId: id }),
      forAgent: (id) => make({ ...bound, agentId: id }),
    };
  };
  return make(base);
}
