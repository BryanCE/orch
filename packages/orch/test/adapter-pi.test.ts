import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const originalOrchDir = process.env.ORCH_DIR;
const orchDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-adapter-pi-"));

const { PiAdapter, parsePiModelsOutput } = await import("../src/adapters/pi.ts");
const { presenceDir } = await import("../src/presence/store.ts");
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
  fixtureKeys.add(key);
  seedStatus(orchDir, key, { state, pid: process.pid });
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
  removeTempDir(orchDir);
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
    // Nullness IS the capability: pi composes every role.
    expect(adapter.inboxSteering).not.toBeNull();
    expect(adapter.question).not.toBeNull();
    expect(adapter.modelControl).not.toBeNull();
    expect(adapter.sessionView).not.toBeNull();
    expect(adapter.presenceRegistration).not.toBeNull();
    expect(adapter.lifecycleControl).not.toBeNull();
  });

  test("restricted workers explicitly load the bundled pi extension", () => {
    const command = adapter.restrictedInteractiveCmd({});
    expect(command).toContain("--no-extensions");
    expect(command).toMatch(/-e .*pi-bridge\.js/);
  });

  test("declares its lifecycle slash-commands", () => {
    expect(adapter.lifecycleCmd("reset")).toEqual({ text: "/new" });
    expect(adapter.lifecycleCmd("reload")).toEqual({ text: "/reload" });
    expect(adapter.lifecycleCmd("restart")).toEqual({ text: "/quit" });
  });

  test("reads state from the presence status through store helpers", () => {
    writeStatus("pistate001", "working");

    expect(adapter.detectState({ key: "pistate001" })).toBe("working");
    expect(adapter.detectState({ key: "missingag1" })).toBe("unknown");
  });

  test("appends a steer message to the presence inbox", () => {
    writeStatus("pisteer001", "working");

    adapter.steer({ key: "pisteer001", text: "run the tests" });

    const lines = fs.readFileSync(path.join(storePresenceDir(), "pisteer001", "inbox.jsonl"), "utf8").trim().split("\n");
    expect(JSON.parse(lines[0]!)).toMatchObject({ text: "run the tests" });
  });

  test("writes a blocking answer to the presence answer file", () => {
    writeStatus("pianswer01", "blocked");

    adapter.answer({ key: "pianswer01", text: "yes" });

    expect(JSON.parse(fs.readFileSync(path.join(storePresenceDir(), "pianswer01", "answer.json"), "utf8"))).toMatchObject({ text: "yes" });
  });

  test("reads result.json and falls back to the last assistant session text", () => {
    writeStatus("piresult01", "done");
    fs.writeFileSync(presencePath("piresult01", "result.json"), JSON.stringify({ text: "from result" }));
    expect(adapter.extractResult({ key: "piresult01" })).toBe("from result");

    const sessionPath = path.join(orchDir, "session.jsonl");
    fs.writeFileSync(sessionPath, JSON.stringify({
      type: "message",
      message: { role: "assistant", content: [{ type: "text", text: "from session" }] },
    }) + "\n");
    expect(adapter.extractResult({ key: "missingag1", sessionPath })).toBe("from session");
  });
  test("parses pi's supported model table without importing harness internals", () => {
    const output = [
      "provider      model                         context  max-out  thinking  images",
      "anthropic     claude-sonnet-4-6             1M       128K     yes       yes",
      "openai-codex  gpt-5.6-luna                  372K     128K     yes       yes",
      "No models available",
    ].join("\n");

    expect(parsePiModelsOutput(output)).toEqual([
      { spec: "anthropic/claude-sonnet-4-6" },
      { spec: "openai-codex/gpt-5.6-luna" },
    ]);
    expect(parsePiModelsOutput("No models available")).toEqual([]);
  });
});

