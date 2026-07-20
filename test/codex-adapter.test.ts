import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, describe, expect, test } from "bun:test";
import { editCodexNotifyConfig } from "../src/adapters/codex-notify.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import {
  CODEX_STATE_FALLBACK_MARKER,
  CODEX_TURN_COMPLETE,
  CodexAdapter,
  codexAdapter,
  codexStateFallback,
} from "../src/adapters/codex.ts";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-adapter-codex-"));

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("CodexAdapter", () => {
  test("uses the codex launch shapes and declares honest capabilities", () => {
    const adapter = new CodexAdapter();

    expect(codexAdapter.id).toBe("codex");
    expect(adapter.caps).toEqual({ steer: "resume", ask: false, setModel: false, sessionTail: true, enforcesCommandLocks: false, lifecycle: [] });
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
      const key = "headless~local~notify-test";
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

      fs.rmSync(orchDir, { recursive: true, force: true });
      const silent = Bun.spawnSync([process.execPath, "extensions/codex/index.ts", payload], {
        cwd: path.join(import.meta.dir, ".."),
        env: { ...process.env, ORCH_DIR: orchDir, ORCH_AGENT_KEY: "" },
      });
      expect(silent.exitCode).toBe(0);
      expect(fs.existsSync(path.join(orchDir, "agents"))).toBe(false);
    } finally {
      fs.rmSync(orchDir, { recursive: true, force: true });
    }
  });
});
