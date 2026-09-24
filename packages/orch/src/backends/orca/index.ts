import { z } from "zod";
import { AgentGoneError } from "../../control/agent-gone.ts";
import { environmentStamp } from "../../agent/environment.ts";
import { agentLaunchEnv } from "../../policy/spawner.ts";
import { pidStampedWith } from "../../process-identity.ts";
import { LocalProcessRole, placedShellPid } from "../process.ts";
import { binaryOnPath, shellQuote } from "../../util.ts";
import { isAgentId } from "../identity.ts";
import { OrcaCommandError, GONE_HANDLE_CODES, ORCA_INPUT_RETRY, createOrcaCli, orcaBinary, type OrcaCli } from "./cli.ts";
import { createBackendCaptureRole, createInteractiveCommand } from "../backend.ts";
import type {
  AgentNamingRole,
  AgentStatusRole,
  Backend,
  BackendGroup,
  BackendGroupLayout,
  BackendId,
  BackendSpawnOpts,
  BackendTarget,
  CaptureRole,
  CreatedGroup,
  EnvironmentIdentityRole,
  ForegroundRole,
  GroupHomeRole,
  GroupLayoutRole,
  LabelRole,
  MoveRequest,
  PlacementInventoryRole,
  PlacementRole,
  ScreenRole,
  ServerInfoRole,
  SpaceHomeRole,
  VersionRole,
} from "../../types/backend.ts";
import type { AgentAdapter } from "../../types/adapter.ts";
import type { OrchDir } from "../../types/core.ts";
import type { OrcaBackendDeps, OrcaHandle, OrcaTerminal } from "../../types/plexer.ts";

const ORCA_BACKEND: BackendId = "orca";
/** The oldest Orca this integration speaks to. */
const SUPPORTED_ORCA = ">=1.4.0";
/** Orca panes carry this key in every process environment. */
const ORCA_PANE_KEY = "ORCA_PANE_KEY";
/** Orca has no environment-specific blocked event to stamp. */
const ORCA_ENVIRONMENT_STAMP = environmentStamp({ labels: false, blockedEvent: null });

const terminalCreateSchema = z.object({ handle: z.string(), tabId: z.string() });
const terminalSplitSchema = z.object({ handle: z.string() });
const terminalReadSchema = z.object({ tail: z.array(z.string()) });

function worktreeSelector(workspace: string | undefined, cwd: string): string {
  return workspace === undefined ? `path:${cwd}` : `id:${workspace}`;
}

function reportGoneHandle(handle: OrcaHandle, deliver: () => void): void {
  try {
    deliver();
  } catch (error: unknown) {
    if (error instanceof OrcaCommandError && error.code !== null && GONE_HANDLE_CODES.has(error.code)) {
      throw new AgentGoneError(handle, `orca reports ${error.code}`);
    }
    throw error;
  }
}

function launchLine(env: Readonly<Record<string, string>>, command: string): string {
  return ["env", ...Object.entries(env).map(([key, value]) => `${key}=${shellQuote(value)}`), command].join(" ");
}

/** tmux key names orch sends, as the bytes Orca's pty reads. */
const KEY_BYTES: Readonly<Record<string, string>> = {
  Escape: "\x1b",
  Enter: "\r",
  Tab: "\t",
  BSpace: "\x7f",
  Up: "\x1b[A",
  Down: "\x1b[B",
  Right: "\x1b[C",
  Left: "\x1b[D",
};

function keyBytes(key: string): string {
  const named = KEY_BYTES[key];
  if (named !== undefined) return named;
  const control = /^C-([a-z])$/.exec(key);
  if (control) return String.fromCharCode(control[1]!.charCodeAt(0) - 96);
  return key;
}

/** Backend for terminals managed by Orca. */
export class OrcaBackend implements Backend<OrcaHandle> {
  readonly id = ORCA_BACKEND;
  readonly cli: OrcaCli;
  private readonly orchDir: OrchDir | undefined;
  readonly process = new LocalProcessRole<OrcaHandle>(placedShellPid(() => this.foreground));

  constructor(deps: OrcaBackendDeps & { readonly orchDir?: OrchDir } = {}) {
    this.cli = createOrcaCli(deps.executor);
    this.orchDir = deps.orchDir;
  }

