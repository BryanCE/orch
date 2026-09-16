import * as files from "node:fs";
import * as path from "node:path";
import { refreshStaleShims } from "../../doctor/runner.ts";
import { retryingAsync } from "../../retry.ts";
import { errorMessage, sleep } from "../../util.ts";
import { atShellPrompt, NO_FOREGROUND } from "../../backends/shell-ready.ts";
import { RELOAD_SIGNAL_FILE } from "../../settings/watch.ts";
import { adapterCommand, admitLaunchModel } from "../spawn/models.ts";
import { resolveAdapterOrDie, resolveTuningOrDie } from "../selection.ts";
import { readRpc, writeRpc } from "../daemon.ts";
import { die } from "../target.ts";
import { resolveLifecycle, refuseForeignHolder } from "../resolve.ts";
import { NO_TUNING } from "../../policy/tuning.ts";
import { whoAmI, type CallerSelf } from "../self.ts";
import { lifecycleLogger, lifecycleTargets } from "./index.ts";
import { parseCommand } from "../registry.ts";
import { describeHandle } from "./close.ts";
import type { Backend, ForegroundProcesses } from "../../types/backend.ts";
import type { AgentAdapter, LifecycleVerb } from "../../types/adapter.ts";
import type { LifecycleResolution } from "../resolve.ts";
import type { LifecycleTarget } from "../../types/command.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { Services } from "../../types/services.ts";
import type { Logger, OrchDir } from "../../types/core.ts";

export function foregroundOf(backend: Pick<Backend, "foreground">, handle: string): ForegroundProcesses {
  return backend.foreground?.read(handle) ?? NO_FOREGROUND;
}

export interface ReloadResult {
  handle: string;
  ok: boolean;
  reason?: string;
}

/** Block until the agent's bridge republishes status.json while its recorded
 *  process is live, proving the harness came back. */
async function awaitBridgeRefresh(services: LifecycleServices, presenceKey: string, wasUpdatedAt: number | undefined, tries: number): Promise<boolean> {
  return retryingAsync(
    "await bridge refresh",
    async () => {
      const status = (await readRpc(services, "agent-status", { target: presenceKey })).status;
      const live = (await readRpc(services, "process-live", { target: presenceKey })).live;
      return status !== null
        && live
        && (wasUpdatedAt === undefined || status.updatedAt > wasUpdatedAt);
    },
    { attempts: tries, delayMs: 500, backoff: 1 },
    { retryOnResult: (value) => !value },
  );
}

/** Apply a lifecycle verb to an agent with no console through the daemon, which owns
 *  every lifecycle mechanism. A detached agent has none, so this reports its refusal. */
type LifecycleServices = Pick<Services, "orchDir" | "settings" | "logger" | "models">;

async function lifecycleThroughDaemon(services: LifecycleServices, verb: LifecycleVerb, key: string, handle: string): Promise<ReloadResult> {
  const wasUpdatedAt = (await readRpc(services, "agent-status", { target: key })).status?.updatedAt;
  if (wasUpdatedAt === undefined) return { handle, ok: false, reason: "no bridge status.json to verify against" };
  try {
    await writeRpc(services, "lifecycle", { target: key, verb });
  } catch (error: unknown) {
    return { handle, ok: false, reason: errorMessage(error) };
  }
  return (await awaitBridgeRefresh(services, key, wasUpdatedAt, 60))
    ? { handle, ok: true }
    : { handle, ok: false, reason: `bridge status.json did not refresh within 30s after ${verb}` };
}

export async function reloadAgentAndAwaitBridge(services: LifecycleServices, backend: Backend, handle: string, presenceKey: string, reloadText: string): Promise<ReloadResult> {
  try {
    const oldUpdatedAt = (await readRpc(services, "agent-status", { target: presenceKey })).status?.updatedAt;
    backend.agentInput?.sendKeys(handle, ["Escape"]);
    await sleep(500);
    if (!backend.agentInput) throw new Error("target environment cannot take input");
    backend.agentInput.submit(handle, reloadText);
    const refreshed = await awaitBridgeRefresh(services, presenceKey, oldUpdatedAt, 60);
    if (refreshed) return { handle, ok: true };
    return { handle, ok: false, reason: errorMessage(`bridge status.json did not refresh within 30s after ${reloadText}`) };
  } catch (error: unknown) {
    return { handle, ok: false, reason: errorMessage(error) };
  }
}

function touchReloadSignal(orchDir: OrchDir): void {
  const signalPath = path.join(orchDir, RELOAD_SIGNAL_FILE);
  const fd = files.openSync(signalPath, "a");
  files.closeSync(fd);
}

