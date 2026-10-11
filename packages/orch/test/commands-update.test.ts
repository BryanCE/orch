import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createServices } from "../src/services.ts";
import { settingsPath } from "../src/settings/schema.ts";
import { runUpdate } from "../src/commands/update.ts";
import { packageManifest } from "../src/util.ts";
import { tempOrchDir, removeTempDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import type { PackageRunner } from "../src/update/release.ts";
import type { FinishReport } from "../src/update/finish.ts";
import type { OrchDir } from "../src/types/core.ts";

function makeRunner(target: string, installs: string[]): PackageRunner {
  return (args, _options) => {
    if (args[0] === "view" && args[2] === "version") return { code: 0, stdout: JSON.stringify(target), stderr: "" };
    if (args[0] === "view" && args[2] === "breakingChanges") return { code: 0, stdout: "{}", stderr: "" };
    if (args[0] === "prefix") return { code: 0, stdout: "/global", stderr: "" };
    if (args[0] === "install") {
      installs.push(args.join(" "));
      return { code: 0, stdout: "", stderr: "" };
    }
    return { code: 1, stdout: "", stderr: `unexpected npm call: ${args.join(" ")}` };
  };
}

function servicesFor(directory: OrchDir) {
  writeSettingsFixture(directory, { defaults: { adapter: "pi", backend: "headless" } });
  return createServices({ orchDir: directory });
}

function captureOutput(run: () => Promise<void>): Promise<string> {
  const oldWrite = process.stdout.write.bind(process.stdout);
  let output = "";
  process.stdout.write = (chunk: string | Uint8Array) => { output += chunk.toString(); return true; };
  return run().then(() => output).finally(() => { process.stdout.write = oldWrite; });
}

const failedFinish: FinishReport = { kind: "failed", step: "settings", reason: "migration failed" };

async function withUpdate(testBody: (directory: OrchDir) => Promise<void>): Promise<void> {
  const directory = tempOrchDir("orch-update-command-");
  const previousExitCode = process.exitCode ?? 0;
  process.exitCode = 0;
  try {
    await testBody(directory);
  } finally {
    process.exitCode = previousExitCode;
    removeTempDir(directory);
  }
}

describe("commands/update", () => {
  test("--check prints the version jump and notes without writing", async () => withUpdate(async (directory) => {
    const services = servicesFor(directory);
    const before = readFileSync(settingsPath(directory), "utf8");
    const output = await captureOutput(() => runUpdate(services, ["--check"], {
      runner: makeRunner("99.0.0", []), confirm: () => Promise.reject(new Error("must not prompt")),
      finish: () => Promise.reject(new Error("must not finish")), runInstalledFinish: () => 1,
    }));
    expect(output).toContain(`orch ${packageManifest().version} -> 99.0.0`);
    expect(readFileSync(settingsPath(directory), "utf8")).toBe(before);
  }));

  test("refuses a downgrade", async () => withUpdate(async (directory) => {
    const services = servicesFor(directory);
    const oldError = process.stderr.write.bind(process.stderr);
    let stderr = "";
    process.stderr.write = (chunk: string | Uint8Array) => { stderr += chunk.toString(); return true; };
    try {
      await runUpdate(services, ["--to", "0.0.1", "--yes"], {
        runner: makeRunner("0.0.1", []), confirm: () => Promise.resolve(true),
        finish: () => Promise.resolve(failedFinish), runInstalledFinish: () => 1,
      });
    } finally { process.stderr.write = oldError; }
    expect(stderr).toContain("orch only moves forward");
  }));

  test("refuses non-TTY updates without --yes", async () => withUpdate(async (directory) => {
    const services = servicesFor(directory);
    const oldTTY = process.stdin.isTTY;
    const oldError = process.stderr.write.bind(process.stderr);
    let stderr = "";
    Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: false });
    process.stderr.write = (chunk: string | Uint8Array) => { stderr += chunk.toString(); return true; };
    try {
      await runUpdate(services, ["--to", "99.0.0"], {
        runner: makeRunner("99.0.0", []), confirm: () => Promise.resolve(true),
        finish: () => Promise.resolve(failedFinish), runInstalledFinish: () => 1,
      });
    } finally {
      process.stderr.write = oldError;
      Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: oldTTY });
    }
    expect(stderr).toContain("Rerun with --yes");
  }));

  test("restores settings after the installed finish fails", async () => withUpdate(async (directory) => {
    const services = servicesFor(directory);
    const file = settingsPath(directory);
    const before = readFileSync(file, "utf8");
    const installs: string[] = [];
    const oldError = process.stderr.write.bind(process.stderr);
    let stderr = "";
    process.stderr.write = (chunk: string | Uint8Array) => { stderr += chunk.toString(); return true; };
    const output = await captureOutput(() => runUpdate(services, ["--to", "99.0.0", "--yes"], {
      runner: makeRunner("99.0.0", installs), confirm: () => Promise.resolve(true),
      finish: () => Promise.resolve(failedFinish), runInstalledFinish: () => 1,
    })).finally(() => { process.stderr.write = oldError; });
    expect(installs).toEqual([`install -g ${packageManifest().name}@99.0.0`, `install -g ${packageManifest().name}@${packageManifest().version}`]);
    expect(readFileSync(file, "utf8")).toBe(before);
    expect(stderr).toContain("rolled back");
    expect(output).toContain("orch ");
  }));

  test("success reports the backup directory", async () => withUpdate(async (directory) => {
    const services = servicesFor(directory);
    const output = await captureOutput(() => runUpdate(services, ["--to", "99.0.0", "--yes"], {
      runner: makeRunner("99.0.0", []), confirm: () => Promise.resolve(true),
      finish: () => Promise.resolve({ kind: "finished", settingsChanges: [], fixes: [], failing: [] }),
      runInstalledFinish: () => 0,
    }));
    expect(output).toContain("updated ");
    expect(output).toContain(`${directory}/backups/update-`);
  }));
});
