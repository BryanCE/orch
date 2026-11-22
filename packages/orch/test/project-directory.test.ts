import { afterEach, describe, expect, test } from "bun:test";
import { projectDirectory } from "../src/daemon/server/spawn/project.ts";
import { agentLaunchEnv } from "../src/policy/spawner.ts";
import { recordAgentStatus } from "../src/presence/store.ts";
import { placeHere } from "../src/process-place.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { seedAgent } from "./helpers/agent.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";

const directories: OrchDir[] = [];

afterEach(() => {
  closeAllStores();
  for (const directory of directories.splice(0)) removeTempDir(directory);
});

function orchDirWith(project: string | null): OrchDir {
  const directory = tempOrchDir("orch-project-directory-");
  directories.push(directory);
  seedAgent("lead", { adapter: "pi", cwd: "/repo/main", name: "lead" }, directory);
  recordAgentStatus(directory, placeHere(directory, "lead"), { state: "working", project }, 1);
  return directory;
}

describe("an agent's project directory", () => {
  test("a spawned agent takes its spawner's project, not the directory it launches in", () => {
    expect(projectDirectory(orchDirWith("/repo/main"), "lead", "/repo/main/.orch-worktrees/w1")).toBe("/repo/main");
  });

  test("a spawner with no project recorded gives the directory the spawn was asked from", () => {
    expect(projectDirectory(orchDirWith(null), "lead", "/asked/from")).toBe("/asked/from");
  });

  test("the human's spawn gives the directory it was asked from", () => {
    expect(projectDirectory(orchDirWith("/repo/main"), null, "/asked/from")).toBe("/asked/from");
  });

  test("the launch environment carries the launch's project, never this process's own", () => {
    const original = process.env.ORCH_PROJECT;
    process.env.ORCH_PROJECT = "/this/process";
    try {
      expect(agentLaunchEnv({ key: "k1", orchDir: orchDirWith(null), project: "/repo/main" }).ORCH_PROJECT).toBe("/repo/main");
    } finally {
      if (original === undefined) delete process.env.ORCH_PROJECT;
      else process.env.ORCH_PROJECT = original;
    }
  });
});
