import type { AgentAdapter } from "../adapters/adapter.ts";
import { herdrBestEffort, herdrJSON, herdrPanes } from "../herdr.ts";
import type { Backend, BackendCapabilities, BackendSpawnOpts } from "./backend.ts";

/** Handle owned by one herdr pane. */
export type HerdrHandle = string;

const HERDR_BACKEND = "herdr";

interface HerdrPane {
  readonly pane_id?: string;
  readonly workspace_id?: string;
}

interface AgentStartResult {
  readonly agent?: {
    readonly pane_id?: string;
  };
}

function callerPane(panes: HerdrPane[]): HerdrPane | undefined {
  const caller = process.env.HERDR_PANE_ID;
  return panes.find((pane) => pane.pane_id === caller) ?? panes[0];
}

function spawnPane(adapter: AgentAdapter, opts: BackendSpawnOpts): HerdrHandle {
  const command = adapter.restrictedInteractiveCmd?.(opts) ?? adapter.interactiveCmd(opts);
  if (!command.trim()) throw new Error(`adapter ${String(adapter.id)} returned an empty interactive command`);

  const panes: HerdrPane[] = herdrPanes();
  const source = callerPane(panes);
  if (!source?.workspace_id) throw new Error("Could not determine herdr workspace (herdr down?).");

  const trimmedAdapterName = adapter.id.trim();
  // Empty ids are invalid at runtime even though AdapterId is a closed union.
  // oxlint-disable-next-line typescript(prefer-nullish-coalescing)
  const adapterName = trimmedAdapterName || "agent";
  const keyName = opts.key?.trim() ?? "agent";
  const name = `${adapterName}-${keyName}`;
  const result = herdrJSON<AgentStartResult>([
    "agent",
    "start",
    name,
    "--workspace",
    source.workspace_id,
    "--cwd",
    opts.cwd ?? process.cwd(),
    "--no-focus",
    "--",
    "bash",
    "-lc",
    command,
  ]);
  const handle = result.agent?.pane_id;
  if (!handle) throw new Error("agent start returned no pane");
  return handle;
}

/** Herdr pane backend, preserving the existing CLI boundary for pane control. */
export class HerdrBackend implements Backend<HerdrHandle> {
  readonly id = HERDR_BACKEND;
  readonly panes = true;
  readonly focusable = true;
  readonly caps: BackendCapabilities = { panes: true, focusable: true };

  /** Start the adapter as a herdr-managed agent with status authority. */
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
