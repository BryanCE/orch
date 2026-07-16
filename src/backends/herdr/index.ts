import type { AgentAdapter } from "../../adapters/adapter.ts";
import { registerSinkProvider } from "../../notify.ts";
import { herdrNotificationProvider } from "./notify.ts";
import { binaryOnPath } from "../../util.ts";
import { isRecord } from "../../store.ts";
import { herdrBestEffort, herdrExec, herdrJSON, herdrNames, herdrPanes, herdrReachable, herdrTabs, type HerdrPane, type HerdrTab, type HerdrWorkspace } from "./cli.ts";
import type {
  Backend,
  BackendCapabilities,
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

const HERDR_BACKEND = "herdr";

interface AgentStartResult {
  readonly agent?: {
    readonly pane_id?: string;
  };
}

/** Workspace reported when a pane's workspace cannot be resolved from herdr. */
const HERDR_FALLBACK_WORKSPACE = "herdr";

/** Workspace of the invoking pane, falling back to the first listed pane. */
function callerPaneWorkspace(): string | undefined {
  const panes = herdrPanes();
  const caller = process.env.HERDR_PANE_ID;
  return (panes.find((pane) => pane.pane_id === caller) ?? panes[0])?.workspace_id;
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
      foreground_processes?: HerdrForegroundProcess[];
    };
  };
}