  readonly capture: CaptureRole = createBackendCaptureRole("orca", () => this.orchDir);
  readonly identity: EnvironmentIdentityRole = {
    current: (id: string | null): string | null => {
      if (!process.env[ORCA_PANE_KEY]) return null;
      return isAgentId(id) ? id : null;
    },
  };
  // Orca terminals are directly addressed by their native handle.
  readonly handleLookup: null = null;
  // Orca keeps no logs orch owns.
  readonly logPruning: null = null;
  readonly versionInfo: VersionRole = {
    installed: (): string | null => this.cli.version(),
    supported: (): string => SUPPORTED_ORCA,
  };
  readonly serverInfo: ServerInfoRole = {
    running: () => {
      const status = this.cli.serverStatus();
      return status.running ? { version: status.version, compatible: null } : null;
    },
  };

  readonly agentInput = {
    submit: (handle: OrcaHandle, text: string): void => {
      reportGoneHandle(handle, () => this.cli.ack(["terminal", "send", "--terminal", handle, "--text", text, "--enter"], undefined, ORCA_INPUT_RETRY));
    },
    sendKeys: (handle: OrcaHandle, keys: readonly string[]): void => {
      if (keys.length === 1 && keys[0] === "C-c") {
        reportGoneHandle(handle, () => this.cli.ack(["terminal", "send", "--terminal", handle, "--interrupt"], undefined, ORCA_INPUT_RETRY));
        return;
      }
      const text = keys.map(keyBytes).join("");
      reportGoneHandle(handle, () => this.cli.ack(["terminal", "send", "--terminal", handle, "--text", text], undefined, ORCA_INPUT_RETRY));
    },
    focus: (handle: OrcaHandle): void => {
      reportGoneHandle(handle, () => this.cli.ack(["terminal", "switch", "--terminal", handle]));
    },
  };

  readonly foreground: ForegroundRole<OrcaHandle> = {
    read: (handle) => {
      const row = this.terminal(handle);
      const shellPid = pidStampedWith(ORCA_PANE_KEY, `${row.tabId}:${row.leafId}`);
      return { shellPid, foregroundPid: null, processes: [] };
    },
  };

  readonly placement: PlacementRole<OrcaHandle> = {
    open: (request) => {
      if (typeof request.targetHandle === "string") return { handle: this.split(request.targetHandle, request.split) };
      if (request.group !== undefined) {
        const row = this.cli.terminals().find((terminal) => terminal.tabId === request.group);
        if (!row) throw new AgentGoneError(request.group, "orca tab is not listed");
        return { handle: this.split(row.handle, request.split) };
      }
      // Orca has no create-time env flag; spawn types env assignments into the shell.
      const result = this.cli.json(["terminal", "create", "--worktree", worktreeSelector(request.workspace, request.cwd)], terminalCreateSchema);
      return { handle: result.handle };
    },
    close: (handle) => {
      try { this.cli.ack(["terminal", "close", "--terminal", handle]); } catch { /* best effort */ }
    },
  };

  readonly placementInventory: PlacementInventoryRole<OrcaHandle> = {
    current: () => {
      const key = process.env[ORCA_PANE_KEY];
      if (!key) return null;
      const row = this.cli.terminals().find((terminal) => `${terminal.tabId}:${terminal.leafId}` === key);
      return row ? { handle: row.handle, workspace: row.worktreeId, group: row.tabId } : null;
    },
    list: (): readonly BackendTarget<OrcaHandle>[] => this.cli.terminals().map((terminal) => ({
      handle: terminal.handle,
      workspace: terminal.worktreeId,
      group: terminal.tabId,
      groupLabel: terminal.title,
      name: terminal.title,
      agent: null,
      focused: false,
      // Orca rows carry no orch presence key, so status cannot be resolved here.
      status: null,
      sessionPath: null,
    })),
    coordinateOf: (handle) => this.cli.terminals().find((terminal) => terminal.handle === handle)?.worktreeId ?? null,
  };

  readonly screen: ScreenRole<OrcaHandle> = {
    read: (handle, lines) => {
      const result = this.cli.json(["terminal", "read", "--terminal", handle, "--screen"], terminalReadSchema);
      return (lines > 0 ? result.tail.slice(-lines) : []).join("\n");
    },
  };
  // Orca has no zoom role in its terminal CLI.
  readonly zooming = null;
  readonly labeling: LabelRole<OrcaHandle> = { setLabel: (handle, name) => { this.cli.ack(["terminal", "rename", "--terminal", handle, "--title", name]); } };
  // Orca has no separate agent name operation.
  readonly agentNaming: AgentNamingRole<OrcaHandle> | null = null;
  // Orca exposes no orch presence status key for a terminal.
  readonly agentStatus: AgentStatusRole<OrcaHandle> | null = null;

