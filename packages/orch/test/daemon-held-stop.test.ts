import { afterEach, describe, expect, test } from "bun:test";
import { cmdDaemon, confirmEndsHeld } from "../src/commands/daemon.ts";
import { rpcHandlers } from "../src/daemon/server/handlers/table.ts";
import { startRpcServer } from "../src/daemon/server/rpc.ts";
import { rpcCall } from "../src/daemon/client/rpc.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import type { Services } from "../src/types/services.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";
import { testServices } from "./helpers/services.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const dirs: OrchDir[] = [];
const servers: RpcServer[] = [];

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

/** orchd on a temp dir, holding one agent's PTY. */
async function daemonHoldingOne(): Promise<Services> {
  const orchDir = tempOrchDir("orch-daemon-held-");
  dirs.push(orchDir);
  const services = testServices({ orchDir, settings: {} });
  const state = idleDaemonState(services, orchDir);
  await state.held.start("agent-a", { file: "sh", args: [], cwd: orchDir, env: {} });
  const server = await startRpcServer(orchDir, rpcHandlers(state), { logger: services.logger });
  state.server = server;
  servers.push(server);
  return services;
}

describe("stopping orchd while it holds agents", () => {
  test("daemon-status counts the held agents", async () => {
    const services = await daemonHoldingOne();
    expect((await rpcCall(services.orchDir, "daemon-status", undefined)).held).toBe(1);
  });

  test("reload names how many agents it would end and refuses without --yes", async () => {
    const services = await daemonHoldingOne();
    const refused = await cmdDaemon(services, ["reload"]).then(() => null, (error: unknown) => error);
    expect(refused).toBeInstanceOf(Error);
    expect(String(refused)).toContain("orchd holds 1 agent, and a reload ends it. Run 'orch daemon reload --yes' to reload it anyway.");
  });

  test("stop refuses with held agents, or when orchd cannot say, unless confirmed", () => {
    expect(() => confirmEndsHeld("stop", 2, false)).toThrow("orchd holds 2 agents, and a stop ends every one. Run 'orch daemon stop --yes' to stop it anyway.");
    expect(() => confirmEndsHeld("stop", null, false)).toThrow("how many agents it holds is unknown");
    expect(() => confirmEndsHeld("stop", 2, true)).not.toThrow();
    expect(() => confirmEndsHeld("stop", 0, false)).not.toThrow();
  });
});
