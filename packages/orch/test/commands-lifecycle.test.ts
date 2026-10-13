import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { NO_FOREGROUND } from "../src/backends/shell-ready.ts";
import { ownedAgentKeys } from "../src/commands/lifecycle/index.ts";
import { cmdRestart, foregroundOf, reloadAgentAndAwaitBridge } from "../src/commands/lifecycle/reload.ts";
import { resolveAdapterOrDie, resolveTuningOrDie } from "../src/commands/selection.ts";
import { adapterCommand } from "../src/commands/spawn/models.ts";
import { agentView } from "../src/store/agent-view.ts";
import { releaseLease } from "../src/store/lease-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { seedStatus } from "./helpers/presence.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { seedAgent, seedLiveProcess, seedOperator } from "./helpers/agent.ts";
import { FakePanedBackend, withRegisteredBackendAsync } from "./helpers/backend.ts";
import { servedServices } from "./helpers/daemon-state.ts";
import { captureCommand } from "./helpers/stdout.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import type { Services } from "../src/types/services.ts";

const servers: RpcServer[] = [];
const dirs: OrchDir[] = [];

const SETTINGS = {
  enabled: { adapters: ["pi"], backends: ["headless"] },
  defaults: { adapter: "pi", backend: "headless" },
};

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  closeAllStores();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

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
  test("capability helpers fail closed when absent", async () => {
    const backend = new FakePanedBackend();
    const root = tempOrchDir("orch-lifecycle-helper-");
    dirs.push(root);
    const services = await servedServices({ orchDir: root, settings: SETTINGS }, servers);
    expect(foregroundOf({ foreground: null }, "p1")).toEqual(NO_FOREGROUND);
    const result = await reloadAgentAndAwaitBridge(services, backend, "p1", "agent00001", "reload");
    expect(result.handle).toBe("p1");
    expect(result.ok).toBe(false);
  });
  test("reports missing bridge pid without touching backend", async () => {
    const root = tempOrchDir("orch-lifecycle-missing-");
    dirs.push(root);
    const services = await servedServices({ orchDir: root, settings: SETTINGS }, servers);
    expect(await reloadAgentAndAwaitBridge(services, new FakePanedBackend(), "p1", "missingag1", "reload")).toMatchObject({ ok: false });
  });

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

  test("restart --harness quits with the old harness, launches the new one, and records it", async () => {
    await withFleet(async (root, key) => {
      seedLiveProcess(root, key);
      const services = await swapServices(root);
      const submitted: string[] = [];
      const backend = new FakePanedBackend();
      Object.defineProperty(backend, "agentInput", {
        value: {
          submit(_handle: unknown, text: string): void { submitted.push(text); },
          sendKeys: () => undefined,
          focus: () => undefined,
        },
      });
      // The old harness quits at once: the shell is the pane's foreground process.
      Object.defineProperty(backend, "foreground", {
        value: { read: () => ({ shellPid: process.pid, foregroundPid: process.pid, processes: [] }) },
      });
      const { payload } = await captureCommand(() => withRegisteredBackendAsync(backend, () =>
        cmdRestart(services, [key, "--harness", "claude", "--model", "claude-opus-5-5", "--json"])));
      const settings = services.settings.current();
      const tuning = resolveTuningOrDie({ adapterFlag: "claude", modelFlag: "claude-opus-5-5" }, settings, "claude", null);
      const quit = resolveAdapterOrDie("pi").lifecycleControl?.lifecycleCmd("restart");
      if (!quit) throw new Error("pi declares no restart command");
      expect(payload).toMatchObject({ ok: 1, total: 1 });
      expect(submitted).toEqual([
        quit.text,
        adapterCommand("claude", settings, { model: tuning.model, thinking: tuning.thinking, preferredModels: settings.models.preferred.claude ?? [] }),
      ]);
      expect(agentView(root, key)).toMatchObject({ harnessId: "claude", tuning: { model: tuning.model, thinking: tuning.thinking } });
    });
  });

  test("restart --harness refuses an agent whose environment takes no input", async () => {
    await withFleet(async (root, key) => {
      const services = await swapServices(root);
      const { payload } = await captureCommand(() => withRegisteredBackendAsync(new FakePanedBackend(), () =>
        cmdRestart(services, [key, "--harness", "claude", "--model", "claude-opus-5-5", "--json"])));
      expect(payload).toMatchObject({ ok: 0, total: 1 });
      expect(JSON.stringify(payload.results)).toContain("cannot relaunch");
      expect(agentView(root, key)?.harnessId).toBe("pi");
    });
  });
});

/** Services with pi and claude enabled, on a model listing that offers nothing,
 *  so every model passes the listing check without running a harness. */
async function swapServices(root: OrchDir): Promise<Services> {
  const served = await servedServices({ orchDir: root, settings: {
    enabled: { adapters: ["pi", "claude"], backends: ["headless"] },
    defaults: { adapter: "pi", backend: "headless" },
  } }, servers);
  return { ...served, models: { ...served.models, read: () => "" } };
}
