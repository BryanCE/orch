import { describe, expect, test } from "bun:test";
import { cmdReview } from "../src/commands/review.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import { servedServices } from "./helpers/daemon-state.ts";
import { captureStdout } from "./helpers/stdout.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const servers: RpcServer[] = [];
const SETTINGS = { defaults: { adapter: "pi", backend: "headless" } };

describe("commands/review", () => {
  test.serial("lists an empty fleet", async () => {
    const root: OrchDir = tempOrchDir("orch-command-review-empty-");
    isolateOrchEnv();
    process.env.ORCH_DIR = root;
    try {
      const services = await servedServices({ orchDir: root, settings: SETTINGS }, servers);
      const output = await captureStdout(() => cmdReview(services, ["list"]));
      expect(output).toBe("No worktree reviews pending.\n");
    } finally {
      while (servers.length) await servers.pop()!.close();
      restoreOrchEnv();
      removeTempDir(root);
    }
  });
});
