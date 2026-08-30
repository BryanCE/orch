import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
// Imported FIRST of the orch modules on purpose, and for its evaluation order
// alone: every other import below enters the pre-existing
// runtime.ts -> adapters/registry.ts -> <adapter> -> config.ts -> runtime.ts
// cycle at runtime.ts, so config.ts's body then reads ORCH_RUNTIMES inside
// runtime.ts's own TDZ. Entering at the registry evaluates runtime.ts and
// config.ts as its dependencies instead, in an order that resolves.
import "../src/adapters/registry.ts";
import { editCodexNotifyConfig } from "../src/adapters/codex-notify.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import {
  CODEX_STATE_FALLBACK_MARKER,
  CODEX_TURN_COMPLETE,
  codexStateFallback,
} from "../src/adapters/codex-events.ts";
import { CodexAdapter, codexAdapter } from "../src/adapters/codex.ts";
import { mintAgentId, serializeIdentity } from "../src/backends/identity.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-adapter-codex-"));
const ENV = [
  "ORCH_AGENT_KEY", "ORCH_DIR", "ORCH_OWNER", "ORCH_SESSION_KEY", "ORCH_PROJECT",
  "ORCH_AGENT_NAME", "ORCH_SPAWNER", "ORCH_SPAWNER_LABEL",
] satisfies readonly string[];
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(ENV.map((name) => [name, process.env[name]]));
  // The parent is a plain test session. The one child that represents a
  // spawned Codex agent states its minted key in its explicit env object below.
  for (const name of ENV) delete process.env[name];
});

