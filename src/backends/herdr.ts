import type { AgentAdapter } from "../adapters/adapter.ts";
import { herdrBestEffort, herdrJSON, herdrPanes } from "../herdr.ts";
import type { Backend, BackendCapabilities, BackendSpawnOpts } from "./backend.ts";

/** Handle owned by one herdr pane. */
export type HerdrHandle = string;

const HERDR_BACKEND = "herdr";
const DEFAULT_TAB_LABEL = "work";

type HerdrPane = {
  readonly pane_id?: string;
  readonly workspace_id?: string;
};

type TabCreateResult = {
  readonly root_pane?: {
    readonly pane_id?: string;
  };
};

function callerPane(panes: HerdrPane[]): HerdrPane | undefined {
  const caller = process.env.HERDR_PANE_ID;
  return panes.find((pane) => pane.pane_id === caller) ?? panes[0];
}

function spawnPane(adapter: AgentAdapter, opts: BackendSpawnOpts): HerdrHandle {
  const command = adapter.interactiveCmd(opts);
  if (!command.trim()) throw new Error(`adapter ${String(adapter.id)} returned an empty interactive command`);

  const panes: HerdrPane[] = herdrPanes();
  const source = callerPane(panes);
  if (!source?.workspace_id) throw new Error("Could not determine herdr workspace (herdr down?).");

  const result: TabCreateResult = herdrJSON([
    "tab",
    "create",
    "--workspace",
    source.workspace_id,
    "--cwd",
    opts.cwd ?? process.cwd(),
    "--label",
    DEFAULT_TAB_LABEL,
    "--no-focus",
  ]);
  const handle = result.root_pane?.pane_id;
  if (!handle) throw new Error("tab create returned no root pane");

  herdrBestEffort(["pane", "run", handle, command]);
  return handle;
}

/** Herdr pane backend, preserving the existing CLI boundary for pane control. */
export class HerdrBackend implements Backend<HerdrHandle> {
  readonly id = HERDR_BACKEND;
  readonly panes = true;
  readonly focusable = true;
  readonly caps: BackendCapabilities = { panes: true, focusable: true };

  /** Create a tab and start the adapter's interactive command in its root pane. */
  spawn(adapter: AgentAdapter, opts: BackendSpawnOpts): HerdrHandle {
    return spawnPane(adapter, opts);
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
}

/** Shared herdr backend instance for command wiring. */
export const herdrBackend = new HerdrBackend();
