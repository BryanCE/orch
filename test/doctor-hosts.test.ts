import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { runDoctor } from "../src/doctor/runner.ts";
import type { SshResult } from "../src/remote.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

const directories: string[] = [];

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-doctor-hosts-"));
  directories.push(directory);
  return directory;
}

function result(results: Awaited<ReturnType<typeof runDoctor>>, id: string) {
  const check = results.find((entry) => entry.id === id);
  if (!check) throw new Error(`missing ${id} result`);
  return check;
}

function writeHosts(directory: string, settings: Record<string, unknown>): void {
  writeSettingsFixture(directory, settings);
}

function successfulRunner(_destination: string, command: string): SshResult {
  if (command === "orch --version") return { ok: true, stdout: "orch 0.1.0\n", stderr: "", code: 0 };
  return { ok: true, stdout: "", stderr: "", code: 0 };
}

afterEach(() => {
  while (directories.length) fs.rmSync(directories.pop()!, { recursive: true, force: true });
});

describe("doctor remote host checks", () => {
  test("accepts a reachable host with matching orch version and writable ORCH_DIR", async () => {
    const directory = tempDir();
    writeHosts(directory, { hosts: { good: { dest: "user@good.example" } } });

    const results = await runDoctor(directory, successfulRunner);

    expect(result(results, "remote-ssh")).toMatchObject({ status: "ok", detail: "1 configured host passed" });
    expect(result(results, "remote-orch-version")).toMatchObject({ status: "ok", detail: "1 configured host passed" });
    expect(result(results, "remote-orch-dir")).toMatchObject({ status: "ok", detail: "1 configured host passed" });
  });

  test("reports unreachable hosts with a copy-paste SSH fix hint", async () => {
    const directory = tempDir();
    writeHosts(directory, { hosts: { down: { dest: "user@down.example" } } });
    const unreachable = (): SshResult => {
      throw new Error("connection refused");
    };

    const check = result(await runDoctor(directory, unreachable), "remote-ssh");

    expect(check.status).toBe("fail");
    expect(check.detail).toContain("fix: ssh -o BatchMode=yes -o ConnectTimeout=5 user@down.example true");
  });

  test("flags a remote orch version/schema mismatch in detail", async () => {
    const directory = tempDir();
    writeHosts(directory, { hosts: { old: { dest: "user@old.example" } } });
    const mismatch = (_destination: string, command: string): SshResult =>
      command === "orch --version"
        ? { ok: true, stdout: "orch 9.9.9\n", stderr: "", code: 0 }
        : { ok: true, stdout: "", stderr: "", code: 0 };

    const check = result(await runDoctor(directory, mismatch), "remote-orch-version");

    expect(check.status).toBe("fail");
    expect(check.detail).toContain("old: remote orch 9.9.9 (local 0.1.0)");
    expect(check.detail).toContain("fix: ssh user@old.example orch --version");
  });

  test("reports no remote hosts configured as healthy", async () => {
    const results = await runDoctor(tempDir(), () => ({ ok: true, stdout: "", stderr: "", code: 0 }));

    for (const id of ["remote-ssh", "remote-orch-version", "remote-orch-dir"]) {
      expect(result(results, id)).toMatchObject({ status: "ok", detail: "no remote hosts configured" });
    }
  });
});
