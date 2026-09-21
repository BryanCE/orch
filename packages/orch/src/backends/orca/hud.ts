import { writeFileSync } from "node:fs";
import { isAgentState, type AgentState } from "../../agent-state.ts";
import { linuxTtyOf } from "../../process-identity.ts";
import { environmentOf } from "../../store/agent-view.ts";
import type { OrchDir } from "../../types/core.ts";
import type { BackendId } from "../../types/backend.ts";
import type { BridgeNotifyEvent, PaneLabels, PaneStatusSnapshot } from "../../types/plexer.ts";
import { isAgentId } from "../identity.ts";
import { orcaBackend } from "./index.ts";

const ORCA_PLEXER: BackendId = "orca";
const OSC_AGENT_STATUS_PREFIX = "\x1b]9999;";
const OSC_TERMINATOR = "\x07";
/** orch's states as Orca's four. Absent means Orca hears nothing. */
const ORCA_STATE: Readonly<Partial<Record<AgentState, "working" | "blocked" | "waiting" | "done">>> = {
  working: "working",
  blocked: "blocked",
  asking: "waiting",
  idle: "done",
  done: "done",
  error: "done",
  aborted: "done",
  exited: "done",
};

function paneHandle(id: string | null, orchDir: OrchDir): string | null {
  if (!isAgentId(id)) return null;
  try {
    const environment = environmentOf(orchDir, id);
    return environment.plexer === ORCA_PLEXER ? environment.handle : null;
  } catch {
    return null;
  }
}

function hudActive(id: string | null, orchDir: OrchDir): boolean {
  return paneHandle(id, orchDir) !== null;
}

function frameFor(snapshot: PaneStatusSnapshot): string | null {
  if (!isAgentState(snapshot.state)) return null;
  const state = ORCA_STATE[snapshot.state];
  if (state === undefined) return null;
  return `${OSC_AGENT_STATUS_PREFIX}${JSON.stringify({ state, prompt: snapshot.task ?? "" })}${OSC_TERMINATOR}`;
}

function createPaneStatusReporterInternal(
  deps: OrcaHudDeps,
  id: string | null,
  paneId: string | null,
  orchDir: OrchDir,
): (snapshot: PaneStatusSnapshot) => void {
  let lastFrame: string | undefined;
  let tty: string | undefined;

  function reportablePane(): string | null {
    return paneId !== null && paneId === paneHandle(id, orchDir) ? paneId : null;
  }

  function resolveTty(pane: string): string | null {
    if (tty !== undefined) return tty;
    try {
      const shellPid = deps.shellPidOf(pane);
      const found = shellPid === null ? null : deps.ttyOf(shellPid);
      if (found !== null) tty = found;
      return found;
    } catch {
      return null;
    }
  }

  return (snapshot: PaneStatusSnapshot): void => {
    const pane = reportablePane();
    if (pane === null) return;
    const frame = frameFor(snapshot);
    if (frame === null || frame === lastFrame) return;
    const target = resolveTty(pane);
    if (target === null) return;
    try {
      deps.writeTty(target, frame);
      lastFrame = frame;
    } catch {
      tty = undefined;
    }
  };
}

export interface OrcaHud {
  paneHandle: (id: string | null, orchDir: OrchDir) => string | null;
  hudActive: (id: string | null, orchDir: OrchDir) => boolean;
  createPaneStatusReporter: (id: string | null, paneId: string | null, orchDir: OrchDir) => (snapshot: PaneStatusSnapshot) => void;
  notify: (event: BridgeNotifyEvent) => void;
  readLabels: (apply: (labels: PaneLabels) => void) => Promise<boolean>;
}

export interface OrcaHudDeps {
  readonly shellPidOf: (paneId: string) => number | null;
  readonly ttyOf: (pid: number) => string | null;
  readonly writeTty: (tty: string, frame: string) => void;
}

export function createOrcaHud(deps: OrcaHudDeps): OrcaHud {
  return {
    paneHandle,
    hudActive,
    createPaneStatusReporter: (id, paneId, orchDir) => createPaneStatusReporterInternal(deps, id, paneId, orchDir),
    notify: () => { /* Orca has no notification verb. */ },
    readLabels: () => Promise.resolve(false),
  };
}

export const orcaHud = createOrcaHud({
  shellPidOf: (paneId) => orcaBackend.foreground.read(paneId).shellPid,
  ttyOf: linuxTtyOf,
  writeTty: (tty, frame) => writeFileSync(tty, frame),
});
