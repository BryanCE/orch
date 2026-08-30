import { execFileSync } from "node:child_process";
import * as files from "node:fs";
import * as path from "node:path";
import { refreshStaleShims } from "../doctor/runner.ts";
import { buildEntities, recipientFor, recipientLabel, resolvePane, resolveTarget } from "../entities.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import { STATUS_FILE } from "../presence/schema.ts";
import { orchDir, presenceAgentDir, readPresenceStatus, removePresenceAgentDir } from "../presence/store.ts";
import { assertNameFree } from "../policy/name.ts";
import { liveAgentViews } from "../store/agent-view.ts";
import { callerAuthority, refuseClose } from "../policy/close-authority.ts";
import type { CloseAuthority } from "../types/policy.ts";
import { agentById, endAgent, renameAgent as renameNormalizedAgent } from "../store/agent-rows.ts";
import { selfId, selfIdentity } from "../identity/self.ts";

import { retryingSync } from "../retry.ts";
import { errorMessage, isRecord, pidAlive } from "../util.ts";
import { processInstanceMatches, processIsAlive } from "../process-identity.ts";
import { getBackend } from "../backends/registry.ts";
import { NO_PANE_FOREGROUND, paneAtShellPrompt, sleepMs } from "../backends/pane-ready.ts";

import { loadConfig } from "../config.ts";
import { resolveThinking, splitThinkingSuffix } from "../policy/thinking.ts";
import { adapterCommand, assertLaunchModelAllowed, launchModel, pinModels } from "./spawn.ts";
import { pickAdapter, resolveAdapterOrDie } from "./selection.ts";
import { spawnerIsRepliable, workerPrompt } from "../worker-prompt.ts";
import { entityAdapter } from "./status.ts";
import { parseGovernance, writeRpc } from "./daemon.ts";
import { agentAddress, agentViewIndex, assertAgentOwned, ownsAgent, presenceById, requireCallerOwnerToken, splitOptionFlags, die, backendTarget, parseTargetPrompt, resolveLifecycleTarget, viewForKey } from "./target.ts";
import { commandLogger } from "./logging.ts";
import type { Backend, BackendHandle, PaneForeground, PaneHostRole } from "../types/backend.ts";
import type { AgentAdapter, LifecycleVerb } from "../types/adapter.ts";
import type { AgentView } from "../types/store.ts";
import type { AgentFlags, LifecycleTarget } from "../types/command.ts";
import type { OrchConfig } from "../types/config.ts";
import { currentProcess } from "../store/interval-rows.ts";

function lifecycleLogger(key: string) {
  const agentId = tryParseIdentity(key)?.id;
  return agentId ? commandLogger().forAgent(agentId) : commandLogger();
}

/** Dispatch a prompt and retry once when the pane never enters working state. */
export async function cmdRun(args: string[]): Promise<void> {
  const raw = args.includes("--raw");
  const json = args.includes("--json");
  const { gov, rest } = parseGovernance(args.filter((arg) => arg !== "--json"));
  const { target, prompt } = parseTargetPrompt(rest, "--raw", 'usage: orch run <target> "<prompt>" [--raw] [--steal] [--cross-space] [--json]');
  const { ent, pane } = resolvePane(target, { crossSpace: gov.crossSpace });
  const headerContext = { lockedCommands: loadConfig(orchDir()).locked_commands, spawnerRepliable: spawnerIsRepliable() };
  const result = await writeRpc("dispatch", { target: ent.key, text: workerPrompt(prompt, raw, entityAdapter(ent), headerContext) }, gov);
  const recipient = recipientFor(ent.key);
  if (json) process.stdout.write(JSON.stringify({ target: pane, recipient, dispatched: true, ...(isRecord(result) ? result : {}) }) + "\n");
  else process.stdout.write(`Dispatched to ${recipientLabel(recipient)}.\n`);
}

export function cmdWait(args: string[]) {
  let status = "done";
  const defaultTimeout = loadConfig(orchDir()).timeouts.wait_ms;
  let timeout = defaultTimeout;
  const json = args.includes("--json");
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--status") status = args[++i]!;
    else if (args[i] === "--timeout") timeout = parseInt(args[++i]!, 10) || defaultTimeout;
    else if (args[i] === "--json") continue;
    else positional.push(args[i]!);
  }
  const target = positional[0];
  if (!target) die("usage: orch wait <target> [--status done|idle|working|blocked] [--timeout ms]");
  const { backend, handle } = backendTarget(target, "wait");
  const entity = resolveTarget(target);
  if (!entity.paneId) {
    if (json) process.stdout.write(JSON.stringify({ outcome: "answer", reason: "no-pane", text: `${target} has no pane; wait does not apply.` }) + "\n");
    else process.stdout.write(`${target} has no pane; wait does not apply.\n`);
    return;
  }
  const role = backend.agentStatus;
  if (!role) {
    if (json) process.stdout.write(JSON.stringify({ outcome: "answer", reason: "no-environment-role", text: "this pane environment does not provide wait" }) + "\n");
    else process.stdout.write("this pane environment does not provide wait\n");
    return;
  }
  role.wait(handle, status, timeout);
  if (json) process.stdout.write(JSON.stringify({ target: handle, status, reached: true }) + "\n");
  else process.stdout.write(`${handle} reached "${status}".\n`);
}

/** Block until the agent's own presence status reports idle from a write newer than
 *  the one we replaced. A stale idle is the pre-reset session answering for the new one. */
