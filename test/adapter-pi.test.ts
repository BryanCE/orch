import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";

const originalOrchDir = process.env.ORCH_DIR;
const orchDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-adapter-pi-"));

const { PiAdapter } = await import("../src/adapters/pi.ts");
const { presenceDir } = await import("../src/store.ts");
const adapter = new PiAdapter();

function storePresenceDir(): string {
  return presenceDir();
}
const fixtureKeys = new Set<string>();

function presencePath(key: string, file: string): string {
  fixtureKeys.add(key);
  const directory = path.join(storePresenceDir(), key);
  fs.mkdirSync(directory, { recursive: true });
  return path.join(directory, file);
}

function writeStatus(key: string, state: string): void {
  fs.writeFileSync(presencePath(key, "status.json"), JSON.stringify({ state, pid: process.pid }));
}

function restoreOrchDir(): void {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
}

beforeEach(() => {
  process.env.ORCH_DIR = orchDir;
});

afterEach(() => {
  for (const key of fixtureKeys) {
    fs.rmSync(path.join(storePresenceDir(), key), { recursive: true, force: true });
  }
  fixtureKeys.clear();
  restoreOrchDir();
});

afterAll(() => {
  fs.rmSync(orchDir, { recursive: true, force: true });
  restoreOrchDir();
});

describe("PiAdapter", () => {
  test("uses pi interactively, pif headlessly, and declares honest capabilities", () => {
    expect(adapter.interactiveCmd({})).toBe("pi");
    expect(adapter.headlessCmd("fix tests", { model: "openai/gpt-5" })).toEqual([
      "pif",
      "--model",
      "openai/gpt-5",
      "fix tests",
    ]);
    expect(adapter.caps).toEqual({ steer: "inbox", ask: true, setModel: true, sessionTail: true, lifecycle: ["reset", "reload", "restart"] });
  });

  test("declares its lifecycle slash-commands", () => {
    expect(adapter.lifecycleCmd("reset")).toEqual({ text: "/new" });
    expect(adapter.lifecycleCmd("reload")).toEqual({ text: "/reload" });
    expect(adapter.lifecycleCmd("restart")).toEqual({ text: "/quit" });
  });

  test("reads state from the presence status through store helpers", () => {
    writeStatus("pi-state", "working");

    expect(adapter.detectState({ key: "pi-state" })).toBe("working");
    expect(adapter.detectState({ key: "missing" })).toBe("unknown");
  });

  test("appends a steer message to the presence inbox", () => {
    writeStatus("pi-steer", "working");

    adapter.steer({ key: "pi-steer", text: "run the tests" });

    const lines = fs.readFileSync(path.join(storePresenceDir(), "pi-steer", "inbox.jsonl"), "utf8").trim().split("\n");
    expect(JSON.parse(lines[0]!)).toMatchObject({ text: "run the tests" });
  });

  test("writes a blocking answer to the presence answer file", () => {
    writeStatus("pi-answer", "blocked");

    adapter.answer({ key: "pi-answer", text: "yes" });

    expect(JSON.parse(fs.readFileSync(path.join(storePresenceDir(), "pi-answer", "answer.json"), "utf8"))).toMatchObject({ text: "yes" });
  });

  test("reads result.json and falls back to the last assistant session text", () => {
    writeStatus("pi-result", "done");
    fs.writeFileSync(presencePath("pi-result", "result.json"), JSON.stringify({ text: "from result" }));
    expect(adapter.extractResult({ key: "pi-result" })).toBe("from result");

    const sessionPath = path.join(orchDir, "session.jsonl");
    fs.writeFileSync(sessionPath, JSON.stringify({
      type: "message",
      message: { role: "assistant", content: [{ type: "text", text: "from session" }] },
    }) + "\n");
    expect(adapter.extractResult({ key: "missing", sessionPath })).toBe("from session");
  });
});
