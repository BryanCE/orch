import { execFileSync } from "node:child_process";
import { join } from "node:path";
import type { AgentAdapter } from "../../adapters/adapter.ts";
import type {
  Backend,
  BackendCapabilities,
  BackendGroup,
  BackendSpawnOpts,
  BackendSplit,
  BackendTarget,
  BackendWorkspace,
  DeliverPayload,
} from "../backend.ts";
import type { Identity } from "../identity.ts";
import { binaryOnPath } from "../../util.ts";
import { presenceAgentDir, readJSON, type PresenceStatus } from "../../store.ts";
import { bestEffortTmux, execTmux, orchPanes, type TmuxPane } from "./cli.ts";

/** Handle owned by one tmux pane. */
export type TmuxHandle = string;

const TMUX_BACKEND = "tmux";
const FALLBACK_WORKSPACE = "tmux";

/** Pause the calling process; tmux has no native blocking wait primitive to poll against. */
function sleepMs(ms: number): void {
  try {
    execFileSync("sleep", [String(ms / 1000)], { stdio: "ignore" });
  } catch {
    // best-effort pause; a failed sleep just tightens the poll loop
  }
}

/** Agent status read from the presence protocol for one pane's stamped key. */
function statusForAgentKey(key: string): string | null {
  if (!key) return null;
  const status = readJSON<PresenceStatus>(join(presenceAgentDir(key), "status.json"));
  return status?.state ?? null;
}

function groupFromWindowPanes(windowId: string, panes: readonly TmuxPane[]): BackendGroup {
  const first = panes[0]!;
  const index = Number(first.windowIndex);
  return {
    id: windowId,
    label: first.windowName || null,
    workspace: first.session || null,
    focused: panes.some((pane) => pane.windowActive),
    number: Number.isFinite(index) ? index : null,
    paneCount: panes.length,
    status: null,
  };
}

function workspaceFromSessionPanes(session: string, panes: readonly TmuxPane[]): BackendWorkspace {
  const windowIds = new Set(panes.map((pane) => pane.windowId));
  return {
    id: session,
    label: session,
    focused: panes.some((pane) => pane.sessionAttached),
    number: null,
    tabCount: windowIds.size,
    paneCount: panes.length,
    status: null,
  };
}

/** Group orch panes by a key, dropping panes with no value for that key. */
function groupPanesBy(panes: readonly TmuxPane[], key: (pane: TmuxPane) => string): Map<string, TmuxPane[]> {
  const groups = new Map<string, TmuxPane[]>();
  for (const pane of panes) {
    const value = key(pane);
    if (!value) continue;
    const bucket = groups.get(value);
    if (bucket) bucket.push(pane);
    else groups.set(value, [pane]);
  }
  return groups;
}

/** Backend for panes managed by a tmux session. */
export class TmuxBackend implements Backend<TmuxHandle> {
  readonly id = TMUX_BACKEND;
  readonly panes = true;
  readonly focusable = true;
  readonly canSendKeys = true;
  readonly caps: BackendCapabilities = { panes: true, focusable: true, canSendKeys: true };

  isAvailable(): boolean {
    return binaryOnPath("tmux");
  }

  isInsideSession(): boolean {
    return !!process.env.TMUX;
  }

  /** Resolve the session owning a pane. Kept protected for hermetic tests. */
  protected sessionOf(pane: string): string {
    return bestEffortTmux(["display-message", "-p", "-t", pane, "#{session_name}"])?.trim() ?? "";
  }

  /** Resolve the orch presence key stamped on a pane, when it has one. */
  protected agentKeyOf(pane: string): string {
    return bestEffortTmux(["display-message", "-p", "-t", pane, "#{@orch_agent_key}"])?.trim() ?? "";
  }

  mintIdentity(handle: TmuxHandle): Identity {
    return {
      backend: TMUX_BACKEND,
      workspace: this.sessionOf(handle) || FALLBACK_WORKSPACE,
      handle,
    };
  }

