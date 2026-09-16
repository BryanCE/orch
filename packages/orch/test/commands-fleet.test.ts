import { describe, expect, test } from "bun:test";
import { mintAgentId } from "../src/backends/identity.ts";
import { readFleet } from "../src/commands/fleet.ts";
import { indexPresenceById } from "../src/entities/lookup.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import { servedServices } from "./helpers/daemon-state.ts";
import { seedAgent } from "./helpers/agent.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const servers: RpcServer[] = [];
const SETTINGS = { defaults: { adapter: "pi", backend: "headless" } };

describe("commands/fleet", () => {
  test.serial("reads an empty fleet", async () => {
    const root: OrchDir = tempOrchDir("orch-command-fleet-empty-");
    isolateOrchEnv();
    process.env.ORCH_DIR = root;
    try {
      const services = await servedServices({ orchDir: root, settings: SETTINGS }, servers);
      const snapshot = await readFleet(services, true);
      expect(snapshot.views).toEqual([]);
      expect(snapshot.presence).toEqual([]);
      expect(Array.isArray(snapshot.entities)).toBe(true);
    } finally {
      while (servers.length) await servers.pop()!.close();
      restoreOrchEnv();
      removeTempDir(root);
    }
  });

  test.serial("reads agent views and indexes presence by key", async () => {
    const root: OrchDir = tempOrchDir("orch-command-fleet-agent-");
    isolateOrchEnv();
    process.env.ORCH_DIR = root;
    const id = mintAgentId();
    try {
      seedAgent(id, {}, root);
      const services = await servedServices({ orchDir: root, settings: SETTINGS }, servers);
      const snapshot = await readFleet(services, true);
      expect(snapshot.views).toHaveLength(1);
      expect(snapshot.views[0]?.id).toBe(id);
      expect(indexPresenceById(snapshot.presence).has(id)).toBe(true);
    } finally {
      while (servers.length) await servers.pop()!.close();
      restoreOrchEnv();
      removeTempDir(root);
    }
  });
});