function awaitIdleAfter(statusPath: string, beforeUpdated: number, sentAt: number): boolean {
  return retryingSync(
    "await idle presence",
    () => {
      const status = readPresenceStatus(statusPath);
      const updated = Date.parse(typeof status?.updatedAt === "string" ? status.updatedAt : "");
      const advanced = Number.isFinite(updated)
        && (!Number.isFinite(beforeUpdated) || updated > beforeUpdated)
        && updated >= sentAt - 1000;
      return advanced && status?.state === "idle";
    },
    { attempts: 300, delayMs: 250, backoff: 1 },
    { sleepSync: sleepMs, retryOnResult: (value) => !value },
  );
}

/** Every orch-owned live agent, addressed by identity key. Keying on paneId instead
 *  silently skipped the entire detached fleet — a headless agent never has a pane. */
export function ownedAgentKeys(): string[] {
  // Ownership is the OPEN lease (Rule 11). A released one is history and must
  // stop answering here, or `--all` keeps steering agents this orch let go.
  const views = agentViewIndex();
  return buildEntities()
    .filter((ent) => {
      if (!ent.presence) return false;
      return ownsAgent(viewForKey(views, ent.key) ?? { id: ent.key, heldBy: null });
    })
    .map((ent) => ent.key);
}

/** Split `orch reset` args into its --model/--thinking flags and the targets to clear. */
function parseResetArgs(args: string[]): { targets: string[]; flags: AgentFlags } {
  const targets: string[] = [];
  const flags: AgentFlags = {};
  if (args.includes("--all")) requireCallerOwnerToken();
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (arg === "--json" || arg === "--force") continue;
    if (arg === "--model") { flags.modelFlag = args[++index]; continue; }
    if (arg === "--thinking") { flags.thinkingFlag = args[++index]; continue; }
    if (arg === "--all") targets.push(...ownedAgentKeys());
    else targets.push(arg);
  }
  return { targets, flags };
}

export async function cmdNew(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const force = args.includes("--force");
  const { targets, flags } = parseResetArgs(args);
  if (!targets.length) die("usage: orch reset <target>... | --all [--model <model>] [--thinking <level>] [--json]");
  // Check ownership before resolving model configuration: a driving verb must
  // name a live foreign holder even when this caller has no model selected.
  for (const target of targets) {
    const { entity: ent } = resolveLifecycleTarget(target);
    assertAgentOwned(target, ent, force);
  }
  // A cleared session drops back to the harness's own default, so reset re-pins on
  // exactly the terms a spawn does: the model named here, else the configured default.
  const config = loadConfig(orchDir());
  const adapter = resolveAdapterOrDie(pickAdapter(flags, config));
  const model = launchModel(flags, config, adapter);
  // Reset re-pins on exactly the terms a spawn does, and that includes the
  // thinking effort: re-pinning the bare model dropped the level and every reset
  // silently returned the agent to the harness default (TASKS/12-thinking.md).
  const thinking = resolveThinking({
    flag: flags.thinkingFlag,
    modelSuffix: splitThinkingSuffix(flags.modelFlag ?? config.defaults.models[adapter.id] ?? "").thinking,
    harness: adapter.id,
    config,
  });
  assertLaunchModelAllowed(adapter.id, model);
  const cleared: { key: string; pane: string; name: string }[] = [];
  const results: { target: string; cleared: true; ready: true }[] = [];
  for (const target of targets) {
    // A detached agent has no pane, so it resolves through the lifecycle target
    // resolver; resolvePane would reject the whole headless fleet outright.
    const { entity: ent, handle } = resolveLifecycleTarget(target);
    const pane = describeHandle(handle);
    assertAgentOwned(target, ent, force);
    const statusPath = path.join(presenceAgentDir(ent.key), STATUS_FILE);
    const before = readPresenceStatus(statusPath);
    const beforeUpdated = Date.parse(typeof before?.updatedAt === "string" ? before.updatedAt : "");
    const sentAt = Date.now();
    // The daemon owns every lifecycle mechanism: a console gets the adapter's
    // text, a detached agent has none and is refused. Neither is the CLI's to choose.
    await writeRpc("lifecycle", { target: ent.key, verb: "reset" });
    if (!awaitIdleAfter(statusPath, beforeUpdated, sentAt)) die(`${pane}: reset did not become ready within 75s.`);
    cleared.push({ key: ent.key, pane, name: ent.name ?? pane });
    results.push({ target: pane, cleared: true, ready: true });
    if (!json) process.stdout.write(`Cleared session on ${pane}; ready.\n`);
  }
  // A reset that could not re-pin its model left the agent on the wrong one, and
  // re-running reset is idempotent — unlike a spawn, nothing duplicates on retry.
  if ((await pinModels(cleared, model, thinking)).length) process.exitCode = 1;
  if (json) process.stdout.write(JSON.stringify(results.length === 1 ? results[0] : results) + "\n");
  else process.stdout.write(`Pinned ${cleared.length} reset agent(s) to ${model}.\n`);
}

export function paneForeground(backend: Backend, handle: string): PaneForeground {
  return backend.paneForeground?.read(handle) ?? NO_PANE_FOREGROUND;
}

interface ReloadResult {
  pane: string;
  ok: boolean;
  reason?: string;
}

/** Block until the agent's bridge republishes status.json under a live pid, proving
 *  the harness came back. Backend-agnostic: it reads only the presence protocol. */