  readonly groupHome: GroupHomeRole<OrcaHandle> = {
    list: () => {
      const groups = new Map<string, OrcaTerminal[]>();
      for (const row of this.cli.terminals()) {
        const rows = groups.get(row.tabId);
        if (rows) rows.push(row);
        else groups.set(row.tabId, [row]);
      }
      return [...groups.values()].map((rows) => this.groupFromRows(rows));
    },
    create: (request): CreatedGroup<OrcaHandle> => {
      const args = ["terminal", "create", "--worktree", worktreeSelector(request.workspace, request.cwd)];
      if (request.label) args.push("--title", request.label);
      const result = this.cli.json(args, terminalCreateSchema);
      const rows = this.cli.terminals().filter((row) => row.tabId === result.tabId);
      return { group: this.groupFromRows(rows), rootHandle: result.handle };
    },
    rename: (coordinate, label) => {
      const row = this.cli.terminals().find((terminal) => terminal.tabId === coordinate);
      if (!row) throw new AgentGoneError(coordinate, "orca tab is not listed");
      this.cli.ack(["terminal", "rename", "--terminal", row.handle, "--title", label]);
    },
    close: (coordinate) => { this.cli.ack(["terminal", "close", "--tab", coordinate]); },
    focus: (coordinate) => {
      const row = this.cli.terminals().find((terminal) => terminal.tabId === coordinate);
      if (!row) throw new AgentGoneError(coordinate, "orca tab is not listed");
      this.cli.ack(["terminal", "switch", "--terminal", row.handle]);
    },
    move: (_request: MoveRequest<OrcaHandle>): void => { throw new Error("orca cannot move a terminal between tabs"); },
  };

  readonly groupLayout: GroupLayoutRole<OrcaHandle> = {
    read: (group): BackendGroupLayout<OrcaHandle> => {
      const rows = this.cli.terminals().filter((terminal) => terminal.tabId === group);
      if (!rows.length) throw new Error(`no terminals on tab ${group}`);
      // Orca reports no cell geometry over the CLI; equal rects keep the tiling planner honest about count only.
      return {
        group,
        placements: rows.map((row, index) => ({ handle: row.handle, rect: { x: 0, y: index, width: 1, height: 1 } })),
      };
    },
  };

  // Orca has no folder-workspace verb on its CLI; a space has no Orca home.
  readonly spaceHome: SpaceHomeRole<OrcaHandle> | null = null;

  isAvailable(): boolean {
    return binaryOnPath(orcaBinary());
  }

  isInsideSession(): boolean {
    return !!process.env[ORCA_PANE_KEY];
  }

  spawn(adapter: AgentAdapter, opts: BackendSpawnOpts): OrcaHandle {
    const command = createInteractiveCommand(adapter, opts);
    const cwd = opts.cwd ?? process.cwd();
    const env = agentLaunchEnv(opts, ORCA_ENVIRONMENT_STAMP);
    const adopted = typeof opts.intoHandle === "string" ? opts.intoHandle : null;
    const handle = adopted ?? this.placement.open({
      cwd,
      workspace: opts.workspace,
      group: opts.group,
      split: opts.split,
      targetHandle: typeof opts.targetHandle === "string" ? opts.targetHandle : undefined,
      env,
    }).handle;
    try {
      // The pane shell is POSIX today; a Windows Orca host is a later adapter decision.
      this.agentInput.submit(handle, launchLine(env, command));
    } catch (error: unknown) {
      if (adopted === null) this.placement.close(handle);
      throw error;
    }
    return handle;
  }

  private split(handle: OrcaHandle, split: "down" | "right" | undefined): OrcaHandle {
    const direction = split === "right" ? "horizontal" : "vertical";
    return this.cli.json(["terminal", "split", "--terminal", handle, "--direction", direction], terminalSplitSchema).handle;
  }

  private terminal(handle: OrcaHandle): OrcaTerminal {
    const row = this.cli.terminals().find((terminal) => terminal.handle === handle);
    if (!row) throw new AgentGoneError(handle, "orca terminal is not listed");
    return row;
  }

  private groupFromRows(rows: readonly OrcaTerminal[]): BackendGroup {
    const first = rows[0];
    if (!first) throw new Error("orca tab has no terminals");
    return {
      id: first.tabId,
      label: first.title,
      workspace: first.worktreeId,
      focused: false,
      number: null,
      placementCount: rows.length,
      status: null,
    };
  }
}

/** Shared Orca backend instance. */
export const orcaBackend = new OrcaBackend();
