import { afterEach, describe, expect, test } from "bun:test";
import { opencodeDriver } from "../src/adapters/opencode-driver.ts";
import { OpencodeServerOwner } from "../src/adapters/opencode-server.ts";
import { orchDirAt } from "../src/orch-dir.ts";
import { settingsFromFile } from "../src/settings/read.ts";
import { SETTINGS_FILE_SCHEMA, SETTINGS_SCHEMA } from "../src/settings/schema.ts";
import type { BridgeDelivery, BridgeMessage } from "../src/shared/bridge-message.ts";
import type { HeldSession, SessionAsk, SessionLinkEvents } from "../src/types/held-session.ts";
import type { PipesProvider } from "../src/types/pipes.ts";
import { sleep } from "../src/util.ts";
import { fakeOpencode, servingPipes, servingProcess, type FakeOpencode } from "./helpers/fake-opencode.ts";
import { recordingLogger } from "./helpers/logger.ts";

const cwd = "/opencode-test";
const orchDir = orchDirAt("/opencode-test-orch");
const settings = settingsFromFile("settings.json", SETTINGS_FILE_SCHEMA.parse({
  schemaVersion: SETTINGS_SCHEMA,
  runtime: "node",
  timeouts: { server_ready_ms: 1_000, spawn_attach_poll_ms: 20 },
  servers: { idle_ms: 50, silence_ms: 2_000, reconnect_ms: 20, backfill_messages: 50 },
}));
const servers: FakeOpencode[] = [];
const sessions: HeldSession[] = [];
const owners: OpencodeServerOwner[] = [];

afterEach(async () => {
  for (const session of sessions.splice(0)) await session.close();
  for (const owner of owners.splice(0)) owner.shutdown();
  for (const server of servers.splice(0)) await server.close();
});

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
    onOutcome: (outcome) => record(`outcome:${outcome.id}:${JSON.stringify(outcome.applied ?? null)}:${outcome.error ?? ""}`),
    onError: (error) => record(`error:${error.message}`),
    onReset: (sessionId) => record(`reset:${sessionId}`),
  };
  return { log, events, seen };
}

function delivery(id: string, message: BridgeMessage): BridgeDelivery {
  return { id, message };
}

const LUNA = { providerID: "openai", id: "gpt-luna", modelID: "gpt-luna", name: "Luna", variants: [{ id: "none" }, { id: "high" }] };

async function setup(models: readonly Record<string, unknown>[] = [LUNA]) {
  const owner = new OpencodeServerOwner();
  owners.push(owner);
  const fake = await fakeOpencode(owner.clientEnv.OPENCODE_PASSWORD ?? "", models);
  servers.push(fake);
  const pipes = servingPipes(fake.url);
  const { logger, records } = recordingLogger();
  const context = { pipes, settings, logger };
  const driver = opencodeDriver(owner);
  return { owner, fake, pipes, records, context, driver };
}

async function openOn(models: readonly Record<string, unknown>[] = [LUNA], opts: { model?: string; thinking?: "off" | "high" | "minimal" } = {}) {
  const setupResult = await setup(models);
  const { driver, context } = setupResult;
  const connection = await driver.connect({ form: "server", orchDir, cwd, ...opts }, { ORCH_AGENT: "a1" }, context);
  const rec = recorder();
  const session = await connection.open({ kind: "new", cwd }, rec.events);
  sessions.push(session);
  return { ...setupResult, connection, rec, session };
}

async function rejection(pending: Promise<unknown>): Promise<string> {
  return await pending.then(() => { throw new Error("expected a rejection"); }, (error: unknown) => error instanceof Error ? error.message : String(error));
}

const posts = (fake: FakeOpencode, suffix: string) => fake.calls.filter((call) => call.method === "POST" && call.path.endsWith(suffix));

