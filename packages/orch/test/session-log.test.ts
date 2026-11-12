import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readAgent } from "../src/agent/read.ts";
import { appendSessionEntries, parseSessionLog } from "../src/agent/session-log.ts";
import { hostIdentity } from "../src/hosts/identity.ts";
import { recordAgentStatus } from "../src/presence/store.ts";
import { placeHere } from "../src/process-place.ts";
import { mintAgentId } from "../src/shared/agent-id.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { setForm } from "../src/store/interval-rows.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import type { SessionViewEntry } from "../src/types/adapter.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { FormId } from "../src/types/form.ts";
import type { SpawnRegistration } from "../src/types/store.ts";
import { recordingLogger } from "./helpers/logger.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const dirs: OrchDir[] = [];
afterEach(() => {
  closeAllStores();
  for (const dir of dirs.splice(0)) removeTempDir(dir);
});

function sessionPath(): string {
  const dir = tempOrchDir("orch-session-log-");
  dirs.push(dir);
  return join(dir, "transcript", "session.jsonl");
}

const entries: SessionViewEntry[] = [
  { role: "user", text: "inspect the files", timestamp: "2026-07-20T10:00:00Z" },
  { role: "assistant", toolCalls: [{ name: "read", arg: "src/index.ts" }] },
  { role: "assistant", text: "files inspected" },
];

describe("orchd session logs", () => {
  test("appends entries across calls and parses them in order", () => {
    const path = sessionPath();
    appendSessionEntries(path, entries.slice(0, 1));
    appendSessionEntries(path, entries.slice(1));
    expect(parseSessionLog(readFileSync(path, "utf8"))).toEqual(entries);
  });

  test("reports the line number of malformed JSON and malformed entries", () => {
    for (const invalid of ["{", "null", '{"role":"other"}', '{"role":"tool","isError":"yes"}', '{"role":"assistant","toolCalls":[{"name":"read"}]}']) {
      expect(() => parseSessionLog(`${JSON.stringify(entries[0])}\n${invalid}\n`)).toThrow("line 2");
    }
  });

  test("accepts every entry field, an empty log and a final line without a newline", () => {
    const tool: SessionViewEntry = { role: "tool", tool: "read", text: "missing", isError: true, timestamp: "2026-07-20T10:00:01Z" };
    expect(parseSessionLog(JSON.stringify(tool))).toEqual([tool]);
    expect(parseSessionLog("")).toEqual([]);
    expect(() => parseSessionLog(`${JSON.stringify(tool)}\n\n`)).toThrow("line 2");
  });

  test("readAgent reads an orchd transcript for a recorded form", () => {
    const orchDir = tempOrchDir("orch-session-reader-");
    dirs.push(orchDir);
    const key = mintAgentId();
    const registration: SpawnRegistration & { readonly form: FormId } = {
      key, harnessId: "pi", placed: false, cwd: orchDir, name: "reader", model: "test", spawner: null,
      form: "acp",
      process: { host: hostIdentity().id, pid: process.pid, startToken: `session-log-${key}` },
    };
    registerSpawnedAgent(orchDir, registration);
    setForm(orchDir, key, Date.now(), registration.form);
    const agent = placeHere(orchDir, key);
    const path = join(orchDir, "transcript", "session.jsonl");
    appendSessionEntries(path, entries);
    recordAgentStatus(orchDir, agent, { state: "done", sessionPath: path }, Date.now());
    const reader = { orchDir, logger: recordingLogger().logger, held: () => ({ has: () => false, text: () => "" }) };

    expect(readAgent(reader, agent, { kind: "session" })).toMatchObject({
      kind: "session", lookup: { kind: "found", sessionPath: path, view: { entries } },
    });
    expect(readAgent(reader, agent, { kind: "tail", lines: entries.length })).toMatchObject({
      kind: "tail", lookup: { kind: "found", sessionPath: path, view: { entries } },
    });
    expect(readAgent(reader, agent, { kind: "tail", lines: 1 })).toMatchObject({
      kind: "tail", lookup: { kind: "found", view: { entries: entries.slice(-1) } },
    });
    expect(readAgent(reader, agent, { kind: "result" })).toMatchObject({
      kind: "result", lookup: { kind: "found", source: "session", payload: { text: "files inspected", task: "inspect the files" } },
    });
  });
});
