import { describe, expect, test } from "bun:test";
import { resolveEntity, resolveLifecycle } from "../src/commands/resolve.ts";
import { errorMessage } from "../src/util.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import { servedServices } from "./helpers/daemon-state.ts";
import { seedAgent, seedOperator } from "./helpers/agent.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const servers: RpcServer[] = [];
const SETTINGS = { defaults: { adapter: "pi", backend: "headless" } };

describe("commands/resolve", () => {
  test.serial("resolves one target with its view and ownership", async () => {
    const root: OrchDir = tempOrchDir("orch-command-resolve-agent-");
    isolateOrchEnv();
    process.env.ORCH_DIR = root;
    const id = "resolve-agent";
    try {
      seedOperator(root);
      seedAgent(id, {}, root);
      const services = await servedServices({ orchDir: root, settings: SETTINGS }, servers);
      const resolved = await resolveEntity(services, id);
      expect(resolved.entity.key).toBe(id);
      expect(resolved.view?.id).toBe(id);
      expect(resolved.holder).toBeNull();
      expect(typeof resolved.callerOwns).toBe("boolean");
    } finally {
      while (servers.length) await servers.pop()!.close();
      restoreOrchEnv();
      removeTempDir(root);
    }
  });

  test.serial("resolves lifecycle target with backend and handle", async () => {
    const root: OrchDir = tempOrchDir("orch-command-resolve-lifecycle-");
    isolateOrchEnv();
    process.env.ORCH_DIR = root;
    const id = "resolve-lifecycle-agent";
    try {
      seedOperator(root);
      seedAgent(id, { backend: "headless" }, root);
      const services = await servedServices({ orchDir: root, settings: SETTINGS }, servers);
      const resolved = await resolveLifecycle(services, id);
      expect(resolved.key).toBe(id);
      expect(resolved.backend.id).toBe("headless");
      expect(typeof resolved.handle).toBe("string");
    } finally {
      while (servers.length) await servers.pop()!.close();
      restoreOrchEnv();
      removeTempDir(root);
    }
  });

  test.serial("rejects an unknown target", async () => {
    const root: OrchDir = tempOrchDir("orch-command-resolve-missing-");
    isolateOrchEnv();
    process.env.ORCH_DIR = root;
    try {
      seedOperator(root);
      const services = await servedServices({ orchDir: root, settings: SETTINGS }, servers);
      const failure = await resolveEntity(services, "nobody").then(() => null, (error: unknown) => errorMessage(error));
      expect(failure).toMatch(/No target matches/);
    } finally {
      while (servers.length) await servers.pop()!.close();
      restoreOrchEnv();
      removeTempDir(root);
    }
  });
});
