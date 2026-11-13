// A session orchd holds: the agent's process runs on pipes orchd keeps, and orchd drives its
// conversation through a driver the harness declares for the form. ACP is one driver; a harness
// with its own server API is another. The process, its screen, its log and its presence are
// orchd's and are the same for every driver; only the wire belongs to one.
import type { AgentLink } from "../control/agent-links.ts";
import type { BackendSpawnOpts } from "./backend.ts";
import type { Logger } from "./core.ts";
import type { PipesProcess, PipesProvider } from "./pipes.ts";
import type { QuestionOption } from "./question.ts";
import type { SessionView, SessionViewEntry } from "./adapter.ts";
import type { OrchSettings } from "./settings.ts";

/** How a turn ended, in presence terms. */
export interface TurnOutcome {
  readonly state: Extract<SessionView["state"], "done" | "aborted" | "error">;
  readonly error: string | null;
}

/** A tool call waiting for permission. */
export interface SessionAsk {
  readonly toolCallId: string;
  readonly title: string;
  readonly options: readonly QuestionOption[];
}

/** Receives transcript, turn, permission and delivery events from a held session. */
export interface SessionLinkEvents {
  onTurnStarted(deliveryId: string): void;
  onEntries(entries: readonly SessionViewEntry[]): void;
  onTurnEnded(outcome: TurnOutcome, text: string): void;
  /** Records the ask as an open question and answers its id. */
  onAsk(ask: SessionAsk): string;
  onAsksSettled(): void;
  onAskDropped(questionId: string): void;
  onApplied(deliveryId: string): void;
  onError(error: Error): void;
  /** Called once, before a session load replays the whole conversation through `onEntries`. */
  onLoad?(): void;
  /** A fresh conversation replaced the old one; `sessionId` names it. */
  onReset(sessionId: string): void;
}

/** Which conversation to open: a new one, or the one a recorded session id names. */
export type SessionOpen =
  | { readonly kind: "new"; readonly cwd: string }
  | { readonly kind: "existing"; readonly cwd: string; readonly sessionId: string };

/** What orchd needs while it opens a session. */
export interface SessionOpenContext {
  readonly logger: Logger;
  readonly settings: OrchSettings;
}

/** A session open on a held process: the link orchd drives it through, and its id. */
export interface HeldSession {
  readonly link: AgentLink;
  readonly sessionId: string;
}

/** One launch of a driver's process. `open` runs once the process has started, on that process. */
export interface HeldLaunch {
  readonly argv: readonly string[];
  /** Environment the process needs on top of the launch environment. */
  readonly env: Readonly<Record<string, string>>;
  /** Opens the conversation and applies the launch's model and thinking level. A model the
   *  harness does not offer rejects by name. */
  open(child: PipesProcess, open: SessionOpen, events: SessionLinkEvents, context: SessionOpenContext): Promise<HeldSession>;
}

/** How a harness runs in a form whose session orchd holds. */
export interface HeldSessionDriver {
  launch(opts: BackendSpawnOpts): HeldLaunch;
  /** True when the harness's own terminal program reads the same session store, so a restart in
   *  the other form resumes the conversation by session id. */
  readonly sharesSessions: boolean;
  /** Whether a recorded session can be reopened, asked before a restart ends the running process. */
  reopens(pipes: PipesProvider, settings: OrchSettings): Promise<boolean>;
}
