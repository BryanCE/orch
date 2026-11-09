/**
 * The environment of an agent whose PTY this host's orchd holds.
 *
 * orchd launches the harness's interactive command in a PTY it owns and keeps it running
 * for as long as orchd runs, so a viewer can attach to the live screen from any host. The
 * held process is the agent's recorded process here; when the PTY's program exits, the
 * liveness tick sees that process gone. The handle is the PTY program's pid.
 *
 * Only orchd starts a held agent, through {@link startHeldAgent}: the PTY lives in orchd's
 * own process, so `spawn` from any other process has nothing to hold it.
 */
import { createInteractiveCommand } from "../backend.ts";
import { LocalProcessRole } from "../process.ts";
import { unplacedRegistration, type LaunchedAgent } from "../registration.ts";
import { agentLaunchEnv } from "../../policy/spawner.ts";
import { environmentStamp } from "../../shared/environment.ts";
import { createBackendCaptureRole } from "../../presence/roles.ts";
import { registerSpawnedAgent } from "../../store/spawn-registration.ts";
import { hostShell } from "../../host.ts";
import { hostedHere } from "../../local-process.ts";
import { isAgentId } from "../../shared/agent-id.ts";
import type { AgentAdapter } from "../../types/adapter.ts";
import type { AgentInputRole, Backend, BackendId, BackendSpawnOpts, CaptureRole, ProcessRole, RelaunchRole } from "../../types/backend.ts";
import type { HeldPtysByPid, PtyHolder } from "../../types/pty.ts";

const HELD_BACKEND: BackendId = "held";

/** A held agent has no pane: no labels to read, no blocked signal to relay. */
const HELD_ENVIRONMENT_STAMP = environmentStamp({ labels: false, blockedEvent: null });

/** A held agent's handle is its PTY program's pid. */
type HeldHandle = string;

function heldPid(handle: HeldHandle): number | null {
  const pid = Number(handle);
  return Number.isSafeInteger(pid) && pid > 0 ? pid : null;
}

/** orchd's PTYs, by the pid a held handle records. orchd binds them when it starts, since
 *  they live in orchd's memory alone. */
let heldPtys: HeldPtysByPid | null = null;

/** Give the held backend orchd's PTYs to type into and relaunch. */
export function bindHeldPtys(ptys: HeldPtysByPid): void {
  heldPtys = ptys;
}

function boundPtys(): HeldPtysByPid {
  if (heldPtys === null) throw new Error("only orchd holds PTYs, so only orchd can reach one");
  return heldPtys;
}

/** A held PTY runs its command through this host's shell, as a pane would run it. */
function shellRun(command: string): { readonly file: string; readonly args: readonly string[] } {
  const [file, ...args] = hostShell();
  return { file, args: [...args, command] };
}

function requirePid(handle: HeldHandle): number {
  const pid = heldPid(handle);
  if (pid === null) throw new Error(`held handle ${handle} is not a pid`);
  return pid;
}

/** The bytes a terminal reads for each key name a caller sends. */
const KEY_BYTES: Readonly<Record<string, string>> = {
  Enter: "\r", Escape: "\x1b", Tab: "\t", BSpace: "\x7f", Space: " ",
  "C-c": "\x03", "C-d": "\x04", "C-u": "\x15", "C-l": "\x0c",
  Up: "\x1b[A", Down: "\x1b[B", Right: "\x1b[C", Left: "\x1b[D",
};

function typeInto(handle: HeldHandle, data: string): void {
  const pid = requirePid(handle);
  if (!boundPtys().writeToPid(pid, data)) throw new Error(`no PTY held here runs pid ${pid}`);
}

/** Input to a held agent goes straight into its PTY, as a terminal attached to it would send it. */
const heldInput: AgentInputRole<HeldHandle> = {
  submit: (handle, text) => {
    typeInto(handle, text);
    typeInto(handle, KEY_BYTES.Enter ?? "\r");
  },
  sendKeys: (handle, keys) => {
    for (const key of keys) typeInto(handle, KEY_BYTES[key] ?? key);
  },
  // Focus is a pane verb, refused before it gets here: a held agent lists no pane.
  focus: (handle) => { throw new Error(`held agent ${handle} has no pane to bring forward`); },
};

