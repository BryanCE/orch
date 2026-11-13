import { afterEach, describe, expect, test } from "bun:test";
import { opencodeDriver } from "../src/adapters/opencode-driver.ts";
import { OpencodeServerOwner } from "../src/adapters/opencode-server.ts";
import { orchDirAt } from "../src/orch-dir.ts";
import { settingsFromFile } from "../src/settings/read.ts";
import { SETTINGS_FILE_SCHEMA, SETTINGS_SCHEMA } from "../src/settings/schema.ts";
import type { BridgeDelivery, BridgeMessage } from "../src/shared/bridge-message.ts";
import type { HeldSession, SessionAsk, SessionLinkEvents, TerminalControl } from "../src/types/held-session.ts";
import { fakeOpencode, servingPipes, type FakeOpencode } from "./helpers/fake-opencode.ts";
import { recordingLogger } from "./helpers/logger.ts";

const cwd = "/opencode-test";
const orchDir = orchDirAt("/opencode-test-orch");
const settings = settingsFromFile("settings.json", SETTINGS_FILE_SCHEMA.parse({
  schemaVersion: SETTINGS_SCHEMA,
  runtime: "node",
  timeouts: { server_ready_ms: 1_000, spawn_attach_poll_ms: 20 },
  servers: { idle_ms: 50, silence_ms: 2_000, reconnect_ms: 20, backfill_messages: 50 },
}));
const owners: OpencodeServerOwner[] = [];
const fakes: FakeOpencode[] = [];
const sessions: HeldSession[] = [];

