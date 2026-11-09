// Attaching to an agent's screen. The orchd that runs the agent streams it from its terminal
// holder; any other orchd carries it over the link to that one. Keystrokes and resizes go back
// the same way. A viewer letting go never touches the agent.
import { callerMayResolveFor, refuseForeignTarget } from "../../../entities/resolve.ts";
import { atAgentHost } from "./host.ts";
import { requireOriginPeer } from "./peer.ts";
import { placeHere } from "../../../process-place.ts";
import { hostIdentity } from "../../../hosts/identity.ts";
import type { DaemonState } from "../state.ts";
import type { OrchDir } from "../../../types/core.ts";
import type { RpcHandler } from "../../../types/daemon.ts";
import { heldId, type HeldTerminal, type PtyExit } from "../../../types/pty.ts";
import type { HereAgent } from "../../../types/agent-place.ts";
import type { ScreenConnection, ScreenHolder, ScreenSource } from "../../../types/screen.ts";

type ScreenMethod = "attach-screen" | "peer-attach-screen" | "screen-input" | "screen-resize" | "screen-detach";

/** Why a held agent's screen ended. */
function exitReason(exit: PtyExit): string {
  return exit.signal === null ? `the agent exited with code ${exit.exitCode}` : `the agent was ended by signal ${exit.signal}`;
}

/** What a held screen that is not an agent's says when it ends, and does when its viewer lets go. */
export interface HeldScreenEnding {
  readonly reason: (exit: PtyExit) => string;
  readonly release: () => void;
}

/** Stream a screen this orchd holds to one connection: a snapshot, then every chunk after it.
 *  An agent's screen outlives its viewer; `ending` is for one that does not. */
export function attachHeld(holder: ScreenHolder, screens: ScreenConnection, terminal: HeldTerminal, size: { cols: number; rows: number }, queueBytes: number, ending?: HeldScreenEnding): void {
  const key = heldId(terminal);
  if (!holder.has(terminal)) throw new Error(`${key} has no terminal held on this machine, so there is no screen to attach to`);
  let unsubscribe: (() => void) | null = null;
  const source: ScreenSource = {
    input: (data) => { holder.write(terminal, data); },
    resize: (cols, rows) => { holder.resize(terminal, cols, rows); },
    refresh: () => { screens.push(key, { kind: "snapshot", data: holder.snapshot(terminal) }); },
    release: () => {
      unsubscribe?.();
      ending?.release();
    },
  };
  screens.open(key, source, queueBytes);
  holder.resize(terminal, size.cols, size.rows);
  // The holder's feed resumes exactly where its snapshot ends, so taken together in one tick
  // they neither miss nor repeat a byte.
  screens.push(key, { kind: "snapshot", data: holder.snapshot(terminal) });
  unsubscribe = holder.subscribe(
    terminal,
    (data) => { screens.push(key, { kind: "data", data }); },
    (exit) => { screens.push(key, { kind: "end", reason: (ending?.reason ?? exitReason)(exit) }); },
  );
}

/** The methods that work a screen this connection is attached to, and the one a linked host's
 *  orchd attaches with: they need only the holder, never another host. */
export function heldScreenHandlers(directory: OrchDir, holder: () => ScreenHolder, queueBytes: () => number): { readonly [M in Exclude<ScreenMethod, "attach-screen">]: RpcHandler<M> } {
  return {
    "peer-attach-screen": (params, _emit, context) => {
      requireOriginPeer(directory, context, params.key);
      attachHeld(holder(), context.screens, { kind: "agent", agent: placeHere(directory, params.key) }, { cols: params.cols, rows: params.rows }, queueBytes());
      return { ok: true };
    },
    "screen-input": async (params, _emit, context) => {
      await context.screens.source(params.key).input(params.data);
      return { ok: true };
    },
    "screen-resize": async (params, _emit, context) => {
      await context.screens.source(params.key).resize(params.cols, params.rows);
      return { ok: true };
    },
    "screen-detach": (params, _emit, context) => {
      context.screens.close(params.key);
      return { ok: true };
    },
  };
}

/** The screen methods: streaming from `holder` when the agent runs here, and over its host's
 *  link when it runs there. */
export function screenHandlers(state: DaemonState, holder: () => ScreenHolder): { readonly [M in ScreenMethod]: RpcHandler<M> } {
  const queueBytes = (): number => state.services.settings.current().attach.queue_bytes;
  return {
    "attach-screen": async (params, _emit, context) => {
      if (context.peer !== undefined) throw new Error("a linked host's orchd attaches with peer-attach-screen");
      if (!callerMayResolveFor(state.directory, params.caller, { key: params.key })) refuseForeignTarget(params.key);
      const size = { cols: params.cols, rows: params.rows };
      const here = (agent: HereAgent): { host: string; linked: boolean } => {
        attachHeld(holder(), context.screens, { kind: "agent", agent }, size, queueBytes());
        return { host: hostIdentity().name, linked: false };
      };
      return await atAgentHost(state, params.key, {
        here,
        there: async (link, host) => {
          const { source, started } = link.attachScreen(params.key, size, (chunk) => { context.screens.push(params.key, chunk); });
          context.screens.open(params.key, source, queueBytes());
          try {
            await started;
          } catch (error: unknown) {
            context.screens.close(params.key);
            throw error;
          }
          return { host: host.name, linked: true };
        },
      });
    },
    ...heldScreenHandlers(state.directory, holder, queueBytes),
  };
}
