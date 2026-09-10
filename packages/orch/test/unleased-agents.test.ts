import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores } from "../src/store/connection.ts";
import { ensureHarness, getOrCreateSessionAgent, insertAgent } from "../src/store/agent-rows.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { unleasedAgents } from "../src/daemon/rpc/session-registry.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const directories: string[] = [];

afterEach(() => {
  closeAllStores();
  while (directories.length > 0) removeTempDir(directories.pop()!);
});

describe("registration unleased agent hint", () => {
  test("includes unleased workers but never session identities", () => {
    const orchDir = mkdtempSync(join(tmpdir(), "orch-unleased-agents-"));
    directories.push(orchDir);
    ensureHarness(orchDir, "pi", "pi");
    insertAgent(orchDir, { id: "worker", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "worker", createdAt: 1 });
    const session = getOrCreateSessionAgent(orchDir, {
      pid: 42,
      startToken: "session-start",
      sessionToken: "session-token",
      harnessId: "pi",
      cwd: "/repo",
      label: "session",
      hostId: "host",
      hostName: "host",
      hostOs: "linux",
      now: 2,
    });
    insertAgent(orchDir, { id: "leased", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "leased", createdAt: 3 });
    acquireLease(orchDir, "leased", session.id, 4);

    expect(unleasedAgents(orchDir, session.id)).toEqual([{ id: "worker", name: "worker" }]);
  });
});
