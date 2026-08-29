import { isAdapterId } from "../../adapters/adapter.ts";
import { registerNotifier } from "../../notify/sinks.ts";
import { herdrNotifier } from "./notify.ts";
import { binaryOnPath, isRecord } from "../../util.ts";
import { agentLaunchEnv } from "../../policy/spawner.ts";
import { herdrAck, herdrExec, herdrJSON, herdrNames, herdrPanes, herdrReachable, herdrStartAgent, herdrTabs, version } from "./cli.ts";
import { homeLabel } from "../backend.ts";
import { tryParseIdentity } from "../identity.ts";
import { agentChannel, capture } from "../../presence/roles.ts";
import { LocalProcessRole } from "../process.ts";
import type { AgentNamingRole, AgentStatusRole, Backend, BackendGroup, BackendGroupLayout, BackendId, BackendRect, BackendSpawnOpts, BackendSplit, BackendTarget, BackendWorkspace, BackendZoomMode, CreateGroupRequest, CreatedGroup, CreatedHome, EnvironmentIdentityRole, GroupHomeRole, GroupLayoutRole, HomeSubject, Identity, MovePaneRequest, OpenPaneRequest, PaneForegroundRole, PaneHostRole, PaneInventoryRole, PaneNamingRole, PaneScreenRole, PaneZoomRole, PlexerHome, SpaceHomeRole, VersionRole } from "../../types/backend.ts";
import type { AgentAdapter } from "../../types/adapter.ts";
import type { HerdrHandle, HerdrPane, HerdrTab, HerdrWorkspace } from "../../types/plexer.ts";

const HERDR_BACKEND: BackendId = "herdr";

/** Resolve the caller's declared harness at the runtime boundary. A malformed
 * blank id uses the caller-provided default rather than naming one harness here. */
function herdrKind(adapterId: string, fallback: string): string {
  const normalized = adapterId.trim();
  if (normalized) {
    if (!isAdapterId(normalized)) throw new Error(`unsupported herdr harness kind: ${adapterId}`);
    return normalized;
  }
  const defaultKind = fallback.trim();
  if (!defaultKind) throw new Error("herdr harness kind is required");
  return defaultKind;
}

/** Workspace of the invoking pane, and ONLY of the invoking pane. A caller outside
 *  herdr has no workspace: falling back to the first listed pane spawned orch's
 *  agents into whichever workspace happened to be listed first — someone else's. */
function callerPaneWorkspace(): string | undefined {
  const caller = process.env.HERDR_PANE_ID;
  if (!caller) return undefined;
  return herdrPanes().find((pane) => pane.pane_id === caller)?.workspace_id;
}

/** The pane's border label; empty ids are invalid at runtime even though
 *  AdapterId is a closed union. */
function paneName(adapter: AgentAdapter, opts: BackendSpawnOpts): string {
  if (opts.name) return opts.name;
  const adapterName = (adapter.id.trim() || "agent").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  // A1: identity is a minted id and nothing else, so there is no component to
  // strip - the key IS the id. Normalization stays because herdr's pane names
  // are a 32-character grammar, not because the key might carry coordinates.
  const rawId = opts.key?.trim() ?? "";
  const id = rawId.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^[^a-z]+/, "");
  const suffix = id || "agent";
  return `${adapterName}-${suffix}`.slice(0, 32);
}

function paneSessionPath(pane: HerdrPane): string | null {
  const session = pane.agent_session;
  return session?.kind === "path" && typeof session.value === "string" ? session.value : null;
}

function groupFromTab(tab: HerdrTab): BackendGroup {
  return {
    id: tab.tab_id,
    label: tab.label ?? null,
    workspace: tab.workspace_id ?? null,
    focused: !!tab.focused,
    number: tab.number ?? null,
    paneCount: tab.pane_count ?? null,
    status: tab.agent_status ?? null,
  };
}

