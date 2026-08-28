// orch's omp integration — the composition root, and the ONLY file that names omp.
//
// omp (oh-my-pi) is a separate harness that happens to expose a pi-shaped
// extension API. It gets its OWN integration, not pi's: the shared wiring comes
// from src/agent/harness-bridge.ts, and this file supplies omp's vocabulary.
//
// Where omp differs from pi and that difference is load-bearing:
//   settle    omp fires `session_stop` ("a main-agent turn is about to settle");
//             it has no `agent_settled`. Binding pi's name here would leave every
//             successful run writing no result.json and never reaching `done`.
//   model     omp emits no `model_select` / `thinking_level_select`. The presence
//             heartbeat re-reads ctx.model and getThinkingLevel(), so an in-TUI
//             switch lands one tick later rather than not at all.
import { fileURLToPath } from "node:url";
import { hashExtensionFile, registerHarnessBridge } from "../../src/agent/harness-bridge.ts";
import { orchDir } from "../../src/presence/writer.ts";
import { registerOrchSeat } from "../../src/seat/index.ts";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { HarnessApi, HarnessIdentity } from "../../src/agent/harness.ts";

/** omp calls itself `omp`, and fires `session_stop` when a run will not auto-continue. */
const OMP_IDENTITY: HarnessIdentity = { agentId: "omp", settleEvent: "session_stop" };

const EXTENSION_HASH = hashExtensionFile(fileURLToPath(import.meta.url));

function ompExtension(harness: HarnessApi): void {
  const bridge = registerHarnessBridge(harness, OMP_IDENTITY, EXTENSION_HASH, { fleet: false });
  // omp's extension surface is pi-shaped, so the orchestrator seat (status
  // line, /orch-view dashboard, per-agent views) ships here too — enabling omp
  // as a harness in setup/settings is the consent for this integration.
  registerOrchSeat(harness as unknown as ExtensionAPI, {
    orchDir: orchDir(),
    ownKey: bridge.ownKey,
  });
}

export default ompExtension;
