import { errorMessage } from "../util.ts";
import { cmdSpawn } from "../commands/spawn/index.ts";
import { registerCaller } from "../commands/self.ts";
import { askDaemon, callDaemon } from "../commands/daemon.ts";
import { readFleet } from "../commands/fleet.ts";
import { callerCredential } from "../identity/credential.ts";

import type { SmokeSteps } from "../types/command.ts";
import type { Services } from "../types/services.ts";

/** Spawn one headless agent through the real `orch spawn` path and return the newly-recorded key. */
async function spawnHeadlessSmokeAgent(services: Services, cwd: string, prompt: string): Promise<string> {
  await registerCaller(services);
  const before = new Set((await readFleet(services, true)).views.map((view) => view.id));
  await cmdSpawn(services, ["orch-smoke", "--plexer", "headless", "--dir", cwd, "--prompt", prompt]);
  const after = (await readFleet(services, true)).views;
  // The row that was not there before the single-agent spawn IS the smoke agent. Nothing here
  // re-checks the plexer: `--plexer headless` above already decided it, and re-asserting it as a
  // string comparison would be the environment-id branch Rule 11 bans.
  const key = after.find((view) => !before.has(view.id))?.id;
  if (!key) throw new Error("headless spawn recorded no new agent");
  return key;
}

/** The trivial task the smoke agent is launched on. `orch spawn` adds the worker header. */
function buildSmokePrompt(): string {
  return "Reply with the single word: ready";
}

/** The result the agent reported, read through orchd; undefined until it reports one. */
async function readSmokeResult(services: Services, key: string): Promise<string | undefined> {
  const { reading } = await askDaemon(services, "agent-read", { caller: callerCredential(), key, read: { kind: "result" } });
  if (reading.kind !== "result" || reading.lookup.kind !== "found" || reading.lookup.source !== "presence") return undefined;
  const payload = reading.lookup.payload;
  return typeof payload === "string" ? payload || undefined : JSON.stringify(payload);
}

/** Best-effort close of the headless smoke agent, through orchd. */
async function closeSmokeAgent(services: Services, key: string): Promise<void> {
  try {
    await callDaemon(services, "agent-closed", { key });
  } catch {
    // A leaked headless process is reaped by `orch clean`; never let teardown mask the verdict.
  }
}

function defaultSmokeSteps(services: Services): SmokeSteps {
  return {
    spawnHeadless: (cwd, prompt) => spawnHeadlessSmokeAgent(services, cwd, prompt),
    buildPrompt: buildSmokePrompt,
    readResultText: (key) => readSmokeResult(services, key),
    cleanup: (key) => closeSmokeAgent(services, key),
    now: () => Date.now(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    timeoutMs: 60_000,
  };
}

/** The closing smoke round-trip (12.5): spawn a headless agent ON a trivial prompt through orchd
 * and read its result back — so "setup completed" means orch can actually deliver work. The work
 * goes in at spawn because a detached agent has no TTY to idle on: it runs its prompt and exits.
 * Reports the verdict and returns it; setup's exit code is never touched. Every step is injectable
 * so the failure paths are testable without a live agent. */
export async function runSetupSmoke(services: Services, cwd: string, steps: Partial<SmokeSteps> = {}): Promise<boolean> {
  const step = { ...defaultSmokeSteps(services), ...steps };
  let key: string;
  try {
    key = await step.spawnHeadless(cwd, step.buildPrompt());
  } catch (error: unknown) {
    services.logger.error("setup.smoke-spawn-failed", { error: errorMessage(error) });
    process.stdout.write(
      `Smoke failed: orch could not deliver work - the headless spawn was rejected (${errorMessage(error)}).\n` +
      `  "setup completed" does not yet mean orch can deliver work; check 'orch daemon status'.\n`,
    );
    return false;
  }
  const deadline = step.now() + step.timeoutMs;
  let result: string | undefined;
  while (step.now() < deadline) {
    result = await step.readResultText(key);
    if (result) break;
    await step.sleep(500);
  }
  await step.cleanup(key);
  if (!result) {
    services.logger.error("setup.smoke-timeout", { key, timeoutMs: step.timeoutMs });
    process.stdout.write(
      `Smoke failed: the agent launched but no result came back within ${Math.round(step.timeoutMs / 1000)}s - orch did not complete a work round-trip.\n` +
      `  Check the harness auth and 'orch tail ${key}'.\n`,
    );
    return false;
  }
  process.stdout.write("Smoke ok - orch spawned a headless agent on a prompt and read its result back. orch can deliver work.\n");
  return true;
}