function awaitBridgeRefresh(statusPath: string, wasUpdatedAt: string, tries: number): boolean {
  return retryingSync(
    "await bridge refresh",
    () => {
      const status = readPresenceStatus(statusPath);
      return typeof status?.pid === "number" && typeof status.updatedAt === "string"
        && pidAlive(status.pid) && Date.parse(status.updatedAt) > Date.parse(wasUpdatedAt);
    },
    { attempts: tries, delayMs: 500, backoff: 1 },
    { sleepSync: sleepMs, retryOnResult: (value) => !value },
  );
}

/** Apply a lifecycle verb to an agent with no console through the daemon, which owns
 *  every lifecycle mechanism. A detached agent has none, so this reports its refusal. */
async function lifecycleThroughDaemon(verb: LifecycleVerb, key: string, pane: string): Promise<ReloadResult> {
  const statusPath = path.join(presenceAgentDir(key), STATUS_FILE);
  const wasUpdatedAt = readPresenceStatus(statusPath)?.updatedAt;
  if (typeof wasUpdatedAt !== "string") return { pane, ok: false, reason: "no bridge status.json to verify against" };
  try {
    await writeRpc("lifecycle", { target: key, verb });
  } catch (error: unknown) {
    return { pane, ok: false, reason: errorMessage(error) };
  }
  return awaitBridgeRefresh(statusPath, wasUpdatedAt, 60)
    ? { pane, ok: true }
    : { pane, ok: false, reason: `bridge status.json did not refresh within 30s after ${verb}` };
}

export function reloadPaneAndAwaitBridge(backend: Backend, pane: string, presenceKey: string, reloadText: string): ReloadResult {
  try {
    const statusPath = path.join(presenceAgentDir(presenceKey), STATUS_FILE);
    const old = readPresenceStatus(statusPath);
    const oldUpdatedAt = typeof old?.updatedAt === "string" ? old.updatedAt : "";
    if (typeof old?.pid !== "number") {
      return { pane, ok: false, reason: errorMessage("no bridge status.json pid to verify reload") };
    }
    backend.paneInput?.sendKeys(pane, ["Escape"]);
    sleepMs(500);
    if (!backend.paneInput) throw new Error("target environment has no pane input role");
    backend.paneInput.submit(pane, reloadText);
    const refreshed = retryingSync(
      "await bridge refresh",
      () => {
        const st = readPresenceStatus(statusPath);
        return typeof st?.pid === "number" && typeof st.updatedAt === "string"
          && pidAlive(st.pid) && Date.parse(st.updatedAt) > Date.parse(oldUpdatedAt);
      },
      { attempts: 60, delayMs: 500, backoff: 1 },
      { sleepSync: sleepMs, retryOnResult: (value) => !value },
    );
    if (refreshed) return { pane, ok: true };
    return { pane, ok: false, reason: errorMessage(`bridge status.json did not refresh within 30s after ${reloadText}`) };
  } catch (error: unknown) {
    return { pane, ok: false, reason: errorMessage(error) };
  }
}

function touchReloadSignal(): void {
  const signalPath = path.join(orchDir(), "reload.signal");
  const fd = files.openSync(signalPath, "a");
  files.closeSync(fd);
}

function restartPaneAndAwaitBridge(backend: Backend, pane: string, cmd: string, presenceKey: string, quitText: string): boolean {
  const statusPath = path.join(presenceAgentDir(presenceKey), STATUS_FILE);
  const oldPid = readPresenceStatus(statusPath)?.pid ?? null;
  backend.paneInput?.sendKeys(pane, ["Escape"]);
  sleepMs(500);
  if (!backend.paneInput) throw new Error("target environment has no pane input role");
  backend.paneInput.submit(pane, quitText);
  const shellSeen = retryingSync(
    "await shell prompt",
    () => paneAtShellPrompt(paneForeground(backend, pane)),
    { attempts: 16, delayMs: 500, backoff: 1 },
    { sleepSync: sleepMs, retryOnResult: (value) => !value },
  );
  if (!shellSeen) {
    lifecycleLogger(presenceKey).warn("lifecycle.restart-exit-timeout", { handle: pane, command: quitText });
    process.stdout.write(`${pane}: agent did not exit after ${quitText} - skipping relaunch.\n`);
    return false;
  }
  backend.paneInput.submit(pane, cmd);
  const refreshed = retryingSync(
    "await relaunched bridge",
    () => {
      const st = readPresenceStatus(statusPath);
      return typeof st?.pid === "number" && st.pid !== oldPid && pidAlive(st.pid);
    },
    { attempts: 40, delayMs: 500, backoff: 1 },
    { sleepSync: sleepMs, retryOnResult: (value) => !value },
  );
  if (refreshed) return true;
  lifecycleLogger(presenceKey).warn("lifecycle.restart-bridge-timeout", { handle: pane });
  process.stdout.write(`${pane}: relaunched but bridge status.json did not refresh within 20s.\n`);
  return false;
}

/** The targets a lifecycle command was given.
 *
 *  `reload` and `restart` collected these with two hand-written loops that
 *  differed only in whether a flag took a value, so `--all` meant "every agent
 *  this caller owns" in two places. One place now. */