async function restartAgentAndAwaitBridge(services: LifecycleServices, logger: Logger, backend: Backend, handle: string, cmd: string, presenceKey: string, quitText: string): Promise<boolean> {
  backend.agentInput?.sendKeys(handle, ["Escape"]);
  await sleep(500);
  if (!backend.agentInput) throw new Error("target environment cannot take input");
  backend.agentInput.submit(handle, quitText);
  const shellSeen = await retryingAsync(
    "await shell prompt",
    () => atShellPrompt(foregroundOf(backend, handle)),
    { attempts: 16, delayMs: 500, backoff: 1 },
    { retryOnResult: (value) => !value },
  );
  if (!shellSeen) {
    lifecycleLogger(logger, presenceKey).warn("lifecycle.restart-exit-timeout", { handle, command: quitText });
    process.stdout.write(`${handle}: agent did not exit after ${quitText} - skipping relaunch.\n`);
    return false;
  }
  backend.agentInput.submit(handle, cmd);
  const refreshed = await retryingAsync(
    "await relaunched bridge",
    async () => {
      const status = (await readRpc(services, "agent-status", { target: presenceKey })).status;
      const live = (await readRpc(services, "process-live", { target: presenceKey })).live;
      return status !== null && live;
    },
    { attempts: 40, delayMs: 500, backoff: 1 },
    { retryOnResult: (value) => !value },
  );
  if (refreshed) return true;
  lifecycleLogger(logger, presenceKey).warn("lifecycle.restart-bridge-timeout", { handle });
  process.stdout.write(`${handle}: relaunched but bridge status.json did not refresh within 20s.\n`);
  return false;
}

/** One target's reload, planned but not yet performed. */
interface PlannedReload {
  readonly resolved: LifecycleTarget;
  readonly target: string;
  readonly harnessId: string;
  readonly reloadText: string;
}

/** Resolve every target BEFORE touching a shim: an unresolvable target must not
 *  leave a redeployed integration behind, and the refresh can only be scoped to
 *  the harnesses in play once they are known. */
async function planReloads(services: LifecycleServices, self: CallerSelf, targets: readonly string[], force: boolean, results: ReloadResult[]): Promise<PlannedReload[]> {
  const planned: PlannedReload[] = [];
  for (const target of targets) {
    try {
      const resolved = await resolveLifecycle(services, target);
      refuseForeignHolder(self, target, resolved, force);
      const harness = resolved.view?.harnessId;
      if (!harness) throw new Error(`Target "${target}" has no recorded harness - cannot determine its reload mechanism`);
      const adapter = resolveAdapterOrDie(harness);
      const reloadCmd = adapter.lifecycleControl?.lifecycleCmd("reload");
      if (!reloadCmd) throw new Error(`adapter ${adapter.id} has no reload mechanism`);
      planned.push({ resolved, target, harnessId: adapter.id, reloadText: reloadCmd.text });
    } catch (error: unknown) {
      results.push({ handle: target, ok: false, reason: errorMessage(error) });
    }
  }
  return planned;
}

async function performReloads(services: LifecycleServices, planned: readonly PlannedReload[], results: ReloadResult[]): Promise<void> {
  for (const { target, resolved, reloadText } of planned) {
    const { entity: ent, backend, handle } = resolved;
    try {
      // No console to type `/reload` into leaves only the daemon, which owns
      // every lifecycle mechanism a backend does or does not have.
      results.push(backend.agentInput
        ? await reloadAgentAndAwaitBridge(services, backend, describeHandle(handle), ent.key, reloadText)
        : await lifecycleThroughDaemon(services, "reload", ent.key, describeHandle(handle)));
    } catch (error: unknown) {
      results.push({ handle: target, ok: false, reason: errorMessage(error) });
    }
  }
}

function reportReloads(results: readonly ReloadResult[], json: boolean): void {
  const ok = results.filter((result) => result.ok).length;
  if (json) {
    process.stdout.write(JSON.stringify({ results, ok, total: results.length, hard: false, signaled: "reload.signal" }) + "\n");
  } else {
    for (const result of results) {
      process.stdout.write(result.ok ? `RELOADED ${result.handle}\n` : `FAILED ${result.handle}: ${errorMessage(result.reason ?? "reload failed")}\n`);
    }
    process.stdout.write("SIGNALED reload.signal\n");
  }
  // `process.exitCode`, never `process.exit()`: the JSON above is buffered, so
  // exiting here truncates the very payload a caller reads to find out WHICH
  // target failed (src/commands/index.ts:272 states the same rule).
  if (ok !== results.length) process.exitCode = 1;
}

