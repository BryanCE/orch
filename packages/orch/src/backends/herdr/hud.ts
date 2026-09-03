// herdr pane HUD — the plexer-side half of an in-agent bridge.
//
// Everything in this file is gated on the herdr PLEXER (backend), not on any
// agent harness: pane custom-status metadata, pane/tab label lookup, and desktop
// notifications. CLAUDE.md Rule 10 forbids backend-gated code from living under
// `extensions/<harness>/`, so orchd depends on the plexer-neutral port
// (`src/backends/hud.ts`) and never imports this module; the port wires these
// functions in as its herdr provider — no herdr socket, event name, or shell-out
// ever appears outside `src/backends/herdr/`.
import { execFile, execFileSync } from "node:child_process";
import { isAgentId } from "../identity.ts";
import { requestJsonLine } from "../../presence/socket-client.ts";
import { orchDir } from "../../presence/writer.ts";
import { environmentOf } from "../../store/agent-view.ts";
import { herdrEnvironmentPresent } from "./index.ts";
import { notificationText } from "../../notify/format.ts";
import { isRecord } from "../../util.ts";
import { isUnknownArray, optionalString, truncate } from "../../util.ts";
import type { BridgeNotifyEvent, PaneLabels, PaneStatusSnapshot } from "../../types/plexer.ts";

const HERDR_METADATA_SOURCE = "orch:bridge";
const CUSTOM_STATUS_MAX = 32;

/** This plexer's id, as the plexer's OWN provider writes and reads it. Rule 11
 *  bans branching on an environment id in core code; a provider recognising its
 *  own rows inside `src/backends/<plexer>/` is the one place it is the answer. */
const HERDR_PLEXER = "herdr";

/** Herdr's own report of where its server listens. Asked once and remembered:
 *  one server serves the machine, and orchd outside every session still has to
 *  reach it. Asking herdr beats guessing a path or storing one that goes stale. */
let reportedSocket: string | null | undefined;

function serverSocketPath(): string | undefined {
  if (reportedSocket !== undefined) return reportedSocket ?? undefined;
  try {
    const reported = execFileSync("herdr", ["status", "server"], { encoding: "utf8", timeout: 2000 });
    reportedSocket = /^socket:\s*(.+)$/m.exec(reported)?.[1]?.trim() ?? null;
  } catch {
    reportedSocket = null;
  }
  return reportedSocket ?? undefined;
}

/** Herdr's control socket. A process inside a pane is told where it is; every
 *  other process — orchd is never in a pane — asks herdr itself. */
function herdrSocketPath(): string | undefined {
  return herdrEnvironmentPresent() ? process.env.HERDR_SOCKET_PATH : serverSocketPath();
}

/**
 * Herdr pane handle for this process, or null when this is not a herdr pane.
 *
 * A1 / CLAUDE.md Rule 11: the plexer and the handle are ENVIRONMENT, composed
 * from `agent_plexers` and `agent_handles`. They used to be two segments of the
 * identity key, so the HUD reported against the pane the agent was BORN in and
 * an agent that moved kept writing into a pane it had left. Environment is
 * mutable, so it is asked for on every call and never frozen at import.
 */
export function herdrPaneHandle(id: string | null): string | null {
  // An id that is not minted names no agent orch registered, so there is no
  // environment to compose — never a pane handle to fall back on.
  if (!isAgentId(id)) return null;
  try {
    const environment = environmentOf(orchDir(), id);
    return environment.plexer === HERDR_PLEXER ? environment.handle : null;
  } catch {
    // No store to read yet is "no pane", not a crash: this runs inside the agent.
    return null;
  }
}

/**
 * Capability probe for the pane-HUD port (`src/backends/hud.ts`): true when this
 * process is a herdr pane.
 *
 * Deliberately the BROADEST gate any HUD entry point applies — placement alone.
 * The socket- and env-dependent entry points keep their own stricter checks
 * internally, so selecting this provider never grants more than each function
 * already allowed itself.
 */
export function herdrHudActive(id: string | null): boolean {
  return herdrPaneHandle(id) !== null;
}

// ---- pane custom-status metadata ----

let metadataSeq = Date.now() * 1000;

function nextMetadataSeq(): number {
  metadataSeq += 1;
  return metadataSeq;
}

