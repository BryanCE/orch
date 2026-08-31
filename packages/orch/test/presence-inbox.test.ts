import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { appendInbox, drainInbox } from "../src/presence/inbox.ts";
import { appendAck, drainClaimedLines } from "../src/presence/inbox.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { presenceAgentDir, writeStatus } from "../src/presence/writer.ts";
import { answerViaFile, steerViaInbox } from "../src/adapters/pi.ts";

const dirs: string[] = [];
const originalOrchDir = process.env.ORCH_DIR;
function temp(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-presence-inbox-"));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
});

describe("shared presence line writers", () => {
  test("inbox and ack drains use the same claimed rename path", () => {
    const dir = temp();
    fs.mkdirSync(dir, { recursive: true });
    appendInbox(dir, { text: "inbox" });
    expect(drainInbox(dir)).toEqual(['{"text":"inbox"}', ""]);
    appendAck(dir, "id", "key");
    const acks = drainClaimedLines(path.join(dir, "ack.jsonl"));
    expect(acks).toHaveLength(2);
    expect(acks[0]).toContain('"id":"id"');
    expect(acks[1]).toBe("");
    expect(fs.readdirSync(dir).some((name) => name.endsWith(".draining"))).toBe(false);
  });

  test("pi appends and answers through shared presence writers", () => {
    const root = temp();
    process.env.ORCH_DIR = root;
    const key = "pitestagt1";
    const dir = presenceAgentDir(key, root);
    fs.mkdirSync(dir, { recursive: true });
    steerViaInbox({ key, id: "s1", text: "hello" });
    expect(JSON.parse(fs.readFileSync(path.join(dir, "inbox.jsonl"), "utf8"))).toMatchObject({ id: "s1", text: "hello" });
    answerViaFile({ key, text: "answer" });
    expect(JSON.parse(fs.readFileSync(path.join(dir, "answer.json"), "utf8"))).toMatchObject({ text: "answer" });
  });

  test("wrong status schema is rejected by shared status reader", () => {
    const root = temp();
    const dir = presenceAgentDir("bad", root);
    fs.mkdirSync(dir, { recursive: true });
    writeStatus(dir, { schema: PRESENCE_SCHEMA + 1, pid: process.pid });
    expect(fs.readFileSync(path.join(dir, "status.json"), "utf8")).toContain(String(PRESENCE_SCHEMA + 1));
  });
});
