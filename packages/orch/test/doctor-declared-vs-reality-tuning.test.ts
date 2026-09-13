import { afterEach, describe, expect, test } from "bun:test";

import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { checkDeclaredVsReality } from "../src/doctor/declared-vs-reality.ts";
import { setTuning } from "../src/store/interval-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import type { DeclaredVsRealityDependencies } from "../src/types/doctor.ts";
import type { PresenceStatus } from "../src/types/presence.ts";
import type { OrchDir } from "../src/types/core.ts";
import { seedAgent } from "./helpers/agent.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const directories: OrchDir[] = [];

function fixture(status: PresenceStatus | null): { directory: OrchDir; dependencies: DeclaredVsRealityDependencies } {
  const directory = tempOrchDir("orch-doctor-tuning-");
  directories.push(directory);
  seedAgent("agent-1", { name: "worker", model: "openai/model-a" }, directory);
  setTuning(directory, "agent-1", Date.now() + 1, { model: "openai/model-a", thinking: "high" });
  return {
    directory,
    dependencies: {
      processAlive: () => true,
      plexerInventory: () => [],
      readPresenceStatus: () => status,
    },
  };
}

function status(provider: string, id: string, thinking: string): PresenceStatus {
  return { schema: PRESENCE_SCHEMA, model: { provider, id }, thinking };
}

afterEach(() => {
  closeAllStores();
  while (directories.length) removeTempDir(directories.pop()!);
});

describe("doctor declared tuning versus reality", () => {
  test("matching model and effort produces no finding", () => {
    const { directory, dependencies } = fixture(status("openai", "model-a", "high"));

    const result = checkDeclaredVsReality(directory, dependencies);

    expect(result.status).toBe("ok");
    expect(result.detail).not.toContain("agent agent-1");
  });

  test("different effort reports both ladder specs", () => {
    const { directory, dependencies } = fixture(status("openai", "model-a", "medium"));

    const result = checkDeclaredVsReality(directory, dependencies);

    expect(result.status).toBe("warn");
    expect(result.detail).toContain("agent agent-1 (worker): declared openai/model-a:high, running openai/model-a:medium");
  });

  test("different model reports both ladder specs", () => {
    const { directory, dependencies } = fixture(status("anthropic", "model-b", "high"));

    const result = checkDeclaredVsReality(directory, dependencies);

    expect(result.status).toBe("warn");
    expect(result.detail).toContain("agent agent-1 (worker): declared openai/model-a:high, running anthropic/model-b:high");
  });

  test("missing status produces no tuning finding", () => {
    const { directory, dependencies } = fixture(null);

    const result = checkDeclaredVsReality(directory, dependencies);

    expect(result.status).toBe("ok");
    expect(result.detail).not.toContain("agent agent-1");
  });
});