function lifecycleTargets(
  args: readonly string[],
  booleans: readonly string[],
  valueFlags: readonly string[] = [],
): { targets: string[]; values: Map<string, string>; all: boolean } {
  const known = new Set(booleans);
  const takesValue = new Set(valueFlags);
  const values = new Map<string, string>();
  const targets: string[] = [];
  let all = false;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!;
    if (takesValue.has(argument)) { values.set(argument, args[++index] ?? ""); continue; }
    if (argument === "--all") { all = true; continue; }
    if (known.has(argument)) continue;
    targets.push(argument);
  }
  // `--all` is every agent this caller OWNS, which is a right the caller has to
  // hold before the list is even built.
  if (all) {
    requireCallerOwnerToken();
    targets.push(...ownedAgentKeys());
  }
  return { targets, values, all };
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
function planReloads(targets: readonly string[], force: boolean, results: ReloadResult[]): PlannedReload[] {
  const planned: PlannedReload[] = [];
  for (const target of targets) {
    try {
      const resolved = resolveLifecycleTarget(target);
      assertAgentOwned(target, resolved.entity, force);
      const harness = resolved.entity.agent ?? resolved.entity.presence?.status?.agent;
      if (!harness) throw new Error(`Target "${target}" has no recorded harness - cannot determine its reload mechanism`);
      const adapter = resolveAdapterOrDie(harness);
      const reloadCmd = adapter.lifecycleControl?.lifecycleCmd("reload");
      if (!reloadCmd) throw new Error(`adapter ${adapter.id} has no reload mechanism`);
      planned.push({ resolved, target, harnessId: adapter.id, reloadText: reloadCmd.text });
    } catch (error: unknown) {
      results.push({ pane: target, ok: false, reason: errorMessage(error) });
    }
  }
  return planned;
}

async function performReloads(planned: readonly PlannedReload[], results: ReloadResult[]): Promise<void> {
  for (const { target, resolved, reloadText } of planned) {
    const { entity: ent, backend, handle } = resolved;
    try {
      // No console to type `/reload` into leaves only the daemon, which owns
      // every lifecycle mechanism a backend does or does not have.
      results.push(backend.paneInput
        ? reloadPaneAndAwaitBridge(backend, describeHandle(handle), ent.key, reloadText)
        : await lifecycleThroughDaemon("reload", ent.key, describeHandle(handle)));
    } catch (error: unknown) {
      results.push({ pane: target, ok: false, reason: errorMessage(error) });
    }
  }
}

function reportReloads(results: readonly ReloadResult[], json: boolean): void {
  const ok = results.filter((result) => result.ok).length;
  if (json) {
    process.stdout.write(JSON.stringify({ results, ok, total: results.length, hard: false, signaled: "reload.signal" }) + "\n");
  } else {
    for (const result of results) {
      process.stdout.write(result.ok ? `RELOADED ${result.pane}\n` : `FAILED ${result.pane}: ${errorMessage(result.reason ?? "reload failed")}\n`);
    }
    process.stdout.write("SIGNALED reload.signal\n");
  }
  // `process.exitCode`, never `process.exit()`: the JSON above is buffered, so
  // exiting here truncates the very payload a caller reads to find out WHICH
  // target failed (src/commands/index.ts:272 states the same rule).
  if (ok !== results.length) process.exitCode = 1;
}

export async function cmdReload(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const { targets, all } = lifecycleTargets(args, ["--json", "--force"]);
  // `--all` is a valid invocation even with zero live panes: it still touches
  // reload.signal (SIGNALED) for config/extension watchers. Only a bare call
  // with neither --all nor a target is a usage error.
  if (!all && !targets.length) die("usage: orch reload <target>... | --all [--json]");
  const results: ReloadResult[] = [];
  const planned = planReloads(targets, args.includes("--force"), results);
  // A reload exists to pick up new code, so stale deployments redeploy first —
  // but only for the harnesses being reloaded. `orch reload <pi agent>` has no
  // business rewriting another harness's integration.
  if (planned.length) await refreshStaleShims(orchDir(), [...new Set(planned.map((plan) => plan.harnessId))]);
  await performReloads(planned, results);
  try {
    touchReloadSignal();
  } catch (error: unknown) {
    die(`Failed reload.signal: ${errorMessage(error)}`);
  }
  reportReloads(results, json);
}

/** The command a restart relaunches the harness on. Restart is a FRESH launch,
 *  so the model is resolved exactly like spawn and reset rather than letting the
 *  harness fall back to its own default. */
function restartLaunchCommand(cmd: string | null, harnessId: string, adapter: AgentAdapter, config: OrchConfig): string {
  if (cmd !== null) return cmd;
  const model = launchModel({}, config, adapter);
  assertLaunchModelAllowed(adapter.id, model);
  return adapterCommand(harnessId, config, { model, preferredModels: config.models.preferred[adapter.id] ?? [] });
}

/** Restart one target. A detached agent has no shell to type a quit into, so the
 *  daemon rules on what restart means for it. */
async function restartOneTarget(target: string, cmd: string | null, config: OrchConfig, flags: { json: boolean; force: boolean }): Promise<boolean> {
  const { entity: ent, backend, handle } = resolveLifecycleTarget(target);
  assertAgentOwned(target, ent, flags.force);
  const harness = ent.agent ?? ent.presence?.status?.agent;
  if (!harness) die(`Target "${target}" has no recorded harness - cannot determine its restart mechanism.`);
  const adapter = resolveAdapterOrDie(harness);
  const quitCmd = adapter.lifecycleControl?.lifecycleCmd("restart");
  if (!quitCmd) die(`Target "${target}" uses adapter ${adapter.id}, which has no restart mechanism.`);
  if (!backend.paneInput) {
    const restarted = await lifecycleThroughDaemon("restart", ent.key, describeHandle(handle));
    if (restarted.ok) {
      if (!flags.json) process.stdout.write(`${restarted.pane}: bridge live.\n`);
      return true;
    }
    const reason = restarted.reason ?? "restart failed";
    lifecycleLogger(ent.key).error("lifecycle.restart-failed", { handle: String(restarted.pane), error: reason });
    process.stdout.write(`${restarted.pane}: ${reason}\n`);
    return false;
  }
  const launch = restartLaunchCommand(cmd, harness, adapter, config);
  if (!flags.json) process.stdout.write(`Restarting ${describeHandle(handle)} (${launch})...\n`);
  if (!restartPaneAndAwaitBridge(backend, describeHandle(handle), launch, ent.key, quitCmd.text)) return false;
  if (!flags.json) process.stdout.write(`${describeHandle(handle)}: bridge live.\n`);
  return true;
}

