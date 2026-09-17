import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  appendOutcome,
  appendStatusHistory,
  flushPresenceHistory,
  presenceAgentDir,
  reportHistoryFailures,
  writeResult,
} from "../src/presence/history.ts";
import { OUTCOMES_FILE, RESULTS_FILE, STATUS_LOG_FILE } from "../src/presence/schema.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

function historyRecords(file: string): unknown[] {
  return readFileSync(file, "utf8").trim().split("\n").map((line): unknown => JSON.parse(line));
}

describe("presence history queue", () => {
  test("appendStatusHistory writes only when flushed", () => {
    const root = tempOrchDir("orch-history-");
    const key = "history-agent-1";
    const record = { key, state: "idle", ts: 1 };
    try {
      appendStatusHistory(key, root, record);
      expect(existsSync(join(presenceAgentDir(key, root), STATUS_LOG_FILE))).toBe(false);
      flushPresenceHistory();
      expect(historyRecords(join(presenceAgentDir(key, root), STATUS_LOG_FILE))).toEqual([record]);
    } finally {
      removeTempDir(root);
    }
  });

  test("preserves call order for multiple appends", () => {
    const root = tempOrchDir("orch-history-");
    const key = "history-agent-2";
    const records = [
      { key, state: "idle", ts: 1 },
      { key, state: "working", ts: 2 },
      { key, state: "done", ts: 3 },
    ];
    try {
      for (const record of records) appendStatusHistory(key, root, record);
      flushPresenceHistory();
      expect(historyRecords(join(presenceAgentDir(key, root), STATUS_LOG_FILE))).toEqual(records);
    } finally {
      removeTempDir(root);
    }
  });

  test("writes results and outcomes in one flush", () => {
    const root = tempOrchDir("orch-history-");
    const key = "history-agent-3";
    const result = { key, text: "finished", ts: 1 };
    const outcome = { key, action: "model", ok: true, ts: 2 };
    try {
      writeResult(key, root, result);
      appendOutcome(key, root, outcome);
      flushPresenceHistory();
      expect(JSON.parse(readFileSync(join(presenceAgentDir(key, root), RESULTS_FILE), "utf8"))).toEqual(result);
      expect(JSON.parse(readFileSync(join(presenceAgentDir(key, root), OUTCOMES_FILE), "utf8"))).toEqual(outcome);
    } finally {
      removeTempDir(root);
    }
  });

  test("reports a failed append without throwing", () => {
    const root = tempOrchDir("orch-history-");
    const key = "history-agent-4";
    const errors: unknown[] = [];
    const record = { key, state: "idle", ts: 1 };
    try {
      mkdirSync(join(root, "agents"), { recursive: true });
      writeFileSync(presenceAgentDir(key, root), "not a directory");
      reportHistoryFailures((error) => errors.push(error));
      expect(() => {
        appendStatusHistory(key, root, record);
        flushPresenceHistory();
      }).not.toThrow();
      expect(errors).toHaveLength(1);
    } finally {
      reportHistoryFailures(() => undefined);
      removeTempDir(root);
    }
  });
});
