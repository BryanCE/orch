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
import { resolveLifecycle, refuseForeignHolder, targetName } from "../resolve.ts";
import { whoAmI, type CallerSelf } from "../self.ts";
import { lifecycleLogger, lifecycleTargets, requireLifecycleTargets } from "./index.ts";
import { parseCommand } from "../registry.ts";
import { usageError } from "../../cli/usage.ts";
import { describeHandle } from "../../backends/backend.ts";
import type { Backend, ForegroundProcesses } from "../../types/backend.ts";
import type { AgentAdapter, LifecycleVerb } from "../../types/adapter.ts";
import type { HeldLifecycleTarget } from "../resolve.ts";
import type { AgentFlags, LifecycleTarget } from "../../types/command.ts";
import type { ThinkingLevel } from "../../types/policy.ts";
import type { AgentView } from "../../types/store.ts";
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
async function readAgentRuntime(services: LifecycleServices, presenceKey: string) {
  const status = (await readRpc(services, "agent-status", { target: presenceKey })).status;
  const live = (await readRpc(services, "process-live", { target: presenceKey })).live;
  return { status, live };
}

async function submitAgentText(backend: Backend, handle: string, text: string): Promise<void> {
  backend.agentInput?.sendKeys(handle, ["Escape"]);
  await sleep(500);
  if (!backend.agentInput) throw new Error("target environment cannot take input");
  backend.agentInput.submit(handle, text);
}

