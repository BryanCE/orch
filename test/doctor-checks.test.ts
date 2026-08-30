import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { runDoctor } from "../src/doctor/runner.ts";
import { checkProvenanceDepth } from "../src/doctor/provenance-depth.ts";
import { checkUnclaimedAgents } from "../src/doctor/unclaimed-agents.ts";
import { claimAgent } from "../src/store/agent-rows.ts";
import { orm } from "../src/store/connection.ts";
import { sql } from "drizzle-orm";
import { checkNotifiers } from "../src/doctor/notify.ts";
import { PREREQUISITES } from "../src/adapters/prerequisites.ts";
import { loadConfig } from "../src/config.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { seedAgent } from "./helpers/agent.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { CheckResult } from "../src/types/doctor.ts";

const directories: string[] = [];

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-doctor-checks-"));
  directories.push(directory);
  return directory;
}

function notifyResult(results: CheckResult[]): CheckResult {
  const result = results.find((entry) => entry.id === "notify-sinks");
  if (!result) throw new Error("missing notify-sinks result");
  return result;
}

function notifierResult(results: CheckResult[]): CheckResult {
  const result = results.find((entry) => entry.id === "notifiers");
  if (!result) throw new Error("missing notifiers result");
  return result;
}

async function withPath<T>(value: string, action: () => Promise<T>): Promise<T> {
  const previous = process.env.PATH;
  process.env.PATH = value;
  try {
    return await action();
  } finally {
    if (previous === undefined) delete process.env.PATH;
    else process.env.PATH = previous;
  }
}

function writeConfig(directory: string, settings: Record<string, unknown>): void {
  writeSettingsFixture(directory, settings);
}

afterEach(() => {
  while (directories.length) removeTempDir(directories.pop()!);
});

describe("doctor provenance-depth checks", () => {
  test("finds a live agent deeper than fleet.max_depth", () => {
    const directory = tempDir();
    writeConfig(directory, { fleet: { max_depth: 1 } });
    seedAgent("root000001", { name: "root" }, directory);
    seedAgent("child00001", { name: "child", spawnedBy: "root000001" }, directory);
    seedAgent("deep000001", { name: "deep-worker", spawnedBy: "child00001" }, directory);

    const result = checkProvenanceDepth(directory);

    expect(result.status).toBe("warn");
    expect(result.detail).toContain("deep-worker (deep000001)");
    expect(result.detail).toContain("depth 2");
    expect(result.detail).toContain("fleet.max_depth (1)");
  });

  test("accepts a live agent at fleet.max_depth", () => {
    const directory = tempDir();
    writeConfig(directory, { fleet: { max_depth: 1 } });
    seedAgent("root000002", { name: "root" }, directory);
    seedAgent("child00002", { name: "child", spawnedBy: "root000002" }, directory);

    const result = checkProvenanceDepth(directory);

    expect(result).toMatchObject({
      id: "provenance-depth",
      label: "Provenance depth",
      status: "ok",
      detail: "no agents exceed fleet.max_depth",
    });
  });
});

describe("doctor unclaimed-agent checks", () => {
  test("finds an old unclaimed live agent with its age", () => {
    const directory = tempDir();
    const now = 600_000;
    writeConfig(directory, { doctor: { unclaimed_after_ms: 120_000 } });
    seedAgent("unclaim001", { name: "stuck-worker" }, directory);
    orm(directory).run(sql`UPDATE agents SET created_at = ${now - 180_000} WHERE id = ${"unclaim001"}`);

    const result = checkUnclaimedAgents(directory, now);

    expect(result).toMatchObject({ id: "unclaimed-agents", label: "Unclaimed agents", status: "warn" });
    expect(result.detail).toContain("stuck-worker (unclaim001)");
    expect(result.detail).toContain("3 min ago");
  });

  test("ignores a claimed agent", () => {
    const directory = tempDir();
    const now = 600_000;
    writeConfig(directory, { doctor: { unclaimed_after_ms: 120_000 } });
    seedAgent("claimed001", { name: "claimed-worker" }, directory);
    orm(directory).run(sql`UPDATE agents SET created_at = ${now - 180_000} WHERE id = ${"claimed001"}`);
    expect(claimAgent(directory, "claimed001", "session-token", now - 100_000)).toEqual({ kind: "stamped" });

    const result = checkUnclaimedAgents(directory, now);

    expect(result).toMatchObject({ status: "ok", detail: "no live agents remain unclaimed past doctor.unclaimed_after_ms" });
  });

  test("ignores a fresh unclaimed agent under the threshold", () => {
    const directory = tempDir();
    const now = 600_000;
    writeConfig(directory, { doctor: { unclaimed_after_ms: 120_000 } });
    seedAgent("fresh00001", { name: "fresh-worker" }, directory);
    orm(directory).run(sql`UPDATE agents SET created_at = ${now - 60_000} WHERE id = ${"fresh00001"}`);

    const result = checkUnclaimedAgents(directory, now);

    expect(result).toMatchObject({ status: "ok", detail: "no live agents remain unclaimed past doctor.unclaimed_after_ms" });
  });
});

