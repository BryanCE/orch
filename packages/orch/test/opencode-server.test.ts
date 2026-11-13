import { afterEach, describe, expect, test } from "bun:test";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { opencodeServerDriver } from "../src/adapters/opencode-server.ts";
import { orchDirAt } from "../src/orch-dir.ts";
import { settingsFromFile } from "../src/settings/read.ts";
import { SETTINGS_FILE_SCHEMA, SETTINGS_SCHEMA } from "../src/settings/schema.ts";
import type { BridgeDelivery, BridgeMessage } from "../src/shared/bridge-message.ts";
import type { HeldSession, SessionAsk, SessionLinkEvents } from "../src/types/held-session.ts";
import type { PipesExit, PipesProcess } from "../src/types/pipes.ts";
import { recordingLogger } from "./helpers/logger.ts";

const cwd = "/opencode-test";
const orchDir = orchDirAt("/opencode-test-orch");
const settings = settingsFromFile("settings.json", SETTINGS_FILE_SCHEMA.parse({
  schemaVersion: SETTINGS_SCHEMA,
  runtime: "node",
  timeouts: { server_ready_ms: 1_000, spawn_attach_poll_ms: 20 },
}));

/** One request the fake server took. */
interface Call {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

/** A fake opencode server: its HTTP API, its event stream, and the calls it took. */
interface FakeOpencode {
  readonly url: string;
  readonly calls: Call[];
  /** Push one event down every open event stream. */
  send(type: string, data: Record<string, unknown>): void;
  close(): Promise<void>;
}

const servers: FakeOpencode[] = [];
const sessions: HeldSession[] = [];

afterEach(async () => {
  for (const session of sessions.splice(0)) session.link.close();
  for (const server of servers.splice(0)) await server.close();
});

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
async function fakeOpencode(password: string, models: readonly Record<string, unknown>[]): Promise<FakeOpencode> {
  const calls: Call[] = [];
  const streams: ServerResponse[] = [];
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
      const path = (request.url ?? "/").split("?")[0] ?? "/";
      if (path === "/api/event") {
        response.writeHead(200, { "content-type": "text/event-stream" });
        response.write(`data: ${JSON.stringify({ id: "evt_0", type: "server.connected", data: {} })}\n\n`);
        streams.push(response);
        return;
      }
      const body = await readBody(request);
      calls.push({ method, path, body });
      if (method === "GET" && path === "/api/model") return json(response, { location: { directory: cwd }, data: models });
      if (method === "POST" && path === "/api/session") {
        created += 1;
        return json(response, { data: { id: `ses_${created}`, location: { directory: cwd } } });
      }
      if (method === "GET" && /^\/api\/session\/[^/]+$/.test(path)) return json(response, { data: { id: path.split("/").at(-1) } });
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
  const port = address.port;
  const fake: FakeOpencode = {
    url: `http://127.0.0.1:${port}`,
    calls,
    send(type, data) {
      for (const stream of streams) stream.write(`data: ${JSON.stringify({ id: `evt_${type}`, type, data })}\n\n`);
    },
    async close() {
      for (const stream of streams) stream.end();
      await new Promise<void>((resolve) => { server.close(() => { resolve(); }); });
    },
  };
  servers.push(fake);
  return fake;
}

/** A started `opencode serve` as orchd sees it: stdout says where it listens, and it never exits. */
function servingProcess(stdout: string): PipesProcess {
  const encoder = new TextEncoder();
  return {
    pid: 1,
    input: new WritableStream<Uint8Array>(),
    output: new ReadableStream<Uint8Array>({ start(controller) { if (stdout.length > 0) controller.enqueue(encoder.encode(stdout)); } }),
    onStderr: () => undefined,
    exited: new Promise<PipesExit>(() => undefined),
    kill: () => undefined,
  };
}

/** Records every event as one line, and resolves a wait when a line shows up. */
function recorder() {
  const log: string[] = [];
  let waiters: { line: string; resolve: () => void }[] = [];
  let asked = 0;
  const record = (line: string) => {
    log.push(line);
    for (const waiter of waiters.filter((item) => item.line === line)) waiter.resolve();
    waiters = waiters.filter((item) => item.line !== line);
  };
  const seen = (line: string) => new Promise<void>((resolve) => {
    if (log.includes(line)) resolve();
    else waiters.push({ line, resolve });
  });
  const events: SessionLinkEvents = {
    onTurnStarted: (id) => record(`started:${id}`),
    onEntries: (entries) => { for (const entry of entries) record(`entry:${entry.role}:${entry.text ?? entry.toolCalls?.map((call) => `${call.name}(${call.arg})`).join(",") ?? ""}`); },
    onTurnEnded: (outcome, text) => record(`ended:${outcome.state}:${outcome.error ?? ""}:${text}`),
    onAsk: (ask: SessionAsk) => {
      asked += 1;
      record(`ask:${ask.toolCallId}:${ask.title}:${ask.options.map((option) => option.id).join("|")}`);
      return `q${asked}`;
    },
    onAsksSettled: () => record("settled"),
    onAskDropped: (id) => record(`dropped:${id}`),
    onApplied: (id) => record(`applied:${id}`),
    onError: (error) => record(`error:${error.message}`),
    onReset: (sessionId) => record(`reset:${sessionId}`),
  };
  return { log, events, seen };
}

function delivery(id: string, message: BridgeMessage): BridgeDelivery {
  return { id, message };
}

const LUNA = { providerID: "openai", id: "gpt-luna", modelID: "gpt-luna", name: "Luna", variants: [{ id: "none" }, { id: "high" }] };

/** Launch the driver on a fake server and open a session. */
async function openOn(models: readonly Record<string, unknown>[], opts: { model?: string; thinking?: "off" | "high" | "minimal" } = {}) {
  const launch = opencodeServerDriver.launch({ form: "server", orchDir, cwd, ...opts });
  const password = launch.env.OPENCODE_PASSWORD;
  if (password === undefined) throw new Error("the launch sets OPENCODE_PASSWORD");
  const fake = await fakeOpencode(password, models);
  const rec = recorder();
  const { logger, records } = recordingLogger();
  const session = await launch.open(servingProcess(`booting\nserver listening on ${fake.url}\n`), { kind: "new", cwd }, rec.events, { logger, settings });
  sessions.push(session);
  return { fake, rec, session, records, launch };
}

/** The message a promise rejects with; one that resolves fails the test. */
async function rejection(pending: Promise<unknown>): Promise<string> {
  return await pending.then(() => { throw new Error("expected a rejection"); }, (error: unknown) => error instanceof Error ? error.message : String(error));
}

const posts = (fake: FakeOpencode, suffix: string) => fake.calls.filter((call) => call.method === "POST" && call.path.endsWith(suffix));

describe("opencode server form", () => {
  test("the launch runs a private opencode serve on a loopback port it picks, with a generated password", () => {
    const launch = opencodeServerDriver.launch({ form: "server", orchDir, cwd });
    expect(launch.argv).toEqual(["opencode", "serve", "--hostname=127.0.0.1", "--port=0"]);
    expect(launch.env.OPENCODE_PASSWORD).toMatch(/^[\w-]{40,}$/);
    expect(launch.env.OPENCODE_SERVER_PASSWORD).toBe(launch.env.OPENCODE_PASSWORD);
    expect(opencodeServerDriver.launch({ form: "server", orchDir, cwd }).env.OPENCODE_PASSWORD).not.toBe(launch.env.OPENCODE_PASSWORD);
  });

  test("a new session is created in the agent's directory on the launch model, with the thinking level as its variant", async () => {
    const { fake, session } = await openOn([LUNA], { model: "openai/gpt-luna", thinking: "high" });
    expect(session.sessionId).toBe("ses_1");
    expect(posts(fake, "/api/session")).toEqual([{ method: "POST", path: "/api/session", body: { location: { directory: cwd }, model: { providerID: "openai", id: "gpt-luna", variant: "high" } } }]);
  });

  test("off is opencode's none variant; a level the model does not offer is skipped with a warning", async () => {
    const off = await openOn([LUNA], { model: "openai/gpt-luna", thinking: "off" });
    expect(posts(off.fake, "/api/session")[0]?.body).toEqual({ location: { directory: cwd }, model: { providerID: "openai", id: "gpt-luna", variant: "none" } });
    const minimal = await openOn([LUNA], { model: "openai/gpt-luna", thinking: "minimal" });
    expect(posts(minimal.fake, "/api/session")[0]?.body).toEqual({ location: { directory: cwd }, model: { providerID: "openai", id: "gpt-luna" } });
    expect(minimal.records.map((record) => record.event)).toContain("opencode.thinking-not-offered");
  });

  test("a model opencode does not offer refuses the launch by name", async () => {
    expect(await rejection(openOn([LUNA], { model: "openai/gpt-other" }))).toContain("opencode offers no model openai/gpt-other; it offers openai/gpt-luna");
  });

  test("a model spec without a provider refuses the launch", async () => {
    expect(await rejection(openOn([LUNA], { model: "gpt-luna" }))).toContain("opencode names a model provider/model; gpt-luna is not one");
  });

  test("a server that never says it listens fails the launch within the wait", async () => {
    const launch = opencodeServerDriver.launch({ form: "server", orchDir, cwd });
    const { logger } = recordingLogger();
    expect(await rejection(launch.open(servingProcess("booting\n"), { kind: "new", cwd }, recorder().events, { logger, settings }))).toContain("did not say it is listening within 1000 ms");
  });

  test("a dispatch is queued as a prompt, and the turn runs from execution started to succeeded with the last message's text", async () => {
    const { fake, rec, session } = await openOn([LUNA]);
    session.link.push(delivery("d1", { action: "dispatch", text: "do it" }));
    await rec.seen("applied:d1");
    expect(posts(fake, "/prompt")).toEqual([{ method: "POST", path: "/api/session/ses_1/prompt", body: { text: "do it", delivery: "queue" } }]);
    fake.send("session.execution.started", { sessionID: "ses_1" });
    fake.send("session.tool.input.started", { sessionID: "ses_1", assistantMessageID: "m1", id: "t1", name: "shell" });
    fake.send("session.tool.called", { sessionID: "ses_1", assistantMessageID: "m1", id: "t1", input: { command: "ls" } });
    fake.send("session.tool.success", { sessionID: "ses_1", assistantMessageID: "m1", id: "t1", content: [{ type: "text", text: "a b" }] });
    fake.send("session.text.ended", { sessionID: "ses_1", assistantMessageID: "m2", ordinal: 0, text: "done it" });
    fake.send("session.execution.succeeded", { sessionID: "ses_1" });
    await rec.seen("ended:done::done it");
    expect(rec.log).toEqual([
      "entry:user:do it",
      "applied:d1",
      "started:d1",
      "entry:assistant:shell(ls)",
      "entry:tool:a b",
      "entry:assistant:done it",
      "ended:done::done it",
    ]);
  });

  test("a steer is sent with steer delivery", async () => {
    const { fake, rec, session } = await openOn([LUNA]);
    session.link.push(delivery("s1", { action: "steer", text: "also this" }));
    await rec.seen("applied:s1");
    expect(posts(fake, "/prompt")[0]?.body).toEqual({ text: "also this", delivery: "steer" });
  });

  test("a failed execution ends the turn in error with opencode's message", async () => {
    const { fake, rec } = await openOn([LUNA]);
    fake.send("session.execution.started", { sessionID: "ses_1" });
    fake.send("session.execution.failed", { sessionID: "ses_1", error: { type: "provider.quota", message: "Payment Required" } });
    await rec.seen("ended:error:Payment Required:");
  });

  test("events of another session are ignored", async () => {
    const { fake, rec } = await openOn([LUNA]);
    fake.send("session.execution.started", { sessionID: "ses_other" });
    fake.send("session.execution.started", { sessionID: "ses_1" });
    await rec.seen("started:");
    expect(rec.log).toEqual(["started:"]);
  });

  test("a permission ask is a question with opencode's replies, and an answer replies to it", async () => {
    const { fake, rec, session } = await openOn([LUNA]);
    fake.send("session.execution.started", { sessionID: "ses_1" });
    fake.send("permission.asked", { id: "per_1", sessionID: "ses_1", action: "shell", resources: ["rm -rf build"] });
    await rec.seen("ask:per_1:shell: rm -rf build:once|always|reject");
    session.link.push(delivery("a1", { action: "answer", text: "", questionId: "q1", optionId: "once" }));
    await rec.seen("settled");
    expect(posts(fake, "/reply")).toEqual([{ method: "POST", path: "/api/session/ses_1/permission/per_1/reply", body: { decision: "once" } }]);
    expect(rec.log).toContain("applied:a1");
  });

  test("abort interrupts the session and the interrupted execution ends the turn aborted, dropping open asks", async () => {
    const { fake, rec, session } = await openOn([LUNA]);
    fake.send("session.execution.started", { sessionID: "ses_1" });
    fake.send("permission.asked", { id: "per_1", sessionID: "ses_1", action: "edit", resources: ["a.ts"] });
    await rec.seen("ask:per_1:edit: a.ts:once|always|reject");
    session.link.abort?.();
    fake.send("session.execution.interrupted", { sessionID: "ses_1", reason: "user" });
    await rec.seen("ended:aborted::");
    expect(posts(fake, "/interrupt")).toHaveLength(1);
    expect(rec.log).toContain("dropped:q1");
  });

  test("reset starts a fresh session on the same model and reports its id; events follow the new session", async () => {
    const { fake, rec, session } = await openOn([LUNA], { model: "openai/gpt-luna" });
    if (session.link.reset === null) throw new Error("the opencode link offers reset");
    await session.link.reset();
    expect(rec.log).toEqual(["reset:ses_2"]);
    expect(posts(fake, "/api/session").map((call) => call.body)).toEqual([
      { location: { directory: cwd }, model: { providerID: "openai", id: "gpt-luna" } },
      { location: { directory: cwd }, model: { providerID: "openai", id: "gpt-luna" } },
    ]);
    fake.send("session.execution.started", { sessionID: "ses_1" });
    fake.send("session.execution.started", { sessionID: "ses_2" });
    await rec.seen("started:");
    expect(rec.log).toEqual(["reset:ses_2", "started:"]);
  });

  test("a reset during a turn is refused", async () => {
    const { fake, rec, session } = await openOn([LUNA]);
    fake.send("session.execution.started", { sessionID: "ses_1" });
    await rec.seen("started:");
    if (session.link.reset === null) throw new Error("the opencode link offers reset");
    expect(await rejection(session.link.reset())).toContain("a turn is running");
  });

  test("a model push switches the session's model, the thinking suffix as its variant", async () => {
    const { fake, rec, session } = await openOn([LUNA]);
    session.link.push(delivery("m1", { action: "model", model: "openai/gpt-luna:high" }));
    await rec.seen("applied:m1");
    expect(posts(fake, "/model")).toEqual([{ method: "POST", path: "/api/session/ses_1/model", body: { model: { providerID: "openai", id: "gpt-luna", variant: "high" } } }]);
  });

  test("reopening a recorded session reads it and switches it to the launch model", async () => {
    const launch = opencodeServerDriver.launch({ form: "server", orchDir, cwd, model: "openai/gpt-luna" });
    const fake = await fakeOpencode(launch.env.OPENCODE_PASSWORD ?? "", [LUNA]);
    const { logger } = recordingLogger();
    const session = await launch.open(servingProcess(`server listening on ${fake.url}\n`), { kind: "existing", cwd, sessionId: "ses_9" }, recorder().events, { logger, settings });
    sessions.push(session);
    expect(session.sessionId).toBe("ses_9");
    expect(fake.calls.filter((call) => call.path.startsWith("/api/session")).map((call) => `${call.method} ${call.path}`)).toEqual(["GET /api/session/ses_9", "POST /api/session/ses_9/model"]);
  });
});