async function awaitBridgeRefresh(services: LifecycleServices, presenceKey: string, wasUpdatedAt: number | undefined, tries: number): Promise<boolean> {
  return retryingAsync(
    "await bridge refresh",
    async () => {
      const { status, live } = await readAgentRuntime(services, presenceKey);
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
    await submitAgentText(backend, handle, reloadText);
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

/** Poll the probe every 500ms until it holds, or give up after `attempts`. */
function pollUntil(label: string, probe: () => boolean | Promise<boolean>, attempts: number): Promise<boolean> {
  return retryingAsync(label, probe, { attempts, delayMs: 500, backoff: 1 }, { retryOnResult: (value) => !value });
}

/** Type the harness's own quit text and wait for the shell prompt. */
async function quitHarness(logger: Logger, backend: Backend, handle: string, presenceKey: string, quitText: string): Promise<boolean> {
  await submitAgentText(backend, handle, quitText);
  if (await pollUntil("await shell prompt", () => atShellPrompt(foregroundOf(backend, handle)), 16)) return true;
  lifecycleLogger(logger, presenceKey).warn("lifecycle.restart-exit-timeout", { handle, command: quitText });
  process.stdout.write(`${handle}: agent did not exit after ${quitText} - skipping relaunch.\n`);
  return false;
}

async function launchAndAwaitBridge(services: LifecycleServices, logger: Logger, backend: Backend, handle: string, cmd: string, presenceKey: string): Promise<boolean> {
  if (!backend.agentInput) throw new Error("target environment cannot take input");
  backend.agentInput.submit(handle, cmd);
  const bridgeLive = async (): Promise<boolean> => {
    const { status, live } = await readAgentRuntime(services, presenceKey);
    return status !== null && live;
  };
  if (await pollUntil("await relaunched bridge", bridgeLive, 40)) return true;
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
async function planReloads(services: LifecycleServices, self: CallerSelf, targets: readonly string[], steal: boolean, results: ReloadResult[]): Promise<PlannedReload[]> {
  const planned: PlannedReload[] = [];
  for (const target of targets) {
    try {
      const resolved = await resolveLifecycle(services, target);
      refuseForeignHolder(self, target, resolved, steal);
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
  if (!all && !targets.length) throw usageError(invocation);
  const results: ReloadResult[] = [];
  const planned = await planReloads(services, self, targets, invocation.flags.has("--steal"), results);
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

/** The flags one restart applies to every target. `harness` is null when the
 *  caller named none: each target relaunches on its recorded harness. */
interface RestartOptions {
  readonly json: boolean;
  readonly steal: boolean;
  readonly cmd: string | null;
  readonly selection: AgentFlags;
  readonly harness: AgentAdapter | null;
}

/** What a restart relaunches an agent on. */
interface Relaunch {
  readonly adapter: AgentAdapter;
  readonly model: string;
  readonly thinking: ThinkingLevel;
  readonly command: string;
}

/** The harness `--harness` moves the agent onto, or null when it keeps the recorded one. */
function switchedHarness(options: RestartOptions, recorded: AgentAdapter): AgentAdapter | null {
  return options.harness === recorded ? null : options.harness;
}

/** Restart is a FRESH launch of an EXISTING agent: the flags, else the tuning the
 *  agent holds, else the configured default. Another harness never inherits the
 *  old harness's model, so a changed harness pins nothing. */
function planRelaunch(view: AgentView, recorded: AgentAdapter, options: RestartOptions, settings: OrchSettings, catalogue: Services["models"]): Relaunch {
  const switched = switchedHarness(options, recorded);
  const adapter = switched ?? recorded;
  const pinned = switched === null ? view.tuning : null;
  const tuning = resolveTuningOrDie(options.selection, settings, adapter.id, pinned);
  const model = admitLaunchModel(settings, adapter.id, catalogue, tuning.model);
  const command = options.cmd ?? adapterCommand(adapter.id, settings, { model, thinking: tuning.thinking, preferredModels: settings.models.preferred[adapter.id] ?? [] });
  return { adapter, model, thinking: tuning.thinking, command };
}

/** A detached agent has no shell to type a quit into, so the daemon rules on what
 *  restart means for it. The daemon relaunches only what it recorded. */
async function restartThroughDaemon(services: LifecycleServices, resolved: HeldLifecycleTarget, recorded: AgentAdapter, options: RestartOptions): Promise<boolean> {
  const { entity: ent, handle } = resolved;
  const name = targetName(resolved);
  const retuned = switchedHarness(options, recorded) !== null || options.selection.modelFlag !== undefined;
  if (retuned) die(`cannot relaunch ${name} on another harness or model: its environment takes no input. Close it and spawn again.`);
  // The relaunched harness claims the row afresh, so the old claim goes first.
  await writeRpc(services, "reclaim", { target: ent.key });
  const restarted = await lifecycleThroughDaemon(services, "restart", ent.key, describeHandle(handle));
  if (restarted.ok) {
    if (!options.json) process.stdout.write(`${name}: bridge live.\n`);
    return true;
  }
  const reason = restarted.reason ?? "restart failed";
  lifecycleLogger(services.logger, ent.key).error("lifecycle.restart-failed", { handle: String(restarted.handle), error: reason });
  process.stdout.write(`${name}: ${reason}\n`);
  return false;
}

/** Quit with the recorded harness's quit text, then launch the planned harness in
 *  the same pane. The store moves to the new harness only after the old one exits. */
async function restartOneTarget(services: LifecycleServices, self: CallerSelf, target: string, options: RestartOptions): Promise<boolean> {
  const { logger } = services;
  const resolved = await resolveLifecycle(services, target);
  refuseForeignHolder(self, target, resolved, options.steal);
  const { entity: ent, backend, handle, view } = resolved;
  if (!view?.harnessId) die(`Target "${target}" has no recorded harness - cannot determine its restart mechanism.`);
  const recorded = resolveAdapterOrDie(view.harnessId);
  const quitCmd = recorded.lifecycleControl?.lifecycleCmd("restart");
  if (!quitCmd) die(`Target "${target}" uses adapter ${recorded.id}, which has no restart mechanism.`);
  if (!backend.agentInput) return restartThroughDaemon(services, resolved, recorded, options);
  const name = targetName(resolved);
  const pane = describeHandle(handle);
  const relaunch = planRelaunch(view, recorded, options, services.settings.current(), services.models);
  relaunch.adapter.workspaceTrust?.preTrustWorkspace(view.cwd, relaunch.command);
  if (!options.json) process.stdout.write(`Restarting ${name} (${relaunch.command})...\n`);
  if (!await quitHarness(logger, backend, pane, ent.key, quitCmd.text)) return false;
  // The relaunched harness claims the row afresh, so the old claim goes first.
  await writeRpc(services, "reclaim", { target: ent.key, relaunch: { harnessId: relaunch.adapter.id, model: relaunch.model, thinking: relaunch.thinking } });
  if (!await launchAndAwaitBridge(services, logger, backend, pane, relaunch.command, ent.key)) return false;
  if (!options.json) process.stdout.write(`${name}: bridge live.\n`);
  return true;
}

/** One `--harness` applies to every target, `--all` included, so its shims refresh once. */
async function restartOptions(services: Services, drive: Omit<RestartOptions, "cmd" | "harness">, cmd: string | null): Promise<RestartOptions> {
  const harness = drive.selection.adapterFlag === undefined ? null : resolveAdapterOrDie(drive.selection.adapterFlag);
  if (harness) await refreshStaleShims(services.orchDir, services.logger, [harness.id], services.settings.current());
  return { ...drive, cmd, harness };
}

export async function cmdRestart(services: Services, args: string[]): Promise<void> {
  const { invocation, self, targets, json, steal, selection } = await requireLifecycleTargets(services, "restart", args);
  const options = await restartOptions(services, { json, steal, selection }, invocation.flags.value("--cmd") ?? null);
  const results: ReloadResult[] = [];
  let ok = 0;
  for (const target of targets) {
    try {
      const restarted = await restartOneTarget(services, self, target, options);
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

