// `orch attach <agent>`: this terminal becomes a viewer of the agent's live screen. The CLI
// talks only to this machine's orchd, which streams the screen from its own holder or carries
// it from the orchd of the host the agent runs on. Keystrokes and resizes go back the same way.
// The detach key, or closing the terminal, only stops viewing: the agent keeps running.
import { StringDecoder } from "node:string_decoder";
import type { Socket } from "node:net";
import { connectDaemon } from "../daemon/client/rpc.ts";
import { ensureDaemon, translateDaemonError } from "../daemon/client/reach.ts";
import { encodeRequest, readJsonMessages, type RpcLine } from "../daemon/client/wire.ts";
import { RPC_RESULTS, type ParamsOf, type RpcMethod } from "../daemon/client/protocol.ts";
import { callerCredential } from "../identity/credential.ts";
import { detachByte, splitAtDetach } from "../cli/detach-key.ts";
import { usageError } from "../cli/usage.ts";
import { CommandRefusal } from "../refusal.ts";
import { parseCommand } from "./registry.ts";
import { resolveEntity, targetName } from "./resolve.ts";
import type { ScreenChunk } from "../types/screen.ts";
import type { Services } from "../types/services.ts";

/** Home the cursor and clear the screen and scrollback, so a snapshot draws on an empty terminal. */
const CLEAR_SCREEN = "\x1b[H\x1b[2J\x1b[3J";
/** Save and restore the terminal's title around the attach. */
const PUSH_TITLE = "\x1b[22;0t";
const POP_TITLE = "\x1b[23;0t";
/** Undo the modes an agent's screen may leave set: the alternate screen, mouse reporting,
 *  bracketed paste, a hidden cursor, and colors. */
const RESET_MODES = "\x1b[?1049l\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l\x1b[?2004l\x1b[?25h\x1b[0m";

/** The id of the attach request; every input and resize after it counts up from the next. */
const ATTACH_ID = 1;

/** What one screen chunk writes to the viewer's terminal. A snapshot replaces the screen. */
export function screenOutput(chunk: Exclude<ScreenChunk, { kind: "end" }>): string {
  return chunk.kind === "snapshot" ? CLEAR_SCREEN + chunk.data : chunk.data;
}

/** The terminal title while attached. */
export function attachTitle(name: string, host: string): string {
  return `\x1b]0;${name} on ${host}\x07`;
}

/** How a viewing session ended. */
export type ScreenEnd =
  | { readonly kind: "detached" }
  | { readonly kind: "ended"; readonly reason: string }
  | { readonly kind: "refused"; readonly message: string };

/** Sends one request on the viewing connection. */
export type ScreenSend = <M extends RpcMethod>(method: M, params: ParamsOf<M>) => void;

/** One screen orchd streams to this terminal. */
export interface ScreenView {
  /** The key orchd streams the screen under. */
  readonly key: string;
  /** Send the request that opens the screen; it is the first on the connection. */
  readonly open: (send: ScreenSend, size: { cols: number; rows: number }) => void;
  /** orchd answered the open request. */
  readonly opened: (result: unknown) => void;
  /** Clear the terminal before drawing a snapshot: the screen replaces what was there. */
  readonly replace: boolean;
  /** Every piece of output, as drawn. */
  readonly output?: (data: string) => void;
}

/** Dial this machine's orchd for one viewing connection. */
export async function dialScreen(services: Services): Promise<Socket> {
  try {
    await ensureDaemon(services.orchDir, services.logger);
    return await connectDaemon(services.orchDir, services.settings.current().timeouts.daemon_probe_ms);
  } catch (error: unknown) {
    throw translateDaemonError(services.orchDir, error);
  }
}

export async function cmdAttach(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("attach", args);
  const target = invocation.positional[0];
  if (target === undefined || invocation.positional.length > 1) throw usageError(invocation);
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new CommandRefusal("orch attach needs a terminal: run it in one");
  const settings = services.settings.current();
  const detach = detachByte(settings.attach.detach_key);
  const resolved = await resolveEntity(services, target);
  const key = resolved.entity.key;
  const name = targetName(resolved);
  const socket = await dialScreen(services);
  /** The host the agent runs on, once orchd has said; `linked` when it is not orchd's own. */
  const runs: { host: string | null; linked: boolean } = { host: null, linked: false };
  const end = await viewScreen(services, socket, detach, {
    key,
    replace: true,
    open: (send, size) => { send("attach-screen", { caller: callerCredential(), key, ...size }); },
    opened: (result) => {
      const answer = RPC_RESULTS["attach-screen"].safeParse(result);
      if (answer.success) {
        runs.host = answer.data.host;
        runs.linked = answer.data.linked;
      }
      process.stdout.write(attachTitle(name, runs.host ?? "this host"));
    },
  });
  if (end.kind === "refused") throw new CommandRefusal(end.message);
  process.stdout.write(end.kind === "detached"
    ? `Detached from ${name}. It keeps running${runs.linked ? ` on ${runs.host}` : ""}.\n`
    : `${name}: ${end.reason}.\n`);
}

/** Hold the terminal on one screen orchd streams until the viewer detaches or the screen ends. */
export function viewScreen(services: Services, socket: Socket, detach: number, screen: ScreenView): Promise<ScreenEnd> {
  const stdin = process.stdin;
  const stdout = process.stdout;
  const decoder = new StringDecoder("utf8");
  const key = screen.key;
  let nextId = ATTACH_ID;
  const send: ScreenSend = (method, params) => {
    if (!socket.destroyed) socket.write(encodeRequest(nextId++, method, params));
  };

  return new Promise<ScreenEnd>((resolve) => {
    let finished = false;
    const finish = (end: ScreenEnd): void => {
      if (finished) return;
      finished = true;
      stdin.off("data", onKeys);
      stdout.off("resize", onResize);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write(`${RESET_MODES}${POP_TITLE}\r\n`);
      socket.end();
      resolve(end);
    };
    const onKeys = (chunk: Buffer): void => {
      const { forward, detached } = splitAtDetach(chunk, detach);
      const data = decoder.write(Buffer.from(forward));
      if (data.length > 0) send("screen-input", { key, data });
      if (detached) finish({ kind: "detached" });
    };
    const onResize = (): void => { send("screen-resize", { key, cols: stdout.columns, rows: stdout.rows }); };
    const onLine = (line: RpcLine): void => {
      switch (line.kind) {
        case "reply":
          if (line.id === ATTACH_ID) screen.opened(line.result);
          return;
        case "error":
          if (line.id === ATTACH_ID) finish({ kind: "refused", message: line.error.message });
          else services.logger.debug("attach.request-refused", { key, error: line.error.message });
          return;
        case "screen":
          if (line.key !== key) return;
          if (line.chunk.kind === "end") finish({ kind: "ended", reason: line.chunk.reason });
          else {
            screen.output?.(line.chunk.data);
            stdout.write(screen.replace ? screenOutput(line.chunk) : line.chunk.data);
          }
          return;
        case "event":
        case "delivery":
        case "gap":
          return;
        default: {
          const exhaustive: never = line;
          throw new Error(`unknown rpc line ${String(exhaustive)}`);
        }
      }
    };

    readJsonMessages(socket, onLine);
    socket.once("close", () => { finish({ kind: "ended", reason: "orchd closed the connection" }); });
    socket.once("error", (error) => { finish({ kind: "ended", reason: `the connection to orchd failed: ${error.message}` }); });
    stdout.write(PUSH_TITLE);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onKeys);
    stdout.on("resize", onResize);
    screen.open(send, { cols: stdout.columns, rows: stdout.rows });
  });
}
