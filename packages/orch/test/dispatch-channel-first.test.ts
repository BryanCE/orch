import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { deliverControl } from "../src/control/dispatch.ts";
import { serializeIdentity } from "../src/backends/identity.ts";
import { seedStatus } from "./helpers/presence.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
const previousDir = process.env.ORCH_DIR;

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-channel-first-"));
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  writeSettingsFixture(dir, { defaults: { adapter: "pi", backend: "headless" } });
  return dir;
}

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (previousDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = previousDir;
});

// Delivery and read are ORCH's mechanism; a pane is an optimisation. inbox.jsonl
// -> bridge -> ack.jsonl needs no screen. A capless environment is one with no
// shortcut, NOT one orch cannot talk to.
//
// Answering `no-pane` to a DISPATCH is that rule inverted: it treats the missing
// optimisation as a missing capability and drops real work on the floor. Orch's own
// channel is tried FIRST, and the pane only ever as a shortcut.
describe("work reaches an agent through orch's channel, with the pane only a shortcut", () => {
  test("a headless agent receives a dispatch through the inbox, not a no-pane answer", async () => {
    const directory = tempDir();
    // A1: the target IS the minted id. A paneless agent has no plexer and no
    // space — missing rows, never a `headless~local~…` key inventing both.
    const target = serializeIdentity({ id: "detached01" });
    seedStatus(directory, target, { agent: "pi", pid: process.pid, state: "idle" });

    const outcome = await deliverControl(target, { kind: "run", text: "do the work", id: "dispatch-1" });

    expect(outcome).toEqual({ outcome: "invoke", ack: "expected" });
    const inbox = path.join(directory, "agents", target, "inbox.jsonl");
    expect(fs.existsSync(inbox)).toBe(true);
    expect(fs.readFileSync(inbox, "utf8")).toContain("do the work");
  });

  test("a steer reaches a paneless agent the same way", async () => {
    const directory = tempDir();
    const target = serializeIdentity({ id: "detached02" });
    seedStatus(directory, target, { agent: "pi", pid: process.pid, state: "working" });

    const outcome = await deliverControl(target, { kind: "steer", text: "adjust course", id: "steer-1" });

    // "expected" is what stops the outbox settling the row before the bridge
    // has read a thing; a pane shortcut would report "none" (L7).
    expect(outcome).toEqual({ outcome: "invoke", ack: "expected" });
    expect(fs.readFileSync(path.join(directory, "agents", target, "inbox.jsonl"), "utf8")).toContain("adjust course");
  });
});