export async function cmdRestart(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const flags = { json, force: args.includes("--force") };
  const { targets, values } = lifecycleTargets(args, ["--hard", "--json", "--force"], ["--cmd"]);
  if (!targets.length) die("usage: orch restart <target>... | --all [--cmd pi] [--json]");
  const cmd = values.get("--cmd") ?? null;
  const config = loadConfig(orchDir());
  let ok = 0;
  for (const target of targets) {
    if (await restartOneTarget(target, cmd, config, flags)) ok++;
  }
  if (json) process.stdout.write(JSON.stringify({ targets, ok, total: targets.length, hard: true }) + "\n");
  else process.stdout.write(`${ok}/${targets.length} restarted with fresh bridge.\n`);
  // `process.exitCode`, never `process.exit()` — same rule as reload above.
  if (ok !== targets.length) process.exitCode = 1;
}

/** What the plexer did with the name after orch's own write landed (U5). */
interface ChromeOutcome {
  readonly chrome: "renamed" | "none" | "failed";
  readonly chromeError: string | null;
}

/**
 * Write the new label into orch's registry, then let the plexer SHOW it.
 *
 * `TASKS/11-usage-bugs.md` U5: this used to relabel the agent and leave the pane
 * BORDER reading the old name, because a separate `--pane` invocation set the
 * border — two names for one fact, which Rule 9 forbids and
 * `TASKS/01-agent-model.md` settles (a name is ONE piece of display metadata).
 * The operator watches the panes; a stale border is worse than an ordinal
 * because it actively lies about which worker holds which slice.
 *
 * orch's own name write commits FIRST and alone. The chrome is a separate action
 * whose failure is reported and never rewrites whether the rename happened
 * (`TASKS/07-port-seam.md`: "the response states the two outcomes separately").
 */
function renameAgent(
  backend: Backend,
  handle: BackendHandle,
  key: string,
  name: string,
  views: ReadonlyMap<string, AgentView>,
): ChromeOutcome | null {
  const view = viewForKey(views, key);
  if (!view) {
    lifecycleLogger(key).error("rename.unmanaged-agent", { target: key });
    process.stdout.write(`orch rename: ${key} is not an orch-spawned agent; use --pane to relabel the pane.\n`);
    return null;
  }
  assertNameFree(name, view.environment.space ?? "");
  const identity = tryParseIdentity(key);
  if (!identity || !renameNormalizedAgent(orchDir(), identity.id, name)) return null;
  const role = backend.agentNaming;
  if (!role) throw new Error("target environment has no agent naming role");
  role.renameAgent(handle, name);
  // The border follows the name in the SAME command. An environment with no
  // pane naming has no border to sync, which is an answer, not a failure (E14).
  const paneNaming = backend.paneNaming;
  if (!paneNaming) return { chrome: "none", chromeError: null };
  try {
    paneNaming.renamePane(handle, name);
    return { chrome: "renamed", chromeError: null };
  } catch (error: unknown) {
    const message = errorMessage(error);
    lifecycleLogger(key).warn("rename.chrome-failed", { handle: describeHandle(handle), error: message });
    process.stdout.write(`orch rename: named "${name}", but the pane border was not updated: ${message}\n`);
    return { chrome: "failed", chromeError: message };
  }
}

export function cmdRename(args: string[]) {
  const paneLabel = args.includes("--pane");
  const json = args.includes("--json");
  const force = args.includes("--force");
  const positional = args.filter((arg) => arg !== "--pane" && arg !== "--json" && arg !== "--force");
  const target = positional[0];
  const name = positional[1];
  if (!target || !name) die("usage: orch rename <target> <name> [--pane] [--force]");
  const views = agentViewIndex();
  const { backend, handle, key } = backendTarget(target, "rename", views);
  assertAgentOwned(target, { key }, force, views);
  // Renaming an agent moves a label only: orch's registry owns the name, the
  // identity key never changes, and every session/daemon route survives it.
  // --pane relabels the backend's pane chrome instead and leaves the name alone.
  let outcome: ChromeOutcome | null = null;
  try {
    if (paneLabel) {
      // `--pane` is for deliberately giving the border something DIFFERENT. It
      // leaves orch's name alone; it is never the price of a correct display.
      if (!backend.paneNaming) throw new Error("target environment has no pane naming role");
      backend.paneNaming.renamePane(handle, name);
      outcome = { chrome: "renamed", chromeError: null };
    } else outcome = renameAgent(backend, handle, key, name, views);
  } catch (error: unknown) {
    die(`orch rename: ${errorMessage(error)}`);
  }
  if (!outcome) die(`Could not rename ${handle}.`);
  if (json) {
    process.stdout.write(JSON.stringify({
      target: handle, key, name, paneLabel, renamed: true,
      chrome: outcome.chrome, chromeError: outcome.chromeError,
    }) + "\n");
  } else {
    const chrome = outcome.chrome === "failed" ? " (pane border NOT updated)" : "";
    process.stdout.write(`${handle} -> ${paneLabel ? "pane label" : "named"} "${name}"${chrome}.\n`);
  }
}

