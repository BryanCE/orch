// A held agent on another host's orchd, driven from this one: the far orchd runs the agent's
// harness in a PTY it holds, and this orchd keeps the reference row and a live link to it.
import { startFarOrchd, type FarOrchd } from "./far-orchd.ts";
import { FakePtyProvider, type FakePty } from "./fake-pty.ts";
import { idleDaemonState } from "./daemon-state.ts";
import { seedOperator } from "./agent.ts";
import { testDaemonServices } from "./services.ts";
import { removeTempDir, tempOrchDir } from "./tempdir.ts";
import { spawnHeadless } from "../../src/daemon/server/handlers/lifecycle.ts";
import { registerHostedAgent } from "../../src/store/spawn-registration.ts";
import { HostLinks } from "../../src/hosts/link.ts";
import { hostIdentity } from "../../src/hosts/identity.ts";
import { mintAgentId } from "../../src/shared/agent-id.ts";
import { rpcCall } from "../../src/daemon/client/rpc.ts";
import { splitThinkingSuffix } from "../../src/policy/thinking.ts";
import { attachBridge, detachBridge, type BridgeLink } from "../../src/control/bridge-links.ts";
import type { BridgeDelivery } from "../../src/shared/bridge-message.ts";
import type { HostGreeting } from "../../src/types/host.ts";
import type { ModelCatalogue } from "../../src/types/adapter.ts";
import type { OrchDir } from "../../src/types/core.ts";
import type { DaemonState } from "../../src/daemon/server/state.ts";

/** The pi models every held far agent here may run on. */
export const HELD_FAR_MODELS = ["openai/gpt-5.6-luna", "openai/gpt-5.6-sol"] as const;

const PI_LISTING = `provider model context max-out thinking images\n${HELD_FAR_MODELS.map((spec) => `${spec.replace("/", " ")} 400K 128K yes yes`).join("\n")}\n`;

/** A far orchd whose held PTYs are fakes the test plays, each running as this test's process. */
export interface HeldFar extends FarOrchd {
  readonly ptys: FakePtyProvider;
}

/** Start a far orchd that holds PTYs whose program reads as live, and lists {@link HELD_FAR_MODELS}. */
export async function startHeldFar(greeting: HostGreeting): Promise<HeldFar> {
  // Every PTY program is this runner, so each held process reads as a running harness.
  const ptys = new FakePtyProvider(() => process.pid);
  // The listing pi gives, answered from memory: no harness runs.
  const models: ModelCatalogue = { read: () => PI_LISTING, warm: () => Promise.resolve(), forget: () => undefined };
  const far = await startFarOrchd(greeting, { pty: ptys, models });
  return { ...far, ptys };
}

export interface HeldFarAgentOptions {
  readonly name?: string;
  /** The work it starts on; none and it idles for its first dispatch. */
  readonly prompt?: string | null;
  /** The agent on the asking host that spawned it. */
  readonly spawner?: string | null;
}

/** Spawn a pi agent on the far orchd as this host's orchd asks for one: held in a PTY there. */
export async function heldFarAgent(far: HeldFar, opts: HeldFarAgentOptions = {}): Promise<{ readonly key: string; readonly pty: FakePty }> {
  const key = mintAgentId();
  await spawnHeadless(far.state, {
    key,
    name: opts.name ?? key,
    spawner: opts.spawner ?? null,
    adapter: "pi",
    model: HELD_FAR_MODELS[0],
    thinking: "medium",
    prompt: opts.prompt ?? null,
    cwd: far.orchDir,
  }, hostIdentity().id);
  return { key, pty: far.ptys.last() };
}

const bridges: { readonly orchDir: OrchDir; readonly key: string; readonly link: BridgeLink }[] = [];

/**
 * What the held agent's bridge does on the far host: hold a link for its key, take what orchd
 * pushes, and report back over that orchd's socket as the pi bridge does. Text and answers are
 * acked; a model is reported applied. Answers every delivery it took, in order.
 */
export function attachFakeBridge(far: FarOrchd, key: string): BridgeDelivery[] {
  const deliveries: BridgeDelivery[] = [];
  const report = async (delivery: BridgeDelivery): Promise<void> => {
    const { id, message } = delivery;
    if (message.action !== "model") {
      await rpcCall(far.orchDir, "ack", { id });
      return;
    }
    const { bare, thinking } = splitThinkingSuffix(message.model);
    await rpcCall(far.orchDir, "control-outcome", { id, key, command: "model", applied: { model: bare, ...(thinking === undefined ? {} : { thinking }) } });
  };
  const link: BridgeLink = {
    push: (delivery) => {
      deliveries.push(delivery);
      setTimeout(() => { void report(delivery); }, 0);
    },
    close: () => undefined,
  };
  attachBridge(far.orchDir, key, link);
  bridges.push({ orchDir: far.orchDir, key, link });
  return deliveries;
}

/** Drop every fake bridge attached, for a test's afterEach. */
export function detachFakeBridges(): void {
  for (const { orchDir, key, link } of bridges.splice(0)) detachBridge(orchDir, key, link);
}

/** This host's orchd, linked to `far` as the host named box, holding the reference row of
 *  `key` with this test's operator as its spawner, as `orch spawn --host box` leaves it. */
export interface NearOrchd {
  readonly orchDir: OrchDir;
  readonly state: DaemonState;
  /** The operator that spawned it, holding its lease. */
  readonly operator: string;
  close(): void;
}

export async function nearOrchd(far: FarOrchd, key: string): Promise<NearOrchd> {
  const orchDir = tempOrchDir("orch-held-near-");
  const services = testDaemonServices({ orchDir, settings: { hosts: { box: { dest: "box" } }, links: { request_timeout_ms: 2_000 } } });
  const hosts = new HostLinks({ orchDir, settings: () => services.settings.current(), logger: services.logger, spawn: far.spawner(), events: () => undefined });
  await hosts.link("box").connect();
  const operator = seedOperator(orchDir);
  registerHostedAgent(orchDir, { key, harnessId: "pi", cwd: far.orchDir, name: key, model: HELD_FAR_MODELS[0], thinking: "medium", spawner: operator, host: far.greeting.host });
  return {
    orchDir,
    state: { ...idleDaemonState(services, orchDir), hosts },
    operator,
    close: () => {
      hosts.closeAll();
      removeTempDir(orchDir);
    },
  };
}
