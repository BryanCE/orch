import { describe, expect, test } from "bun:test";
import { whoAmI, refuseNonOperatorOverride } from "../src/commands/self.ts";
import { workerHeaderContextOf } from "../src/policy/spawner.ts";
import { SETTINGS_DEFAULTS } from "../src/settings/schema.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { OrchSettings } from "../src/types/settings.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import { seedOperator } from "./helpers/agent.ts";
import { servedServices } from "./helpers/daemon-state.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const servers: RpcServer[] = [];
const SETTINGS = { defaults: { adapter: "pi", backend: "headless" } };

const workerSettings = (maxDepth: number): OrchSettings => ({
  ...SETTINGS_DEFAULTS,
  runtime: "node",
  enabled: { adapters: ["pi"], backends: ["headless"] },
  locked_commands: [],
  gated_commands: [],
  defaults: { ...SETTINGS_DEFAULTS.defaults, models: {} },
  fleet: { ...SETTINGS_DEFAULTS.fleet, max_agents_per_space: {}, max_depth: maxDepth },
  models: { allowed: {}, preferred: {} },
  workers: { ...SETTINGS_DEFAULTS.workers, exclude_extensions: [], allow_tools: [], verify_commands: [] },
  skills: { ...SETTINGS_DEFAULTS.skills, link: [] },
  agents: { writable_settings: [] },
  notify: [],
  hosts: {},
  spaces: {},
});

describe("commands/self", () => {
  test.serial("reads the caller identity from the daemon", async () => {
    const root: OrchDir = tempOrchDir("orch-command-self-");
    isolateOrchEnv();
    process.env.ORCH_DIR = root;
    try {
      const id = seedOperator(root);
      const services = await servedServices({ orchDir: root, settings: SETTINGS }, servers);
      const self = await whoAmI(services);
      expect(self.kind).toBe("operator");
      expect(self.id).toBe(id);
      expect(self.depth).toBe(0);
    } finally {
      while (servers.length) await servers.pop()!.close();
      restoreOrchEnv();
      removeTempDir(root);
    }
  });

  test("uses caller depth for worker spawn policy", () => {
    const self = { id: "x", kind: "agent" as const, space: null, view: null, depth: 2 };
    expect(workerHeaderContextOf(self, workerSettings(3)).maySpawn).toBe(false);
    expect(workerHeaderContextOf(self, workerSettings(4)).maySpawn).toBe(true);
  });

  test("refuses non-operator overrides", () => {
    expect(() => refuseNonOperatorOverride({ kind: "session" }, "--all"))
      .toThrow(/operator-only/);
  });
});