interface RecordedProcess {
  pid: number;
  startToken?: string;
}

/** The agent id inside a presence key. A key is an ENVIRONMENT wrapped around
 *  orch's opaque id, and the store is keyed by that id alone; a key that does not
 *  parse is already bare. Same resolution as `deriveLeasePayload` — reading the
 *  raw key here is what made close look up a row no writer ever produces. */
function agentIdOf(key: string): string {
  return tryParseIdentity(key)?.id ?? key;
}

/** Read the launch identity from the normalized agent process interval. Presence
 * status carries liveness only and can never authorize a signal. */
function recordedProcess(key: string): RecordedProcess | null {
  try {
    const row = currentProcess(orchDir(), agentIdOf(key));
    if (row === undefined) return null;
    return { pid: row.pid, ...(row.startToken === null ? {} : { startToken: row.startToken }) };
  } catch {
    return null;
  }
}

/** Whether the recorded process instance is still present after a close attempt. */
function recordedProcessRemains(recorded: RecordedProcess): boolean {
  const startToken = recorded.startToken;
  if (typeof startToken !== "string") return processIsAlive(recorded.pid);
  const exited = retryingSync(
    "await closed process",
    () => !processInstanceMatches(recorded.pid, startToken),
    { attempts: 40, delayMs: 50, backoff: 1 },
    { sleepSync: sleepMs, retryOnResult: (value) => !value },
  );
  return !exited;
}

/** Close is the SECOND ending verb. TASKS/01-agent-model.md §11: close "ends
 *  the process; an `agent_endings` row is written, row and history stay", and
 *  only `reap` deletes. Deleting the hub row here cascaded away the agent's
 *  lease and its whole lease history — so a live orch's holding vanished the
 *  moment anyone closed the agent it drove, and retention (which sweeps ended
 *  rows) had nothing left to sweep. */
function endClosedAgent(key: string): void {
  const root = orchDir();
  const agentId = agentIdOf(key);
  const row = agentById(root, agentId);
  if (row && !row.ending) {
    const by = selfId();
    endAgent(root, agentId, Date.now(), by !== undefined && agentById(root, by) ? by : null);
  }
  removePresenceAgentDir(presenceAgentDir(key, root));
}

/** One target's result from a multi-target close, with the reason it failed. */
interface CloseOutcome {
  readonly target: string;
  /** Diagnostic environment coordinate, null when the pane interval is closed. */
  readonly handle: string | null;
  readonly outcome: "done" | "error";
  readonly error: string | null;
}

/** Render a native handle without falling back to Object.prototype.toString. */
function describeHandle(handle: BackendHandle): string {
  return typeof handle === "string" ? handle : handle.toString();
}

/** Whether the ENVIRONMENT still lists this handle (U1). A plexer with no
 *  inventory, or one this process is not inside a session of, was not asked and
 *  says nothing either way, so the recorded handle stands. */
function plexerStillHasPane(backend: Backend | null, handle: BackendHandle): boolean | null {
  const inventory = backend?.paneInventory;
  // No inventory, or no session to ask, is UNKNOWN — never evidence that a
  // handle exists. A missing handle is dealt with by the caller and never
  // reaches this function.
  if (!inventory || backend?.isInsideSession() !== true) return null;
  try {
    return inventory.list().some((entry) => describeHandle(entry.handle) === describeHandle(handle));
  } catch {
    // A plexer that cannot answer has not said the pane is gone.
    return null;
  }
}

/** One agent a close was asked to end, with everything needed to end it. */
interface CloseTarget {
  readonly backend: Backend | null;
  /** The current environment handle, or null when the pane interval is closed. */
  readonly handle: BackendHandle | null;
  readonly key: string;
  readonly recorded: RecordedProcess | null;
  /** Whether a pane operation is meaningful here — false when the plexer no
   *  longer lists the handle (U1), so orch never asks it to close a lost pane. */
  readonly paneKnown: boolean;
}

/**
 * Every orch-managed record `--all` may end.
 *
 * Each row is read DIRECTLY, never resolved through a target string: resolution
 * is what makes a stale row ambiguous, and one unresolvable row must not abort
 * the sweep. A bulk close that closes nothing leaves every name reserved, which
 * is exactly when respawning is the only way out.
 */
function sweepTargets(authority: CloseAuthority): CloseTarget[] {
  const presence = presenceById();
  const targets: CloseTarget[] = [];
  for (const view of liveAgentViews(orchDir())) {
    // The human sweeps the lot; an agent sweeps only the slaves it owns, so a
    // bulk close never reaches into another orch's fleet.
    if (refuseClose(orchDir(), authority, view.id) !== null) continue;
    const address = agentAddress(view, presence);
    const backend = getBackend(view.environment.plexer ?? "") ?? null;
    if (!backend) {
      lifecycleLogger(address).warn("close.unknown-backend", { backend: view.environment.plexer, handle: address });
      process.stdout.write(`skipping ${address}: unknown backend ${JSON.stringify(view.environment.plexer)} (reaping the record)\n`);
    }
    const handle = view.environment.handle;
    const paneState = handle === null ? false : plexerStillHasPane(backend, handle);
    targets.push({
      backend, handle, key: address, recorded: recordedProcess(address),
      // Unknown inventory still permits a real recorded handle to be handed to
      // the plexer; a null handle is never replaced with the agent id.
      paneKnown: handle !== null && paneState !== false,
    });
  }
  return targets;
}

