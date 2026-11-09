import { afterEach, expect, test } from "bun:test";
import { buildFleetStatus } from "../src/commands/status/offline.ts";
import { RPC_RESULTS } from "../src/daemon/client/protocol.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { bindHostName } from "../src/store/host-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { forgetRemoteLiveness } from "../src/process-place.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { testServices } from "./helpers/services.ts";
import { testHost } from "./helpers/host.ts";
import type { OrchDir } from "../src/types/core.ts";

const FAR = testHost("far-host-id", "far");
const dirs: OrchDir[] = [];
afterEach(() => {
  forgetRemoteLiveness(FAR.id);
  closeAllStores();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

test("status lists a headless agent on a linked host, unknown until the host answers", () => {
  const orchDir = tempOrchDir("orch-status-linked-");
  dirs.push(orchDir);
  bindHostName(orchDir, "far", FAR, Date.now());
  registerSpawnedAgent(orchDir, {
    key: "farag00001", harnessId: "pi", backendId: "headless", placed: false,
    handle: JSON.stringify({ kind: "headless", pid: 424242, key: "farag00001" }),
    cwd: "/home/far", name: "far-test", model: "m", spawner: null,
    process: { pid: 424242, startToken: "t" }, host: FAR,
  });
  const settings = testServices({ orchDir }).settings.current();
  const status = buildFleetStatus(settings, { directory: orchDir, caller: null });
  const parsed = RPC_RESULTS.status.parse({ ...status, rows: status.rows.map((row) => ({ ...row, bridgeAttached: true })) });
  const row = parsed.rows.find((candidate) => candidate.key === "farag00001");
  expect(row?.state).toBe("unknown");
  expect(row?.alive).toBe(true);
});
