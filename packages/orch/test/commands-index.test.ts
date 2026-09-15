import type { OrchDir } from "../src/types/core.ts";
import { orchDirAt } from "../src/services.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { describe, expect, test } from "bun:test";
import { needsFirstRunSetup, readOrchVersion, runCommand } from "../src/commands/index.ts";
import { HELP_HEADER } from "../src/cli/help.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { announceUnleasedAgents } from "../src/daemon/client/registration.ts";
import type { RegisterSessionResponse } from "../src/types/daemon.ts";

describe("commands/index", () => {
  test("does not gate help or noninteractive commands", () => {
    expect(needsFirstRunSetup(null, "help")).toBe(false);
    expect(needsFirstRunSetup(null, "status")).toBe(false);
  });
  test("reads a package version string", () => expect(readOrchVersion()).toMatch(/^\d+\.\d+\.\d+/));
  test("prints the daemon's unleased list and stays silent on an empty one", () => {
    const output: string[] = [];
    const identity = {
      id: "seam-session",
      label: "session",
      kind: "session",
      unleased: [{ id: "worker", name: "worker" }],
    } satisfies RegisterSessionResponse;
    announceUnleasedAgents(identity, (text) => output.push(text));
    announceUnleasedAgents({ ...identity, unleased: [] }, (text) => output.push(text));
    expect(output).toEqual(["1 unleased agent(s) exist - orch adopt worker to take one, orch status to see them.\n"]);
  });
  test("dispatches representative commands and reports unknown commands", () => {
    const directory: OrchDir = tempOrchDir("orch-command-seam-");
    const oldDir: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
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
      expect(stdout).toContain(HELP_HEADER);
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