  /** Identity of the calling pane, resolved from tmux's environment. */
  currentIdentity(): Identity | null {
    const handle = process.env.TMUX_PANE;
    if (!handle) return null;
    const workspace = this.sessionOf(handle);
    if (!workspace) return null;
    return { backend: TMUX_BACKEND, workspace, handle };
  }

  /** Split an existing window to place a new pane inside a created group (D8). */
  private placeInGroup(group: string, split: BackendSplit | undefined, cwd: string, envArgs: readonly string[], command: string): TmuxHandle {
    const orientation = split === "right" ? "-h" : "-v";
    const output = bestEffortTmux([
      "split-window",
      "-t",
      group,
      orientation,
      "-P",
      "-F",
      "#{pane_id}",
      "-c",
      cwd,
      ...envArgs,
      "--",
      "bash",
      "-lc",
      command,
    ]);
    const handle = output?.trim() ?? "";
    if (!handle) throw new Error("tmux split-window returned no pane id");
    return handle;
  }

  /** Open a fresh window to place a new pane when no group is given. */
  private placeInNewWindow(cwd: string, envArgs: readonly string[], command: string): TmuxHandle {
    const output = bestEffortTmux([
      "new-window",
      "-P",
      "-F",
      "#{pane_id}",
      "-c",
      cwd,
      ...envArgs,
      "--",
      "bash",
      "-lc",
      command,
    ]);
    const handle = output?.trim() ?? "";
    if (!handle) throw new Error("tmux new-window returned no pane id");
    return handle;
  }

  spawn(adapter: AgentAdapter, opts: BackendSpawnOpts): TmuxHandle {
    if (!this.isInsideSession()) throw new Error("tmux spawn requires running inside a tmux session");
    const command = adapter.restrictedInteractiveCmd?.(opts) ?? adapter.interactiveCmd(opts);
    if (!command.trim()) throw new Error(`adapter ${String(adapter.id)} returned an empty interactive command`);

    const cwd = opts.cwd ?? process.cwd();
    const orchDir = opts.orchDir ?? process.env.ORCH_DIR ?? "";
    const envArgs = ["-e", `ORCH_AGENT_KEY=${opts.key ?? ""}`, "-e", `ORCH_DIR=${orchDir}`];

    const handle = opts.group
      ? this.placeInGroup(opts.group, opts.split, cwd, envArgs, command)
      : this.placeInNewWindow(cwd, envArgs, command);

    bestEffortTmux(["set-option", "-p", "-t", handle, "@orch_agent_key", opts.key ?? ""]);
    bestEffortTmux(["set-option", "-p", "-t", handle, "@orch_agent", String(adapter.id)]);
    bestEffortTmux(["select-layout", "-t", handle, "tiled"]);
    return handle;
  }

  close(handle: TmuxHandle): boolean {
    if (typeof handle !== "string" || handle.length === 0) return false;
    return bestEffortTmux(["kill-pane", "-t", handle]) !== null;
  }

  /** Pane ids for panes orch itself spawned (a non-empty `@orch_agent_key`). */
  list(): TmuxHandle[] {
    return orchPanes().map((pane) => pane.paneId);
  }

  /** Submit either payload kind as text followed by Enter. */
  deliver(handle: TmuxHandle, payload: DeliverPayload): boolean {
    return bestEffortTmux(["send-keys", "-t", handle, "--", payload.text]) !== null
      && bestEffortTmux(["send-keys", "-t", handle, "--", "Enter"]) !== null;
  }

  /** Select the target window and pane in tmux. */
  focus(handle: TmuxHandle): boolean {
    return bestEffortTmux(["select-window", "-t", handle]) !== null
      && bestEffortTmux(["select-pane", "-t", handle]) !== null;
  }

