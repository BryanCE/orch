import { join } from "node:path";
import type { AgentAdapter } from "../../adapters/adapter.ts";
import { homeLabel } from "../backend.ts";
import { tryParseIdentity } from "../identity.ts";
import { binaryOnPath } from "../../util.ts";
import { sleepMs } from "../pane-ready.ts";
import { STATUS_FILE } from "../../presence/schema.ts";
import { presenceAgentDir, AgentStatusRole, Backend, BackendGroup, BackendGroupLayout, BackendId, BackendSpawnOpts, BackendSplit, BackendTarget, BackendWorkspace, CreateGroupRequest, CreatedGroup, CreatedHome, EnvironmentIdentityRole, GroupHomeRole, GroupLayoutRole, HomeSubject, Identity, MovePaneRequest, PaneForegroundRole, PaneHostRole, PaneInventoryRole, PaneNamingRole, PaneScreenRole, PaneZoomRole, PlexerHome, SpaceHomeRole, capture } from "../../presence/roles.ts";
import { LocalProcessRole } from "../process.ts";
import type { AgentNamingRole, execTmux, orchPanes, readPresenceStatus } from "../../presence/store.ts";
import { bestEffortTmux, type TmuxPane } from "./cli.ts";
import { agentChannel, windowPaneRects } from "../../types/backend.ts";

/** Handle owned by one tmux pane. */
export type TmuxHandle = string;

const TMUX_BACKEND: BackendId = "tmux";

function tmuxEnvArgs(env: Readonly<Record<string, string>>): string[] {
  return Object.entries(env).flatMap(([name, value]) => ["-e", `${name}=${value}`]);
}

