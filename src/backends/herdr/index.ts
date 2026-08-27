import type { AgentAdapter } from "../../adapters/adapter.ts";
import { registerSinkProvider } from "../../notify/sinks.ts";
import { herdrNotificationProvider } from "./notify.ts";
import { binaryOnPath, errorMessage, isRecord, projectRoot, shellQuote } from "../../util.ts";
import { NO_PANE_FOREGROUND, paneAtShellPrompt, paneRunsCommand, sleepMs, type PaneForeground } from "../pane-ready.ts";
import { herdrAck, herdrBestEffort, herdrExec, herdrJSON, herdrNames, herdrPanes, herdrReachable, herdrTabs, type HerdrPane, type HerdrTab, type HerdrWorkspace } from "./cli.ts";
import type {
  Backend,
  BackendCapabilities,
  BackendId,
  BackendGroup,
  BackendGroupLayout,
  BackendRect,
  BackendSpawnOpts,
  BackendSplit,
  BackendTarget,
  BackendWorkspace,
  BackendZoomMode,
  DeliverPayload,
} from "../backend.ts";
import type { Identity } from "../identity.ts";

/** Handle owned by one herdr pane. */
export type HerdrHandle = string;

const HERDR_BACKEND: BackendId = "herdr";

/** A fresh pane's shell settles in well under a second; five seconds is the outer
 *  bound before orch types anyway and lets the launch check rule on the result. */
const SHELL_PROMPT_ATTEMPTS = 20;
const SHELL_PROMPT_POLL_MS = 250;

/** A harness takes a moment to claim the terminal, and a line typed into a shell
 *  that was still starting runs late rather than never — so the window is wide
 *  enough that a retype cannot land on top of a harness that just came up. */
const LAUNCH_SETTLE_ATTEMPTS = 24;
const LAUNCH_SETTLE_POLL_MS = 250;
const LAUNCH_ATTEMPTS = 2;

/** Workspace of the invoking pane, and ONLY of the invoking pane. A caller outside
 *  herdr has no workspace: falling back to the first listed pane spawned orch's
 *  agents into whichever workspace happened to be listed first — someone else's. */
function callerPaneWorkspace(): string | undefined {
  const caller = process.env.HERDR_PANE_ID;
  if (!caller) return undefined;
  return herdrPanes().find((pane) => pane.pane_id === caller)?.workspace_id;
}

/** The launch line orch runs in the pane. An explicit --cmd is the caller's
 *  verbatim; ignoring it made --cmd a no-op that still printed what it never ran. */
function launchCommand(adapter: AgentAdapter, opts: BackendSpawnOpts): string {
  const command = opts.cmd ?? adapter.restrictedInteractiveCmd?.(opts) ?? adapter.interactiveCmd(opts);
  if (!command.trim()) throw new Error(`adapter ${String(adapter.id)} returned an empty interactive command`);
  return command;
}

/** The pane's border label; empty ids are invalid at runtime even though
 *  AdapterId is a closed union. */
