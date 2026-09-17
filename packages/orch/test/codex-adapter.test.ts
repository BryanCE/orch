import { recordingLogger } from "./helpers/logger.ts";
import * as fs from "node:fs";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
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
import { startRpcServer } from "../src/daemon/server/rpc.ts";
import { stubRpcHandlers } from "./helpers/rpc-handlers.ts";
import type { ParamsOf } from "../src/daemon/client/protocol.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import {
  CODEX_STATE_FALLBACK_MARKER,
  CODEX_TURN_COMPLETE,
  codexStateFallback,
} from "../src/adapters/codex-events.ts";
import { CodexAdapter, codexAdapter } from "../src/adapters/codex.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { removeTempDir, tempOrchDir } from "../test/helpers/tempdir.ts";
import { isolateOrchEnv, restoreOrchEnv } from "../test/helpers/env.ts";
import type { OrchDir } from "../src/types/core.ts";

type StatusReportParams = ParamsOf<"report-status">;
type ResultReportParams = ParamsOf<"report-result">;

interface ReportCapture {
  readonly statuses: StatusReportParams[];
  readonly results: ResultReportParams[];
  readonly server: RpcServer;
}

async function startReportServer(orchDir: OrchDir): Promise<ReportCapture> {
  const statuses: StatusReportParams[] = [];
  const results: ResultReportParams[] = [];
  const server = await startRpcServer(orchDir, stubRpcHandlers({
    "report-status": (params) => { statuses.push(params); return { ok: true }; },
    "report-result": (params) => { results.push(params); return { ok: true }; },
  }), { logger: recordingLogger().logger });
  return { statuses, results, server };
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-adapter-codex-"));
beforeEach(() => {
  isolateOrchEnv();
  // The parent is a plain test session. The one child that represents a
  // spawned Codex agent states its minted key in its explicit env object below.
});

afterEach(() => {
  restoreOrchEnv();
});

afterAll(() => {
  removeTempDir(tempDir);
});

describe("CodexAdapter", () => {
  test("uses the codex launch shapes and declares honest capabilities", () => {
    const adapter = new CodexAdapter();

    expect(codexAdapter.id).toBe("codex");
    expect(adapter.sessionView).not.toBeNull();
    expect(adapter.bridge).toBeNull();
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

  test("notify shim reports done presence and result over orchd", async () => {
    const orchDir: OrchDir = tempOrchDir("orch-codex-notify-");
    const capture = await startReportServer(orchDir);
    try {
      // The shim parses launch env through the one identity boundary, so the fixture
      // must be what a real spawn mints: the id alone. A `<plexer>~<space>~<name>` key is
      // environment welded into identity, which Rule 11 forbids.
      const key = mintAgentId();
      const payload = JSON.stringify({ type: CODEX_TURN_COMPLETE, "last-assistant-message": "finished" });
      const child = Bun.spawn([process.execPath, path.join(import.meta.dir, "..", "extensions", "codex", "index.ts"), payload], {
        cwd: path.join(import.meta.dir, ".."),
        env: { ...process.env, ORCH_DIR: orchDir, [LAUNCH_ENV]: key, ORCH_REPORT_TIMEOUT_MS: "2000" },
        stdout: "ignore",
        stderr: "ignore",
      });
      expect(await child.exited).toBe(0);
      expect(capture.statuses).toHaveLength(1);
      expect(capture.statuses[0]?.key).toBe(key);
      expect(capture.statuses[0]?.status).toMatchObject({ state: "done", lastText: "finished" });
      expect(capture.results).toHaveLength(1);
      expect(capture.results[0]?.key).toBe(key);
      expect(capture.results[0]?.result).toMatchObject({ text: "finished" });

      await capture.server.close();
      removeTempDir(orchDir);
      const silent = Bun.spawnSync([process.execPath, path.join(import.meta.dir, "..", "extensions", "codex", "index.ts"), payload], {
        cwd: path.join(import.meta.dir, ".."),
        env: { ...process.env, ORCH_DIR: orchDir, [LAUNCH_ENV]: "" },
      });
      expect(silent.exitCode).toBe(0);
      expect(fs.existsSync(path.join(orchDir, "agents"))).toBe(false);
    } finally {
      await capture.server.close();
      removeTempDir(orchDir);
    }
  });
});