function sendHerdrMetadata(paneId: string, customStatus: string): void {
  const socketPath = herdrSocketPath();
  if (!socketPath) return;
  const request = {
    id: `${HERDR_METADATA_SOURCE}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    method: "pane.report_metadata",
    params: {
      pane_id: paneId,
      source: HERDR_METADATA_SOURCE,
      custom_status: customStatus,
      seq: nextMetadataSeq(),
    },
  };
  void requestJsonLine(socketPath, request, 500);
}

/**
 * Builds the pane custom-status reporter. Returns a no-op-ish sink that only
 * emits when this process owns the herdr pane it would report against and the
 * derived status line actually changed.
 */
export function createPaneStatusReporter(id: string | null, paneId: string | null): (snapshot: PaneStatusSnapshot) => void {
  let lastCustomStatus: string | undefined;

  // Report only against the pane this process actually occupies right now: a
  // stale handle would paint someone else's pane with this agent's status.
  function reportablePane(): string | null {
    if (!herdrSocketPath() || paneId === null) return null;
    return paneId === herdrPaneHandle(id) ? paneId : null;
  }

  function currentCustomStatus(snapshot: PaneStatusSnapshot): string | undefined {
    if (snapshot.state === "working" && snapshot.task) {
      return truncate(snapshot.task, CUSTOM_STATUS_MAX).slice(0, CUSTOM_STATUS_MAX);
    }
    if ((snapshot.state === "done" || snapshot.state === "idle") && snapshot.cost > 0) {
      return `$${snapshot.cost.toFixed(2)}`;
    }
    return undefined;
  }

  return (snapshot: PaneStatusSnapshot): void => {
    const pane = reportablePane();
    if (pane === null) return;
    const customStatus = currentCustomStatus(snapshot);
    if (!customStatus || customStatus === lastCustomStatus) return;
    lastCustomStatus = customStatus;
    sendHerdrMetadata(pane, customStatus);
  };
}

// ---- pane / tab label lookup (`herdr pane list`, `herdr tab list`) ----

interface HerdrEntityLike {
  pane_id?: unknown;
  tab_id?: unknown;
  label?: unknown;
}

function runHerdrJson(args: string[]): Promise<unknown> {
  return new Promise((resolve) => {
    try {
      execFile("herdr", args, { timeout: 2000 }, (_error, stdout) => {
        try {
          resolve(JSON.parse(String(stdout)) as unknown);
        } catch {
          resolve(undefined);
        }
      });
    } catch {
      resolve(undefined);
    }
  });
}

function herdrCollection(output: unknown, name: string): unknown {
  if (!isRecord(output)) return undefined;
  const result = output.result;
  return isRecord(result) && result[name] !== undefined ? result[name] : output[name];
}

function isHerdrEntity(value: unknown): value is HerdrEntityLike {
  return isRecord(value)
    && (value.pane_id === undefined || typeof value.pane_id === "string")
    && (value.tab_id === undefined || typeof value.tab_id === "string")
    && (value.label === undefined || typeof value.label === "string");
}

function findHerdrPane(panes: unknown, handle: string): HerdrEntityLike | undefined {
  if (!isUnknownArray(panes)) return undefined;
  return panes.find((candidate: unknown): candidate is HerdrEntityLike =>
    isHerdrEntity(candidate) && candidate.pane_id === handle);
}

function findPaneTab(tabs: unknown, pane: HerdrEntityLike | undefined): HerdrEntityLike | undefined {
  if (!isUnknownArray(tabs) || typeof pane?.tab_id !== "string") return undefined;
  return tabs.find((candidate: unknown): candidate is HerdrEntityLike =>
    isHerdrEntity(candidate) && candidate.tab_id === pane.tab_id);
}

/**
 * Reads this pane's (and its tab's) labels and hands them to `apply`. Returns
 * false when this process is not a herdr pane, so the caller can skip the
 * status write entirely; a lookup that fails leaves the previous labels in
 * place but still reports true.
 */
export async function readPaneLabels(id: string | null, apply: (labels: PaneLabels) => void): Promise<boolean> {
  const handle = herdrPaneHandle(id);
  if (handle === null) return false;
  try {
    const [paneOutput, tabOutput] = await Promise.all([
      runHerdrJson(["pane", "list"]),
      runHerdrJson(["tab", "list"]),
    ]);
    const pane = findHerdrPane(herdrCollection(paneOutput, "panes"), handle);
    const tab = findPaneTab(herdrCollection(tabOutput, "tabs"), pane);
    apply({
      label: optionalString(pane?.label) ?? null,
      tabLabel: optionalString(tab?.label) ?? null,
    });
  } catch {
    // best-effort
  }
  return true;
}

// ---- desktop notifications ----

export function notifyHerdr(event: BridgeNotifyEvent): void {
  const { title, body } = notificationText(event, { colorize: true });
  try {
    execFile("herdr", ["notification", "show", title, "--body", body, "--sound", "request", "--position", "bottom-left"], () => {
      /* noop */
    });
  } catch {
    // best-effort
  }
}

