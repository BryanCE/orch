import { afterEach, describe, expect, test } from "bun:test";
import { spawnHeadless } from "../src/daemon/server/handlers/lifecycle.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { heldBackend } from "../src/backends/registry.ts";
import { hostIdFrom, hostShell } from "../src/host.ts";
import { agentView } from "../src/store/agent-view.ts";
import { selectOpenOutboxForTarget } from "../src/store/outbox-rows.ts";
import type { ModelCatalogue } from "../src/types/adapter.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { Services } from "../src/types/services.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";
import { FakePtyProvider } from "./helpers/fake-pty.ts";
import { testServices } from "./helpers/services.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const dirs: OrchDir[] = [];

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop()!);
});

const PI_MODELS = "provider model context max-out thinking images\nopenai gpt-5.6-luna 400K 128K yes yes\n";

/** Services whose model catalogue answers from memory, so admitting a model runs no harness. */
function servicesAt(orchDir: OrchDir): Services {
  const services = testServices({ orchDir, settings: { enabled: { adapters: ["pi"], backends: ["headless"] } } });
  const models: ModelCatalogue = { ...services.models, read: () => PI_MODELS };
  return { ...services, models };
}

describe("a spawn another host asks for", () => {
  test("runs the interactive harness in a PTY orchd holds, recorded as held, with its prompt queued", async () => {
    const orchDir = tempOrchDir("orch-held-spawn-");
    dirs.push(orchDir);
    const provider = new FakePtyProvider();
    const state = idleDaemonState(servicesAt(orchDir), orchDir, provider);
    const key = mintAgentId();

    const result = await spawnHeadless(state, {
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
    expect(state.held.has(key)).toBe(true);
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
});
