// A held agent on another host's orchd, driven from this one: the far orchd runs the agent's
// harness in a PTY it holds, and this orchd keeps the reference row and a live link to it.
import { startFarOrchd, type FarOrchd } from "./far-orchd.ts";
import { FakePtyProvider } from "./fake-pty.ts";
import { idleDaemonState } from "./daemon-state.ts";
import { seedOperator } from "./agent.ts";
import { testDaemonServices } from "./services.ts";
import { recordingLogger } from "./logger.ts";
import { removeTempDir, tempOrchDir } from "./tempdir.ts";
import { spawnHeadless } from "../../src/daemon/server/handlers/lifecycle.ts";
import { registerHostedAgent } from "../../src/store/spawn-registration.ts";
import { probeAllProcesses } from "../../src/presence/store.ts";
import { HostLinks, type LinkProcess, type LinkSpawner } from "../../src/hosts/link.ts";
import { hostIdentity } from "../../src/hosts/identity.ts";
import { mintAgentId } from "../../src/shared/agent-id.ts";
import { rpcCall } from "../../src/daemon/client/rpc.ts";
import { splitThinkingSuffix } from "../../src/policy/thinking.ts";
import { applyHostEvent, reconcileHostAgents } from "../../src/daemon/server/host-events.ts";
import { rpcHandlers } from "../../src/daemon/server/handlers/table.ts";
import { startRpcServer } from "../../src/daemon/server/rpc.ts";
import { attachBridge, detachBridge, type BridgeLink } from "../../src/control/bridge-links.ts";
import type { BridgeDelivery } from "../../src/shared/bridge-message.ts";
import type { HostGreeting } from "../../src/types/host.ts";
import type { ModelCatalogue } from "../../src/types/adapter.ts";
import type { OrchDir } from "../../src/types/core.ts";
import type { PtyProcess, PtyProvider } from "../../src/types/pty.ts";
import type { ThinkingLevel } from "../../src/types/policy.ts";
import type { DaemonState } from "../../src/daemon/server/state.ts";

/** The pi models every held far agent here may run on. */
export const HELD_FAR_MODELS = ["openai/gpt-5.6-luna", "openai/gpt-5.6-sol"] as const;

const PI_LISTING = `provider model context max-out thinking images\n${HELD_FAR_MODELS.map((spec) => `${spec.replace("/", " ")} 400K 128K yes yes`).join("\n")}\n`;
const CLAUDE_LISTING = JSON.stringify({ type: "control_response", response: { subtype: "success", request_id: "models", response: { models: [{ value: "haiku" }] } } });

/** Every harness's model listing, from memory: admitting a model runs no harness. claude
 *  answers haiku; every other harness answers {@link HELD_FAR_MODELS} as pi does. */
export const HELD_FAR_CATALOGUE: ModelCatalogue = {
  read: (bin) => (bin === "claude" ? CLAUDE_LISTING : PI_LISTING),
  warm: () => Promise.resolve(),
  forget: () => undefined,
};

/** Where a far orchd's held PTYs come from: it keeps every PTY it made, newest last, and
 *  ends any program still running when the far orchd closes. */
export interface HeldPtys<T extends PtyProcess = PtyProcess> extends PtyProvider {
  last(): T;
  close?(): void;
}

/** A far orchd whose held PTYs come from `ptys`. */
export interface HeldFar<P extends HeldPtys = FakePtyProvider> extends FarOrchd {
  readonly ptys: P;
}

export interface HeldFarOptions {
  /** The model listing its harnesses answer: {@link HELD_FAR_CATALOGUE} when absent. */
  readonly models?: ModelCatalogue;
  /** Timeouts beside the short write ack every far orchd here has. */
  readonly timeouts?: Readonly<Record<string, number>>;
}

/** Start a far orchd that holds PTYs from `ptys`: fakes whose program is this runner when
 *  absent, so each held process reads as a running harness. */
export function startHeldFar(greeting: HostGreeting, options?: HeldFarOptions): Promise<HeldFar>;
export function startHeldFar<P extends HeldPtys>(greeting: HostGreeting, options: HeldFarOptions & { readonly ptys: P }): Promise<HeldFar<P>>;
export async function startHeldFar(greeting: HostGreeting, options: HeldFarOptions & { readonly ptys?: HeldPtys } = {}): Promise<HeldFar<HeldPtys>> {
  const ptys: HeldPtys = options.ptys ?? new FakePtyProvider(() => process.pid);
  const far = await startFarOrchd(greeting, { pty: ptys, models: options.models ?? HELD_FAR_CATALOGUE, timeouts: options.timeouts });
  return {
    ...far,
    ptys,
    close: async () => {
      ptys.close?.();
      await far.close();
    },
  };
}

