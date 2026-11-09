// Attaching to an agent's screen. The orchd that runs the agent streams it from its terminal
// holder; any other orchd carries it over the link to that one. Keystrokes and resizes go back
// the same way. A viewer letting go never touches the agent.
import { callerMayResolveFor, refuseForeignTarget } from "../../../entities/resolve.ts";
import { atAgentHost } from "./host.ts";
import { requireOriginPeer } from "./peer.ts";
import type { DaemonState } from "../state.ts";
import type { OrchDir } from "../../../types/core.ts";
import type { RpcHandler } from "../../../types/daemon.ts";
import type { PtyExit } from "../../../types/pty.ts";
import type { ScreenConnection, ScreenHolder, ScreenSource } from "../../../types/screen.ts";

type ScreenMethod = "attach-screen" | "peer-attach-screen" | "screen-input" | "screen-resize" | "screen-detach";

/** Why a held agent's screen ended. */
function exitReason(exit: PtyExit): string {
  return exit.signal === null ? `the agent exited with code ${exit.exitCode}` : `the agent was ended by signal ${exit.signal}`;
}

/** Stream a screen this orchd holds to one connection: a snapshot, then every chunk after it. */
export function attachHeld(holder: ScreenHolder, screens: ScreenConnection, key: string, size: { cols: number; rows: number }, queueBytes: number): void {
  if (!holder.has(key)) throw new Error(`${key} has no terminal held on this machine, so there is no screen to attach to`);
  let unsubscribe: (() => void) | null = null;
  const source: ScreenSource = {
    input: (data) => { holder.write(key, data); },
    resize: (cols, rows) => { holder.resize(key, cols, rows); },
    refresh: () => { screens.push(key, { kind: "snapshot", data: holder.snapshot(key) }); },
    release: () => { unsubscribe?.(); },
  };
  screens.open(key, source, queueBytes);
  holder.resize(key, size.cols, size.rows);
  // The holder's feed resumes exactly where its snapshot ends, so taken together in one tick
  // they neither miss nor repeat a byte.
  screens.push(key, { kind: "snapshot", data: holder.snapshot(key) });
  unsubscribe = holder.subscribe(
    key,
    (data) => { screens.push(key, { kind: "data", data }); },
    (exit) => { screens.push(key, { kind: "end", reason: exitReason(exit) }); },
  );
}

/** The methods that work a screen this connection is attached to, and the one a linked host's
 *  orchd attaches with: they need only the holder, never another host. */
export function heldScreenHandlers(directory: OrchDir, holder: () => ScreenHolder, queueBytes: () => number): { readonly [M in Exclude<ScreenMethod, "attach-screen">]: RpcHandler<M> } {
  return {
    "peer-attach-screen": (params, _emit, context) => {
      requireOriginPeer(directory, context, params.key);
      attachHeld(holder(), context.screens, params.key, { cols: params.cols, rows: params.rows }, queueBytes());
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
      const here = (): { host: string | null } => {
        attachHeld(holder(), context.screens, params.key, size, queueBytes());
        return { host: null };
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
          return { host: host.name };
        },
      });
    },
    ...heldScreenHandlers(state.directory, holder, queueBytes),
  };
}