afterEach(() => {
  for (const name of ENV) {
    const value = saved[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

afterAll(() => {
  removeTempDir(tempDir);
});

describe("CodexAdapter", () => {
  test("uses the codex launch shapes and declares honest capabilities", () => {
    const adapter = new CodexAdapter();

    expect(codexAdapter.id).toBe("codex");
    expect(adapter.sessionView).not.toBeNull();
    expect(adapter.inboxSteering).toBeNull();
    expect(adapter.question).toBeNull();
    expect(adapter.modelControl).toBeNull();
    expect(adapter.presenceRegistration).toBeNull();
    expect(adapter.lifecycleControl).toBeNull();
    expect(adapter.stateFallback).toBe(true);
    expect(CODEX_STATE_FALLBACK_MARKER).toBe("stateFallback");

    expect(adapter.interactiveCmd({})).toBe("codex");
    expect(adapter.interactiveCmd({ model: "gpt-5" })).toBe("codex --model 'gpt-5'");
    expect(adapter.headlessCmd("fix tests", { model: "gpt-5" })).toEqual([
      "codex",
      "exec",
      "--json",
      "--model",
      "gpt-5",
      "fix tests",
    ]);
  });

  test("detects a completed notify turn and marks ambiguous output as fallback", () => {
    const adapter = new CodexAdapter();
    const notify = JSON.stringify({ type: CODEX_TURN_COMPLETE });

    expect(adapter.detectState({ output: notify, exitCode: 0 })).toBe("done");
    expect(codexStateFallback({ output: notify })).toBe(false);

    const ambiguous = "codex is processing your request";
    expect(adapter.detectState({ output: ambiguous })).toBe("working");
    expect(codexStateFallback({ output: ambiguous })).toBe(true);
    expect(adapter.stateFallback).toBe(true);
  });

  test("notify config editor preserves TOML, is idempotent, and refuses foreign hooks", () => {
    const argv = ["node", "/tmp/orch/dist/scripts/codex-notify.js"];
    const raw = `model = "gpt-5"\nnotify = []\n\n[profiles.default]\nmodel = "other"\n`;
    const inserted = editCodexNotifyConfig(raw, argv);
    expect(inserted.status).toBe("inserted");
    if (inserted.status !== "inserted") throw new Error("expected inserted notify config");
    expect(inserted.text).toBe(`model = "gpt-5"\nnotify = ["node","/tmp/orch/dist/scripts/codex-notify.js"]\n\n[profiles.default]\nmodel = "other"\n`);
    expect(editCodexNotifyConfig(inserted.text, argv)).toEqual({ status: "unchanged" });
    expect(editCodexNotifyConfig(inserted.text, ["node", "/tmp/other-codex-notify.js"])).toMatchObject({ status: "replaced" });

    const foreign = `model = "gpt-5"\nnotify = ["my-hook"]\n`;
    expect(editCodexNotifyConfig(foreign, argv)).toEqual({ status: "foreign", foreignValue: `["my-hook"]` });
    expect(editCodexNotifyConfig("model = \"unterminated\nnotify = [", argv).status).toBe("ambiguous");
    expect(editCodexNotifyConfig("notify = [\n", argv).status).toBe("ambiguous");
  });

  test("extracts layered result text from notify, output file, and assistant output", () => {
    const adapter = new CodexAdapter();
    expect(adapter.extractResult({
      output: JSON.stringify({ type: CODEX_TURN_COMPLETE, "last-assistant-message": "notify result" }),
    })).toBe("notify result");

    const outputPath = path.join(tempDir, "last-message.txt");
    fs.writeFileSync(outputPath, "output file result");
    expect(adapter.extractResult({ output: "not json", outputLastMessagePath: outputPath })).toBe("output file result");

    expect(adapter.extractResult({
      output: JSON.stringify({ item: { type: "agent_message", text: "assistant result" } }),
    })).toBe("assistant result");
  });

  test("reads a recorded Codex JSONL session tail and never guesses a path", () => {
    const adapter = new CodexAdapter();
    const sessionPath = path.join(tempDir, "codex-session.jsonl");
    fs.writeFileSync(sessionPath, [
      JSON.stringify({ type: "item", item: { type: "agent_message", text: "tail result" } }),
      JSON.stringify({ type: CODEX_TURN_COMPLETE }),
    ].join("\n"));
    expect(adapter.readSessionView({ sessionPath })).toEqual({ state: "idle", lastText: "tail result" });
    expect(adapter.readSessionView({})).toBeUndefined();
  });

  test("notify shim writes schema-current done presence and result atomically", () => {
    const orchDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-codex-notify-"));
    try {
      // The shim parses ORCH_AGENT_KEY through the one identity boundary, so the fixture
      // must be what a real spawn mints: the id alone. A `<plexer>~<space>~<name>` key is
      // environment welded into identity, which Rule 11 / TASKS/01-agent-model.md forbids.
      const key = serializeIdentity({ id: mintAgentId() });
      const payload = JSON.stringify({ type: CODEX_TURN_COMPLETE, "last-assistant-message": "finished" });
      const result = Bun.spawnSync([process.execPath, "extensions/codex/index.ts", payload], {
        cwd: path.join(import.meta.dir, ".."),
        env: { ...process.env, ORCH_DIR: orchDir, ORCH_AGENT_KEY: key },
      });
      expect(result.exitCode).toBe(0);
      const dir = path.join(orchDir, "agents", key);
      const status: Record<string, unknown> = JSON.parse(fs.readFileSync(path.join(dir, "status.json"), "utf8")) as Record<string, unknown>;
      const savedResult: Record<string, unknown> = JSON.parse(fs.readFileSync(path.join(dir, "result.json"), "utf8")) as Record<string, unknown>;
      expect(status).toMatchObject({ schema: PRESENCE_SCHEMA, state: "done", lastText: "finished" });
      expect(savedResult).toMatchObject({ schema: PRESENCE_SCHEMA, text: "finished" });
      expect(fs.readdirSync(dir).filter((name) => name.includes(".tmp-")).length).toBe(0);

      removeTempDir(orchDir);
      const silent = Bun.spawnSync([process.execPath, "extensions/codex/index.ts", payload], {
        cwd: path.join(import.meta.dir, ".."),
        env: { ...process.env, ORCH_DIR: orchDir, ORCH_AGENT_KEY: "" },
      });
      expect(silent.exitCode).toBe(0);
      expect(fs.existsSync(path.join(orchDir, "agents"))).toBe(false);
    } finally {
      removeTempDir(orchDir);
    }
  });
});
