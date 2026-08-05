// orch's omp integration — the composition root, and the ONLY file that names omp.
//
// omp (oh-my-pi) is a separate harness that happens to expose a pi-shaped
// extension API. It gets its OWN integration, not pi's: this file imports the
// same harness-neutral control plane from src/agent/** that pi's does, and
// supplies omp's vocabulary on top.
//
// Where omp differs from pi and that difference is load-bearing:
//   settle    omp fires `session_stop` ("a main-agent turn is about to settle");
//             it has no `agent_settled`. Binding pi's name here would leave every
//             successful run writing no result.json and never reaching `done`.
//   model     omp emits no `model_select` / `thinking_level_select`. The presence
//             heartbeat re-reads ctx.model and getThinkingLevel(), so an in-TUI
//             switch lands one tick later rather than not at all.
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { activePaneHud } from "../../src/backends/hud.ts";
import { createDaemonAck } from "../../src/agent/daemon-ack.ts";
import { registerFleetMonitor } from "../../src/agent/monitor.ts";
import { ORCH_DIR, createAgentPresence } from "../../src/agent/presence.ts";
import { registerAgentTools } from "../../src/agent/tools.ts";
import type { HarnessApi, HarnessIdentity } from "../../src/agent/harness.ts";

/** omp calls itself `omp`, and fires `session_stop` when a run will not auto-continue. */
const OMP_IDENTITY: HarnessIdentity = { agentId: "omp", settleEvent: "session_stop" };

// The digest must stay byte-identical to computeCodeHash in src/daemon/lifecycle.ts; doctor compares the two.
function hashExtensionFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 12);
}

const EXTENSION_HASH = hashExtensionFile(fileURLToPath(import.meta.url));

function orchestratorBridgeExtension(omp: ExtensionAPI): void {
  const harness = omp as unknown as HarnessApi;
  const hud = activePaneHud();
  const paneId = hud.paneHandle;

  hud.registerPaneState(
    {
      onSessionStart: (handler) => omp.on("session_start", (_event, ctx) => handler(ctx)),
      onAgentStart: (handler) => omp.on("agent_start", (_event, ctx) => handler(ctx)),
      onAgentEnd: (handler) => omp.on("agent_end", (event) => handler(event)),
      onSessionShutdown: (handler) => omp.on("session_shutdown", (event) => handler(event)),
    },
    omp.events,
    { agentId: OMP_IDENTITY.agentId, extensionHash: EXTENSION_HASH },
  );

  const presence = createAgentPresence({
    harness,
    identity: OMP_IDENTITY,
    paneId,
    extensionHash: EXTENSION_HASH,
    ack: createDaemonAck(ORCH_DIR),
    reportStatus: hud.statusReporter(paneId),
  });

  async function refreshLabels(): Promise<void> {
    const applied = await hud.readLabels((labels) => {
      presence.state.label = labels.label;
      presence.state.tabLabel = labels.tabLabel;
    });
    if (applied) presence.writeStatus();
  }

  const { onBlockedChange } = registerAgentTools(harness, {
    presence,
    identity: OMP_IDENTITY,
    notify: hud.notify,
    refreshLabels,
  });

  hud.registerBlockedRelay(omp.events, onBlockedChange);
  // An omp session that orchestrates also watches: one daemon subscription for the
  // whole session, so a worker going blocked surfaces instead of being polled for.
  registerFleetMonitor(harness, ORCH_DIR);
}

export default orchestratorBridgeExtension;