  /** Pass backend key names through to tmux unchanged. */
  sendKeys(handle: TmuxHandle, keys: readonly string[]): boolean {
    return bestEffortTmux(["send-keys", "-t", handle, "--", ...keys]) !== null;
  }

  /** Apply tmux's built-in tiled layout to the target group. */
  // fallow-ignore-next-line unused-class-member
  applyLayout(group: string, layout: "tiled"): boolean {
    return bestEffortTmux(["select-layout", "-t", group, layout]) !== null;
  }

  /** Every orch pane with its workspace, group, name, and presence status (D1, D2). */
  inventory(): BackendTarget<TmuxHandle>[] {
    return orchPanes().map((pane) => ({
      handle: pane.paneId,
      workspace: pane.session || null,
      group: pane.windowId || null,
      groupLabel: pane.windowName || null,
      name: pane.agentName || pane.paneTitle || null,
      agent: pane.agent || null,
      focused: pane.paneActive && pane.windowActive && pane.sessionAttached,
      status: statusForAgentKey(pane.agentKey),
      sessionPath: null,
    }));
  }

  /** Read the last visible lines of a pane's screen. Throws on failure (D7). */
  read(handle: TmuxHandle, lines: number): string {
    return execTmux(["capture-pane", "-p", "-t", handle, "-S", `-${lines}`]);
  }

  /** Rename the agent shown for a pane (the `@orch_agent_name` pane option). */
  renameAgent(handle: TmuxHandle, name: string): boolean {
    return bestEffortTmux(["set-option", "-p", "-t", handle, "@orch_agent_name", name]) !== null;
  }

  /** Rename the pane border label. */
  renamePane(handle: TmuxHandle, name: string): boolean {
    return bestEffortTmux(["select-pane", "-t", handle, "-T", name]) !== null;
  }

  /** Block until the pane's presence status.json reports the status, or time out (D2). */
  waitAgentStatus(handle: TmuxHandle, status: string, timeoutMs: number): boolean {
    const key = this.agentKeyOf(handle);
    if (!key) return false;
    const statusPath = join(presenceAgentDir(key), "status.json");
    const deadline = Date.now() + timeoutMs;
    while (true) {
      if (readJSON<PresenceStatus>(statusPath)?.state === status) return true;
      if (Date.now() >= deadline) return false;
      sleepMs(250);
    }
  }

  /** Create a window and report it with its root pane. Throws on failure (D4). */
  createGroup(opts: { workspace: string; cwd: string; label?: string | null }): { group: BackendGroup; rootHandle: TmuxHandle } {
    const args = ["new-window", "-P", "-F", "#{window_id}\t#{window_index}\t#{pane_id}", "-t", opts.workspace, "-c", opts.cwd];
    if (opts.label) args.push("-n", opts.label);
    const [windowId, windowIndex, paneId] = execTmux(args).trim().split("\t");
    if (!windowId || !paneId) throw new Error("tmux new-window returned no window/pane id");
    const index = Number(windowIndex);
    return {
      group: {
        id: windowId,
        label: opts.label ?? null,
        workspace: opts.workspace,
        focused: false,
        number: Number.isFinite(index) ? index : null,
        paneCount: 1,
        status: null,
      },
      rootHandle: paneId,
    };
  }

  /** tmux windows containing at least one orch pane (D4). */
  groups(): BackendGroup[] {
    const byWindow = groupPanesBy(orchPanes(), (pane) => pane.windowId);
    return [...byWindow.entries()].map(([windowId, panes]) => groupFromWindowPanes(windowId, panes));
  }

  /** tmux sessions containing at least one orch pane; `number` is always null for tmux (D4). */
  workspaces(): BackendWorkspace[] {
    const bySession = groupPanesBy(orchPanes(), (pane) => pane.session);
    return [...bySession.entries()].map(([session, panes]) => workspaceFromSessionPanes(session, panes));
  }
}

/** Shared tmux backend instance. */
export const tmuxBackend = new TmuxBackend();