function workspaceFromHerdr(workspace: HerdrWorkspace): BackendWorkspace {
  return {
    id: workspace.workspace_id,
    label: workspace.label ?? null,
    focused: !!workspace.focused,
    number: workspace.number ?? null,
    tabCount: workspace.tab_count ?? null,
    paneCount: workspace.pane_count ?? null,
    status: workspace.agent_status ?? null,
  };
}

interface HerdrForegroundProcess {
  name?: string;
}

interface HerdrProcessInfo {
  result?: {
    process_info?: {
      shell_pid?: number;
      foreground_process_group_id?: number;
      foreground_processes?: HerdrForegroundProcess[];
    };
  };
}

function isHerdrForegroundProcess(value: unknown): value is HerdrForegroundProcess {
  return isRecord(value) && (value.name === undefined || typeof value.name === "string");
}

function optionalPid(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function isHerdrProcessInfo(value: unknown): value is HerdrProcessInfo {
  if (!isRecord(value)) return false;
  if (value.result === undefined) return true;
  if (!isRecord(value.result)) return false;
  if (value.result.process_info === undefined) return true;
  if (!isRecord(value.result.process_info)) return false;
  const processes = value.result.process_info.foreground_processes;
  return processes === undefined || (Array.isArray(processes) && processes.every(isHerdrForegroundProcess));
}

const ZOOM_FLAGS: Record<BackendZoomMode, string> = { on: "--on", off: "--off", toggle: "--toggle" };

/** A freshly created workspace's first pane takes noticeably longer to reach a
 *  prompt than a split of a pane already running one. */
/** Herdr pane backend: adapts the herdr CLI to the plexer Backend port. */
export class HerdrBackend implements Backend<HerdrHandle> {
  readonly id = HERDR_BACKEND;
  readonly process = new LocalProcessRole();
  // Composes identity (it knows which space this process sits in) and nothing for
  // log pruning: herdr keeps no logs orch owns. Absence IS the answer (E13).
  readonly identity: EnvironmentIdentityRole = {
    current: (): Identity | null => this.ownIdentity(),
  };
  // No key -> handle lookup: a pane is addressed by its own handle here.
  readonly handleLookup: null = null;
  // herdr keeps no logs orch owns.
  readonly logPruning: null = null;
  readonly versionInfo: VersionRole = { installed: (): string | null => this.installedVersion() };
  readonly channel = agentChannel;
  readonly capture = capture;
  readonly paneInput = {
    submit: (handle: HerdrHandle, text: string): void => { herdrAck(["pane", "run", handle, text]); },
    sendKeys: (handle: HerdrHandle, keys: readonly string[]): void => { herdrAck(["pane", "send-keys", handle, ...keys]); },
    focus: (handle: HerdrHandle): void => { herdrAck(["agent", "focus", handle]); },
  };
  readonly paneForeground: PaneForegroundRole<HerdrHandle> = {
    read: (handle) => {
      const out = herdrExec(["pane", "process-info", "--pane", handle], {
        timeout: 5000,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).toString();
      const parsed: unknown = JSON.parse(out);
      if (!isHerdrProcessInfo(parsed)) throw new Error(`herdr pane process-info returned invalid response for ${handle}`);
      const info = parsed.result?.process_info;
      return {
        shellPid: optionalPid(info?.shell_pid),
        foregroundPid: optionalPid(info?.foreground_process_group_id),
        processes: info?.foreground_processes?.map((process) => String(process.name)) ?? [],
      };
    },
  };
  readonly paneHost: PaneHostRole<HerdrHandle> = {
    open: (request: OpenPaneRequest<HerdrHandle>) => {
      const workspace = request.workspace ?? callerPaneWorkspace();
      if (!workspace) throw new Error("Could not determine herdr workspace (herdr down?).");
      const targetPane = typeof request.targetPane === "string"
        ? request.targetPane
        : typeof request.group === "string"
          ? this.panesWithMetadata().find((pane) => pane.group === request.group)?.handle ?? null
          : null;
      return { handle: this.openPane(workspace, { cwd: request.cwd, env: request.env, split: request.split }, targetPane) };
    },
    close: (handle) => { herdrAck(["pane", "close", handle]); },
  };
  readonly paneInventory: PaneInventoryRole<HerdrHandle> = {
    current: () => {
      const handle = process.env.HERDR_PANE_ID;
      return handle ? { handle, workspace: callerPaneWorkspace() ?? null, group: null } : null;
    },
    list: () => this.panesWithMetadata(),
  };
  /** The last visible lines of a pane's screen. Throws on failure. */
  readonly paneScreen: PaneScreenRole<HerdrHandle> = {
    read: (handle, lines) => herdrExec(["pane", "read", handle, "--source", "recent-unwrapped", "--lines", String(lines)], {
      timeout: 5000,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  };
  readonly paneZoom: PaneZoomRole<HerdrHandle> = { setZoom: (handle, mode) => { herdrAck(["pane", "zoom", handle, ZOOM_FLAGS[mode]]); } };
  readonly paneNaming: PaneNamingRole<HerdrHandle> = { renamePane: (handle, name) => { herdrAck(["pane", "rename", handle, name]); } };
  readonly agentNaming: AgentNamingRole<HerdrHandle> = { renameAgent: (handle, name) => { herdrAck(["agent", "rename", handle, name]); } };
  /** Blocks until herdr reports the status; provider failures and timeouts throw. */
  readonly agentStatus: AgentStatusRole<HerdrHandle> = {
    wait: (handle, status, timeoutMs) => {
      herdrExec(["agent", "wait", handle, "--until", status, "--timeout", String(timeoutMs)], {
        timeout: timeoutMs + 5000,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    },
  };
  readonly groupHome: GroupHomeRole<HerdrHandle> = {
    list: () => [...herdrTabs().values()].map(groupFromTab),
    create: (opts: CreateGroupRequest): CreatedGroup<HerdrHandle> => {
      const args = ["tab", "create"];
      // No coordinate resolved means herdr picks its own current workspace;
      // orch never invents one to pass (E10).
      if (opts.workspace !== undefined) args.push("--workspace", opts.workspace);
      args.push("--cwd", opts.cwd, "--no-focus");
      if (opts.label) args.push("--label", opts.label);
      args.push(...this.paneEnvFlags({ env: opts.env }));
      const result = herdrJSON<{ tab: HerdrTab; root_pane: HerdrPane }>(args);
      if (!result?.tab?.tab_id || !result.root_pane?.pane_id) throw new Error("tab create returned no tab/root pane");
      return { group: groupFromTab(result.tab), rootHandle: result.root_pane.pane_id };
    },
    rename: (coordinate, label) => { herdrAck(["tab", "rename", coordinate, label]); },
    close: (coordinate) => { herdrAck(["tab", "close", coordinate]); },
    focus: (coordinate) => { herdrAck(["tab", "focus", coordinate]); },
    move: (request: MovePaneRequest<HerdrHandle>) => {
      if (request.group === null) {
        const args = ["pane", "move", request.handle, "--new-tab", "--no-focus"];
        if (request.label) args.push("--label", request.label);
        herdrJSON<{ move_result?: { pane?: { pane_id?: string } } }>(args);
        return;
      }
      const move = this.movePaneIntoTab(request.handle, request.group, request.split, request.against ?? request.targetPane);
      if (move.changed) return;
      if (move.reason !== "same_tab") throw new Error(`herdr refused to move ${request.handle} into ${request.group}: ${move.reason ?? "unchanged"}`);
      const bounceArgs = ["pane", "move", request.handle, "--new-tab", "--no-focus"];
      const bouncedResult = herdrJSON<{ move_result?: { pane?: { pane_id?: string } } }>(bounceArgs);
      const bounced = bouncedResult?.move_result?.pane?.pane_id ?? request.handle;
      const reseated = this.movePaneIntoTab(bounced, request.group, request.split, request.against ?? request.targetPane);
      if (!reseated.changed) throw new Error(`herdr left ${bounced} outside tab ${request.group}`);
    },
  };
  readonly groupLayout: GroupLayoutRole<HerdrHandle> = {
    read: (group: string): BackendGroupLayout<HerdrHandle> => {
      const panes = herdrPanes().filter((pane) => pane.tab_id === group);
      if (!panes.length) throw new Error(`no panes on tab ${group}`);
      const rects = panes.flatMap((pane) => pane.rect ? [{ handle: pane.pane_id, rect: pane.rect }] : []);
      return rects.length === panes.length ? { group, panes: rects } : this.tabLayoutOf(panes[0]!.pane_id);
    },
  };
  readonly spaceHome: SpaceHomeRole<HerdrHandle> = {
    list: (): readonly PlexerHome[] => this.herdrWorkspaces().map((workspace) => ({ coordinate: workspace.id, label: workspace.label })),
    create: (subject: HomeSubject, request): CreatedHome<HerdrHandle> => {
      // E8: the home orch opens is marked for the subject it was opened for.
      // Without a label herdr names the workspace itself (`wF`), and the pack
      // inside it reads as random agents beside the human's own panes.
      const created = this.openWorkspace({ cwd: request.cwd, label: homeLabel(subject, request.label), env: request.env });
      return { coordinate: created.workspace, rootHandle: created.rootHandle };
    },
    rename: (coordinate, label): void => { herdrAck(["workspace", "rename", coordinate, label]); },
    close: (coordinate): void => { herdrAck(["workspace", "close", coordinate]); },
    focus: (coordinate): void => { herdrAck(["workspace", "focus", coordinate]); },
  };

  /** True when the herdr binary is resolvable on PATH. */
  isAvailable(): boolean {
    return binaryOnPath("herdr");
  }

  private installedVersion(): string | null {
    return version();
  }

  /** True when a herdr control socket is reachable (inside a live herdr session). */
  isInsideSession(): boolean {
    return process.env.HERDR_ENV === "1" || herdrReachable();
  }

  /** Identity of the calling pane, resolved from herdr's own environment. */
  private ownIdentity(): Identity | null {
    const handle = process.env.HERDR_PANE_ID;
    if (!handle) return null;
    // Identity is orch's, not the plexer's: it exists only if orch minted one and
    // handed it over at launch. A pane orch never spawned has NO orch identity,
    // and that is an answer — the pane id is a plexer coordinate that renumbers
    // on a move, so promoting it to an identity forks the agent in two (A1).
    return tryParseIdentity(process.env.ORCH_AGENT_KEY);
  }

  /** Create a pane first, then start herdr's canonical harness in that pane. */
  spawn(adapter: AgentAdapter, opts: BackendSpawnOpts): HerdrHandle {
    // Validate before adopting or opening a pane: an adopted pane is not ours
    // to clean up if herdr cannot honor the request.
    this.launchArgs(adapter, opts);
    // A handed-over pane is the caller's to clean up, and it is already seated.
    const adopted = typeof opts.intoPane === "string" ? opts.intoPane : null;
    const opened = adopted === null;
    const handle = adopted ?? this.paneHost.open({
      cwd: opts.cwd ?? process.cwd(),
      workspace: opts.workspace,
      group: opts.group,
      split: opts.split,
      // opts.targetPane is an opaque cross-backend handle; herdr's own is a
      // string, so it is narrowed here rather than trusted (as tmux does too).
      targetPane: typeof opts.targetPane === "string" ? opts.targetPane : undefined,
      env: agentLaunchEnv(opts),
    }).handle;
    if (!opened) {
      this.startAgentInPane(adapter, handle, opts);
      return handle;
    }
    try {
      this.startAgentInPane(adapter, handle, opts);
    } catch (error: unknown) {
      try {
        herdrAck(["pane", "close", handle]);
      } catch (cleanupError: unknown) {
        const original = error instanceof Error ? error.message : String(error);
        const cleanup = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
        throw new Error(`${original}; cleanup failed: ${cleanup}`);
      }
      throw error;
    }
    return handle;
  }

  /** Name a pane for its agent and boot the harness in it. Cleanup is the
   *  caller's: only it knows whether the pane is one it just opened. */
  private startAgentInPane(adapter: AgentAdapter, handle: HerdrHandle, opts: BackendSpawnOpts): void {
    const name = paneName(adapter, opts);
    herdrAck(["pane", "rename", handle, name]);
    if (!/^[a-z][a-z0-9_-]{0,31}$/.test(name)) throw new Error(`invalid herdr agent name: ${name}`);
    if ([...herdrNames().values()].includes(name)) throw new Error(`herdr agent name collision: ${name}`);
    // herdr owns the readiness handshake: `agent start` pins the pane's terminal
    // id, retries `agent_pane_busy` while the shell is still initializing, and
    // only then submits the launch. Polling for a shell here raced that retry and
    // blocked orch's loop doing it. `herdrStartAgent` supplies `--timeout`.
    const args = this.launchArgs(adapter, opts);
    herdrStartAgent(["agent", "start", name, "--kind", herdrKind(adapter.id, name), "--pane", handle], args);
  }

  /** The arguments herdr appends to its own canonical executable.
   *
   *  herdr's `agent start` builds `argv = [interactive_agent_executable(kind),
   *  ...args]` (its `src/app/agents.rs`), so orch supplies the ARGUMENTS and
   *  herdr supplies the binary. That is why `opts.cmd` cannot select a different
   *  executable here — and why its flags must still be honoured rather than
   *  dropped, which is what bug 1.4 was. Raw and unquoted: herdr quotes for the
   *  target shell itself (`interactive_shell_command`).
   *
   *  herdr rejects any argument containing a control character, so an adapter
   *  that produced one is refused here with a message naming the argument. */
  private launchArgs(adapter: AgentAdapter, opts: BackendSpawnOpts): string[] {
    const argv = adapter.interactiveArgv(opts);
    if (argv.length === 0) throw new Error(`adapter ${String(adapter.id)} returned an empty interactive argv`);
    const args = argv.slice(1);
    const control = args.find((arg) => /[\u0000-\u001f\u007f]/.test(arg));
    if (control !== undefined) {
      throw new Error(`herdr refuses control characters in agent arguments: ${JSON.stringify(control)}`);
    }
    return args;
  }

  private paneEnvFlags(opts: BackendSpawnOpts): string[] {
    return Object.entries(agentLaunchEnv(opts)).flatMap(([key, value]) => ["--env", `${key}=${value}`]);
  }

  /**
   * Give orch a pane to launch into. herdr 0.7.5+ `agent start` requires an
   * existing pane and picks its own executable, so orch makes the pane and runs
   * its own adapter command line in it.
   */
  private openPane(workspace: string, opts: BackendSpawnOpts, splitFrom: HerdrHandle | null): HerdrHandle {
    const flags = ["--cwd", opts.cwd ?? process.cwd(), ...this.paneEnvFlags(opts), "--no-focus"];
    // No pane to split from — a shell outside herdr — so the agent gets a tab.
    const opened: { command: string; args: string[] } = splitFrom
      ? { command: "pane split", args: ["pane", "split", splitFrom, "--direction", opts.split === "down" ? "down" : "right", ...flags] }
      : { command: "tab create", args: ["tab", "create", "--workspace", workspace, ...flags] };
    const result = herdrJSON<{ pane?: HerdrPane; root_pane?: HerdrPane }>(opened.args);
    const handle = result.pane?.pane_id ?? result.root_pane?.pane_id;
    if (!handle) throw new Error(`herdr ${opened.command} returned no pane: ${JSON.stringify(result)}`);
    return handle;
  }

  /** Every pane with its workspace, tab, name and agent metadata. Private:
   *  `paneInventory` is the one public address for this (2.2). */
  private panesWithMetadata(): BackendTarget<HerdrHandle>[] {
    const tabs = herdrTabs();
    const names = herdrNames();
    return herdrPanes().map((pane) => {
      const tab = pane.tab_id ? tabs.get(pane.tab_id) : undefined;
      return {
        handle: pane.pane_id,
        workspace: pane.workspace_id ?? null,
        group: pane.tab_id ?? null,
        groupLabel: tab?.label ?? null,
        name: names.get(pane.pane_id) ?? pane.name ?? null,
        agent: pane.agent ?? null,
        focused: !!pane.focused,
        status: pane.agent_status ?? null,
        sessionPath: paneSessionPath(pane),
      };
    });
  }

  /**
   * Workspace id → its own label, straight from `workspace list`. A tab's label
   * is a tab's, and using one as the workspace's name printed `wF` where
   * `t3reports` was one field away.
   */
  workspaceNames(): Map<string, string> {
    const names = new Map<string, string>();
    for (const workspace of this.herdrWorkspaces()) {
      if (workspace.label) names.set(workspace.id, workspace.label);
    }
    return names;
  }

  /** One `pane move` into a tab, retaining herdr's replacement pane id. */
  private movePaneIntoTab(handle: HerdrHandle, group: string, split: BackendSplit, against?: HerdrHandle): { handle: HerdrHandle; changed: boolean; reason: string | null } {
    const args = ["pane", "move", handle, "--tab", group, "--split", split, "--no-focus"];
    if (against) args.push("--target-pane", against);
    const result = herdrJSON<{ move_result?: { changed?: boolean; reason?: string; pane?: { pane_id?: string } } }>(args);
    return {
      handle: result?.move_result?.pane?.pane_id ?? handle,
      changed: result?.move_result?.changed !== false,
      reason: result?.move_result?.reason ?? null,
    };
  }

  /** Geometry of the tab containing a pane. Throws when unresolvable. */
  private tabLayoutOf(handle: HerdrHandle): BackendGroupLayout<HerdrHandle> {
    const result = herdrJSON<{ layout: { tab_id: string; panes: { pane_id: string; rect: BackendRect }[] } }>(
      ["pane", "layout", "--pane", handle],
    );
    const layout = result?.layout;
    if (!layout || !Array.isArray(layout.panes)) throw new Error(`no layout for ${handle}`);
    return {
      group: layout.tab_id,
      panes: layout.panes.map((pane) => ({ handle: pane.pane_id, rect: pane.rect })),
    };
  }

  /** Open a workspace of orch's own. Throws on failure. */
  private openWorkspace(opts: { cwd: string; label?: string | null; env?: Readonly<Record<string, string>> }): { workspace: string; rootHandle: HerdrHandle } {
    const args = ["workspace", "create", "--cwd", opts.cwd, "--no-focus", ...this.paneEnvFlags({ env: opts.env })];
    if (opts.label) args.push("--label", opts.label);
    const result = herdrJSON<{ workspace?: HerdrWorkspace; root_pane?: HerdrPane }>(args);
    const workspace = result?.workspace?.workspace_id;
    const rootHandle = result?.root_pane?.pane_id;
    if (!workspace || !rootHandle) throw new Error(`herdr workspace create returned no workspace/root pane: ${JSON.stringify(result)}`);
    return { workspace, rootHandle };
  }

  /** Throws on herdr failure (callers surface the error). */
  private herdrWorkspaces(): BackendWorkspace[] {
    const result = herdrJSON<{ workspaces: HerdrWorkspace[] }>(["workspace", "list"]);
    return (result?.workspaces ?? []).map(workspaceFromHerdr);
  }

}

/** Shared herdr backend instance for command wiring. */
export const herdrBackend = new HerdrBackend();

registerNotifier(herdrNotifier);