/** The targets named on the command line. Unlike the sweep, a refusal here is
 *  fatal: the caller asked for THAT agent and must be told it is not theirs. */
function namedTargets(positional: readonly string[], authority: CloseAuthority): CloseTarget[] {
  return positional.map((target) => {
    const resolved = resolveLifecycleTarget(target);
    // The LEASE never gates ending: an orch must be able to close its own slave
    // while another orch drives it, and a dead holder must never keep a runaway
    // alive. OWNERSHIP does gate it for an agent - the human is unrestricted,
    // an agent reaches only its own provenance subtree.
    const refusal = refuseClose(orchDir(), authority, resolved.key);
    if (refusal !== null) die(refusal);
    // `resolveLifecycleTarget` also supplies process-oriented fallbacks (pid/key).
    // Close may hand only the environment's actual pane handle to paneHost.
    const handle = resolved.view !== null ? resolved.view.environment.handle : resolved.entity.paneId;
    return {
      backend: resolved.backend,
      handle,
      key: resolved.key,
      recorded: recordedProcess(resolved.key),
      // A pane-capable backend's stale registry row may outlive its pane. Do
      // not invoke a provider with an opaque identity handle in that case.
      paneKnown: handle !== null && (resolved.backend.paneInventory === null || resolved.entity.paneId !== null),
    };
  });
}

/** How one target was ended, or why it could not be. `failure` is the REAL
 *  reason at each point it can go wrong, never one sentence covering all four. */
interface CloseAttempt {
  readonly failure: string | null;
  readonly signalled: boolean;
  readonly closedByBackend: boolean;
  /** True when the backend explicitly said the pane was already absent. */
  readonly alreadyAbsent: boolean;
}

/** Signal the recorded process INSTANCE, never merely the pid: reaping waits
 *  until that same (pid, start_token) is gone, not until kill(2) is accepted. */
function closeByProcess(recorded: RecordedProcess): CloseAttempt {
  try {
    process.kill(recorded.pid, "SIGTERM");
  } catch (error: unknown) {
    return { failure: errorMessage(error), signalled: false, closedByBackend: false, alreadyAbsent: false };
  }
  const failure = recordedProcessRemains(recorded) ? `process ${recorded.pid} is still running after SIGTERM` : null;
  return { failure, signalled: true, closedByBackend: false, alreadyAbsent: false };
}

/** A pane host owns closure when process identity is unavailable. */
function closeByPane(paneHost: PaneHostRole, handle: BackendHandle): CloseAttempt {
  try {
    paneHost.close(handle);
    return { failure: null, signalled: false, closedByBackend: true, alreadyAbsent: false };
  } catch (error: unknown) {
    // A pane that is already gone is the desired end state, not a close error.
    const message = errorMessage(error);
    if (message.includes("pane_not_found")) {
      return { failure: null, signalled: false, closedByBackend: true, alreadyAbsent: true };
    }
    return { failure: message, signalled: false, closedByBackend: false, alreadyAbsent: false };
  }
}

/** A plexer's successful close is not proof when its inventory can answer: verify
 *  the handle is really gone after every close attempt we can observe. */
function stillListed(target: CloseTarget): string | null {
  // An inventory that cannot see this session is UNKNOWN, so it cannot prove
  // that a successfully closed handle remains present.
  if (target.handle === null || !target.backend?.paneInventory || target.backend.isInsideSession() !== true) return null;
  const handle = target.handle;
  try {
    const listed = target.backend.paneInventory.list()
      .some((entry) => describeHandle(entry.handle) === describeHandle(handle));
    return listed === true
      ? `${describeHandle(handle)} is still listed by ${target.backend?.id ?? "the plexer"} after the close`
      : null;
  } catch (error: unknown) {
    return errorMessage(error);
  }
}

/** The one mechanism that can end this target, decided from the recorded
 *  process and the environment's pane role BEFORE anything is attempted. A
 *  variant carries what its own close needs, so the attempt re-derives nothing. */
type CloseRoute =
  | { readonly kind: "process"; readonly recorded: RecordedProcess }
  | { readonly kind: "pane"; readonly paneHost: PaneHostRole }
  | { readonly kind: "untokenized"; readonly pid: number }
  | { readonly kind: "none" };

function closeRoute(target: CloseTarget, paneHost: PaneHostRole | null): CloseRoute {
  // Narrowed to the RECORD OF A LIVE PROCESS in one step: a dead pid is the
  // same answer as no record at all, and every test below reads one value.
  const recorded = target.recorded !== null && processIsAlive(target.recorded.pid) ? target.recorded : null;
  const token = recorded !== null && typeof recorded.startToken === "string" ? recorded.startToken : null;
  if (recorded !== null && token !== null && processInstanceMatches(recorded.pid, token)) {
    return { kind: "process", recorded };
  }
  if (target.paneKnown && paneHost !== null) return { kind: "pane", paneHost };
  // A live process without a launch token cannot be safely signalled or
  // reaped: losing the row would make that process unreachable.
  if (recorded !== null) return { kind: "untokenized", pid: recorded.pid };
  return { kind: "none" };
}

function takeRoute(route: CloseRoute, handle: BackendHandle | null): CloseAttempt {
  switch (route.kind) {
    case "process": return closeByProcess(route.recorded);
    case "pane": return handle === null
      ? { failure: "pane route had no environment handle", signalled: false, closedByBackend: false, alreadyAbsent: false }
      : closeByPane(route.paneHost, handle);
    case "untokenized": return {
      failure: `process ${route.pid} is live but carries no start token, so orch cannot prove it is this agent`,
      signalled: false, closedByBackend: false, alreadyAbsent: false,
    };
    case "none": return { failure: null, signalled: false, closedByBackend: false, alreadyAbsent: false };
  }
}