export async function cmdReload(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("reload", args);
  const json = invocation.flags.has("--json");
  const self = await whoAmI(services);
  const { targets, all } = await lifecycleTargets(services, self, invocation);
  // `--all` is a valid invocation even with zero live agents: it still touches
  // reload.signal (SIGNALED) for settings/extension watchers. Only a bare call
  // with neither --all nor a target is a usage error.
  if (!all && !targets.length) die("usage: orch reload <target>... | --all [--json]");
  const results: ReloadResult[] = [];
  const planned = await planReloads(services, self, targets, invocation.flags.has("--force"), results);
  // A reload exists to pick up new code, so stale deployments redeploy first —
  // but only for the harnesses being reloaded. `orch reload <pi agent>` has no
  // business rewriting another harness's integration.
  if (planned.length) await refreshStaleShims(services.orchDir, services.logger, [...new Set(planned.map((plan) => plan.harnessId))], services.settings.current());
  await performReloads(services, planned, results);
  try {
    touchReloadSignal(services.orchDir);
  } catch (error: unknown) {
    die(`Failed reload.signal: ${errorMessage(error)}`);
  }
  reportReloads(results, json);
}

/** The command a restart relaunches the harness on. Restart is a FRESH launch of
 *  an EXISTING agent, so it relaunches on the tuning the agent holds, resolved
 *  exactly like dispatch and reset rather than letting the harness fall back to
 *  its own default. */
function restartLaunchCommand(resolved: LifecycleResolution, cmd: string | null, harnessId: string, adapter: AgentAdapter, settings: OrchSettings, catalogue: Services["models"]): string {
  if (cmd !== null) return cmd;
  const tuning = resolveTuningOrDie({}, settings, adapter.id, resolved.view?.tuning ?? NO_TUNING);
  const model = admitLaunchModel(settings, adapter.id, catalogue, tuning.model);
  return adapterCommand(harnessId, settings, { model, thinking: tuning.thinking, preferredModels: settings.models.preferred[adapter.id] ?? [] });
}

/** Restart one target. A detached agent has no shell to type a quit into, so the
 *  daemon rules on what restart means for it. */
async function restartOneTarget(services: LifecycleServices, self: CallerSelf, target: string, cmd: string | null, flags: { json: boolean; force: boolean }): Promise<boolean> {
  const { logger } = services;
  const settings = services.settings.current();
  const resolved = await resolveLifecycle(services, target);
  refuseForeignHolder(self, target, resolved, flags.force);
  const { entity: ent, backend, handle } = resolved;
  const harness = resolved.view?.harnessId;
  if (!harness) die(`Target "${target}" has no recorded harness - cannot determine its restart mechanism.`);
  const adapter = resolveAdapterOrDie(harness);
  const quitCmd = adapter.lifecycleControl?.lifecycleCmd("restart");
  if (!quitCmd) die(`Target "${target}" uses adapter ${adapter.id}, which has no restart mechanism.`);
  // The relaunched harness claims the row afresh, so the old claim goes first.
  await writeRpc(services, "reclaim", { target: ent.key });
  if (!backend.agentInput) {
    const restarted = await lifecycleThroughDaemon(services, "restart", ent.key, describeHandle(handle));
    if (restarted.ok) {
      if (!flags.json) process.stdout.write(`${restarted.handle}: bridge live.\n`);
      return true;
    }
    const reason = restarted.reason ?? "restart failed";
    lifecycleLogger(logger, ent.key).error("lifecycle.restart-failed", { handle: String(restarted.handle), error: reason });
    process.stdout.write(`${restarted.handle}: ${reason}\n`);
    return false;
  }
  const launch = restartLaunchCommand(resolved, cmd, harness, adapter, settings, services.models);
  if (!flags.json) process.stdout.write(`Restarting ${describeHandle(handle)} (${launch})...\n`);
  if (!await restartAgentAndAwaitBridge(services, logger, backend, describeHandle(handle), launch, ent.key, quitCmd.text)) return false;
  if (!flags.json) process.stdout.write(`${describeHandle(handle)}: bridge live.\n`);
  return true;
}
export async function cmdRestart(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("restart", args);
  const json = invocation.flags.has("--json");
  const flags = { json, force: invocation.flags.has("--force") };
  const self = await whoAmI(services);
  const { targets } = await lifecycleTargets(services, self, invocation);
  if (!targets.length) die("usage: orch restart <target>... | --all [--cmd pi] [--json]");
  const cmd = invocation.flags.value("--cmd") ?? null;
  const results: ReloadResult[] = [];
  let ok = 0;
  for (const target of targets) {
    try {
      const restarted = await restartOneTarget(services, self, target, cmd, flags);
      if (restarted) {
        ok++;
        results.push({ handle: target, ok: true });
      } else {
        results.push({ handle: target, ok: false, reason: "restart failed" });
      }
    } catch (error: unknown) {
      const reason = errorMessage(error);
      results.push({ handle: target, ok: false, reason });
      if (!json) process.stdout.write(`FAILED ${target}: ${reason}\n`);
    }
  }
  if (json) process.stdout.write(JSON.stringify({ results, targets, ok, total: targets.length, hard: true }) + "\n");
  else process.stdout.write(`${ok}/${targets.length} restarted with fresh bridge.\n`);
  // `process.exitCode`, never `process.exit()` — same rule as reload above.
  if (ok !== targets.length) process.exitCode = 1;
}

