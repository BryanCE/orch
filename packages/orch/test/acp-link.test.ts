import { afterEach, describe, expect, test } from "bun:test";
import { methods } from "@agentclientprotocol/sdk";
import { openAcpLink, type AcpLink, type AcpLinkEvents } from "../src/acp/link.ts";
import type { AcpPermissionAsk } from "../src/acp/session.ts";
import type { BridgeDelivery, BridgeMessage } from "../src/shared/bridge-message.ts";
import {
  chunk,
  defaultFakeScript,
  fakeAcpAgent,
  permission,
  turn,
  type FakeAcpScript,
} from "./helpers/fake-acp-agent.ts";

const info = { name: "orch-test", version: "test" };
const cwd = "/acp-test";
const fakes: ReturnType<typeof fakeAcpAgent>[] = [];
const links: AcpLink[] = [];

function setup(overrides: Partial<FakeAcpScript> = {}) {
  const fake = fakeAcpAgent(defaultFakeScript(overrides));
  fakes.push(fake);
  return fake;
}

function delivery(id: string, message: BridgeMessage): BridgeDelivery {
  return { id, message };
}

/** Records every link event as one line, and lets a test wait for a line to appear. */
function recorder() {
  const log: string[] = [];
  let waiters: { line: string; resolve: () => void }[] = [];
  const record = (line: string) => {
    log.push(line);
    for (const waiter of waiters.filter((item) => item.line === line)) waiter.resolve();
    waiters = waiters.filter((item) => item.line !== line);
  };
  const seen = (line: string) => new Promise<void>((resolve) => {
    if (log.includes(line)) resolve();
    else waiters.push({ line, resolve });
  });
  const events: AcpLinkEvents = {
    onTurnStarted: (id) => record(`started:${id}`),
    onEntries: (entries) => record(`entries:${JSON.stringify(entries)}`),
    onTurnEnded: (outcome, text) => record(`ended:${outcome.state}:${text}`),
    onAsk: (ask: AcpPermissionAsk) => {
      record(`ask:${ask.toolCallId}`);
      return ask.toolCallId;
    },
    onAsksSettled: () => record("settled"),
    onAskDropped: (id) => record(`dropped:${id}`),
    onApplied: (id) => record(`applied:${id}`),
    onError: (error) => record(`error:${error.message}`),
  };
  return { log, events, seen };
}

async function open(fake: ReturnType<typeof fakeAcpAgent>, events: AcpLinkEvents): Promise<AcpLink> {
  const opened = await openAcpLink(fake.streams, { kind: "new", cwd }, info, events);
  links.push(opened);
  return opened;
}

afterEach(async () => {
  for (const opened of links.splice(0)) opened.link.close();
  for (const fake of fakes.splice(0)) {
    fake.connection.close();
    await fake.connection.closed;
  }
});

describe("ACP link", () => {
  test("a dispatch applies, starts the turn, emits entries, then ends with the last message", async () => {
    const fake = setup({ turns: [turn({ updates: [chunk("Hello"), chunk(" there")] })] });
    const rec = recorder();
    const { link } = await open(fake, rec.events);
    link.push(delivery("d1", { action: "dispatch", text: "hi" }));
    await rec.seen("ended:done:Hello there");
    expect(rec.log).toEqual([
      "applied:d1",
      "started:d1",
      `entries:${JSON.stringify([{ role: "assistant", text: "Hello there" }])}`,
      "ended:done:Hello there",
    ]);
  });

  test("a steer pushed mid-turn waits for the turn to end and is never a cancel", async () => {
    const fake = setup({
      turns: [
        turn({ updates: [chunk("one")], permissions: [permission("p1")] }),
        turn({ updates: [chunk("two")] }),
      ],
    });
    const rec = recorder();
    const { link } = await open(fake, rec.events);
    link.push(delivery("d1", { action: "dispatch", text: "first" }));
    await rec.seen("ask:p1");
    link.push(delivery("s1", { action: "steer", text: "second" }));
    expect(rec.log).not.toContain("applied:s1");
    expect(fake.received.filter((item) => item.method === methods.agent.session.prompt)).toHaveLength(1);
    link.push(delivery("a1", { action: "answer", text: "", questionId: "p1", optionId: "p1-once" }));
    await rec.seen("ended:done:two");
    expect(rec.log.indexOf("applied:s1")).toBeGreaterThan(rec.log.indexOf("ended:done:one"));
    expect(fake.received.filter((item) => item.method === methods.agent.session.prompt)).toHaveLength(2);
    expect(fake.received.some((item) => item.method === methods.agent.session.cancel)).toBe(false);
  });

  test("two asks answered in reverse each resolve their own option, and settle once after the second", async () => {
    const fake = setup({ turns: [turn({ permissions: [permission("p1"), permission("p2")] })] });
    const rec = recorder();
    const { link } = await open(fake, rec.events);
    link.push(delivery("d1", { action: "dispatch", text: "go" }));
    await rec.seen("ask:p1");
    await rec.seen("ask:p2");
    link.push(delivery("a2", { action: "answer", text: "", questionId: "p2", optionId: "p2-always" }));
    await rec.seen("applied:a2");
    expect(rec.log).not.toContain("settled");
    link.push(delivery("a1", { action: "answer", text: "", questionId: "p1", optionId: "p1-once" }));
    await rec.seen("settled");
    await rec.seen("ended:done:");
    expect(rec.log.filter((line) => line === "settled")).toHaveLength(1);
    expect(rec.log.indexOf("settled")).toBeGreaterThan(rec.log.indexOf("applied:a1"));
    expect(fake.permissions.map((item) => [item.toolCallId, item.response.outcome])).toEqual([
      ["p2", { outcome: "selected", optionId: "p2-always" }],
      ["p1", { outcome: "selected", optionId: "p1-once" }],
    ]);
  });

  test("abort with an ask open cancels the session, drops the ask, and ends the turn aborted", async () => {
    const fake = setup({
      turns: [turn({ permissions: [permission("p1")], waitForCancel: true, stopReason: "cancelled" })],
    });
    const rec = recorder();
    const { link } = await open(fake, rec.events);
    link.push(delivery("d1", { action: "dispatch", text: "go" }));
    await rec.seen("ask:p1");
    link.abort?.();
    await rec.seen("ended:aborted:");
    expect(rec.log).toContain("dropped:p1");
    expect(fake.received.some((item) => item.method === methods.agent.session.cancel)).toBe(true);
  });

  test("a model push on an agent with no model option is an error, applies nothing, and takes no model", async () => {
    const fake = setup({ configOptions: [] });
    const rec = recorder();
    const { link } = await open(fake, rec.events);
    expect(link.takes).not.toContain("model");
    link.push(delivery("m1", { action: "model", model: "next" }));
    await rec.seen("error:Agent does not offer a model config option");
    expect(rec.log).not.toContain("applied:m1");
  });

  test("an answer for an unknown question id is an error and applies nothing", async () => {
    const fake = setup();
    const rec = recorder();
    const { link } = await open(fake, rec.events);
    link.push(delivery("a1", { action: "answer", text: "", questionId: "nope", optionId: "x" }));
    await rec.seen("error:No selectable ACP ask for nope");
    expect(rec.log).not.toContain("applied:a1");
  });
});
