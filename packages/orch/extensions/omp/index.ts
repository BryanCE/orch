// orch's omp integration — the composition root, and the ONLY file that names omp.
//
// omp (oh-my-pi) is a separate harness that happens to expose a pi-shaped
// extension API. It gets its OWN integration, not pi's: the shared wiring comes
// from src/agent/harness-bridge.ts, and this file supplies omp's vocabulary.
//
// Where omp differs from pi and that difference is load-bearing:
//   settle    omp fires `session_stop` ("a main-agent turn is about to settle");
//             it has no `agent_settled`. Binding pi's name here would leave every
//             successful run writing no results.jsonl and never reaching `done`.
//   model     omp emits no `model_select` / `thinking_level_select`. `agent_start`
//             re-reads ctx.model and getThinkingLevel(), so an in-TUI switch
//             lands at the next prompt rather than not at all.
import { fileURLToPath } from "node:url";
import { hashExtensionFile } from "orch/core/agent/harness-bridge.ts";
import { composePiShaped } from "../pi/compose.ts";
import type { HarnessApi } from "orch/core/types/agent.ts";
import { OMP_IDENTITY } from "./vocabulary.ts";

const EXTENSION_HASH = hashExtensionFile(fileURLToPath(import.meta.url));

function ompExtension(harness: HarnessApi): void {
  composePiShaped(harness, OMP_IDENTITY, EXTENSION_HASH);
}

export default ompExtension;
