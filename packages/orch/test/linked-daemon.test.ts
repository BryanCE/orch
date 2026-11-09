import { afterEach, expect, test } from "bun:test";
import { ensureDaemon } from "../src/daemon/client/reach.ts";
import { LINKED_DAEMON_ENV } from "../src/daemon/client/runtime-files.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { testServices } from "./helpers/services.ts";
import type { OrchDir } from "../src/types/core.ts";

const dirs: OrchDir[] = [];
afterEach(() => {
  delete process.env[LINKED_DAEMON_ENV];
  while (dirs.length) removeTempDir(dirs.pop()!);
});

test("an agent whose orchd is on another host refuses to start one here", async () => {
  const orchDir = tempOrchDir("orch-linked-daemon-");
  dirs.push(orchDir);
  process.env[LINKED_DAEMON_ENV] = "home-laptop";
  const refusal = await ensureDaemon(orchDir, testServices({ orchDir }).logger).then(() => null, (error: unknown) => String(error));
  expect(refusal).toContain("runs on home-laptop");
});
