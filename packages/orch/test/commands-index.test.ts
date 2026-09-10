import * as fs from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, test } from "bun:test";
import { needsFirstRunSetup, readOrchVersion, runCommand } from "../src/commands/index.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { announceUnleasedAgents } from "../src/daemon/rpc/session-registry.ts";
import type { RegisterSessionResponse } from "../src/types/daemon.ts";

describe("commands/index", () => {
  test("does not gate help or noninteractive commands", () => {
    expect(needsFirstRunSetup("help")).toBe(false);
    expect(needsFirstRunSetup("status")).toBe(false);
  });
  test("reads a package version string", () => expect(readOrchVersion()).toMatch(/^\d+\.\d+\.\d+/));
  test("announces unleased agents once per session", () => {
    const output: string[] = [];
    const identity = {
      id: `seam-${Date.now()}-${Math.random()}`,
      label: "session",
      kind: "session",
      unleased: [{ id: "worker", name: "worker" }],
    } satisfies RegisterSessionResponse;
    announceUnleasedAgents("/tmp/commands-index-seam", identity, (text) => output.push(text));
    announceUnleasedAgents("/tmp/commands-index-seam", identity, (text) => output.push(text));
    expect(output).toEqual(["1 unleased agent(s) exist - orch adopt worker to take one, orch status to see them.\n"]);
  });
  test("dispatches representative commands and reports unknown commands", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-command-seam-"));
    const oldDir = process.env.ORCH_DIR;
    const oldStdout = process.stdout.write.bind(process.stdout);
    const oldExit = process.exit.bind(process);
    let stdout = "";
    process.env.ORCH_DIR = directory;
    writeSettingsFixture(directory, { defaults: { adapter: "pi", backend: "headless" } });
    process.stdout.write = (chunk: string | Uint8Array) => { stdout += chunk.toString(); return true; };
    process.exit = (code?: number): never => { throw new Error(`exit ${code ?? 0}`); };
    try {
      runCommand(["version"]);
      runCommand(["help"]);
      // An unknown command prints usage and marks the run failed through the
      // exit CODE; it does not sever the process mid-write (src/refusal.ts).
      const previousCode = process.exitCode ?? 0;
      process.exitCode = 0;
      runCommand(["not-a-command"]);
      expect(process.exitCode).toBe(1);
      process.exitCode = previousCode;
      expect(stdout).toContain("orch ");
      expect(stdout).toContain("orch - the single controller");
      expect(stdout).toContain("Unknown command: not-a-command");
    } finally {
      process.stdout.write = oldStdout;
      process.exit = oldExit;
      if (oldDir === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = oldDir;
      removeTempDir(directory);
    }
  });
});
