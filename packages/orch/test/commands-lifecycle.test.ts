import { orchDirAt } from "../src/services.ts";
import type { OrchDir } from "../src/types/core.ts";
import { describe, expect, test } from "bun:test";
import { NO_FOREGROUND } from "../src/backends/shell-ready.ts";
import { ownedAgentKeys } from "../src/commands/lifecycle/index.ts";
import { foregroundOf, reloadAgentAndAwaitBridge } from "../src/commands/lifecycle/reload.ts";
import { releaseLease } from "../src/store/lease-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { seedStatus } from "./helpers/presence.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { seedAgent, seedOperator } from "./helpers/agent.ts";
import { FakePanedBackend } from "./helpers/backend.ts";
import { servedServices } from "./helpers/daemon-state.ts";
import type { RpcServer } from "../src/types/daemon.ts";

const servers: RpcServer[] = [];

/** A1 / Rule 11: ownership is the OPEN LEASE and nothing else. Releasing it
 *  costs a driver, never the agent — and a released lease is history, so it must
 *  stop answering for ownership the instant it closes. */
async function withFleet(body: (root: OrchDir, key: string, orchId: string) => Promise<void>): Promise<void> {
  const root = tempOrchDir("orch-owned-keys-");
  // The runner is the operator: no launch credential, no harness session, one
  // registered parent process (Rule 19).
  isolateOrchEnv();
  process.env.ORCH_DIR = root;
  try {
    writeSettingsFixture(root, {
      enabled: { adapters: ["pi"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless" },
    });
    const orchId = seedOperator(root);
    const key = "worker0001";
    seedSpace(root, "local");
    seedAgent(key, { adapter: "pi", backend: "headless", space: "local", handle: "w1:p1", owner: orchId }, root);
    seedStatus(root, key, { key, pid: process.pid });
    await body(root, key, orchId);
  } finally {
    while (servers.length) await servers.pop()!.close();
    closeAllStores();
    restoreOrchEnv();
    removeTempDir(root);
  }
}

describe("commands/lifecycle", () => {
  test("capability helpers fail closed when absent", () => {
    const backend = new FakePanedBackend();
    expect(foregroundOf({ foreground: null }, "p1")).toEqual(NO_FOREGROUND);
    const result = reloadAgentAndAwaitBridge(orchDirAt(process.env.ORCH_DIR!), backend, "p1", "agent00001", "reload");
    expect(result.handle).toBe("p1");
    expect(result.ok).toBe(false);
  });
  test("reports missing bridge pid without touching backend", () => expect(reloadAgentAndAwaitBridge(orchDirAt(process.env.ORCH_DIR!), new FakePanedBackend(), "p1", "missingag1", "reload")).toMatchObject({ ok: false }));

  test("--all targets the agents this orch holds a live lease on, and drops them when it releases", async () => {
    await withFleet(async (root, key, orchId) => {
      const services = await servedServices({ orchDir: root, settings: {
        enabled: { adapters: ["pi"], backends: ["headless"] },
        defaults: { adapter: "pi", backend: "headless" },
      } }, servers);
      expect(await ownedAgentKeys(services)).toContain(key);
      releaseLease(root, key, orchId);
      expect(await ownedAgentKeys(services)).not.toContain(key);
    });
  });
});