function paneName(adapter: AgentAdapter, opts: BackendSpawnOpts): string {
  // oxlint-disable-next-line typescript(prefer-nullish-coalescing)
  const adapterName = adapter.id.trim() || "agent";
  return opts.name ?? `${adapterName}-${opts.key?.trim() ?? "agent"}`;
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

/** Herdr pane backend: adapts the herdr CLI to the plexer Backend port. */
export class HerdrBackend implements Backend<HerdrHandle> {
  readonly id = HERDR_BACKEND;
  readonly panes = true;
  readonly focusable = true;
  readonly canSendKeys = true;
  readonly caps: BackendCapabilities = { panes: true, focusable: true, canSendKeys: true, canPruneLogs: false };

  /** True when the herdr binary is resolvable on PATH. */
  isAvailable(): boolean {
    return binaryOnPath("herdr");
  }

  /** True when a herdr control socket is reachable (inside a live herdr session). */
  isInsideSession(): boolean {
    return process.env.HERDR_ENV === "1" || herdrReachable();
  }

  /** Identity of the calling pane, resolved from herdr's own environment. */
  currentIdentity(): Identity | null {
    const handle = process.env.HERDR_PANE_ID;
    if (!handle) return null;
    const pane = herdrPanes().find((candidate) => candidate.pane_id === handle);
    if (!pane?.workspace_id) return null;
    // The caller's own pane was never orch-spawned, so no id was minted for it;
    // its pane id is stable for this process and stands in as the identity.
    return { backend: HERDR_BACKEND, workspace: pane.workspace_id, id: handle };
  }

  /**
   * Open a pane and run the adapter's command line in it, preserved as one
   * `bash -lc` value so quoting survives. orch launches, never herdr:
   * `agent start --kind` would pick herdr's own executable and discard both the
   * adapter's command and `--cmd`.
   */
  spawn(adapter: AgentAdapter, opts: BackendSpawnOpts): HerdrHandle {
    const command = launchCommand(adapter, opts);
    const workspace = opts.workspace ?? callerPaneWorkspace();
    if (!workspace) throw new Error("Could not determine herdr workspace (herdr down?).");

    // A planned target puts the pane in its tab from birth; without one herdr
    // splits the caller's own pane and the fresh pane must be re-seated after.
    const planned = typeof opts.targetPane === "string" ? opts.targetPane : null;
    const handle = this.openPane(workspace, opts, planned ?? process.env.HERDR_PANE_ID ?? null);
    herdrBestEffort(["pane", "rename", handle, paneName(adapter, opts)]);
    // ONE argument. herdr types what it is given into the pane's shell, joining
    // separate argv words with plain spaces — `bash -lc <cmd>` split across words
    // arrives unquoted, so the shell takes `pi` as the whole -c string and every
    // flag after it as a positional arg, launching the harness with no arguments.
    this.launchInPane(handle, `bash -lc ${shellQuote(command)}`);
    if (opts.group && !planned) this.reseatIntoGroup(handle, opts.group, opts.split ?? "right");
    return handle;
  }

  /**
   * Type the launch line into a pane and prove it ran. `pane run` hands text to
   * whatever the terminal is doing at that instant, and a shell still sourcing
   * its rc files echoes the line and drops it — leaving a named, registered pane
   * sitting at a bare prompt with no harness in it. Nothing outside the pane can
   * tell "at a prompt" from "starting up", so the launch is verified rather than
   * timed, and a swallowed line is retyped once before the pane is given up on.
   */
  private launchInPane(handle: HerdrHandle, line: string): void {
    for (let attempt = 0; attempt < LAUNCH_ATTEMPTS; attempt++) {
      this.awaitShellPrompt(handle);
      herdrAck(["pane", "run", handle, line]);
      if (this.awaitCommandRunning(handle)) return;
    }
    this.close(handle);
    throw new Error(`${handle} swallowed the launch line: the pane never left its shell prompt`);
  }

  /** Wait out the pane's shell startup, so the launch line is typed at a terminal
   *  that is at least no longer running something else. */
  private awaitShellPrompt(handle: HerdrHandle): void {
    for (let attempt = 0; attempt < SHELL_PROMPT_ATTEMPTS; attempt++) {
      if (paneAtShellPrompt(this.paneForeground(handle))) return;
      sleepMs(SHELL_PROMPT_POLL_MS);
    }
  }

  /** True once the launched command owns the pane's terminal. */
  private awaitCommandRunning(handle: HerdrHandle): boolean {
    for (let attempt = 0; attempt < LAUNCH_SETTLE_ATTEMPTS; attempt++) {
      sleepMs(LAUNCH_SETTLE_POLL_MS);
      if (paneRunsCommand(this.paneForeground(handle))) return true;
    }
    return false;
  }

  /** herdr's env flags for a pane orch is about to launch an agent into. */
  private paneEnvFlags(opts: BackendSpawnOpts): string[] {
    const env = new Map(Object.entries(opts.env ?? {}));
    if (opts.key?.trim()) env.set("ORCH_AGENT_KEY", opts.key);
    if (opts.orchDir) env.set("ORCH_DIR", opts.orchDir);
    // The fleet's project identity survives worktree/launch-dir differences.
    env.set("ORCH_PROJECT", projectRoot());
    return [...env].flatMap(([key, value]) => ["--env", `${key}=${value}`]);
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

  /** Move a pane herdr opened in the caller's tab into the fleet's tab; a
   *  refused move leaves the agent where herdr put it rather than failing the spawn. */
  private reseatIntoGroup(handle: HerdrHandle, group: string, split: BackendSplit): void {
    try {
      this.moveToGroup(handle, group, split);
    } catch (error: unknown) {
      process.stderr.write(`warning: could not move ${handle} into tab ${group}: ${errorMessage(error)}\n`);
    }
  }

  /** Close one pane through herdr; invalid handles are refused locally. */
  close(handle: HerdrHandle): boolean {
    if (typeof handle !== "string" || handle.length === 0) return false;
    return herdrBestEffort(["pane", "close", handle]);
  }

  /** Return pane ids from herdr's current pane listing. */
  list(): HerdrHandle[] {
    const panes: HerdrPane[] = herdrPanes();
    return panes.flatMap((pane) => pane.pane_id ? [pane.pane_id] : []);
  }

  /** Every pane with its workspace, tab, name, and agent metadata. */
  inventory(): BackendTarget<HerdrHandle>[] {
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

  /** Submit text: "run" types + submits; "message" injects then submits. */
  deliver(handle: HerdrHandle, payload: DeliverPayload): boolean {
    if (payload.kind === "run") return herdrBestEffort(["pane", "run", handle, payload.text]);
    // `agent prompt` types AND submits in one call. herdr 0.7.5 removed
    // `agent send`, which is why the follow-up Enter is gone too.
    return herdrBestEffort(["agent", "prompt", handle, payload.text]);
  }

  /** Jump the view (tab + pane) to an agent's pane. */
  // fallow-ignore-next-line unused-class-member
  focus(handle: HerdrHandle): boolean {
    return herdrBestEffort(["agent", "focus", handle]);
  }

  sendKeys(handle: HerdrHandle, keys: readonly string[]): boolean {
    return herdrBestEffort(["pane", "send-keys", handle, ...keys]);
  }

  /**
   * Workspace id → its own label, straight from `workspace list`. A tab's label
   * is a tab's, and using one as the workspace's name printed `wF` where
   * `t3reports` was one field away.
   */
  workspaceNames(): Map<string, string> {
    const names = new Map<string, string>();
    try {
      if (!herdrReachable()) return names;
      for (const workspace of this.workspaces()) {
        if (workspace.label) names.set(workspace.id, workspace.label);
      }
    } catch {
      // herdr not on PATH / socket down — ids stand in for names.
    }
    return names;
  }

  /** Read the last visible lines of a pane's screen. Throws on failure. */
  // fallow-ignore-next-line unused-class-member
  read(handle: HerdrHandle, lines: number): string {
    return herdrExec(["pane", "read", handle, "--source", "visible", "--lines", String(lines)], {
      timeout: 5000,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  }

  // fallow-ignore-next-line unused-class-member
  zoom(handle: HerdrHandle, mode: BackendZoomMode): boolean {
    return herdrBestEffort(["pane", "zoom", handle, ZOOM_FLAGS[mode]]);
  }

  /** Rename the agent shown for a pane. */
  renameAgent(handle: HerdrHandle, name: string): boolean {
    return herdrBestEffort(["agent", "rename", handle, name]);
  }

  /** Rename the pane border label. */
  renamePane(handle: HerdrHandle, name: string): boolean {
    return herdrBestEffort(["pane", "rename", handle, name]);
  }

  /** Move a pane into an existing tab, splitting `against` (the planned pane)
   *  when given so the tab stays balanced instead of stacking. Throws on failure. */
  moveToGroup(handle: HerdrHandle, group: string, split: BackendSplit, against?: HerdrHandle): boolean {
    const move = this.movePaneIntoTab(handle, group, split, against);
    if (move.changed) return true;
    if (move.reason !== "same_tab") throw new Error(`herdr refused to move ${handle} into ${group}: ${move.reason ?? "unchanged"}`);
    // herdr no-ops a same-tab re-seat, so hop out to a throwaway tab (it closes
    // itself once empty) and back: the cross-tab move honours the target pane.
    this.moveToNewGroup(handle, null);
    if (!this.movePaneIntoTab(handle, group, split, against).changed) throw new Error(`herdr left ${handle} outside tab ${group}`);
    return true;
  }

  /** One `pane move` into a tab, reduced to whether herdr changed the layout. */
  private movePaneIntoTab(handle: HerdrHandle, group: string, split: BackendSplit, against?: HerdrHandle): { changed: boolean; reason: string | null } {
    const args = ["pane", "move", handle, "--tab", group, "--split", split, "--no-focus"];
    if (against) args.push("--target-pane", against);
    const result = herdrJSON<{ move_result?: { changed?: boolean; reason?: string } }>(args);
    return { changed: result?.move_result?.changed !== false, reason: result?.move_result?.reason ?? null };
  }

  /** Move a pane into a freshly created tab. Throws on herdr failure. */
  moveToNewGroup(handle: HerdrHandle, label: string | null): boolean {
    const args = ["pane", "move", handle, "--new-tab", "--no-focus"];
    if (label) args.push("--label", label);
    herdrJSON<unknown>(args);
    return true;
  }

  /** Geometry of every pane in a tab, from the pane listing when it carries
   *  rects and a dedicated layout call when it does not. Throws on an empty tab. */
  groupLayout(group: string): BackendGroupLayout<HerdrHandle> {
    const panes = herdrPanes().filter((pane) => pane.tab_id === group);
    if (!panes.length) throw new Error(`no panes on tab ${group}`);
    const rects = panes.flatMap((pane) => pane.rect ? [{ handle: pane.pane_id, rect: pane.rect }] : []);
    return rects.length === panes.length ? { group, panes: rects } : this.tabLayoutOf(panes[0]!.pane_id);
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

  /** What the pane is running right now; nothing known on failure. */
  paneForeground(handle: HerdrHandle): PaneForeground {
    try {
      const out = herdrExec(["pane", "process-info", "--pane", handle], {
        timeout: 5000,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).toString();
      const parsed = JSON.parse(out) as unknown;
      if (!isHerdrProcessInfo(parsed)) return NO_PANE_FOREGROUND;
      const info = parsed.result?.process_info;
      return {
        shellPid: optionalPid(info?.shell_pid),
        foregroundPid: optionalPid(info?.foreground_process_group_id),
        processes: info?.foreground_processes?.map((process) => String(process.name)) ?? [],
      };
    } catch {
      return NO_PANE_FOREGROUND;
    }
  }

  /** Block until herdr reports the agent status; false on failure/timeout. */
  waitAgentStatus(handle: HerdrHandle, status: string, timeoutMs: number): boolean {
    try {
      herdrExec(["agent", "wait", handle, "--until", status, "--timeout", String(timeoutMs)], {
        timeout: timeoutMs + 5000,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return true;
    } catch {
      return false;
    }
  }

  /** Open a workspace of orch's own. Throws on failure. */
  createWorkspace(opts: { cwd: string; label?: string | null }): { workspace: string; rootHandle: HerdrHandle } {
    const args = ["workspace", "create", "--cwd", opts.cwd, "--no-focus"];
    if (opts.label) args.push("--label", opts.label);
    const result = herdrJSON<{ workspace?: HerdrWorkspace; root_pane?: HerdrPane }>(args);
    const workspace = result?.workspace?.workspace_id;
    const rootHandle = result?.root_pane?.pane_id;
    if (!workspace || !rootHandle) throw new Error(`herdr workspace create returned no workspace/root pane: ${JSON.stringify(result)}`);
    return { workspace, rootHandle };
  }

  /** Create a tab and report it with its root pane. Throws on failure. */
  createGroup(opts: { workspace: string; cwd: string; label?: string | null }): { group: BackendGroup; rootHandle: HerdrHandle } {
    const args = ["tab", "create", "--workspace", opts.workspace, "--cwd", opts.cwd, "--no-focus"];
    if (opts.label) args.push("--label", opts.label);
    const result = herdrJSON<{ tab: HerdrTab; root_pane: HerdrPane }>(args);
    if (!result?.tab?.tab_id || !result.root_pane?.pane_id) throw new Error("tab create returned no tab/root pane");
    return { group: groupFromTab(result.tab), rootHandle: result.root_pane.pane_id };
  }

  // fallow-ignore-next-line unused-class-member
  groups(): BackendGroup[] {
    return [...herdrTabs().values()].map(groupFromTab);
  }

  // fallow-ignore-next-line unused-class-member
  renameGroup(group: string, label: string): boolean {
    return herdrBestEffort(["tab", "rename", group, label]);
  }

  // fallow-ignore-next-line unused-class-member
  closeGroup(group: string): boolean {
    return herdrBestEffort(["tab", "close", group]);
  }

  // fallow-ignore-next-line unused-class-member
  focusGroup(group: string): boolean {
    return herdrBestEffort(["tab", "focus", group]);
  }

  /** Throws on herdr failure (callers surface the error). */
  // fallow-ignore-next-line unused-class-member
  workspaces(): BackendWorkspace[] {
    const result = herdrJSON<{ workspaces: HerdrWorkspace[] }>(["workspace", "list"]);
    return (result?.workspaces ?? []).map(workspaceFromHerdr);
  }

  // fallow-ignore-next-line unused-class-member
  focusWorkspace(workspace: string): boolean {
    return herdrBestEffort(["workspace", "focus", workspace]);
  }
}

/** Shared herdr backend instance for command wiring. */
export const herdrBackend = new HerdrBackend();

registerSinkProvider(herdrNotificationProvider);
