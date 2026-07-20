// herdr pane HUD — the plexer-side half of an in-agent bridge.
//
// Everything in this file is gated on the herdr PLEXER (backend), not on any
// agent harness: pane custom-status metadata, pane/tab label lookup, the pane
// agent-state machine (working / blocked / idle), the `herdr:blocked` signal,
// and desktop notifications. CLAUDE.md Rule 10 forbids backend-gated code from
// living under `extensions/<harness>/`, so harness shims depend on the
// plexer-neutral port (`src/backends/hud.ts`) and never import this module;
// the port wires these functions in as its herdr provider — no herdr socket,
// event name, or shell-out ever appears inside a harness directory.
import { execFile } from "node:child_process";
import { tryParseIdentity } from "../identity.ts";
import type {
  BridgeNotifyEvent,
  PaneHudContext,
  PaneHudEventBus,
  PaneHudOptions,
  PaneHudRegistrar,
  PaneLabels,
  PaneStatusSnapshot,
} from "../hud.ts";
import { requestJsonLine } from "../../presence/socket-client.ts";
import { createPaneStateSocket, retryableErrorMessage } from "./pane-socket.ts";
import { createPaneStateMachine } from "./pane-state-machine.ts";
import { notificationText } from "../../notify/format.ts";
import { isRecord } from "../../util.ts";
import { isUnknownArray, optionalString, truncate } from "../../util.ts";

const HERDR_ENV = process.env.HERDR_ENV;
const HERDR_SOCKET_PATH = process.env.HERDR_SOCKET_PATH;
const AGENT_IDENTITY = tryParseIdentity(process.env.ORCH_AGENT_KEY);
const HERDR_INTEGRATION_ACTIVE =
  HERDR_ENV === "1" && !!HERDR_SOCKET_PATH && AGENT_IDENTITY?.backend === "herdr";
const HERDR_METADATA_SOURCE = "orch:bridge";
const CUSTOM_STATUS_MAX = 32;

/** Herdr pane handle for this process, or null when this is not a herdr pane. */
export function herdrPaneHandle(): string | null {
  return AGENT_IDENTITY?.backend === "herdr" ? AGENT_IDENTITY.handle : null;
}

/**
 * Capability probe for the pane-HUD port (`src/backends/hud.ts`): true when this
 * process is a herdr pane.
 *
 * Deliberately the BROADEST gate any HUD entry point applies — identity alone.
 * The socket- and env-dependent entry points keep their own stricter checks
 * internally, so selecting this provider never grants more than each function
 * already allowed itself.
 */
export function herdrHudActive(): boolean {
  return AGENT_IDENTITY?.backend === "herdr";
}

// ---- pane custom-status metadata ----

let metadataSeq = Date.now() * 1000;

function nextMetadataSeq(): number {
  metadataSeq += 1;
  return metadataSeq;
}

