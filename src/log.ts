/**
 * The one logger. `TASKS/13-logging.md` is the contract.
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
import { dirname } from "node:path";

/** Ordered lowest severity last: an index into this array IS the verbosity. */
export const LOG_LEVELS = ["error", "warn", "info", "debug", "trace"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

/** What a field may hold. A record is a row to be queried, not a place for objects:
 *  a nested shape has no stable column and cannot be filtered on. */
export type LogValue = string | number | boolean | null;

export interface LogRecord {
  /** Epoch millis. Rule 11: instants are INTEGER epoch millis, never TEXT. */
  readonly at: number;
  readonly level: LogLevel;
  /** A stable dotted name ("dispatch.delivered"), never a sentence. The readable
   *  rendering is produced from the record, so wording can change without breaking
   *  anything that greps. */
  readonly event: string;
  /** The dispatch id, or the RPC request id. Correlation is the point. */
  readonly correlationId?: string;
  /** orch's minted id and nothing else. A plexer handle is environment
   *  (`TASKS/01-agent-model.md`) and belongs in `fields`. */
  readonly agentId?: string;
  readonly fields?: Readonly<Record<string, LogValue>>;
}

export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === "string" && (LOG_LEVELS as readonly string[]).includes(value);
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
  if (typeof candidate.at !== "number" || !Number.isFinite(candidate.at)) return false;
  if (!isLogLevel(candidate.level)) return false;
  if (typeof candidate.event !== "string" || candidate.event.length === 0) return false;
  if (candidate.correlationId !== undefined && typeof candidate.correlationId !== "string") return false;
  if (candidate.agentId !== undefined && typeof candidate.agentId !== "string") return false;
  if (candidate.fields !== undefined && !isFields(candidate.fields)) return false;
  return true;
}

/** Per-record context that is not a field: who this is about, and what it belongs to. */
export interface LogContext {
  readonly correlationId?: string;
  readonly agentId?: string;
}

export interface Logger {
  error(event: string, fields?: Readonly<Record<string, LogValue>>, context?: LogContext): void;
  warn(event: string, fields?: Readonly<Record<string, LogValue>>, context?: LogContext): void;
  info(event: string, fields?: Readonly<Record<string, LogValue>>, context?: LogContext): void;
  debug(event: string, fields?: Readonly<Record<string, LogValue>>, context?: LogContext): void;
  trace(event: string, fields?: Readonly<Record<string, LogValue>>, context?: LogContext): void;
  /** A logger that stamps every record with one correlation id, so a caller cannot
   *  forget to pass it halfway through a dispatch. */
  forCorrelation(correlationId: string): Logger;
  forAgent(agentId: string): Logger;
}

export interface LoggerOptions {
  readonly file: string;
  readonly level: LogLevel;
  /** Injectable so a test can assert ordering without sleeping on the real clock. */
  readonly now?: () => number;
}

function severity(level: LogLevel): number {
  return LOG_LEVELS.indexOf(level);
}

export function createLogger(options: LoggerOptions, base: LogContext = {}): Logger {
  const now = options.now ?? Date.now;
  const threshold = severity(options.level);

  const write = (level: LogLevel, event: string, fields?: Readonly<Record<string, LogValue>>, context?: LogContext): void => {
    // Below the threshold nothing is built and nothing is written — a filtered
    // record must cost no formatting, or `trace` is unusable in normal operation.
    if (severity(level) > threshold) return;
    const correlationId = context?.correlationId ?? base.correlationId;
    const agentId = context?.agentId ?? base.agentId;
    const record: LogRecord = {
      at: now(),
      level,
      event,
      ...(correlationId === undefined ? {} : { correlationId }),
      ...(agentId === undefined ? {} : { agentId }),
      ...(fields === undefined ? {} : { fields }),
    };
    try {
      mkdirSync(dirname(options.file), { recursive: true });
      appendFileSync(options.file, `${JSON.stringify(record)}\n`);
    } catch {
      // A log that cannot be written must never take down the operation it was
      // describing. There is nowhere else to report this: writing to stderr is the
      // very habit TASKS/13 exists to delete.
    }
  };

  return {
    error: (event, fields, context) => write("error", event, fields, context),
    warn: (event, fields, context) => write("warn", event, fields, context),
    info: (event, fields, context) => write("info", event, fields, context),
    debug: (event, fields, context) => write("debug", event, fields, context),
    trace: (event, fields, context) => write("trace", event, fields, context),
    forCorrelation: (correlationId) => createLogger(options, { ...base, correlationId }),
    forAgent: (agentId) => createLogger(options, { ...base, agentId }),
  };
}