/** Agent status read from the presence protocol for one pane's stamped key. */
function statusForAgentKey(key: string): string | null {
  if (!key) return null;
  const status = readPresenceStatus(join(presenceAgentDir(key), STATUS_FILE));
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

/** Injected home command runner for hermetic provider tests. */
export interface TmuxBackendDeps {
  readonly homeExec?: (args: string[]) => string;
}

/** Backend for panes managed by a tmux session. */
export class TmuxBackend implements Backend<TmuxHandle> {
  readonly id = TMUX_BACKEND;
  readonly process = new LocalProcessRole();
  private readonly homeExec: (args: string[]) => string;

  constructor(deps: TmuxBackendDeps = {}) {
    this.homeExec = deps.homeExec ?? ((args) => execTmux(args));
  }
  readonly identity: EnvironmentIdentityRole = {
    current: (): Identity | null => this.currentIdentity(),
  };
  // No key -> handle lookup: a pane is addressed by its own handle here.
  readonly handleLookup: null = null;
  // tmux keeps no logs orch owns.
  readonly logPruning: null = null;
  // tmux reports no orch integration version of its own.
  readonly versionInfo: null = null;
  readonly channel = agentChannel;
  readonly capture = capture;
  readonly paneInput = {
    submit: (handle: TmuxHandle, text: string): void => {
      if (bestEffortTmux(["send-keys", "-t", handle, "--", text]) === null
        || bestEffortTmux(["send-keys", "-t", handle, "--", "Enter"]) === null) throw new Error(`tmux failed to submit text to ${handle}`);
    },
    sendKeys: (handle: TmuxHandle, keys: readonly string[]): void => {
      if (bestEffortTmux(["send-keys", "-t", handle, "--", ...keys]) === null) throw new Error(`tmux failed to send keys to ${handle}`);
    },
    focus: (handle: TmuxHandle): void => {
      if (bestEffortTmux(["select-window", "-t", handle]) === null || bestEffortTmux(["select-pane", "-t", handle]) === null) throw new Error(`tmux failed to focus ${handle}`);
    },
  };
  readonly paneForeground: PaneForegroundRole<TmuxHandle> | null = null;
  readonly paneHost: PaneHostRole<TmuxHandle> = {
    open: (request) => {
      const target = request.targetPane ?? request.group;
      if (!target) throw new Error("tmux pane placement requires a target pane or group");
      const orientation = request.split === "right" ? "-h" : "-v";
      const envArgs = tmuxEnvArgs(request.env ?? {});
      const output = bestEffortTmux([
        "split-window", "-t", target, orientation, "-P", "-F", "#{pane_id}",
        "-c", request.cwd, ...envArgs, "--", "bash",
      ]);
      const handle = output?.trim() ?? "";
      if (!handle) throw new Error("tmux split-window returned no pane id");
      return { handle };
    },
    close: (handle) => { this.close(handle); },
  };
  readonly paneInventory: PaneInventoryRole<TmuxHandle> = {
    current: () => {
      const handle = process.env.TMUX_PANE;
      return handle ? { handle, workspace: this.sessionOf(handle), group: null } : null;
    },
    list: () => this.inventory(),
  };
  readonly paneScreen: PaneScreenRole<TmuxHandle> = { read: (handle, lines) => this.read(handle, lines) };
  readonly paneZoom: PaneZoomRole<TmuxHandle> | null = null;
  readonly paneNaming: PaneNamingRole<TmuxHandle> = { renamePane: (handle, name) => { if (!this.renamePane(handle, name)) throw new Error(`tmux failed to rename pane ${handle}`); } };
  readonly agentNaming: AgentNamingRole<TmuxHandle> = { renameAgent: (handle, name) => { if (!this.renameAgent(handle, name)) throw new Error(`tmux failed to rename agent ${handle}`); } };
  readonly agentStatus: AgentStatusRole<TmuxHandle> = { wait: (handle, status, timeoutMs) => { if (!this.waitAgentStatus(handle, status, timeoutMs)) throw new Error(`wait for ${handle} -> "${status}" timed out`); } };
  readonly groupHome: GroupHomeRole<TmuxHandle> = {
    list: () => {
      const byWindow = groupPanesBy(orchPanes(), (pane) => pane.windowId);
      return [...byWindow.entries()].map(([windowId, panes]) => groupFromWindowPanes(windowId, panes));
    },
    create: (opts: CreateGroupRequest): CreatedGroup<TmuxHandle> => {
      const args = ["new-window", "-P", "-F", "#{window_id}\t#{window_index}\t#{pane_id}", "-t", opts.workspace, "-c", opts.cwd];
      if (opts.label) args.push("-n", opts.label);
      args.push(...tmuxEnvArgs(opts.env ?? {}));
      const [windowId, windowIndex, paneId] = execTmux(args).trim().split("\t");
      if (!windowId || !paneId) throw new Error("tmux new-window returned no window/pane id");
      const index = Number(windowIndex);
      return { group: { id: windowId, label: opts.label ?? null, workspace: opts.workspace, focused: false, number: Number.isFinite(index) ? index : null, paneCount: 1, status: null }, rootHandle: paneId };
    },
    rename: (coordinate, label) => { execTmux(["rename-window", "-t", coordinate, label]); },
    close: (coordinate) => { execTmux(["kill-window", "-t", coordinate]); },
    focus: (coordinate) => { execTmux(["select-window", "-t", coordinate]); },
    move: (request: MovePaneRequest<TmuxHandle>): void => {
      if (request.group === null) {
        const args = ["break-pane", "-d", "-s", request.handle];
        if (request.label) args.push("-n", request.label);
        execTmux(args);
        return;
      }
      const orientation = request.split === "right" ? "-h" : "-v";
      const target = request.against ?? request.targetPane ?? request.group;
      execTmux(["join-pane", orientation, "-s", request.handle, "-t", target]);
    },
  };
  readonly groupLayout: GroupLayoutRole<TmuxHandle> = {
    read: (group: string): BackendGroupLayout<TmuxHandle> => {
      const panes = windowPaneRects(group);
      if (!panes.length) throw new Error(`no panes on window ${group}`);
      return { group, panes: panes.map((pane) => ({ handle: pane.paneId, rect: pane.rect })) };
    },
  };
  readonly spaceHome: SpaceHomeRole<TmuxHandle> = {
    list: (): readonly PlexerHome[] => this.homeExec(["list-sessions", "-F", "#{session_name}"])
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((coordinate) => coordinate.length > 0)
      .map((coordinate) => ({ coordinate, label: coordinate })),
    create: (subject: HomeSubject, request): CreatedHome<TmuxHandle> => {
      // E8: never unmarked. A `new-session` with no `-s` takes tmux's own
      // counter for a name, which says nothing about who opened it or what for.
      const args = ["new-session", "-d", "-P", "-F", "#{session_name}\t#{pane_id}", "-c", request.cwd,
        "-s", homeLabel(subject, request.label), ...tmuxEnvArgs(request.env ?? {})];
      const [coordinate, rootHandle] = this.homeExec(args).trim().split("\t");
      if (!coordinate || !rootHandle) throw new Error("tmux new-session returned no session/pane id");
      return { coordinate, rootHandle };
    },
    rename: (coordinate, label): void => { this.homeExec(["rename-session", "-t", coordinate, label]); },
    close: (coordinate): void => { this.homeExec(["kill-session", "-t", coordinate]); },
    // A space's home here IS a tmux session, so focusing it moves the attached
    // client to that session. `select-window` addresses a window inside one and
    // left `orch space focus` silently landing on the wrong home.
    focus: (coordinate): void => { this.homeExec(["switch-client", "-t", coordinate]); },
  };

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

  /** Identity of the calling pane, resolved from tmux's environment. */
  currentIdentity(): Identity | null {
    const handle = process.env.TMUX_PANE;
    if (!handle) return null;
    // See the herdr backend: identity is minted by orch and arrives in the
    // environment. A pane this process merely happens to occupy is not one.
    return tryParseIdentity(process.env.ORCH_AGENT_KEY);
  }

  /** Split one pane (or the group's active pane) to place a new pane inside a group (D8). */
  private placeInGroup(target: string, split: BackendSplit | undefined, cwd: string, envArgs: readonly string[], command: string): TmuxHandle {
    const orientation = split === "right" ? "-h" : "-v";
    const output = bestEffortTmux([
      "split-window",
      "-t",
      target,
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

  /** Replace a pane's shell with the agent, so a window's own pane becomes the
   *  agent's rather than a second pane being opened beside it and the first
   *  left to be closed — a close tmux is free to refuse. */
  private runInPane(handle: TmuxHandle, cwd: string, envArgs: readonly string[], command: string): TmuxHandle {
    const target = String(handle);
    const respawned = bestEffortTmux(["respawn-pane", "-k", "-t", target, "-c", cwd, ...envArgs, "--", "bash", "-lc", command]);
    if (respawned === null) throw new Error(`tmux could not start the agent in pane ${target}`);
    return target;
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
    // An explicit --cmd is the caller's launch line verbatim; without one the adapter builds it.
    const command = opts.cmd ?? adapter.workerLaunch?.restrictedInteractiveCmd(opts) ?? adapter.interactiveCmd(opts);
    if (!command.trim()) throw new Error(`adapter ${String(adapter.id)} returned an empty interactive command`);

    const cwd = opts.cwd ?? process.cwd();
    const orchDir = opts.orchDir ?? process.env.ORCH_DIR ?? "";
    const envArgs = tmuxEnvArgs({
      ORCH_AGENT_KEY: opts.key ?? "",
      ORCH_DIR: orchDir,
      ...(opts.env ?? {}),
    });

    // A planned target pane wins over the group: `-t <window>` splits whatever
    // pane happens to be active there, which makes placement depend on focus.
    const splitTarget = typeof opts.targetPane === "string" ? opts.targetPane : opts.group;
    const handle = typeof opts.intoPane === "string"
      ? this.runInPane(opts.intoPane, cwd, envArgs, command)
      : splitTarget
        ? this.placeInGroup(splitTarget, opts.split, cwd, envArgs, command)
        : this.placeInNewWindow(cwd, envArgs, command);

    bestEffortTmux(["set-option", "-p", "-t", handle, "@orch_agent_key", opts.key ?? ""]);
    bestEffortTmux(["set-option", "-p", "-t", handle, "@orch_agent", String(adapter.id)]);
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

  /** Select the target window and pane in tmux. */
  focus(handle: TmuxHandle): boolean {
    return bestEffortTmux(["select-window", "-t", handle]) !== null
      && bestEffortTmux(["select-pane", "-t", handle]) !== null;
  }

  /** Pass backend key names through to tmux unchanged. */
  sendKeys(handle: TmuxHandle, keys: readonly string[]): boolean {
    return bestEffortTmux(["send-keys", "-t", handle, "--", ...keys]) !== null;
  }

  /** tmux workspaces carry no display names distinct from their ids. */
  workspaceNames(): Map<string, string> {
    return new Map();
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
    const statusPath = join(presenceAgentDir(key), STATUS_FILE);
    const deadline = Date.now() + timeoutMs;
    while (true) {
      if (readPresenceStatus(statusPath)?.state === status) return true;
      if (Date.now() >= deadline) return false;
      sleepMs(250);
    }
  }

  /** tmux sessions containing at least one orch pane; `number` is always null for tmux (D4). */
  workspaces(): BackendWorkspace[] {
    const bySession = groupPanesBy(orchPanes(), (pane) => pane.session);
    return [...bySession.entries()].map(([session, panes]) => workspaceFromSessionPanes(session, panes));
  }
}

/** Shared tmux backend instance. */
export const tmuxBackend = new TmuxBackend();
