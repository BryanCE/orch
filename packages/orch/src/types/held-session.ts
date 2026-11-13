// A session orchd holds: orchd drives the agent's conversation through a driver the harness
// declares for the form. ACP is one driver: one binding process per agent, on pipes. A harness
// with its own server API is another: one server shared by every agent of that harness, each
// agent one session on it. The agent's screen, log and presence are orchd's and are the same for
// every driver; only the wire belongs to one.
import type { AgentLink } from "../control/agent-links.ts";
import type { BackendSpawnOpts } from "./backend.ts";
import type { ControlOutcome } from "./agent.ts";
import type { Logger } from "./core.ts";
import type { PipesProvider } from "./pipes.ts";
import type { QuestionOption } from "./question.ts";
import type { AgentAdapter, SessionView, SessionViewEntry } from "./adapter.ts";
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
  /** A turn started. `deliveryId` names the dispatch or steer that started it, or is empty for
   *  input typed into the harness's own terminal program. */
  onTurnStarted(deliveryId: string): void;
  onEntries(entries: readonly SessionViewEntry[]): void;
  onTurnEnded(outcome: TurnOutcome, text: string): void;
  /** Records the ask as an open question and answers its id. */
  onAsk(ask: SessionAsk): string;
  onAsksSettled(): void;
  onAskDropped(questionId: string): void;
  onApplied(deliveryId: string): void;
  /** The outcome of a control command the link took, as a bridge reports it. */
  onOutcome(outcome: ControlOutcome): void;
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

/** What orchd lends a driver while it starts and opens a session. */
export interface SessionOpenContext {
  readonly logger: Logger;
  readonly settings: OrchSettings;
  readonly pipes: PipesProvider;
}

/** A session open in a held process: the link orchd drives it through, and its id. */
export interface HeldSession {
  readonly link: AgentLink;
  readonly sessionId: string;
  /** Close the link and the session, and resolve once the session is closed. */
  close(): Promise<void>;
}

/** The process a held session runs in, as orchd records it for the agent. */
export interface SessionProcess {
  /** The pid orchd records as the agent's process. */
  readonly pid: number;
  /** Settles once the process is gone. */
  readonly exited: Promise<void>;
  /** True when other agents' sessions run in the same process, so ending one agent never
   *  signals it: the agent ends by releasing its hold. */
  readonly shared: boolean;
  /** Receives future stderr text of the process. */
  onStderr(listener: (text: string) => void): void;
  /** Let go of the process: an agent's own process is killed, a shared one is handed back to the
   *  driver that lent it. Called once. */
  release(): void;
}

/** A process ready for one agent's session. */
export interface SessionConnection {
  readonly process: SessionProcess;
  /** Opens the conversation on the process and applies the launch's model and thinking level.
   *  A model the harness does not offer rejects by name. */
  open(open: SessionOpen, events: SessionLinkEvents): Promise<HeldSession>;
}

/** The agent's terminal, as a session attached to it needs it. */
export interface TerminalControl {
  /** End the terminal program and run `argv` in its place. The terminal keeps the environment it
   *  was opened with, which holds the server's credential. */
  relaunch(argv: readonly string[]): Promise<void>;
}

/** One agent's session on a harness server, shown by the harness's terminal program. */
export interface TerminalSession {
  /** The terminal program and its arguments, attached to the session. */
  readonly argv: readonly string[];
  /** Environment the terminal program needs on top of the agent's launch environment: the
   *  server's credential. */
  readonly env: Readonly<Record<string, string>>;
  readonly sessionId: string;
  /** Start driving the session: the link orchd pushes through. A reset opens a fresh session and
   *  relaunches the terminal program on it through `terminal`. */
  open(events: SessionLinkEvents, terminal: TerminalControl): Promise<HeldSession>;
  /** Hand the server back. Called once, when the agent is gone or never started. */
  release(): void;
}

/** The harness's terminal program is a client of the server the driver holds: orchd opens the
 *  session on that server and the terminal program attaches to it, so the `tui` form has the same
 *  link and presence as the server form. */
export interface TerminalAttachRole {
  /** The credential every terminal program attached to the server needs in its environment. It
   *  is the same for every server the driver starts, so a pane opened before the server runs
   *  already holds it. */
  readonly clientEnv: Readonly<Record<string, string>>;
  /** Borrow the server and open the session for one agent whose launch environment is `env`. */
  attach(opts: BackendSpawnOpts, env: Readonly<Record<string, string>>, open: SessionOpen, context: SessionOpenContext): Promise<TerminalSession>;
}

/** A terminal agent's session, opened before its terminal program starts. */
export interface PreparedTerminal {
  /** What the agent's terminal runs: the harness's terminal program attached to the session. */
  readonly program: readonly string[];
  /** Variables the terminal needs on top of the agent's launch environment. */
  readonly env: Readonly<Record<string, string>>;
  /** Drive the session once the agent is recorded: its link attaches and it reports idle. */
  adopt(): Promise<void>;
  /** Hand the server back: the launch failed before the agent was recorded. */
  abandon(): void;
}

/** Opens a terminal agent's session when its harness's terminal program attaches to a server
 *  orchd holds; answers null for every other harness and form. */
export type TerminalPreparer = (adapter: AgentAdapter, opts: BackendSpawnOpts) => Promise<PreparedTerminal | null>;

/** Who answered a driver's probe. */
export interface DriverIdentity {
  readonly name: string;
  readonly version: string;
}

/** How a harness runs in a form whose session orchd holds. */
export interface HeldSessionDriver {
  /** Start the process the agent's session runs in, or borrow the shared one. `env` is the
   *  agent's launch environment: an agent's own process starts with it, and a shared server gives
   *  it to the agent's session. */
  connect(opts: BackendSpawnOpts, env: Readonly<Record<string, string>>, context: SessionOpenContext): Promise<SessionConnection>;
  /** True when the harness's own terminal program reads the same session store, so a restart in
   *  the other form resumes the conversation by session id. */
  readonly sharesSessions: boolean;
  /** Whether a recorded session can be reopened, asked before a restart ends the running process. */
  reopens(pipes: PipesProvider, settings: OrchSettings): Promise<boolean>;
  /** Start the process, ask who it is, and end it again: doctor's check that the driver works. */
  probe(context: SessionOpenContext): Promise<DriverIdentity>;
  /** The harness's terminal program attached to a session this driver holds, or null when the
   *  terminal program keeps its own session. */
  readonly terminal: TerminalAttachRole | null;
}
