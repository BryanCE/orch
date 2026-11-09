// What an orchd reads about one of its own agents for a caller: the agent's result, or the
// tail of its session. The same shapes answer a caller here and a linked host's orchd.
import type { SessionView } from "./adapter.ts";
import type { LogLevel, LogRecord } from "./core.ts";

/** Where a result came from: the run that settled, the status report, the run history, or
 *  the harness's own session. */
export const RESULT_SOURCES = ["presence", "dispatch", "history", "session"] as const;
export type ResultSource = (typeof RESULT_SOURCES)[number];

export type ResultLookup =
  | { readonly kind: "found"; readonly source: ResultSource; readonly payload: unknown }
  | { readonly kind: "missing"; readonly reason: string };

/** The agent's session, cut to the last entries a tail asked for. */
export type TailLookup =
  | { readonly kind: "found"; readonly sessionPath: string | null; readonly view: SessionView }
  | { readonly kind: "missing"; readonly reason: string };

/** The agent's session as a whole: where it is, and its view when the harness could read one. */
export type SessionLookup =
  | { readonly kind: "found"; readonly sessionPath: string; readonly view: SessionView | null }
  | { readonly kind: "missing"; readonly reason: string };

/** The last lines of the agent's screen, or why it has none to read. */
export type ScreenLookup =
  | { readonly kind: "found"; readonly handle: string; readonly text: string }
  | { readonly kind: "answer"; readonly reason: "no-pane" | "no-environment-role"; readonly text: string };

/** Which of the log records about an agent a caller reads. */
export interface LogFilter {
  readonly since?: number;
  readonly level?: LogLevel;
  readonly dispatch?: string;
}

/** What a caller asks to read. */
export type AgentRead =
  | { readonly kind: "result" }
  | { readonly kind: "tail"; readonly lines: number }
  | { readonly kind: "session" }
  | { readonly kind: "screen"; readonly lines: number }
  | ({ readonly kind: "log" } & LogFilter);

/** The answer to an {@link AgentRead}, of the same kind. */
export type AgentReading =
  | { readonly kind: "result"; readonly lookup: ResultLookup }
  | { readonly kind: "tail"; readonly lookup: TailLookup }
  | { readonly kind: "session"; readonly lookup: SessionLookup }
  | { readonly kind: "screen"; readonly lookup: ScreenLookup }
  | { readonly kind: "log"; readonly records: LogRecord[] };