describe("doctor notification-sink checks", () => {
  test("reports no sinks as healthy", async () => {
    const directory = tempDir();
    const result = await withPath(path.join(directory, "empty-path"), async () => notifyResult(await runDoctor(directory)));

    expect(result).toMatchObject({
      id: "notify-sinks",
      label: "Notification sinks",
      status: "ok",
      detail: "no notify sinks configured",
    });
  });

  test("rejects a webhook with a malformed URL", () => {
    const directory = tempDir();
    writeConfig(directory, { notify: [{ id: "webhook", url: "not a url" }] });

    expect(() => loadConfig(directory)).toThrow(/notify/);
  });

  test("uses the notify-send prerequisite install command in desktop remediation", async () => {
    const directory = tempDir();
    writeConfig(directory, { notify: [{ id: "desktop" }] });

    const result = await withPath(path.join(directory, "empty-path"), () => checkNotifiers(directory));
    const install = PREREQUISITES["notify-send"]!.install!;
    expect(result.status).toBe("fail");
    expect(result.detail).toContain(`fix: install notify-send (\`${install}\`)`);
  });

  test("warns for a command binary missing from PATH", async () => {
    const directory = tempDir();
    writeConfig(directory, { notify: [{ id: "command", command: ["missing-notify-command"] }] });

    const result = await withPath<CheckResult>(path.join(directory, "empty-path"), async (): Promise<CheckResult> => notifyResult(await runDoctor(directory)));
    expect(result.status).toBe("warn");
    expect(result.detail).toContain('command sink #1 binary "missing-notify-command" is not on PATH');
  });

  test("accepts a command binary present on the injected PATH", async () => {
    const directory = tempDir();
    const binDir = path.join(directory, "bin");
    fs.mkdirSync(binDir);
    // Windows resolves executables through PATHEXT, so the fixture needs a real
    // executable extension there; POSIX needs the execute bit instead.
    const bash = path.join(binDir, process.platform === "win32" ? "bash.exe" : "bash");
    fs.writeFileSync(bash, "#!/bin/sh\n");
    fs.chmodSync(bash, 0o755);
    writeConfig(directory, { notify: [{ id: "command", command: ["bash"] }] });

    const result = await withPath(binDir, async () => notifyResult(await runDoctor(directory)));
    expect(result).toMatchObject({ status: "ok", detail: "1 configured sink look deliverable" });
  });

  test("warns when a notifier omits done from its on list", async () => {
    const directory = tempDir();
    writeConfig(directory, { notify: [{ id: "command", command: [process.execPath], on: ["blocked", "error"] }] });

    const result = notifierResult(await runDoctor(directory));
    expect(result).toMatchObject({
      status: "warn",
      detail: 'command: effective "on" list omits "done"; fix: orch settings notify add command --on=blocked,error,done',
    });
  });

  test("does not warn when a notifier includes done in its on list", async () => {
    const directory = tempDir();
    writeConfig(directory, { notify: [{ id: "command", on: ["done"], command: [process.execPath] }] });

    expect(notifierResult(await runDoctor(directory))).toMatchObject({ status: "ok" });
  });

  test("keeps unavailable notifier failures when done is omitted", async () => {
    const directory = tempDir();
    const missingCommand = path.join(directory, "missing-notifier-command");
    writeConfig(directory, { notify: [{ id: "command", command: [missingCommand] }] });

    const result = notifierResult(await runDoctor(directory));
    expect(result.status).toBe("fail");
    expect(result.detail).toContain(`fix: install ${missingCommand}`);
  });
});