function sendHerdrMetadata(customStatus: string): void {
  if (HERDR_ENV !== "1" || !HERDR_SOCKET_PATH || AGENT_IDENTITY?.backend !== "herdr") return;
  const request = {
    id: `${HERDR_METADATA_SOURCE}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    method: "pane.report_metadata",
    params: {
      pane_id: AGENT_IDENTITY.handle,
      source: HERDR_METADATA_SOURCE,
      custom_status: customStatus,
      seq: nextMetadataSeq(),
    },
  };
  void requestJsonLine(HERDR_SOCKET_PATH, request, 500);
}

/**
 * Builds the pane custom-status reporter. Returns a no-op-ish sink that only
 * emits when this process owns the herdr pane it would report against and the
 * derived status line actually changed.
 */
export function createPaneStatusReporter(paneId: string | null): (snapshot: PaneStatusSnapshot) => void {
  let lastCustomStatus: string | undefined;

  function metadataEnabledForState(): boolean {
    return (
      HERDR_INTEGRATION_ACTIVE &&
      paneId === AGENT_IDENTITY?.handle
    );
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
    if (!metadataEnabledForState()) return;
    const customStatus = currentCustomStatus(snapshot);
    if (!customStatus || customStatus === lastCustomStatus) return;
    lastCustomStatus = customStatus;
    sendHerdrMetadata(customStatus);
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

function findHerdrPane(panes: unknown): HerdrEntityLike | undefined {
  if (!isUnknownArray(panes)) return undefined;
  return panes.find((candidate: unknown): candidate is HerdrEntityLike =>
    isHerdrEntity(candidate) && candidate.pane_id === AGENT_IDENTITY?.handle);
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
export async function readPaneLabels(apply: (labels: PaneLabels) => void): Promise<boolean> {
  if (AGENT_IDENTITY?.backend !== "herdr") return false;
  try {
    const [paneOutput, tabOutput] = await Promise.all([
      runHerdrJson(["pane", "list"]),
      runHerdrJson(["tab", "list"]),
    ]);
    const pane = findHerdrPane(herdrCollection(paneOutput, "panes"));
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

// ---- the plexer's out-of-band blocked signal ----

interface HerdrBlockedEventLike {
  active: boolean;
  label?: string;
}

function isHerdrBlockedEvent(value: unknown): value is HerdrBlockedEventLike {
  return isRecord(value)
    && typeof value.active === "boolean"
    && (value.label === undefined || typeof value.label === "string");
}

/**
 * Relays herdr's pane-blocked signal to a bridge. The channel name and its
 * payload guard are plexer vocabulary and stay here; the bridge only receives
 * the decoded (active, label) pair.
 */
export function registerBlockedSignalRelay(
  events: PaneHudEventBus,
  onBlockedChange: (active: boolean, label: string | undefined) => void,
): void {
  events.on("herdr:blocked", (data: unknown) => {
    if (!isHerdrBlockedEvent(data)) return;
    onBlockedChange(data.active, data.label);
  });
}

// ---- herdr pane-state reporting (absorbed from the retired herdr-agent-state extension) ----
// Reports working/blocked/idle to herdr's pane HUD over the herdr socket, with
// idle debounce and a retry-grace hold for retryable provider errors. This is the
// wiring only: the socket sender/queue lives in `pane-socket.ts` and the
// working/blocked/idle decision logic in `pane-state-machine.ts`; here we parse
// env, build both, and adapt the harness lifecycle events onto the machine.
function parsePaneDurationEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function registerPaneStateHud(
  registrar: PaneHudRegistrar,
  events: PaneHudEventBus,
  options: PaneHudOptions,
): void {
  if (HERDR_ENV !== "1" || !HERDR_SOCKET_PATH || AGENT_IDENTITY?.backend !== "herdr") return;

  const agentId = options.agentId;
  const source = `herdr:${agentId}`;

  const socket = createPaneStateSocket({
    socketPath: HERDR_SOCKET_PATH,
    paneId: AGENT_IDENTITY.handle,
    source,
    agentId,
    extensionHash: options.extensionHash,
  });
  const machine = createPaneStateMachine({
    idleDebounceMs: parsePaneDurationEnv("HERDR_IDLE_DEBOUNCE_MS", 250),
    retryGraceMs: parsePaneDurationEnv("HERDR_RETRY_GRACE_MS", 2500),
    enqueueState: socket.enqueueState,
  });

  // Only the root session (the one with UI) mirrors its lifecycle into the pane;
  // nested/sub-agent sessions must not report against this pane's handle.
  let rootSession = false;

  registerBlockedSignalRelay(events, (active, label) => {
    if (!rootSession) return;
    machine.setBlocked(active, label);
  });

  registrar.onSessionStart((ctx: PaneHudContext) => {
    if (ctx?.hasUI !== true) return;
    rootSession = true;
    socket.updateSessionRef(ctx);
    void socket.reportSession();
    // A reload can replace this extension mid-run without emitting another agent_start.
    let active = false;
    try {
      active = ctx?.isIdle?.() === false;
    } catch {
      active = false;
    }
    machine.openSession(active);
  });

  registrar.onAgentStart((ctx: PaneHudContext) => {
    if (!rootSession) return;
    socket.updateSessionRef(ctx);
    void socket.reportSession();
    machine.startRun();
  });

  registrar.onAgentEnd((event) => {
    if (!rootSession) return;
    machine.endRun(retryableErrorMessage(event));
  });

  registrar.onSessionShutdown(async (event: { reason?: string }) => {
    if (!rootSession) return;
    machine.clearTimers();
    // Pi tears down extension runtimes for /reload, /new, /resume, /fork; only a
    // real quit should release herdr's full-lifecycle authority for this pane.
    if (event?.reason === "quit") await socket.releaseAgent();
  });
}