export interface HeldFarAgentOptions {
  readonly name?: string;
  /** The work it starts on; none and it idles for its first dispatch. */
  readonly prompt?: string | null;
  /** The agent on the asking host that spawned it. */
  readonly spawner?: string | null;
  readonly thinking?: ThinkingLevel;
  /** Where it runs on the far host: the far orchd's dir when absent. */
  readonly cwd?: string;
}

/** Spawn a pi agent on the far orchd as this host's orchd asks for one: held in a PTY there. */
export async function heldFarAgent<T extends PtyProcess>(far: HeldFar<HeldPtys<T>>, opts: HeldFarAgentOptions = {}): Promise<{ readonly key: string; readonly pty: T }> {
  const key = mintAgentId();
  await spawnHeadless(far.state, {
    key,
    name: opts.name ?? key,
    spawner: opts.spawner ?? null,
    adapter: "pi",
    model: HELD_FAR_MODELS[0],
    thinking: opts.thinking ?? "medium",
    prompt: opts.prompt ?? null,
    cwd: opts.cwd ?? far.orchDir,
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

export interface NearOrchdOptions {
  /** The reference row's name: its key when absent. */
  readonly name?: string;
  /** Where the far agent runs, as the reference row records it: the far orchd's dir when absent. */
  readonly cwd?: string;
  /** The model and thinking the reference row was launched with: {@link HELD_FAR_MODELS}' first, medium. */
  readonly model?: string;
  readonly thinking?: ThinkingLevel;
  /** Who spawned it here: this test's seeded operator, holding its lease, when absent; null for no spawner. */
  readonly spawner?: "operator" | null;
  /** Apply the far orchd's events to this orchd's state, as orchd's boot wires its links. Off when absent. */
  readonly followEvents?: boolean;
  /** Serve this orchd's real handler table on its socket, so a test reaches it as the CLI does. Off when absent. */
  readonly serve?: boolean;
  /** Link settings beside the request timeout of two seconds. */
  readonly links?: Readonly<Record<string, number>>;
}

/** This host's orchd, linked to a far orchd as the host named box, holding the reference row of
 *  one agent there, as `orch spawn --host box` leaves it. */
export interface NearOrchd {
  readonly orchDir: OrchDir;
  readonly state: DaemonState;
  /** The operator that spawned it, holding its lease; null when the row has no spawner. */
  readonly operator: string | null;
  /** End the far side of the link as a dropped connection would: the link is still wanted. */
  readonly drop: () => Promise<void>;
  /** How many times this host has dialed the far one. */
  readonly dials: () => number;
  close(): Promise<void>;
}

export async function nearOrchd(far: FarOrchd, key: string, options: NearOrchdOptions = {}): Promise<NearOrchd> {
  const orchDir = tempOrchDir("orch-held-near-");
  const services = testDaemonServices({
    orchDir,
    settings: { hosts: { box: { dest: "box" } }, links: { request_timeout_ms: 2_000, ...options.links } },
    models: far.state.services.models,
  });
  const children: LinkProcess[] = [];
  const spawn: LinkSpawner = (...args) => {
    const child = far.spawner()(...args);
    children.push(child);
    return child;
  };
  const follow = options.followEvents ?? false;
  const hosts = new HostLinks({
    orchDir, settings: () => services.settings.current(), logger: services.logger, spawn,
    changed: () => { probeAllProcesses(orchDir); },
    events: (host, event) => { if (follow) applyHostEvent(state, host, event); },
    agents: (host, rows, askedAt) => { if (follow) reconcileHostAgents(state, host, rows, askedAt); },
  });
  const state: DaemonState = { ...idleDaemonState(services, orchDir), hosts };
  if (options.serve ?? false) state.server = await startRpcServer(orchDir, rpcHandlers(state), { logger: recordingLogger().logger });
  const operator = options.spawner === null ? null : seedOperator(orchDir);
  registerHostedAgent(orchDir, {
    key,
    harnessId: "pi",
    cwd: options.cwd ?? far.orchDir,
    name: options.name ?? key,
    model: options.model ?? HELD_FAR_MODELS[0],
    thinking: options.thinking ?? "medium",
    spawner: operator,
    host: far.greeting.host,
  });
  await hosts.link("box").connect();
  return {
    orchDir,
    state,
    operator,
    drop: async () => {
      const child = children.at(-1);
      child?.kill();
      await child?.exited;
    },
    dials: () => children.length,
    close: async () => {
      hosts.closeAll();
      await state.server?.close();
      removeTempDir(orchDir);
    },
  };
}
