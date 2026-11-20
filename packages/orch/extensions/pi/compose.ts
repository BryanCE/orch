// The wiring every pi-shaped harness gets: orch's bridge, the orchestrator seat, and the monitor
// tool. A composition root names its harness and calls this; it never copies the wiring.
import { registerHarnessBridge } from "orch/core/agent/harness-bridge.ts";
import { envOrchDir } from "orch/core/orch-dir.ts";
import { fileSettingsManager } from "orch/core/settings/manager.ts";
import { registerOrchSeat } from "./seat/index.ts";
import { registerMonitor } from "./monitor/index.ts";
import type { HarnessApi, HarnessIdentity } from "orch/core/types/agent.ts";

export function composePiShaped(harness: HarnessApi, identity: HarnessIdentity, extensionHash: string): void {
  const orchDir = envOrchDir();
  const settings = fileSettingsManager(orchDir);
  const bridge = registerHarnessBridge(harness, identity, extensionHash, { orchDir, settings });
  // The shared bridge exposes only the common harness surface; the seat (status line,
  // /orch-view dashboard, per-agent views) and the monitor tool need the pi-shaped API.
  registerOrchSeat(harness, settings, { orchDir, ownKey: bridge.ownKey });
  registerMonitor(harness, settings);
}