describe("opencode server form", () => {
  test("the server is opencode serve --stdio on a loopback port, started with the owner's password", async () => {
    const { owner, pipes, driver, context } = await setup();
    await driver.connect({ form: "server", orchDir, cwd }, { ORCH_AGENT: "a1" }, context);
    expect(pipes.spawned[0]?.request.argv).toEqual(["opencode", "serve", "--stdio", "--hostname=127.0.0.1", "--port=0"]);
    expect(pipes.spawned[0]?.request.env.OPENCODE_PASSWORD).toBe(owner.clientEnv.OPENCODE_PASSWORD);
    expect(owner.clientEnv.OPENCODE_PASSWORD).toMatch(/^[\w-]{40,}$/);
    expect(pipes.spawned[0]?.request.env.OPENCODE_SERVER_PASSWORD).toBeUndefined();
  });

  test("every agent borrows the one server", async () => {
    const { pipes, driver, context } = await setup();
    const first = await driver.connect({ form: "server", orchDir, cwd }, { ORCH_AGENT: "a1" }, context);
    const second = await driver.connect({ form: "server", orchDir, cwd }, { ORCH_AGENT: "a2" }, context);
    expect(pipes.spawned).toHaveLength(1);
    expect(first.process.pid).toBe(second.process.pid);
    expect(first.process.shared).toBe(true);
    expect(second.process.shared).toBe(true);
  });

  test("the server closes once the last agent has been gone for the idle wait, and the next borrow starts a fresh one", async () => {
    const { pipes, driver, context } = await setup();
    const first = await driver.connect({ form: "server", orchDir, cwd }, {}, context);
    const second = await driver.connect({ form: "server", orchDir, cwd }, {}, context);
    first.process.release();
    second.process.release();
    await sleep(120);
    expect(pipes.spawned[0]?.process.killed()).toBe(true);
    await driver.connect({ form: "server", orchDir, cwd }, {}, context);
    expect(pipes.spawned).toHaveLength(2);
  });

  test("a borrow inside the idle wait keeps the server", async () => {
    const { pipes, driver, context } = await setup();
    const first = await driver.connect({ form: "server", orchDir, cwd }, {}, context);
    first.process.release();
    await driver.connect({ form: "server", orchDir, cwd }, {}, context);
    await sleep(120);
    expect(pipes.spawned[0]?.process.killed()).toBe(false);
    expect(pipes.spawned).toHaveLength(1);
  });

  test("a new session is created in the agent's directory on the launch model, with the thinking level as its variant", async () => {
    const { fake, session } = await openOn([LUNA], { model: "openai/gpt-luna", thinking: "high" });
    expect(session.sessionId).toBe("ses_1");
    expect(posts(fake, "/api/session")).toEqual([{ method: "POST", path: "/api/session", query: "", body: { location: { directory: cwd }, model: { providerID: "openai", id: "gpt-luna", variant: "high" } } }]);
  });

  test("the session gets the agent's variables", async () => {
    const { fake } = await openOn();
    expect(fake.calls).toContainEqual({ method: "PUT", path: "/api/session/ses_1/environment", query: "", body: { variables: { ORCH_AGENT: "a1" } } });
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

  test("a dispatch is queued as a prompt, and the turn runs from execution started to succeeded with the last message's text", async () => {
    const { fake, rec, session } = await openOn();
    session.link.push(delivery("d1", { action: "dispatch", text: "do it" }));
    await rec.seen("applied:d1");
    expect(posts(fake, "/prompt")).toEqual([{ method: "POST", path: "/api/session/ses_1/prompt", query: "", body: { text: "do it", delivery: "queue" } }]);
    fake.send("session.execution.started", { sessionID: "ses_1" });
    fake.send("session.tool.input.started", { sessionID: "ses_1", assistantMessageID: "m1", id: "t1", name: "shell" });
    fake.send("session.tool.called", { sessionID: "ses_1", assistantMessageID: "m1", id: "t1", input: { command: "ls" } });
    fake.send("session.tool.success", { sessionID: "ses_1", assistantMessageID: "m1", id: "t1", content: [{ type: "text", text: "a b" }] });
    fake.send("session.text.ended", { sessionID: "ses_1", assistantMessageID: "m2", ordinal: 0, text: "done it" });
    fake.send("session.execution.succeeded", { sessionID: "ses_1" });
    await rec.seen("ended:done::done it");
    expect(rec.log).toEqual(["entry:user:do it", "applied:d1", "started:d1", "entry:assistant:shell(ls)", "entry:tool:a b", "entry:assistant:done it", "ended:done::done it"]);
  });

  test("a steer is sent with steer delivery", async () => {
    const { fake, rec, session } = await openOn();
    session.link.push(delivery("s1", { action: "steer", text: "also this" }));
    await rec.seen("applied:s1");
    expect(posts(fake, "/prompt")[0]?.body).toEqual({ text: "also this", delivery: "steer" });
  });

  test("a failed execution ends the turn in error with opencode's message", async () => {
    const { fake, rec } = await openOn();
    fake.send("session.execution.started", { sessionID: "ses_1" });
    fake.send("session.execution.failed", { sessionID: "ses_1", error: { type: "provider.quota", message: "Payment Required" } });
    await rec.seen("ended:error:Payment Required:");
  });

  test("events of another session are ignored", async () => {
    const { fake, rec } = await openOn();
    fake.send("session.execution.started", { sessionID: "ses_other" });
    fake.send("session.execution.started", { sessionID: "ses_1" });
    await rec.seen("started:");
    expect(rec.log).toEqual(["started:"]);
  });

  test("a permission ask is a question with opencode's replies, and an answer replies to it", async () => {
    const { fake, rec, session } = await openOn();
    fake.send("session.execution.started", { sessionID: "ses_1" });
    fake.send("permission.asked", { id: "per_1", sessionID: "ses_1", action: "shell", resources: ["rm -rf build"] });
    await rec.seen("ask:per_1:shell: rm -rf build:once|always|reject");
    session.link.push(delivery("a1", { action: "answer", text: "", questionId: "q1", optionId: "once" }));
    await rec.seen("settled");
    expect(posts(fake, "/reply")).toEqual([{ method: "POST", path: "/api/session/ses_1/permission/per_1/reply", query: "", body: { decision: "once" } }]);
    expect(rec.log).toContain("applied:a1");
  });

  test("abort interrupts the session and the interrupted execution ends the turn aborted, dropping open asks", async () => {
    const { fake, rec, session } = await openOn();
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
    session.link.push(delivery("d1", { action: "dispatch", text: "do it" }));
    await rec.seen("applied:d1");
    if (session.link.reset === null) throw new Error("the opencode link offers reset");
    await session.link.reset();
    expect(rec.log).toEqual(["entry:user:do it", "applied:d1", "reset:ses_2"]);
    expect(session.sessionId).toBe("ses_2");
    expect(posts(fake, "/api/session").map((call) => call.body)).toEqual([
      { location: { directory: cwd }, model: { providerID: "openai", id: "gpt-luna" } },
      { location: { directory: cwd }, model: { providerID: "openai", id: "gpt-luna" } },
    ]);
    fake.send("session.execution.started", { sessionID: "ses_1" });
    fake.send("session.execution.started", { sessionID: "ses_2" });
    await rec.seen("started:");
    expect(rec.log).toEqual(["entry:user:do it", "applied:d1", "reset:ses_2", "started:"]);
  });

  test("a reset of an unused session keeps it", async () => {
    const { fake, rec, session } = await openOn();
    if (session.link.reset === null) throw new Error("the opencode link offers reset");
    await session.link.reset();
    expect(rec.log).toEqual(["reset:ses_1"]);
    expect(session.sessionId).toBe("ses_1");
    expect(posts(fake, "/api/session")).toHaveLength(1);
  });

  test("a reset during a turn is refused", async () => {
    const { fake, rec, session } = await openOn();
    fake.send("session.execution.started", { sessionID: "ses_1" });
    await rec.seen("started:");
    if (session.link.reset === null) throw new Error("the opencode link offers reset");
    expect(await rejection(session.link.reset())).toContain("a turn is running");
  });

  test("a model push switches the model and reports the outcome", async () => {
    const { fake, rec, session } = await openOn();
    session.link.push(delivery("m1", { action: "model", model: "openai/gpt-luna:high" }));
    await rec.seen('outcome:m1:{"model":"openai/gpt-luna","thinking":"high"}:');
    expect(rec.log).toContain("applied:m1");
    expect(posts(fake, "/model")).toEqual([{ method: "POST", path: "/api/session/ses_1/model", query: "", body: { model: { providerID: "openai", id: "gpt-luna", variant: "high" } } }]);
  });

  test("reopening a recorded session reads it and switches it to the launch model and environment", async () => {
    const { driver, context, fake } = await setup();
    const connection = await driver.connect({ form: "server", orchDir, cwd, model: "openai/gpt-luna" }, { ORCH_AGENT: "a1" }, context);
    const session = await connection.open({ kind: "existing", cwd, sessionId: "ses_9" }, recorder().events);
    sessions.push(session);
    expect(session.sessionId).toBe("ses_9");
    expect(fake.calls.filter((call) => call.path.startsWith("/api/session")).map((call) => `${call.method} ${call.path}`)).toEqual(["GET /api/session/ses_9", "POST /api/session/ses_9/model", "PUT /api/session/ses_9/environment"]);
  });

  test("a turn that ended while the stream was down is caught up from the session's messages", async () => {
    const { fake, rec, session } = await openOn();
    session.link.push(delivery("d1", { action: "dispatch", text: "do it" }));
    await rec.seen("applied:d1");
    fake.send("session.execution.started", { sessionID: "ses_1" });
    await rec.seen("started:d1");
    fake.messages = [
      { id: "msg_9", type: "idle", outcome: "succeeded" },
      { id: "msg_8", type: "assistant", content: [{ type: "text", text: "all done" }] },
      { id: "msg_1", type: "user", text: "do it" },
    ];
    fake.active = {};
    fake.dropStreams();
    await rec.seen("ended:done::all done");
    expect(fake.streamsOpened()).toBeGreaterThanOrEqual(2);
    expect(fake.calls).toContainEqual({ method: "GET", path: "/api/session/ses_1/message", query: "order=desc&limit=50", body: undefined });
  });

  test("a turn that started while the stream was down is caught up as running", async () => {
    const { fake, rec, session } = await openOn();
    session.link.push(delivery("d1", { action: "dispatch", text: "do it" }));
    await rec.seen("applied:d1");
    fake.active = { ses_1: {} };
    fake.messages = [{ id: "msg_1", type: "user", text: "do it" }];
    fake.dropStreams();
    await rec.seen("started:d1");
  });

  test("permission asks are caught up after a gap", async () => {
    const { fake, rec } = await openOn();
    fake.permissions = [{ id: "per_7", sessionID: "ses_1", action: "shell", resources: ["ls"] }];
    fake.dropStreams();
    await rec.seen("ask:per_7:shell: ls:once|always|reject");
    fake.permissions = [];
    fake.dropStreams();
    await rec.seen("dropped:q1");
  });

  test("a server that exits ends the running turn in error", async () => {
    const { pipes, fake, rec, session } = await openOn();
    session.link.push(delivery("d1", { action: "dispatch", text: "do it" }));
    await rec.seen("applied:d1");
    fake.send("session.execution.started", { sessionID: "ses_1" });
    await rec.seen("started:d1");
    const spawned = pipes.spawned[0];
    if (spawned === undefined) throw new Error("the server was spawned");
    spawned.process.exit();
    await rec.seen("ended:error:the opencode server exited:");
  });

  test("a server that never announces its url fails the borrow within the wait", async () => {
    const owner = new OpencodeServerOwner();
    owners.push(owner);
    const driver = opencodeDriver(owner);
    const pipes: PipesProvider = { spawn: () => servingProcess("booting\n") };
    const { logger } = recordingLogger();
    expect(await rejection(driver.connect({ form: "server", orchDir, cwd }, { ORCH_AGENT: "a1" }, { pipes, logger, settings }))).toContain("did not say it is listening within 1000 ms");
  });
});
