import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { computeCodeHash } from "../src/daemon/lifecycle.ts";
import { startRpcServer, type RpcServer } from "../src/daemon/rpc.ts";
import { applyFixes, runDoctor } from "../src/doctor/runner.ts";
import { checkExtensionStaleness } from "../src/doctor/extensions.ts";
import { isDrvFsPath } from "../src/doctor/config.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { seedStatusInDir } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const directories: string[] = [];
const servers: RpcServer[] = [];

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-doctor-"));
  directories.push(directory);
  return directory;
}

function check(results: Awaited<ReturnType<typeof runDoctor>>, id: string) {
  const result = results.find((entry) => entry.id === id);
  if (!result) throw new Error(`missing ${id} result`);
  return result;
}

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  while (directories.length) removeTempDir(directories.pop()!);
});

describe("runDoctor", () => {
  test("detects DrvFs paths by mount path segment", () => {
    expect(isDrvFsPath("/mnt/c/foo")).toBe(true);
    expect(isDrvFsPath("/home/bryan/.orch")).toBe(false);
    expect(isDrvFsPath("/mnt")).toBe(false);
    expect(isDrvFsPath("/mnturd/x")).toBe(false);
  });

  test("runs on an unconfigured install without failing for want of settings.json", async () => {
    // doctor is the command you run WHEN orch is broken, so an install that has never been set up
    // must still get a full report: absence of configuration is the answer for a check whose
    // subject is a configured section, never a defect.
    const results = await runDoctor(tempDir(), () => ({ ok: true, stdout: "", stderr: "", code: 0 }));

    for (const entry of results.filter((row) => row.status === "fail")) {
      expect(entry.detail).not.toContain("settings.json");
    }
    expect(check(results, "config")).toMatchObject({ status: "ok", detail: "no settings.json" });
    for (const id of ["spawn-limits", "command-locks", "notifiers", "notify-sinks", "remote-ssh", "remote-orch-version", "remote-orch-dir"]) {
      expect(check(results, id).status).not.toBe("fail");
    }
  });

  test("reports a normal ORCH_DIR on the Linux filesystem", async () => {
    const result = check(await runDoctor(tempDir()), "orchdir-location");
    expect(result.status).toBe("ok");
  });

  test("reports an absent daemon as optional", async () => {
    const result = check(await runDoctor(tempDir()), "orchd");
    expect(result.status).toBe("ok");
    expect(result.detail).toContain("absent");
  });

  test("reports and fixes a stale daemon lock", async () => {
    const directory = tempDir();
    const lockFile = path.join(directory, "orchd.lock");
    fs.writeFileSync(lockFile, JSON.stringify({ pid: 99999999, codeHash: "old", startedAt: "now" }));

    const result = check(await runDoctor(directory), "orchd-lock");
    expect(result.status).toBe("fail");
    expect(result.detail).toContain(lockFile);
    expect(result.fix).toBeDefined();
    expect(applyFixes([result]).applied[0]).toContain(lockFile);
    expect(fs.existsSync(lockFile)).toBe(false);
  });

  test("accepts a live daemon and an answerable socket", async () => {
    const directory = tempDir();
    const server = await startRpcServer(directory, { "daemon-status": () => ({ ok: true }) });
    servers.push(server);
    const entrypoint = path.join(import.meta.dir, "../src/daemon/orchd.ts");
    fs.writeFileSync(path.join(directory, "orchd.lock"), JSON.stringify({
      pid: process.pid,
      codeHash: computeCodeHash(entrypoint),
      startedAt: new Date().toISOString(),
    }));

    expect(check(await runDoctor(directory), "orchd")).toMatchObject({ status: "ok" });
    expect(check(await runDoctor(directory), "orchd-socket")).toMatchObject({ status: "ok" });
  });

  test("warns when the live daemon code hash is stale", async () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "orchd.lock"), JSON.stringify({
      pid: process.pid,
      codeHash: "old",
      startedAt: new Date().toISOString(),
    }));

    const result = check(await runDoctor(directory), "orchd-staleness");
    expect(result.status).toBe("warn");
    expect(result.detail).toContain("orch daemon reload");
  });

  test("fails on an invalid lock and an unanswerable live socket", async () => {
    const invalid = tempDir();
    const invalidLock = path.join(invalid, "orchd.lock");
    fs.writeFileSync(invalidLock, "not json");
    const invalidResult = check(await runDoctor(invalid), "orchd-lock");
    expect(invalidResult.status).toBe("fail");
    expect(invalidResult.detail).toContain(invalidLock);

    const unanswerable = tempDir();
    fs.writeFileSync(path.join(unanswerable, "orchd.lock"), JSON.stringify({
      pid: process.pid,
      codeHash: "old",
      startedAt: new Date().toISOString(),
    }));
    const socketResult = check(await runDoctor(unanswerable), "orchd-socket");
    expect(socketResult.status).toBe("fail");
    expect(socketResult.detail).toContain("orch daemon start");
  });

  test("warns when the extension bundle is absent for a matching live hash", async () => {
    const directory = tempDir();
    const agent = path.join(directory, "agents", "pane-1");
    fs.mkdirSync(agent, { recursive: true });
    seedStatusInDir(agent, {
      pid: process.pid,
      extensionHash: computeCodeHash(path.join(import.meta.dir, "../extensions/pi/index.ts")),
    });

    const result = await checkExtensionStaleness(directory, path.join(directory, "missing-bundle.js"));
    expect(result).toMatchObject({
      status: "warn",
      detail: "extension bundle not built; run: bun run build:ext",
    });
  });

  test("warns when the extension bundle is absent for a stale live hash", async () => {
    const directory = tempDir();
    const agent = path.join(directory, "agents", "pane-2");
    fs.mkdirSync(agent, { recursive: true });
    seedStatusInDir(agent, { pid: process.pid, extensionHash: "old" });

    const result = await checkExtensionStaleness(directory, path.join(directory, "missing-bundle.js"));
    expect(result).toMatchObject({
      status: "warn",
      detail: "extension bundle not built; run: bun run build:ext",
    });
  });

  test("warns when the extension bundle is absent for a live status without a hash", async () => {
    const directory = tempDir();
    const agent = path.join(directory, "agents", "pane-3");
    const broken = path.join(directory, "agents", "broken");
    fs.mkdirSync(agent, { recursive: true });
    fs.mkdirSync(broken, { recursive: true });
    seedStatusInDir(agent, { pid: process.pid });
    fs.writeFileSync(path.join(broken, "status.json"), "not json");

    const result = await checkExtensionStaleness(directory, path.join(directory, "missing-bundle.js"));
    expect(result).toMatchObject({
      status: "warn",
      detail: "extension bundle not built; run: bun run build:ext",
    });
  });

  test("reports a dead presence pid and corrupt spawn registry lines", async () => {
    const directory = tempDir();
    const agent = path.join(directory, "agents", "former-agent");
    fs.mkdirSync(agent, { recursive: true });
    seedStatusInDir(agent, { pid: 99999999 });
    fs.writeFileSync(path.join(directory, "spawned.jsonl"), "{\"pane\":\"w1:p1\"}\nnot json\n");

    const results = await runDoctor(directory);
    const stale = check(results, "stale-presence");

    expect(stale.status).toBe("warn");
    expect(stale.detail).toContain("former-agent");
    expect(stale.fix).toBeDefined();
    expect(applyFixes([stale])).toEqual({ applied: [stale.fix!.description] });
    expect(fs.existsSync(agent)).toBe(false);
    const registryResult = check(results, "spawned-registry");
    expect(registryResult.status).toBe("warn");
    expect(registryResult.detail).toContain("2");
  });

  test("bins check is driven by the installed set and offers no fix", async () => {
    const directory = tempDir();
    const previousPath = process.env.PATH;
    try {
      process.env.PATH = path.join(directory, "empty-bin");
      const bins = check(await runDoctor(directory), "bins");
      expect(bins).toMatchObject({ status: "ok", detail: "no adapters installed" });
      expect(bins.fix).toBeUndefined();
    } finally {
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
    }
  });

  test("applyFixes reports exactly the changes it applies", () => {
    const directory = tempDir();
    const first = path.join(directory, "first");
    const second = path.join(directory, "second");
    const results = [
      {
        id: "first",
        label: "first",
        status: "warn" as const,
        detail: "missing",
        fix: {
          description: "Create first fixture",
          apply() {
            fs.writeFileSync(first, "first");
          },
        },
      },
      {
        id: "second",
        label: "second",
        status: "warn" as const,
        detail: "missing",
        fix: {
          description: "Create second fixture",
          apply() {
            fs.writeFileSync(second, "second");
          },
        },
      },
      { id: "report-only", label: "report-only", status: "fail" as const, detail: "not reversible" },
    ];

    expect(applyFixes(results)).toEqual({ applied: ["Create first fixture", "Create second fixture"] });
    expect(fs.readFileSync(first, "utf8")).toBe("first");
    expect(fs.readFileSync(second, "utf8")).toBe("second");
  });

  test("validates configured notifier adapters", async () => {
    const empty = tempDir();
    expect(check(await runDoctor(empty), "notifiers")).toMatchObject({
      status: "ok",
      detail: "no notifiers configured",
    });

    const unavailable = tempDir();
    const missingCommand = path.join(unavailable, "missing-notifier-command");
    writeSettingsFixture(unavailable, { notify: [{ id: "command", command: [missingCommand] }] });
    const commandFailure = check(await runDoctor(unavailable), "notifiers");
    expect(commandFailure.status).toBe("fail");
    expect(commandFailure.detail).toContain(`fix: install ${missingCommand}`);

    const command = tempDir();
    writeSettingsFixture(command, { notify: [{ id: "command", command: [process.execPath] }] });
    expect(check(await runDoctor(command), "notifiers")).toMatchObject({
      status: "ok",
      detail: "1 configured notifier are available",
    });
  });

  test("reports invalid config and accepts missing config", async () => {
    const invalid = tempDir();
    writeSettingsFixture(invalid, { queue: { max_retries: "never" } });
    const missing = tempDir();

    const configResult = check(await runDoctor(invalid), "config");
    expect(configResult.status).toBe("fail");
    expect(configResult.detail).toContain("settings.json");
    expect(check(await runDoctor(missing), "config")).toEqual({ id: "config", label: "Config validity", status: "ok", detail: "no settings.json" });
  });

  test("never throws when individual checks encounter broken inputs", async () => {
    const directory = tempDir();
    fs.mkdirSync(path.join(directory, "agents"), { recursive: true });
    fs.writeFileSync(path.join(directory, "spawned.jsonl"), "{broken\n");

    expect(runDoctor(directory)).resolves.toBeArray();

    const invalidAgents = tempDir();
    fs.writeFileSync(path.join(invalidAgents, "agents"), "not a directory");
    expect(check(await runDoctor(invalidAgents), "extension-staleness")).toMatchObject({ status: "fail" });
  });
});