afterEach(async () => {
  for (const session of sessions.splice(0)) await session.close();
  for (const owner of owners.splice(0)) owner.shutdown();
  for (const fake of fakes.splice(0)) await fake.close();
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

async function rejection(pending: Promise<unknown>): Promise<string> {
  return await pending.then(() => { throw new Error("expected a rejection"); }, (error: unknown) => error instanceof Error ? error.message : String(error));
}

const posts = (fake: FakeOpencode, suffix: string) => fake.calls.filter((call) => call.method === "POST" && call.path.endsWith(suffix));

async function setup() {
  const owner = new OpencodeServerOwner();
  owners.push(owner);
  const fake = await fakeOpencode(owner.clientEnv.OPENCODE_PASSWORD ?? "", [LUNA]);
  fakes.push(fake);
  const pipes = servingPipes(fake.url);
  const { logger, records } = recordingLogger();
  const context = { pipes, settings, logger };
  const driver = opencodeDriver(owner);
  return { owner, fake, pipes, records, context, driver };
}

async function attach() {
  const setupResult = await setup();
  const role = setupResult.driver.terminal;
  if (role === null) throw new Error("opencode declares a terminal role");
  const attached = await role.attach(
    { form: "tui", orchDir, cwd, model: "openai/gpt-luna" },
    { ORCH_AGENT: "a1" },
    { kind: "new", cwd },
    setupResult.context,
  );
  return { ...setupResult, role, attached };
}

async function openAttached(terminal: TerminalControl) {
  const attachedResult = await attach();
  const rec = recorder();
  const session = await attachedResult.attached.open(rec.events, terminal);
  sessions.push(session);
  return { ...attachedResult, rec, session };
}

describe("opencode terminal form", () => {
  test("a terminal agent's session is opened first, and its terminal program attaches to it", async () => {
    const { attached, role, owner, fake } = await attach();
    expect(attached.sessionId).toBe("ses_1");
    expect(posts(fake, "/api/session")).toEqual([{
      method: "POST", path: "/api/session", query: "",
      body: { location: { directory: cwd }, model: { providerID: "openai", id: "gpt-luna" } },
    }]);
    expect(attached.argv).toEqual(["opencode", "--server", fake.url, "--session", "ses_1", cwd]);
    expect(attached.env).toEqual(owner.clientEnv);
    expect(role.clientEnv).toEqual(owner.clientEnv);
  });

  test("the attached session is driven like the server form", async () => {
    const relaunched: (readonly string[])[] = [];
    const { session, rec, fake } = await openAttached({ relaunch: (argv) => { relaunched.push(argv); return Promise.resolve(); } });
    session.link.push(delivery("d1", { action: "dispatch", text: "do it" }));
    await rec.seen("applied:d1");
    expect(posts(fake, "/prompt")).toEqual([{
      method: "POST", path: "/api/session/ses_1/prompt", query: "",
      body: { text: "do it", delivery: "queue" },
    }]);
    fake.send("session.execution.started", { sessionID: "ses_1" });
    await rec.seen("started:d1");
    fake.send("session.text.ended", { sessionID: "ses_1", assistantMessageID: "m1", ordinal: 0, text: "done it" });
    fake.send("session.execution.succeeded", { sessionID: "ses_1" });
    await rec.seen("ended:done::done it");
    expect(rec.log).toContain("entry:assistant:done it");
    expect(relaunched).toEqual([]);
  });

  test("a reset opens a fresh session and relaunches the terminal program on it", async () => {
    const relaunched: (readonly string[])[] = [];
    const { session, rec, fake } = await openAttached({ relaunch: (argv) => { relaunched.push(argv); return Promise.resolve(); } });
    if (session.link.reset === null) throw new Error("opencode supports reset");
    session.link.push(delivery("d1", { action: "dispatch", text: "do it" }));
    await rec.seen("applied:d1");
    await session.link.reset();
    expect(rec.log).toContain("reset:ses_2");
    expect(relaunched).toEqual([["opencode", "--server", fake.url, "--session", "ses_2", cwd]]);
    fake.send("session.execution.started", { sessionID: "ses_2" });
    await rec.seen("started:");
  });

  test("a relaunch that fails leaves the session as it was", async () => {
    const { session, rec, fake } = await openAttached({ relaunch: () => Promise.reject(new Error("pane gone")) });
    if (session.link.reset === null) throw new Error("opencode supports reset");
    session.link.push(delivery("d1", { action: "dispatch", text: "do it" }));
    await rec.seen("applied:d1");
    fake.send("session.execution.started", { sessionID: "ses_1" });
    await rec.seen("started:d1");
    fake.send("session.execution.succeeded", { sessionID: "ses_1" });
    await rec.seen("ended:done::");
    expect(await rejection(session.link.reset())).toContain("pane gone");
    expect(rec.log.some((line) => line.startsWith("reset:"))).toBe(false);
    fake.send("session.execution.started", { sessionID: "ses_1" });
    await rec.seen("started:");
    expect(session.sessionId).toBe("ses_1");
  });

  test("a reset of an unused session keeps it", async () => {
    const relaunched: (readonly string[])[] = [];
    const { session, rec, fake } = await openAttached({ relaunch: (argv) => { relaunched.push(argv); return Promise.resolve(); } });
    if (session.link.reset === null) throw new Error("opencode supports reset");
    await session.link.reset();
    expect(rec.log).toContain("reset:ses_1");
    expect(posts(fake, "/api/session")).toHaveLength(1);
    expect(relaunched).toEqual([]);
  });

  test("releasing a terminal agent hands the server back", async () => {
    const { attached, pipes } = await attach();
    attached.release();
    await new Promise<void>((resolve) => { setTimeout(resolve, 120); });
    expect(pipes.spawned).toHaveLength(1);
    expect(pipes.spawned[0]?.process.killed()).toBe(true);
  });

  test("doctor's probe starts a server, reads its version and closes it", async () => {
    const { driver, context, pipes } = await setup();
    expect(await driver.probe(context)).toEqual({ name: "opencode", version: "2.2.7" });
    await new Promise<void>((resolve) => { setTimeout(resolve, 120); });
    expect(pipes.spawned).toHaveLength(1);
    expect(pipes.spawned.at(-1)?.process.killed()).toBe(true);
  });
});