/** The PTY's program is the harness, through this host's shell: a relaunch ends it and runs the
 *  command the same way, in a new PTY with the same directory and environment. */
const heldRelaunch: RelaunchRole<HeldHandle> = {
  relaunch: async (handle, command) => {
    const pid = requirePid(handle);
    const relaunched = await boundPtys().relaunchPid(pid, shellRun(command).args);
    if (relaunched === null) throw new Error(`no PTY held here runs pid ${pid}`);
    const next = String(relaunched.pid);
    return { handle: next, process: heldBackend.process.running(next) };
  },
};

export class HeldBackend implements Backend<HeldHandle> {
  readonly id = HELD_BACKEND;
  readonly process: ProcessRole<HeldHandle> = new LocalProcessRole<HeldHandle>(heldPid);
  readonly capture: CaptureRole = createBackendCaptureRole(HELD_BACKEND, () => undefined);
  // A held agent sits inside orchd, never inside a session a caller can be in.
  readonly identity = null;
  // The recorded handle is the pid, which is the one address of the held process.
  readonly handleLookup = null;
  // The harness keeps its own session; orchd writes no log for a held agent.
  readonly logPruning = null;
  readonly versionInfo = null;
  readonly serverInfo = null;
  // The screen lives in orchd's memory and reaches a viewer through its attach stream,
  // not through a role another process could read synchronously.
  readonly placement = null;
  readonly commandPlacement = null;
  readonly placementInventory = null;
  readonly agentInput: AgentInputRole<HeldHandle> = heldInput;
  readonly foreground = null;
  readonly relaunching: RelaunchRole<HeldHandle> = heldRelaunch;
  readonly screen = null;
  readonly zooming = null;
  readonly labeling = null;
  readonly agentNaming = null;
  readonly agentStatus = null;
  readonly groupHome = null;
  readonly groupLayout = null;
  readonly spaceHome = null;

  /** Never chosen for a spawn: orchd starts held agents itself. */
  isAvailable(): boolean {
    return false;
  }

  isInsideSession(): boolean {
    return false;
  }

  spawn(adapter: AgentAdapter, _opts: BackendSpawnOpts): HeldHandle {
    throw new Error(`cannot spawn a held ${String(adapter.id)} agent here: only orchd holds a PTY, and it starts one when another host spawns on this one`);
  }
}

/** Shared held backend instance. */
export const heldBackend = new HeldBackend();

/**
 * Start one agent's interactive harness in a PTY the holder keeps, and record it in this
 * orch dir's store with the PTY program as its process. The command runs through this
 * host's shell, as a pane would run it.
 */
export async function startHeldAgent(holder: PtyHolder, adapter: AgentAdapter, opts: BackendSpawnOpts): Promise<LaunchedAgent> {
  const key = opts.key;
  if (!isAgentId(key)) throw new Error(`cannot hold a ${String(adapter.id)} agent under ${JSON.stringify(key)}: a held agent runs under its minted id`);
  const command = createInteractiveCommand(adapter, opts);
  const { pid } = await holder.start(key, {
    ...shellRun(command),
    cwd: opts.cwd ?? process.cwd(),
    env: { ...process.env, ...agentLaunchEnv(opts, HELD_ENVIRONMENT_STAMP) },
  });
  const handle = String(pid);
  try {
    const running = heldBackend.process.running(handle);
    const launched: LaunchedAgent = { handle, process: hostedHere(running.pid, running.startToken) };
    registerSpawnedAgent(opts.orchDir, unplacedRegistration(HELD_BACKEND, adapter.id, key, opts, launched));
    return launched;
  } catch (error: unknown) {
    // An agent orch cannot record is one nothing could reach or close.
    holder.kill(key);
    throw error;
  }
}
