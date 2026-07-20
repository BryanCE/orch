// orchestrator-bridge — per-agent control plane for the Claude orchestrator.
//
// Writes $ORCH_DIR/agents/<KEY>/ (default ~/.orch) where <KEY> = ORCH_AGENT_KEY
// (e.g. "herdr~wD~p2") for orch agents, or "session-<pid>" for the
// owner's interactive TUI pane:
//   status.json  — state / model / thinking / tokens / cost / currentFile / lastText
//   result.json  — final assistant text of the last settled run
//   inbox.jsonl  — APPEND a JSON line {"text":"..."} to steer this agent mid-run
//   ack.jsonl    — APPEND {"id":...,"ts":...} per consumed inbox line that carries
//                  a message id, so the daemon marks that outbox row delivered once
//
// Read by the `orch` CLI. Inert failures: every write is best-effort.
//
// This file is the composition root ONLY: it builds the presence binding, the
// daemon ack transport and the tool layer, then wires the selected plexer's HUD
// to them. All plexer-gated behaviour lives under src/backends/<plexer>/ per
// CLAUDE.md Rule 10 — this module names no backend beyond the wiring below.
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { activePaneHud } from "../../src/backends/hud.ts";
import { createDaemonAck } from "./daemon-ack.ts";
import { AGENT_ID, ORCH_DIR, createPiPresence } from "./presence.ts";
import { registerPiTools } from "./tools.ts";

// The digest must stay byte-identical to computeCodeHash in src/daemon/lifecycle.ts; doctor compares the two.
function hashExtensionFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 12);
}

const EXTENSION_HASH = hashExtensionFile(fileURLToPath(import.meta.url));

function orchestratorBridgeExtension(pi: ExtensionAPI): void {
  const hud = activePaneHud();
  const paneId = hud.paneHandle;

  hud.registerPaneState(
    {
      onSessionStart: (handler) => pi.on("session_start", (_event, ctx) => handler(ctx)),
      onAgentStart: (handler) => pi.on("agent_start", (_event, ctx) => handler(ctx)),
      onAgentEnd: (handler) => pi.on("agent_end", (event) => handler(event)),
      onSessionShutdown: (handler) => pi.on("session_shutdown", (event) => handler(event)),
    },
    pi.events,
    { agentId: AGENT_ID, extensionHash: EXTENSION_HASH },
  );

  const presence = createPiPresence({
    pi,
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

  const { onBlockedChange } = registerPiTools(pi, {
    presence,
    notify: hud.notify,
    refreshLabels,
  });

  hud.registerBlockedRelay(pi.events, onBlockedChange);
}

export default orchestratorBridgeExtension;
