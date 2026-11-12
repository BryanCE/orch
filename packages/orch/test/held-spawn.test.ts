import { errorMessage } from "../src/util.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { placeHere } from "../src/process-place.ts";
import { spawnHeadless } from "../src/daemon/server/handlers/lifecycle.ts";
import { mintAgentId } from "../src/shared/agent-id.ts";
import { heldBackend } from "../src/backends/registry.ts";
import { hostIdFrom, hostShell } from "../src/host.ts";
import { hostIdentity } from "../src/hosts/identity.ts";
import { agentView } from "../src/store/agent-view.ts";
import { selectOpenOutboxForTarget } from "../src/store/outbox-rows.ts";
import { attachLink, detachLink, type AgentLink } from "../src/control/agent-links.ts";
import type { BridgeDelivery } from "../src/shared/bridge-message.ts";
import { drainOutbox, redeliverOpenRows } from "../src/daemon/server/outbox.ts";
import { outboxDeps } from "../src/daemon/server/handlers/write.ts";
import type { ModelCatalogue } from "../src/types/adapter.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { DaemonServices } from "../src/types/services.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";
import { FakePtyProvider } from "./helpers/fake-pty.ts";
import { testDaemonServices } from "./helpers/services.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const dirs: OrchDir[] = [];
const links: { readonly directory: OrchDir; readonly key: string; readonly link: AgentLink }[] = [];

afterEach(() => {
  for (const { directory, key, link } of links.splice(0)) detachLink(directory, key, link);
  while (dirs.length) removeTempDir(dirs.pop()!);
});

/** What a bridge does when it dials orchd: hold a link for its key and take what is pushed. */
function attachFakeBridge(directory: OrchDir, key: string): BridgeDelivery[] {
  const deliveries: BridgeDelivery[] = [];
  const link: AgentLink = { takes: ["dispatch", "steer", "answer", "model"], abort: null, push: (delivery): void => { deliveries.push(delivery); }, close: () => undefined };
  attachLink(directory, key, link);
  links.push({ directory, key, link });
  return deliveries;
}

const PI_MODELS = "provider model context max-out thinking images\nopenai gpt-5.6-luna 400K 128K yes yes\n";

/** Services whose model catalogue answers from memory, so admitting a model runs no harness. */
function servicesAt(orchDir: OrchDir, fleet: Record<string, unknown> = {}): DaemonServices {
  const services = testDaemonServices({ orchDir, settings: { enabled: { adapters: ["pi"], backends: ["headless"] }, fleet } });
  const models: ModelCatalogue = { ...services.models, read: () => PI_MODELS };
  return { ...services, models };
}

