// orch's pi integration — the composition root, and the ONLY file that names pi.
//
// The wiring itself lives in src/agent/harness-bridge.ts and names no harness.
// What belongs HERE is pi's vocabulary and nothing else: pi's event names and
// pi's adapter id. A sibling build's event name appearing in this file, or pi's
// appearing in src/agent/**, is the pair code CLAUDE.md Rule 9 forbids.
import { fileURLToPath } from "node:url";
import { hashExtensionFile, registerHarnessBridge } from "../../src/agent/harness-bridge.ts";
import { ORCH_DIR } from "../../src/agent/presence.ts";
import { registerOrchSeat } from "../../src/seat/index.ts";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { HarnessApi, HarnessIdentity } from "../../src/agent/harness.ts";

/** pi calls itself `pi`, and fires `agent_settled` when a run will not auto-continue. */
const PI_IDENTITY: HarnessIdentity = { agentId: "pi", settleEvent: "agent_settled" };

const EXTENSION_HASH = hashExtensionFile(fileURLToPath(import.meta.url));

function piExtension(harness: HarnessApi): void {
  const bridge = registerHarnessBridge(harness, PI_IDENTITY, EXTENSION_HASH, { fleet: false });
  // The shared bridge exposes only the common harness surface; the orchestrator
  // seat (status line, /orch dashboard, per-agent views) needs pi's richer UI,
  // which is available in this harness-specific composition root.
  registerOrchSeat(harness as unknown as ExtensionAPI, {
    orchDir: ORCH_DIR,
    ownKey: bridge.ownKey,
  });
}

export default piExtension;