/** End one agent by the strongest means available, and say what happened. */
function attemptClose(target: CloseTarget): CloseAttempt {
  const paneHost = target.backend?.paneHost ?? null;
  const paneCapable = target.paneKnown && paneHost !== null && target.handle !== null;
  const attempt = takeRoute(closeRoute(target, paneHost), target.handle);
  if (attempt.failure !== null || !paneCapable || attempt.alreadyAbsent) return attempt;
  const lingering = stillListed(target);
  return lingering === null ? attempt : { ...attempt, failure: lingering };
}

/** SIGTERM this session's `orch events` streams, never orch itself. */
function killEventStreams(): number {
  let pids: number[] = [];
  try {
    pids = execFileSync("pgrep", ["-f", "orch events"]).toString().trim().split("\n").filter(Boolean).map(Number);
  } catch { /* no stream running */ }
  const skip = new Set([process.pid, process.ppid]);
  const kill = pids.filter((pid) => !skip.has(pid));
  for (const pid of kill) { try { process.kill(pid, "SIGTERM"); } catch { /* already gone */ } }
  return kill.length;
}

/** Close every target once, in order, recording an outcome for each.
 *
 *  `TASKS/07-port-seam.md`, "Multi-target commands": one recorded outcome per
 *  target with the real error text. Prose on stderr is not something a caller
 *  can act on, and a payload carrying only the successes cannot tell a full
 *  sweep from a half one. A target named twice is closed once. */
function closeEachTarget(targets: readonly CloseTarget[], json: boolean): { results: CloseOutcome[]; closed: string[]; ok: number } {
  const results: CloseOutcome[] = [];
  const closed: string[] = [];
  const seen = new Set<string>();
  for (const target of targets) {
    if (seen.has(target.key)) continue;
    seen.add(target.key);
    const handle = target.handle === null ? null : describeHandle(target.handle);
    const { failure, signalled, closedByBackend } = attemptClose(target);
    if (failure !== null) {
      lifecycleLogger(target.key).error("close.failed", { handle, error: failure });
      results.push({ target: target.key, handle, outcome: "error", error: failure });
      process.stdout.write(`Could not close ${target.key}: ${failure}\n`);
      continue;
    }
    endClosedAgent(target.key);
    closed.push(target.key);
    results.push({ target: target.key, handle, outcome: "done", error: null });
    if (!json) process.stdout.write(`Closed ${target.key}${closedByBackend || signalled ? "." : " (already stopped)."}\n`);
  }
  return { results, closed, ok: closed.length };
}

/** Say what the whole close did, and set the exit code from it. */
function reportClose(
  outcome: { results: CloseOutcome[]; closed: string[]; ok: number },
  flags: { all: boolean; stream: boolean; json: boolean },
): void {
  const { results, closed, ok } = outcome;
  const { all, stream, json } = flags;
  const requested = results.length;
  if (all && !requested && !json) process.stdout.write("No fleet agents to close.\n");
  if (stream) {
    const killed = killEventStreams();
    if (!json) process.stdout.write(killed ? `Killed ${killed} orch events process(es).\n` : "No orch events stream running.\n");
  }
  if (json) process.stdout.write(JSON.stringify({ closed, results, requested, ok, stream }) + "\n");
  // `process.exitCode`, never `process.exit()`: the JSON above is buffered, and
  // exiting here truncates the very payload a caller reads to find out WHICH
  // target failed (src/commands/index.ts:272 states the same rule).
  if (requested && ok !== requested) process.exitCode = 1;
}

export function cmdClose(args: string[]) {
  const usage = "usage: orch close <target>... | --all [--stream] [--json]";
  const { enabled, positional } = splitOptionFlags(args, ["--all", "--stream", "--json"]);
  const all = enabled.has("--all");
  const stream = enabled.has("--stream");
  const json = enabled.has("--json");
  // Reject unknown flags before resolving or closing any preceding target.
  if (positional.some((argument) => argument.startsWith("--"))) die(usage);
  if (!all && !positional.length) die(usage);

  const authority = callerAuthority(selfIdentity());
  const targets = [...(all ? sweepTargets(authority) : []), ...namedTargets(positional, authority)];

  reportClose(closeEachTarget(targets, json), { all, stream, json });
}

export function cmdAbort(args: string[]) {
  const json = args.includes("--json");
  const target = args.find((arg) => arg !== "--json" && arg !== "--force");
  if (!target) die("usage: orch abort <target> [--force] [--json]");
  // Abort is an unconditional ending operation: resolve from orch's registry so
  // a foreign-space target is still reachable, and never apply owner gates.
  const { backend, handle, entity } = resolveLifecycleTarget(target);
  const input = backend.paneInput;
  if (!entity.paneId || !input) {
    const reason = !entity.paneId ? "no-pane" : "no-environment-role";
    const text = !entity.paneId ? `${target} has no pane; abort does not apply.` : "this pane environment does not provide abort";
    if (json) process.stdout.write(JSON.stringify({ outcome: "answer", reason, text }) + "\n");
    else process.stdout.write(text + "\n");
    return;
  }
  input.sendKeys(handle, ["Escape"]);
  sleepMs(500);
  input.sendKeys(handle, ["Escape"]);
  if (json) process.stdout.write(JSON.stringify({ target: handle, aborted: true }) + "\n");
  else process.stdout.write(`Aborted ${describeHandle(handle)}.\n`);
}

