// A headless agent started on this host for the orchd on the other end of a link. The
// agent runs here, with the relay directory as its ORCH_DIR, so everything it reports
// reaches that orchd, and with that orchd's host named in its env, so it never starts an
// orchd here. Nothing is recorded here: that orchd records the agent and owns it.
import { resolveAdapter } from "../adapters/registry.ts";
import { headlessBackend } from "../backends/registry.ts";
import { LINKED_DAEMON_ENV } from "../daemon/client/runtime-files.ts";
import type { OrchDir } from "../types/core.ts";
import type { HostIdentity } from "../types/host.ts";
import type { HostParamsOf, HostResultOf } from "./protocol.ts";

/** Where an origin's agents live on this host, once its link opened the relay. */
export interface OpenRelay {
  readonly orchDir: OrchDir;
  readonly origin: HostIdentity;
}

export function launchForOrigin(relay: OpenRelay, params: HostParamsOf<"launch">): HostResultOf<"launch"> {
  const adapter = resolveAdapter(params.adapter);
  if (!adapter) throw new Error(`this host has no ${params.adapter} harness`);
  const launched = headlessBackend.launch(adapter, {
    key: params.key,
    name: params.name,
    cwd: params.cwd,
    prompt: params.prompt,
    model: params.model,
    thinking: params.thinking,
    preferredModels: params.preferredModels,
    tools: params.tools,
    workers: params.workers,
    env: { ...params.env, [LINKED_DAEMON_ENV]: relay.origin.name },
    orchDir: relay.orchDir,
  });
  return { handle: JSON.stringify(launched.handle), process: launched.process };
}
