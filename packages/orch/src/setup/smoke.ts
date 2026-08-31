import { resolveBackend } from "../backends/registry.ts";
import { loadConfig } from "../config.ts";
import { loadPresence, orchDir } from "../presence/store.ts";
import { agentViews } from "../store/agent-view.ts";
import { binaryOnPath, errorMessage } from "../util.ts";
import { cmdSpawn } from "../commands/spawn/index.ts";
import { resultText } from "../commands/target.ts";
import { commandLogger } from "../commands/logging.ts";
import type { SmokeSteps } from "../types/command.ts";

/** Spawn one headless agent through the real `orch spawn` path and return the newly-recorded key. */
export async function spawnHeadlessSmokeAgent(cwd: string, prompt: string): Promise<string> {
  const before = new Set(agentViews(orchDir()).map((view) => view.id));
  await cmdSpawn(["1", "--backend", "headless", "--name", "orch-smoke", "--cwd", cwd, "--prompt", prompt]);
  const after = agentViews(orchDir());
  // The row that was not there before the single-agent spawn IS the smoke agent. Nothing here
  // re-checks the plexer: `--backend headless` above already decided it, and re-asserting it as a
  // string comparison would be the environment-id branch Rule 11 bans.
  const key = after.find((view) => !before.has(view.id))?.id;
  if (!key) throw new Error("headless spawn recorded no new agent");
  return key;
}

/** The trivial task the smoke agent is launched on. `orch spawn` adds the worker header. */
export function buildSmokePrompt(): string {
  return "Reply with the single word: ready";
}

/** Best-effort close of the headless smoke agent by its key. */
export function closeSmokeAgent(key: string): void {
  try {
    const backend = resolveBackend({ configured: "headless" });
    const handle = backend.handleLookup?.handleFor(key);
    if (handle !== undefined) backend.paneHost?.close(handle);
  } catch {
    // A leaked headless process is reaped by `orch clean`; never let teardown mask the verdict.
  }
}

export const defaultSmokeSteps: SmokeSteps = {
  spawnHeadless: spawnHeadlessSmokeAgent,
  buildPrompt: buildSmokePrompt,
  readResultText: (key) => resultText(loadPresence().get(key)?.result),
  cleanup: closeSmokeAgent,
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  timeoutMs: 60_000,
};

/** The closing smoke round-trip (12.5): spawn a headless agent ON a trivial prompt through orchd
 * and read its result back — so "setup completed" means orch can actually deliver work. The work
 * goes in at spawn because a detached agent has no TTY to idle on: it runs its prompt and exits.
 * Reports the verdict and returns it; setup's exit code is never touched. Every step is injectable
 * so the failure paths are testable without a live agent. */
export async function runSetupSmoke(cwd: string, steps: Partial<SmokeSteps> = {}): Promise<boolean> {
  const step = { ...defaultSmokeSteps, ...steps };
  let key: string;
  try {
    key = await step.spawnHeadless(cwd, step.buildPrompt());
  } catch (error: unknown) {
    commandLogger().error("setup.smoke-spawn-failed", { error: errorMessage(error) });
    process.stdout.write(
      `Smoke failed: orch could not deliver work - the headless spawn was rejected (${errorMessage(error)}).\n` +
      `  "setup completed" does not yet mean orch can deliver work; check 'orch daemon status'.\n`,
    );
    return false;
  }
  const deadline = step.now() + step.timeoutMs;
  let result: string | undefined;
  while (step.now() < deadline) {
    result = step.readResultText(key);
    if (result) break;
    await step.sleep(500);
  }
  step.cleanup(key);
  if (!result) {
    commandLogger().error("setup.smoke-timeout", { key, timeoutMs: step.timeoutMs });
    process.stdout.write(
      `Smoke failed: the agent launched but no result came back within ${Math.round(step.timeoutMs / 1000)}s - orch did not complete a work round-trip.\n` +
      `  Check the harness auth and 'orch tail ${key}'.\n`,
    );
    return false;
  }
  process.stdout.write("Smoke ok - orch spawned a headless agent on a prompt and read its result back. orch can deliver work.\n");
  return true;
}

/**
 * Why a headless smoke round-trip cannot run here, or null when it can.
 *
 * The smoke launches the DEFAULT ADAPTER's binary, so a missing harness is as
 * disqualifying as a missing backend — setup used to report `MISSING pi` and
 * then try to spawn pi anyway, turning a known-absent prerequisite into a
 * spawn failure that read like a broken install.
 */
export function smokeBlocker(): string | null {
  try {
    if (!resolveBackend({ configured: "headless" }).isAvailable()) return "headless backend is unavailable here";
  } catch {
    return "headless backend is unavailable here";
  }
  const adapter = loadConfig(orchDir()).defaults.adapter;
  if (!adapter) return "no default harness is recorded";
  if (!binaryOnPath(adapter)) return `${adapter} is not on PATH`;
  return null;
}
