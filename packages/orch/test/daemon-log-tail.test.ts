import { describe, expect, test } from "bun:test";
import { appendFileSync } from "node:fs";
import { logFile } from "../src/log.ts";
import { lastDaemonEvent } from "../src/daemon/client/reach.ts";
import { tempOrchDir, removeTempDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";

describe("daemon log tail", () => {
  test("skips a CLI line after the daemon line", () => {
    const dir: OrchDir = tempOrchDir("orch-log-tail-");
    try {
      appendFileSync(logFile(dir), `${JSON.stringify({ proc: "orchd", pid: 1, at: 1, level: "error", event: "daemon.crashed" })}\n`);
      appendFileSync(logFile(dir), `${JSON.stringify({ proc: "cli", pid: 2, at: 2, level: "info", event: "cli.done" })}\n`);
      expect(lastDaemonEvent(dir)).toBe("daemon.crashed");
    } finally { removeTempDir(dir); }
  });

  test("a crash reads as its event and its message on one line", () => {
    const dir: OrchDir = tempOrchDir("orch-log-tail-");
    try {
      const fields = { kind: "unhandled rejection", message: "orch.db does not match orch's migrations (CREATE TABLE `a` (\n\t`id` text\n);). Rebuild it." };
      appendFileSync(logFile(dir), `${JSON.stringify({ proc: "orchd", pid: 1, at: 1, level: "error", event: "daemon.crashed", fields })}\n`);
      expect(lastDaemonEvent(dir)).toBe("daemon.crashed: orch.db does not match orch's migrations (CREATE TABLE `a` ( `id` text );). Rebuild it.");
    } finally { removeTempDir(dir); }
  });
});
