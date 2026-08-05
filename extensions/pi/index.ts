// orch's pi integration — the composition root, and the ONLY file that names pi.
//
// Everything this wires together is orch's own in-agent control plane
// (src/agent/**): the presence binding that writes $ORCH_DIR/agents/<KEY>/, the
// tool layer, the peer surface, and the fleet monitor. None of it imports a
// harness package, so a machine with a different pi build — or none — still
// typechecks and bundles it.
//
// What lives HERE is pi's vocabulary and nothing else: pi's event names and pi's
// adapter id. A sibling build's event name appearing in this file, or pi's
// appearing in src/agent/**, is the pair code CLAUDE.md Rule 9 forbids.
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { activePaneHud } from "../../src/backends/hud.ts";
import { createDaemonAck } from "../../src/agent/daemon-ack.ts";
import { registerFleetMonitor } from "../../src/agent/monitor.ts";
import { ORCH_DIR, createAgentPresence } from "../../src/agent/presence.ts";
import { registerAgentTools } from "../../src/agent/tools.ts";
import type { HarnessApi, HarnessIdentity } from "../../src/agent/harness.ts";

/** pi calls itself `pi`, and fires `agent_settled` when a run will not auto-continue. */
const PI_IDENTITY: HarnessIdentity = { agentId: "pi", settleEvent: "agent_settled" };

// The digest must stay byte-identical to computeCodeHash in src/daemon/lifecycle.ts; doctor compares the two.
function hashExtensionFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 12);
}

const EXTENSION_HASH = hashExtensionFile(fileURLToPath(import.meta.url));

function orchestratorBridgeExtension(harness: HarnessApi): void {
  const hud = activePaneHud();
  const paneId = hud.paneHandle;

  hud.registerPaneState(
    {
      onSessionStart: (handler) => harness.on("session_start", (_event, ctx) => handler(ctx)),
      onAgentStart: (handler) => harness.on("agent_start", (_event, ctx) => handler(ctx)),
      onAgentEnd: (handler) => harness.on("agent_end", (event) => handler(event)),
      onSessionShutdown: (handler) => harness.on("session_shutdown", (event) => handler(event)),
    },
    harness.events,
    { agentId: PI_IDENTITY.agentId, extensionHash: EXTENSION_HASH },
  );

  const presence = createAgentPresence({
    harness,
    identity: PI_IDENTITY,
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
    identity: PI_IDENTITY,
    notify: hud.notify,
    refreshLabels,
  });

  hud.registerBlockedRelay(harness.events, onBlockedChange);
  // A pi session that orchestrates also watches: one daemon subscription for the
  // whole session, so a worker going blocked surfaces instead of being polled for.
  registerFleetMonitor(harness, ORCH_DIR);
}

export default orchestratorBridgeExtension;
