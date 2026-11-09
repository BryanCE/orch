// What an orchd reads about one of its own agents for a caller: the agent's result, or the
// tail of its session. The same shapes answer a caller here and a linked host's orchd.
import type { SessionView } from "./adapter.ts";

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

/** What a caller asks to read. */
export type AgentRead =
  | { readonly kind: "result" }
  | { readonly kind: "tail"; readonly lines: number };

/** The answer to an {@link AgentRead}, of the same kind. */
export type AgentReading =
  | { readonly kind: "result"; readonly lookup: ResultLookup }
  | { readonly kind: "tail"; readonly lookup: TailLookup };
