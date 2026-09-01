import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { closeAllStores } from "../src/store/connection.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { cmdReap, reapCandidates, type ReapCandidateInput } from "../src/commands/lease.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { errorMessage } from "../src/util.ts";

const directories: string[] = [];
const previousOrchDir = process.env.ORCH_DIR;
const previousAgentId = process.env[LAUNCH_ENV];
const rows = [
  {
    id: "dead-unleased",
    name: "dead-unleased",
    harnessId: "pi",
    createdAt: 1,
    ownership: { kind: "unleased", reason: "none" },
    processLive: false,
  },
  {
    id: "dead-holder",
    name: "dead-holder",
    harnessId: "claude",
    createdAt: 2,
    ownership: { kind: "unleased", reason: "holder-gone" },
    processLive: false,
  },
  {
    id: "held-dead-process",
    name: "held-dead-process",
    harnessId: "claude",
    createdAt: 3,
    ownership: { kind: "leased", holder: "live-holder" },
    processLive: false,
  },
  {
    id: "held",
    name: "held",
    harnessId: "claude",
    createdAt: 4,
    ownership: { kind: "leased", holder: "live-holder" },
    processLive: true,
  },
  {
    id: "idle",
    name: "idle",
    harnessId: "codex",
    createdAt: 5,
    ownership: { kind: "unleased", reason: "none" },
    processLive: true,
  },
] satisfies ReapCandidateInput[];

afterEach(() => {
  closeAllStores();
  while (directories.length > 0) removeTempDir(directories.pop()!);
  if (previousOrchDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = previousOrchDir;
  if (previousAgentId === undefined) delete process.env[LAUNCH_ENV]; else process.env[LAUNCH_ENV] = previousAgentId;
});

function captureStdout(run: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  // eslint-disable-next-line typescript/unbound-method
  const originalWrite = process.stdout.write;
  process.stdout.write = ((chunk: string | Uint8Array) => { output.push(String(chunk)); return true; });
  return run().then(() => output.join(""), (error: unknown) => { throw error; }).finally(() => { process.stdout.write = originalWrite; });
}

describe("reapCandidates", () => {
  test("classifies unleased dead holders and leased dead processes", () => {
    expect(reapCandidates(rows).map((row) => row.classification)).toEqual(["dead", "dead", "held", "held", "idle"]);
  });

  test("classifies empty input", () => {
    expect(reapCandidates([])).toEqual([]);
  });
});

describe("cmdReap", () => {
  test.serial("prints the --dead --json result shape", async () => {
    const directory = mkdtempSync(join(tmpdir(), "orch-reap-picker-"));
    directories.push(directory);
    ensureHarness(directory, "pi", "pi", 1);
    const caller = mintAgentId();
    const dead = mintAgentId();
    insertAgent(directory, { id: caller, name: "caller", spawnedBy: null, harnessId: "pi", cwd: directory, createdAt: 1 });
    insertAgent(directory, { id: dead, name: "dead", spawnedBy: null, harnessId: "pi", cwd: directory, createdAt: 2 });
    process.env.ORCH_DIR = directory;
    process.env[LAUNCH_ENV] = caller;

    const output = await captureStdout(() => cmdReap(["--dead", "--json"]));
    const parsed: unknown = JSON.parse(output);
    expect(parsed).toEqual([{ target: dead, name: "dead" }]);
  });

  test.serial("refuses bare reap when stdin is not a TTY", async () => {
    // Forced: run from a terminal, the real isTTY sends this down the interactive picker,
    // which then sits waiting for keys with the whole suite behind it.
    const original = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
    Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true, writable: true });
    try {
      const refusal = await cmdReap([]).then(() => null, (error: unknown) => errorMessage(error));
      expect(refusal).toBe("usage: orch reap <target> | --dead [--json]");
    } finally {
      if (original) Object.defineProperty(process.stdin, "isTTY", original);
    }
  });
});
