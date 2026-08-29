import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NO_PANE_FOREGROUND } from "../src/backends/pane-ready.ts";
import { ownedAgentKeys, paneForeground, reloadPaneAndAwaitBridge } from "../src/commands/lifecycle.ts";
import { recordSpawned } from "../src/presence/store.ts";
import { releaseLease } from "../src/store/lease-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { seedStatus } from "./helpers/presence.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

/** A1 / Rule 11: ownership is the OPEN LEASE and nothing else. Releasing it
 *  costs a driver, never the agent — and a released lease is history, so it must
 *  stop answering for ownership the instant it closes. */
function withFleet(body: (root: string, key: string, agentId: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "orch-owned-keys-"));
  const oldDir = process.env.ORCH_DIR;
  const oldOwner = process.env.ORCH_OWNER;
  const oldAgentKey = process.env.ORCH_AGENT_KEY;
  process.env.ORCH_DIR = root;
  process.env.ORCH_OWNER = "orcha00001";
  delete process.env.ORCH_AGENT_KEY;
  try {
    writeSettingsFixture(root, {
      enabled: { adapters: ["pi"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless" },
    });
    const key = "worker0001";
    seedSpace(root, "local");
    recordSpawned(key, { adapter: "pi", backend: "headless", space: "local", handle: "w1:p1", owner: "orcha00001" });
    seedStatus(root, key, { key, pid: process.pid });
    body(root, key, key);
  } finally {
    closeAllStores();
    if (oldDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldDir;
    if (oldOwner === undefined) delete process.env.ORCH_OWNER; else process.env.ORCH_OWNER = oldOwner;
    if (oldAgentKey !== undefined) process.env.ORCH_AGENT_KEY = oldAgentKey;
    removeTempDir(root);
  }
}

describe("commands/lifecycle", () => {
  test("capability helpers fail closed when absent", () => {
    expect(paneForeground({} as never, "p1")).toEqual(NO_PANE_FOREGROUND);
    expect(reloadPaneAndAwaitBridge({ sendKeys: () => false } as never, "p1", "agent00001", "reload")).toEqual(expect.objectContaining({ pane: "p1", ok: false }) as ReturnType<typeof reloadPaneAndAwaitBridge>);
  });
  test("reports missing bridge pid without touching backend", () => expect(reloadPaneAndAwaitBridge({ sendKeys: () => { throw new Error("should not send"); } } as never, "p1", "missingag1", "reload")).toMatchObject({ ok: false }));

  test("--all targets the agents this orch holds a live lease on, and drops them when it releases", () => {
    withFleet((root, key, agentId) => {
      expect(ownedAgentKeys()).toContain(key);
      releaseLease(root, agentId, "orcha00001");
      expect(ownedAgentKeys()).not.toContain(key);
    });
  });
});
