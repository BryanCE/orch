// orch's pi integration — the composition root, and the ONLY file that names pi.
//
// The wiring itself lives in src/agent/harness-bridge.ts and names no harness.
// What belongs HERE is pi's vocabulary and nothing else: pi's event names and
// pi's adapter id. A sibling build's event name appearing in this file, or pi's
// appearing in src/agent/**, is the pair code CLAUDE.md Rule 9 forbids.
import { fileURLToPath } from "node:url";
import { hashExtensionFile } from "orch/core/agent/harness-bridge.ts";
import { composePiShaped } from "./compose.ts";
import type { HarnessApi } from "orch/core/types/agent.ts";
import { PI_IDENTITY } from "./vocabulary.ts";

const EXTENSION_HASH = hashExtensionFile(fileURLToPath(import.meta.url));

function piExtension(harness: HarnessApi): void {
  composePiShaped(harness, PI_IDENTITY, EXTENSION_HASH);
}

export default piExtension;
