import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { cmdSpace } from "../src/commands/space.ts";
import { helpTopic } from "../src/commands/help.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { isRecord } from "../src/util.ts";

const originalDir = process.env.ORCH_DIR;
const originalWrite = process.stdout.write.bind(process.stdout);
const dirs: string[] = [];

afterEach(() => {
  process.stdout.write = originalWrite;
  if (originalDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalDir;
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function headlessOutput(args: string[]): Record<string, unknown> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-space-command-"));
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  writeSettingsFixture(dir, { defaults: { adapter: "pi", backend: "headless" } });
  let output = "";
  process.stdout.write = (chunk: string | Uint8Array) => { output += chunk.toString(); return true; };
  cmdSpace([...args, "--json"]);
  const parsed: unknown = JSON.parse(output);
  if (!isRecord(parsed)) throw new Error("expected JSON object");
  return parsed;
}

describe("orch space", () => {
  test("list answers when the environment has no space-home role", () => {
    expect(headlessOutput(["list"])).toMatchObject({ outcome: "answer", reason: "no-environment-role" });
  });
  test("new answers when the environment has no space-home role", () => {
    expect(headlessOutput(["new", "Release"])).toMatchObject({ outcome: "answer", reason: "no-environment-role" });
  });
  test("rename answers when the environment has no space-home role", () => {
    expect(headlessOutput(["rename", "Release", "Ship"])).toMatchObject({ outcome: "answer", reason: "no-environment-role" });
  });
  test("close answers when the environment has no space-home role", () => {
    expect(headlessOutput(["close", "Release"])).toMatchObject({ outcome: "answer", reason: "no-environment-role" });
  });
  test("focus answers when the environment has no space-home role", () => {
    expect(headlessOutput(["focus", "Release"])).toMatchObject({ outcome: "answer", reason: "no-environment-role" });
  });
  test("headless boundary answers have exit code zero", () => {
    expect(headlessOutput(["focus", "Release"])).toMatchObject({ outcome: "answer", reason: "no-environment-role" });
    expect(process.exitCode ?? 0).toBe(0);
    process.exitCode = 0;
  });
  test("orch ws is gone", () => {
    expect(helpTopic("ws")).toBeNull();
  });
  test("space help and boundary output never say workspace", () => {
    const topic = helpTopic("space");
    expect(topic).not.toBeNull();
    expect(topic!.toLowerCase()).not.toContain("workspace");
    expect(JSON.stringify(headlessOutput(["list"])).toLowerCase()).not.toContain("workspace");
  });
});