describe("a spawn another host asks for", () => {
  test("a local terminal form uses the existing held start path and records its form", async () => {
    const orchDir = tempOrchDir("orch-local-held-form-");
    dirs.push(orchDir);
    const provider = new FakePtyProvider();
    const state = idleDaemonState(servicesAt(orchDir), orchDir, provider);
    const key = mintAgentId();
    const result = await spawnHeadless(state, {
      form: "tui", key, name: "local-held", spawner: null, adapter: "pi",
      model: "openai/gpt-5.6-luna", thinking: "medium", prompt: null, cwd: orchDir,
    });
    expect(result).toMatchObject({ form: "tui", backend: heldBackend.id });
    expect(agentView(orchDir, key)?.form).toBe("tui");
    expect(provider.spawned).toHaveLength(1);
  });
  test("runs the interactive harness in a PTY orchd holds, recorded as held, with its prompt queued", async () => {
    const orchDir = tempOrchDir("orch-held-spawn-");
    dirs.push(orchDir);
    const provider = new FakePtyProvider();
    const state = idleDaemonState(servicesAt(orchDir), orchDir, provider);
    const key = mintAgentId();

    const result = await spawnHeadless(state, {
      form: null,
      key,
      name: "far-worker",
      spawner: "spawner-on-the-other-host",
      adapter: "pi",
      model: "openai/gpt-5.6-luna",
      thinking: "medium",
      prompt: "do the work",
      cwd: orchDir,
    }, hostIdFrom("the-other-host"));

    const pty = provider.last();
    expect(state.held.has({ kind: "agent", agent: placeHere(orchDir, key) })).toBe(true);
    expect(pty.request.file).toBe(hostShell()[0]);
    expect(pty.request.args.slice(0, -1)).toEqual(hostShell().slice(1));
    expect(pty.request.cwd).toBe(orchDir);
    expect(result).toMatchObject({ key, backend: heldBackend.id, handle: String(pty.pid), process: { pid: pty.pid } });

    const view = agentView(orchDir, key);
    expect(view?.environment.plexer).toBe(heldBackend.id);
    expect(view?.environment.handle).toBe(String(pty.pid));
    // The spawner is an agent on the host that asked, never a row here.
    expect(view?.spawnedBy).toBeNull();

    const queued = selectOpenOutboxForTarget(orchDir, key);
    expect(queued.map((row) => row.payload)).toEqual([{ action: "dispatch", text: "do the work" }]);
  });

  test("a spawn with no work starts the agent and queues nothing: it idles for its first dispatch", async () => {
    const orchDir = tempOrchDir("orch-held-no-prompt-");
    dirs.push(orchDir);
    const state = idleDaemonState(servicesAt(orchDir), orchDir, new FakePtyProvider());
    const key = mintAgentId();
    await spawnHeadless(state, {
      form: null, key, name: "far-idle", spawner: "spawner-on-the-other-host", adapter: "pi",
      model: "openai/gpt-5.6-luna", thinking: "medium", prompt: null, cwd: orchDir,
    }, hostIdFrom("the-other-host"));
    expect(state.held.has({ kind: "agent", agent: placeHere(orchDir, key) })).toBe(true);
    expect(selectOpenOutboxForTarget(orchDir, key)).toEqual([]);
  });

  test("is refused once this host is at its own fleet.max_agents_total, naming the host, and starts no PTY", async () => {
    const orchDir = tempOrchDir("orch-held-host-cap-");
    dirs.push(orchDir);
    // Every fake PTY is this test process, so the first agent reads as running here.
    const provider = new FakePtyProvider(() => process.pid);
    const state = idleDaemonState(servicesAt(orchDir, { max_agents_total: 1 }), orchDir, provider);
    const ask = (name: string): Promise<string | null> => spawnHeadless(state, {
      form: null, key: mintAgentId(), name, spawner: "spawner-on-the-other-host", adapter: "pi",
      model: "openai/gpt-5.6-luna", thinking: "medium", prompt: null, cwd: orchDir,
    }, hostIdFrom("the-other-host")).then(() => null, (error: unknown) => errorMessage(error));

    expect(await ask("far-first")).toBeNull();
    expect(await ask("far-second")).toBe(`spawn refused: would put host ${hostIdentity().name} at 2/1 agents (1 live + 1 requested; fleet.max_agents_total)`);
    expect(provider.spawned).toHaveLength(1);
  });

  test("a headless spawn here with no prompt is refused: it would exit before any dispatch", async () => {
    const orchDir = tempOrchDir("orch-headless-no-prompt-");
    dirs.push(orchDir);
    const state = idleDaemonState(servicesAt(orchDir), orchDir, new FakePtyProvider());
    const key = mintAgentId();
    const refused = await spawnHeadless(state, {
      form: "oneshot", key, name: "here-idle", spawner: null, adapter: "pi",
      model: "openai/gpt-5.6-luna", thinking: "medium", prompt: null, cwd: orchDir,
    }).then(() => null, (error: unknown) => errorMessage(error));
    expect(refused).toBe(`cannot spawn ${key}: a headless agent needs its prompt at launch`);
  });

  test("its queued first prompt waits for its bridge and reaches it once the bridge attaches", async () => {
    const orchDir = tempOrchDir("orch-held-first-prompt-");
    dirs.push(orchDir);
    // The PTY program is this runner, so the held process reads as live, as a started harness does.
    const state = idleDaemonState(servicesAt(orchDir), orchDir, new FakePtyProvider(process.pid));
    const key = mintAgentId();

    await spawnHeadless(state, {
      form: null,
      key,
      name: "far-worker",
      spawner: "spawner-on-the-other-host",
      adapter: "pi",
      model: "openai/gpt-5.6-luna",
      thinking: "medium",
      prompt: "do the work",
      cwd: orchDir,
    }, hostIdFrom("the-other-host"));

    // The wake drains the outbox before the harness has started its bridge: the prompt stays queued.
    await drainOutbox(orchDir, outboxDeps(state));
    const [queued] = selectOpenOutboxForTarget(orchDir, key);
    if (queued === undefined) throw new Error("the first prompt left the outbox before any bridge attached");
    expect(queued.payload).toEqual({ action: "dispatch", text: "do the work" });

    const deliveries = attachFakeBridge(orchDir, key);
    await redeliverOpenRows(orchDir, key, outboxDeps(state));
    expect(deliveries).toEqual([{ id: queued.id, message: { action: "dispatch", text: "do the work" } }]);
  });
});
