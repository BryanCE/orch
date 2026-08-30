import { describe, expect, test } from "bun:test";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NO_PANE_FOREGROUND } from "../src/backends/pane-ready.ts";
import { ownedAgentKeys, paneForeground, reloadPaneAndAwaitBridge } from "../src/commands/lifecycle.ts";
import { releaseLease } from "../src/store/lease-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { seedStatus } from "./helpers/presence.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { seedAgent } from "./helpers/agent.ts";
import { FakePanedBackend } from "./helpers/backend.ts";

/** A1 / Rule 11: ownership is the OPEN LEASE and nothing else. Releasing it
 *  costs a driver, never the agent — and a released lease is history, so it must
 *  stop answering for ownership the instant it closes. */
function withFleet(body: (root: string, key: string, agentId: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "orch-owned-keys-"));
  const oldDir = process.env.ORCH_DIR;
  const oldOwner = process.env.ORCH_OWNER;
  const oldAgentKey = process.env[LAUNCH_ENV];
  process.env.ORCH_DIR = root;
  process.env.ORCH_OWNER = "orcha00001";
  delete process.env[LAUNCH_ENV];
  try {
    writeSettingsFixture(root, {
      enabled: { adapters: ["pi"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless" },
    });
    const key = "worker0001";
    seedSpace(root, "local");
    seedAgent(key, { adapter: "pi", backend: "headless", space: "local", handle: "w1:p1", owner: "orcha00001" });
    seedStatus(root, key, { key, pid: process.pid });
    body(root, key, key);
  } finally {
    closeAllStores();
    if (oldDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldDir;
    if (oldOwner === undefined) delete process.env.ORCH_OWNER; else process.env.ORCH_OWNER = oldOwner;
    if (oldAgentKey !== undefined) process.env[LAUNCH_ENV] = oldAgentKey;
    removeTempDir(root);
  }
}

describe("commands/lifecycle", () => {
  test("capability helpers fail closed when absent", () => {
    const backend = new FakePanedBackend();
    expect(paneForeground(backend, "p1")).toEqual(NO_PANE_FOREGROUND);
    const result = reloadPaneAndAwaitBridge(backend, "p1", "agent00001", "reload");
    expect(result.pane).toBe("p1");
    expect(result.ok).toBe(false);
  });
  test("reports missing bridge pid without touching backend", () => expect(reloadPaneAndAwaitBridge(new FakePanedBackend(), "p1", "missingag1", "reload")).toMatchObject({ ok: false }));

  test("--all targets the agents this orch holds a live lease on, and drops them when it releases", () => {
    withFleet((root, key, agentId) => {
      expect(ownedAgentKeys()).toContain(key);
      releaseLease(root, agentId, "orcha00001");
      expect(ownedAgentKeys()).not.toContain(key);
    });
  });
});
