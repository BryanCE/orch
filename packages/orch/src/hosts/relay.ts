// orchd's own RPC, carried over a host link, so an agent on a far host reaches the orchd
// that owns it. The far end, `orch host serve`, listens where a client on that host looks
// for orchd: a socket in a directory of its own for each origin, with that orchd's token
// and this host's settings beside it. Each connection to that socket is one stream on the
// link. The near end dials its own orchd for each stream and passes lines both ways until
// either side ends it. Nothing here reads a line: it carries them.
import { copyFileSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:net";
import { join } from "node:path";
import type { Duplex } from "node:stream";
import { framedLineReader } from "../daemon/client/wire.ts";
import { daemonRuntimeFiles } from "../daemon/client/runtime-files.ts";
import { orchDirAt } from "../orch-dir.ts";
import { settingsPath } from "../settings/schema.ts";
import { ensurePrivateDir, isRecord } from "../util.ts";
import type { OrchDir } from "../types/core.ts";
import type { HostFrame } from "./protocol.ts";

export type StreamFrame = Extract<HostFrame, { kind: "stream-open" | "stream-line" | "stream-end" }>;
type SendFrame = (frame: StreamFrame) => void;

/** The directory a far host keeps for the agents one origin's orchd owns. */
export function relayDir(orchDir: OrchDir, originId: string): OrchDir {
  return orchDirAt(join(orchDir, "links", originId));
}

/** The sockets one end carries, by stream id. Lines a socket writes go out as frames; lines
 *  the other end sends are written to it; either side ending ends both. */
class Streams {
  private readonly sockets = new Map<number, Duplex>();

  constructor(private readonly send: SendFrame) {}

  carry(id: number, socket: Duplex): void {
    this.sockets.set(id, socket);
    framedLineReader(socket, (line) => { this.send({ kind: "stream-line", stream: id, line }); });
    const ended = (): void => {
      if (this.sockets.get(id) !== socket) return;
      this.sockets.delete(id);
      this.send({ kind: "stream-end", stream: id });
    };
    socket.once("end", ended);
    socket.once("close", ended);
    socket.on("error", ended);
  }

  has(id: number): boolean {
    return this.sockets.has(id);
  }

  line(id: number, line: string): void {
    this.sockets.get(id)?.write(`${line}\n`);
  }

  /** The other end ended stream `id`. */
  end(id: number): void {
    const socket = this.sockets.get(id);
    this.sockets.delete(id);
    socket?.end();
  }

  endAll(): void {
    for (const id of [...this.sockets.keys()]) this.end(id);
  }
}

function errorCode(error: unknown): string | undefined {
  return isRecord(error) && typeof error.code === "string" ? error.code : undefined;
}

function listen(server: Server, endpoint: string | { host: string; port: number }): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(endpoint, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

/** Listen where a client looks for orchd in `dir`: its socket path, taken back from a link
 *  that ended without closing it, else loopback TCP with the port written beside it, as
 *  orchd itself does where a socket path cannot be bound. */
async function listenWhereClientsLook(server: Server, dir: OrchDir): Promise<void> {
  const files = daemonRuntimeFiles(dir);
  try {
    await listen(server, files.socket);
    return;
  } catch (error: unknown) {
    if (errorCode(error) === "EADDRINUSE") {
      rmSync(files.socket, { force: true });
      await listen(server, files.socket);
      return;
    }
  }
  await listen(server, { host: "127.0.0.1", port: 0 });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("the relay bound no loopback port");
  writeFileSync(files.port, `${address.port}\n`, { mode: 0o600 });
}

/** The far end: a socket that agents here dial as their orchd. */
export class RelayListener {
  private server: Server | null = null;
  private dir: OrchDir | null = null;
  private nextStream = 1;
  private readonly streams: Streams;

  constructor(private readonly send: SendFrame) {
    this.streams = new Streams(send);
  }

  /** Open the directory for `originId`'s agents under `orchDir`, and listen there. */
  async open(orchDir: OrchDir, originId: string, token: string): Promise<OrchDir> {
    this.close();
    const dir = relayDir(orchDir, originId);
    ensurePrivateDir(dir);
    writeFileSync(daemonRuntimeFiles(dir).token, `${token}\n`, { mode: 0o600 });
    // Agents here run this host's harnesses and plexers, as this host's settings say.
    const settings = settingsPath(orchDir);
    if (existsSync(settings)) copyFileSync(settings, settingsPath(dir));
    const server = createServer((socket) => {
      const id = this.nextStream++;
      this.send({ kind: "stream-open", stream: id });
      this.streams.carry(id, socket);
    });
    await listenWhereClientsLook(server, dir);
    this.server = server;
    this.dir = dir;
    return dir;
  }

  line(id: number, line: string): void {
    this.streams.line(id, line);
  }

  end(id: number): void {
    this.streams.end(id);
  }

  /** Stop listening and end every stream. The socket and the token go with the link. */
  close(): void {
    this.streams.endAll();
    this.server?.close();
    this.server = null;
    if (this.dir === null) return;
    const files = daemonRuntimeFiles(this.dir);
    for (const file of [files.socket, files.port, files.token]) rmSync(file, { force: true });
    this.dir = null;
  }
}

/** The near end: one connection to this machine's orchd for each stream the far end opens.
 *  Lines that arrive while that connection is still being made wait for it. */
export class RelayDialer {
  private readonly streams: Streams;
  private readonly waiting = new Map<number, string[]>();

  constructor(
    private readonly send: SendFrame,
    private readonly dial: () => Promise<Duplex>,
    private readonly onDialFailed: (error: unknown) => void,
  ) {
    this.streams = new Streams(send);
  }

  open(id: number): void {
    this.waiting.set(id, []);
    this.dial().then((socket) => {
      const lines = this.waiting.get(id);
      this.waiting.delete(id);
      // The far end gave up on the stream before orchd answered.
      if (lines === undefined) {
        socket.end();
        return;
      }
      this.streams.carry(id, socket);
      for (const line of lines) this.streams.line(id, line);
    }, (error: unknown) => {
      this.waiting.delete(id);
      this.onDialFailed(error);
      this.send({ kind: "stream-end", stream: id });
    });
  }

  line(id: number, line: string): void {
    const lines = this.waiting.get(id);
    if (lines !== undefined) lines.push(line);
    else if (this.streams.has(id)) this.streams.line(id, line);
  }

  end(id: number): void {
    this.waiting.delete(id);
    this.streams.end(id);
  }

  endAll(): void {
    this.waiting.clear();
    this.streams.endAll();
  }
}
