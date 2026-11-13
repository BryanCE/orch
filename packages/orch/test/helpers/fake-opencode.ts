// A fake opencode 2 server for tests: its HTTP API under HTTP Basic, its event stream, and the
// calls it took; and a PipesProvider whose `opencode serve --stdio` announces that server.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { PipesExit, PipesProcess, PipesProvider, PipesSpawn } from "../../src/types/pipes.ts";

/** One request the fake server took. */
export interface Call {
  readonly method: string;
  /** The path without its query. */
  readonly path: string;
  readonly query: string;
  readonly body: unknown;
}

/** A fake opencode server: its HTTP API, its event stream, and the calls it took. */
export interface FakeOpencode {
  readonly url: string;
  readonly calls: Call[];
  /** Push one event down every open event stream. */
  send(type: string, data: Record<string, unknown>): void;
  /** End every open event stream, as a dropped connection does. */
  dropStreams(): void;
  /** How many event streams were ever opened. */
  streamsOpened(): number;
  /** What `GET /api/session/{id}/message` answers, newest first. */
  messages: Record<string, unknown>[];
  /** What `GET /api/session/active` answers as its `data`. */
  active: Record<string, unknown>;
  /** What `GET /api/session/{id}/permission` answers as its `data`. */
  permissions: Record<string, unknown>[];
  close(): Promise<void>;
}

function readBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let text = "";
    request.on("data", (chunk: Buffer) => { text += chunk.toString("utf8"); });
    request.on("end", () => {
      if (text.length === 0) {
        resolve(undefined);
        return;
      }
      const parsed: unknown = JSON.parse(text);
      resolve(parsed);
    });
  });
}

function json(response: ServerResponse, body: unknown): void {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

/** Start a fake opencode server that takes `password` and offers `models`. */
export async function fakeOpencode(password: string, models: readonly Record<string, unknown>[]): Promise<FakeOpencode> {
  const calls: Call[] = [];
  const streams: ServerResponse[] = [];
  let opened = 0;
  let created = 0;
  let prompted = 0;
  const expected = `Basic ${Buffer.from(`opencode:${password}`, "utf8").toString("base64")}`;
  const server: Server = createServer((request, response) => {
    void (async () => {
      if (request.headers.authorization !== expected) {
        response.writeHead(401).end();
        return;
      }
      const method = request.method ?? "GET";
      const [path = "/", query = ""] = (request.url ?? "/").split("?");
      if (path === "/api/event") {
        opened += 1;
        response.writeHead(200, { "content-type": "text/event-stream" });
        response.write(`data: ${JSON.stringify({ id: "evt_0", type: "server.connected", data: {} })}\n\n`);
        streams.push(response);
        return;
      }
      const body = await readBody(request);
      calls.push({ method, path, query, body });
      if (method === "GET" && path === "/api/info") return json(response, { version: "2.2.7", pid: 1, urls: [], paths: { tmp: "/tmp" } });
      if (method === "GET" && path === "/api/model") return json(response, { data: models });
      if (method === "GET" && path === "/api/session/active") return json(response, { data: fake.active });
      if (method === "POST" && path === "/api/session") {
        created += 1;
        return json(response, { data: { id: `ses_${created}` } });
      }
      if (method === "GET" && /^\/api\/session\/[^/]+$/.test(path)) return json(response, { data: { id: path.split("/").at(-1) } });
      if (method === "GET" && path.endsWith("/message")) return json(response, { data: fake.messages, cursor: {} });
      if (method === "GET" && path.endsWith("/permission")) return json(response, { data: fake.permissions });
      if (method === "PUT" && path.endsWith("/environment")) {
        response.writeHead(204).end();
        return;
      }
      if (path.endsWith("/prompt")) {
        prompted += 1;
        return json(response, { data: { id: `msg_${prompted}`, type: "user" } });
      }
      if (path.endsWith("/interrupt")) return json(response, { interrupted: true });
      return json(response, {});
    })();
  });
  await new Promise<void>((resolve) => { server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("the fake opencode server listens on a TCP port");
  const fake: FakeOpencode = {
    url: `http://127.0.0.1:${address.port}`,
    calls,
    messages: [],
    active: {},
    permissions: [],
    send(type, data) {
      for (const stream of streams) stream.write(`data: ${JSON.stringify({ id: `evt_${type}`, type, data })}\n\n`);
    },
    dropStreams() {
      for (const stream of streams.splice(0)) stream.end();
    },
    streamsOpened: () => opened,
    async close() {
      fake.dropStreams();
      server.closeAllConnections();
      await new Promise<void>((resolve) => { server.close(() => { resolve(); }); });
    },
  };
  return fake;
}

/** A started `opencode serve --stdio` as orchd sees it: it announces `url` on stdout and runs
 *  until it is killed or `exit` is called. */
export interface ServingProcess extends PipesProcess {
  exit(): void;
  readonly killed: () => boolean;
}

export function servingProcess(stdout: string, pid = 4242): ServingProcess {
  const encoder = new TextEncoder();
  let resolveExit: (exit: PipesExit) => void = () => undefined;
  const exited = new Promise<PipesExit>((resolve) => { resolveExit = resolve; });
  let killed = false;
  return {
    pid,
    input: new WritableStream<Uint8Array>(),
    output: new ReadableStream<Uint8Array>({ start(controller) { if (stdout.length > 0) controller.enqueue(encoder.encode(stdout)); } }),
    onStderr: () => undefined,
    exited,
    kill: () => {
      killed = true;
      resolveExit({ code: null, signal: "SIGTERM" });
    },
    exit: () => { resolveExit({ code: 0, signal: null }); },
    killed: () => killed,
  };
}

/** Pipes whose every spawn is an `opencode serve` announcing `url`; it keeps what it started. */
export interface ServingPipes extends PipesProvider {
  readonly spawned: { readonly request: PipesSpawn; readonly process: ServingProcess }[];
}

export function servingPipes(url: string): ServingPipes {
  const spawned: { readonly request: PipesSpawn; readonly process: ServingProcess }[] = [];
  return {
    spawned,
    spawn(request) {
      const process = servingProcess(`${JSON.stringify({ url })}\n`, 4242 + spawned.length);
      spawned.push({ request, process });
      return process;
    },
  };
}
