import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkMalformedPresenceRecords } from "../src/doctor/presence.ts";
import { describeBackendEnvironments } from "../src/doctor/backends.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];

afterEach(() => {
  closeAllStores();
  while (dirs.length > 0) removeTempDir(dirs.pop() ?? "");
});

describe("one current shape only", () => {
  test("a live presence record with a malformed identity is a doctor failure", () => {
    const directory = mkdtempSync(join(tmpdir(), "orch-shape-only-presence-"));
    dirs.push(directory);
    const key = `not-an-agent-${mintAgentId()}`;
    const agentDirectory = join(directory, "agents", key);
    mkdirSync(agentDirectory, { recursive: true });
    writeFileSync(join(agentDirectory, "status.json"), JSON.stringify({ schema: 1, pid: process.pid, agent: "pi" }));

    const result = checkMalformedPresenceRecords(directory);
    expect(result.status).toBe("fail");
    expect(result.detail).toContain("malformed presence record");
  });

  test("doctor backend reports have one detection spelling", () => {
    const result = describeBackendEnvironments([], null);
    expect(result.backends?.every((backend) => !("available" in backend))).toBe(true);
  });
});