function isHerdrForegroundProcess(value: unknown): value is HerdrForegroundProcess {
  return isRecord(value) && (value.name === undefined || typeof value.name === "string");
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
  readonly caps: BackendCapabilities = { panes: true, focusable: true, canSendKeys: true };

  /** True when the herdr binary is resolvable on PATH. */
  isAvailable(): boolean {
    return binaryOnPath("herdr");
  }

  /** True when a herdr control socket is reachable (inside a live herdr session). */
  isInsideSession(): boolean {
    return process.env.HERDR_ENV === "1" || herdrReachable();
  }

  /** Mint an identity for a pane, reading its workspace from herdr's listing. */
  mintIdentity(handle: HerdrHandle): Identity {
    const pane = herdrPanes().find((candidate) => candidate.pane_id === handle);
    // An empty workspace_id is as unusable as a missing one.
    let workspace = pane?.workspace_id ?? HERDR_FALLBACK_WORKSPACE;
    if (workspace === "") workspace = HERDR_FALLBACK_WORKSPACE;
    return { backend: HERDR_BACKEND, workspace, handle };
  }

  /** Identity of the calling pane, resolved from herdr's own environment. */
  currentIdentity(): Identity | null {
    const handle = process.env.HERDR_PANE_ID;
    if (!handle) return null;
    const pane = herdrPanes().find((candidate) => candidate.pane_id === handle);
    if (!pane?.workspace_id) return null;
    return { backend: HERDR_BACKEND, workspace: pane.workspace_id, handle };
  }

  /**
   * Start the adapter as a herdr-managed agent. The launch goes through
   * herdr's native integration argv (never typed into the pane), with the
   * adapter command preserved as one `bash -lc` value so quoting survives.
   * The agent's name is set at start (no separate rename step).
   */
  spawn(adapter: AgentAdapter, opts: BackendSpawnOpts): HerdrHandle {
    const command = adapter.restrictedInteractiveCmd?.(opts) ?? adapter.interactiveCmd(opts);
    if (!command.trim()) throw new Error(`adapter ${String(adapter.id)} returned an empty interactive command`);

    const workspace = opts.workspace ?? callerPaneWorkspace();
    if (!workspace) throw new Error("Could not determine herdr workspace (herdr down?).");

    const trimmedAdapterName = adapter.id.trim();
    // Empty ids are invalid at runtime even though AdapterId is a closed union.
    // oxlint-disable-next-line typescript(prefer-nullish-coalescing)
    const adapterName = trimmedAdapterName || "agent";
    const name = opts.name ?? `${adapterName}-${opts.key?.trim() ?? "agent"}`;

    const flags = ["agent", "start", name, "--workspace", workspace, "--cwd", opts.cwd ?? process.cwd(), "--no-focus"];
    if (opts.group) flags.push("--tab", opts.group);
    if (opts.split) flags.push("--split", opts.split);

    const envArgs = Object.entries(opts.env ?? {}).map(([key, value]) => `${key}=${value}`);
    if (opts.key?.trim()) envArgs.push(`ORCH_AGENT_KEY=${opts.key}`);
    if (opts.orchDir) envArgs.push(`ORCH_DIR=${opts.orchDir}`);

    const launcher = envArgs.length ? ["env", ...envArgs] : [];
    const result = herdrJSON<AgentStartResult>([...flags, "--", ...launcher, "bash", "-lc", command]);
    const handle = result.agent?.pane_id;
    if (!handle) throw new Error("agent start returned no pane");
    return handle;
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
    return herdrBestEffort(["agent", "send", handle, payload.text])
      && herdrBestEffort(["pane", "send-keys", handle, "Enter"]);
  }

  /** Jump the view (tab + pane) to an agent's pane. */
  focus(handle: HerdrHandle): boolean {
    return herdrBestEffort(["agent", "focus", handle]);
  }

  sendKeys(handle: HerdrHandle, keys: readonly string[]): boolean {
    return herdrBestEffort(["pane", "send-keys", handle, ...keys]);
  }

  /** Herdr tiles at spawn via split placement; it has no re-tile operation. */
  // fallow-ignore-next-line unused-class-member
  applyLayout(_group: string, _layout: "tiled"): boolean {
    return false;
  }

  /** Read the last visible lines of a pane's screen. Throws on failure. */
  read(handle: HerdrHandle, lines: number): string {
    return herdrExec(["pane", "read", handle, "--source", "visible", "--lines", String(lines)], {
      timeout: 5000,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  }

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

  /** Move a pane into an existing tab. Throws on herdr failure. */
  moveToGroup(handle: HerdrHandle, group: string, split: BackendSplit): boolean {
    herdrJSON<unknown>(["pane", "move", handle, "--tab", group, "--split", split, "--no-focus"]);
    return true;
  }

  /** Move a pane into a freshly created tab. Throws on herdr failure. */
  moveToNewGroup(handle: HerdrHandle, label: string | null): boolean {
    const args = ["pane", "move", handle, "--new-tab", "--no-focus"];
    if (label) args.push("--label", label);
    herdrJSON<unknown>(args);
    return true;
  }

  /** Geometry of the tab containing a pane. Throws when unresolvable. */
  layoutOf(handle: HerdrHandle): BackendGroupLayout<HerdrHandle> {
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

  /** Names of foreground processes running in a pane; empty on failure. */
  foregroundProcesses(handle: HerdrHandle): string[] {
    try {
      const out = herdrExec(["pane", "process-info", "--pane", handle], {
        timeout: 5000,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).toString();
      const parsed = JSON.parse(out) as unknown;
      if (!isHerdrProcessInfo(parsed)) return [];
      return parsed.result?.process_info?.foreground_processes?.map((process) => String(process.name)) ?? [];
    } catch {
      return [];
    }
  }

  /** Block until herdr reports the agent status; false on failure/timeout. */
  waitAgentStatus(handle: HerdrHandle, status: string, timeoutMs: number): boolean {
    try {
      herdrExec(["wait", "agent-status", handle, "--status", status, "--timeout", String(timeoutMs)], {
        timeout: timeoutMs + 5000,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return true;
    } catch {
      return false;
    }
  }

  /** Create a tab and report it with its root pane. Throws on failure. */
  createGroup(opts: { workspace: string; cwd: string; label?: string | null }): { group: BackendGroup; rootHandle: HerdrHandle } {
    const args = ["tab", "create", "--workspace", opts.workspace, "--cwd", opts.cwd, "--no-focus"];
    if (opts.label) args.push("--label", opts.label);
    const result = herdrJSON<{ tab: HerdrTab; root_pane: HerdrPane }>(args);
    if (!result?.tab?.tab_id || !result.root_pane?.pane_id) throw new Error("tab create returned no tab/root pane");
    return { group: groupFromTab(result.tab), rootHandle: result.root_pane.pane_id };
  }

  groups(): BackendGroup[] {
    return [...herdrTabs().values()].map(groupFromTab);
  }

  renameGroup(group: string, label: string): boolean {
    return herdrBestEffort(["tab", "rename", group, label]);
  }

  closeGroup(group: string): boolean {
    return herdrBestEffort(["tab", "close", group]);
  }

  focusGroup(group: string): boolean {
    return herdrBestEffort(["tab", "focus", group]);
  }

  /** Throws on herdr failure (callers surface the error). */
  workspaces(): BackendWorkspace[] {
    const result = herdrJSON<{ workspaces: HerdrWorkspace[] }>(["workspace", "list"]);
    return (result?.workspaces ?? []).map(workspaceFromHerdr);
  }

  focusWorkspace(workspace: string): boolean {
    return herdrBestEffort(["workspace", "focus", workspace]);
  }
}

/** Shared herdr backend instance for command wiring. */
export const herdrBackend = new HerdrBackend();

registerSinkProvider(herdrNotificationProvider);
