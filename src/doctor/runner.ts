import { loadConfigOrNull } from "../config.ts";
import { runSSH } from "../remote.ts";
import { getBackend } from "../backends/registry.ts";
import { resolveAdapter } from "../adapters/registry.ts";
import type { AdapterId } from "../adapters/adapter.ts";
import type { CheckResult } from "../check-result.ts";
import { binaryStatus, checkBins } from "./bins.ts";
import { checkBackendCapabilities, checkBackendVersions } from "./backends.ts";
import { checkMalformedPresenceRecords, checkStalePresence, checkUnscopedTasks } from "./presence.ts";
import { checkExtensionStaleness } from "./extensions.ts";
import { checkHarnessModels } from "./models.ts";
import { checkCommandLocks, checkConfig, checkOrchDirLocation, checkSpawnLimits, checkWorktreeGitignore } from "./config.ts";
import { checkStore } from "./store.ts";
import { checkNotifications, checkNotifiers, checkNotifySinks } from "./notify.ts";
import { checkDaemonLock, checkDaemonPresence, checkDaemonSocket, checkDaemonStaleness, checkOrphanDaemons } from "./daemon.ts";
import { checkRemoteOrchDir, checkRemoteReachability, checkRemoteVersion, type SshRunner } from "./remote.ts";
import { checkRuntime } from "./runtime.ts";
import { loadPresence } from "../presence/store.ts";
import { placementOf } from "../agent/registry.ts";

export type { CheckResult } from "../check-result.ts";

export async function isolated(id: string, label: string, check: () => Promise<CheckResult> | CheckResult): Promise<CheckResult> {
  try {
    return await check();
  } catch (error: unknown) {
    return { id, label, status: "fail", detail: error instanceof Error ? error.message : String(error) };
  }
}

/** Validate every distinct live adapter/backend composition independently. */
async function checkLiveFleetPairs(orchDir: string): Promise<CheckResult[]> {
  const pairs = new Set<string>();
  for (const entry of loadPresence(orchDir).values()) {
    if (!entry.alive) continue;
    const adapter = typeof entry.status?.agent === "string" ? entry.status.agent : undefined;
    const backend = placementOf(orchDir, entry.key)?.backend;
    if (adapter && backend) pairs.add(`${adapter}\u0000${backend}`);
  }
  return Promise.all([...pairs].map(async (encoded) => {
    const [adapterId, backendId] = encoded.split("\u0000");
    const id = `fleet-pair-${adapterId}-${backendId}`;
    try {
      const adapter = resolveAdapter(adapterId!);
      const backend = getBackend(backendId!);
      if (!backend) return { id, label: `${adapterId} + ${backendId} live pair`, status: "fail", detail: `unknown backend ${JSON.stringify(backendId)}` };
      const diagnosis = adapter.diagnoseShim ? await adapter.diagnoseShim() : { id: `shim-${adapterId}`, label: `${adapterId} integration`, status: "skip" as const, detail: `${adapterId} declares no integration shim` };
      return { ...diagnosis, id, label: `${adapterId} + ${backendId} live pair`, detail: `${adapterId}/${backendId}: ${diagnosis.detail}` };
    } catch (error: unknown) {
      return { id, label: `${adapterId} + ${backendId} live pair`, status: "fail" as const, detail: error instanceof Error ? error.message : String(error) };
    }
  }));
}

/** Run independent environment diagnostics; individual check failures never reject this function. */
export async function runDoctor(orchDir: string, sshRunner: SshRunner = runSSH): Promise<CheckResult[]> {
  // Read settings only to derive provider checks. An unconfigured install has no enabled
  // providers, and checkConfig owns the user-facing failure result, so neither an absent nor a
  // malformed settings.json can prevent the neutral checks from running. doctor is the command
  // you reach for when the install is broken; it never refuses to run for want of configuration.
  let enabledAdapters: AdapterId[] = [];
  let enabledBackends: string[] = [];
  let configuredBackend: string | null = null;
  try {
    const config = loadConfigOrNull(orchDir);
    enabledAdapters = config?.enabled.adapters ?? [];
    enabledBackends = config?.enabled.backends ?? [];
    configuredBackend = config?.defaults.backend ?? null;
  } catch {}
  const bins = binaryStatus(enabledAdapters);
  const providerChecks = enabledAdapters.map((id) => [
    isolated(`bin-${id}`, `${id} binary`, () => bins[id]
      ? { id: `bin-${id}`, label: `${id} binary`, status: "ok", detail: `${id} is on PATH` }
      : { id: `bin-${id}`, label: `${id} binary`, status: "fail", detail: `${id} is not on PATH` }),
    isolated(`shim-${id}`, `${id} integration`, async () => {
      const adapter = resolveAdapter(id);
      return adapter.diagnoseShim ? await adapter.diagnoseShim() : { id: `shim-${id}`, label: `${id} integration`, status: "skip", detail: `${id} declares no integration shim` };
    }),
    isolated(`models-${id}`, `${id} models`, () => checkHarnessModels(orchDir, id)),
  ]).flat();
  let livePairs: CheckResult[];
  try {
    livePairs = await checkLiveFleetPairs(orchDir);
  } catch {
    // Pair discovery is supplemental; a broken presence root must not prevent
    // the independent doctor checks from running and reporting their own result.
    livePairs = [];
  }
  return Promise.all([
    isolated("bins", "Required binaries", () => checkBins(bins, enabledAdapters)),
    ...providerChecks,
    ...livePairs.map((pair) => Promise.resolve(pair)),
    isolated("backend-capabilities", "Backend capabilities", () => checkBackendCapabilities(enabledBackends, configuredBackend)),
    isolated("backend-versions", "Backend versions", () => checkBackendVersions(orchDir)),
    isolated("malformed-presence", "Malformed presence records", () => checkMalformedPresenceRecords(orchDir)),
    isolated("stale-presence", "Stale presence dirs", () => checkStalePresence(orchDir)),
    isolated("store", "Store", () => checkStore(orchDir)),
    isolated("unscoped-tasks", "Unscoped queue tasks", () => checkUnscopedTasks(orchDir)),
    isolated("extension-staleness", "Extension staleness", () => checkExtensionStaleness(orchDir)),
    isolated("config", "Config validity", () => checkConfig(orchDir)),
    isolated("runtime", "Declared runtime", () => checkRuntime(orchDir)),
    isolated("spawn-limits", "Spawn limits", () => checkSpawnLimits(orchDir)),
    isolated("command-locks", "Command locks", () => checkCommandLocks(orchDir)),
    isolated("notifications", "Desktop notifications", () => checkNotifications(bins)),
    isolated("notify-sinks", "Notification sinks", () => checkNotifySinks(orchDir, bins)),
    isolated("notifiers", "Notifiers", () => checkNotifiers(orchDir)),
    isolated("orchdir-location", "ORCH_DIR location", () => checkOrchDirLocation(orchDir)),
    isolated("orchd", "orchd presence", () => checkDaemonPresence(orchDir)),
    isolated("orchd-staleness", "orchd code", () => checkDaemonStaleness(orchDir)),
    isolated("orchd-lock", "orchd lock", () => checkDaemonLock(orchDir)),
    isolated("orchd-socket", "orchd socket", () => checkDaemonSocket(orchDir)),
    isolated("orphan-daemons", "Orphaned daemons", () => checkOrphanDaemons(orchDir)),
    isolated("remote-ssh", "Remote SSH reachability", () => checkRemoteReachability(orchDir, sshRunner)),
    isolated("remote-orch-version", "Remote orch version/schema", () => checkRemoteVersion(orchDir, sshRunner)),
    isolated("remote-orch-dir", "Remote ORCH_DIR", () => checkRemoteOrchDir(orchDir, sshRunner)),
    isolated("worktree-gitignore", "Worktree gitignore", checkWorktreeGitignore),
  ]);
}

export function applyFixes(results: CheckResult[]): { applied: string[] } {
  const applied: string[] = [];
  for (const result of results) {
    if (!result.fix) continue;
    result.fix.apply();
    applied.push(result.fix.description);
  }
  return { applied };
}

/** Redeploy every installed adapter's stale integration shim. Cheap when current
 *  (a live symlink resolves with two stats), so spawn and reload run it first —
 *  a freshly updated orch must never launch agents on the last version's bridge. */
export async function refreshStaleShims(orchDir: string): Promise<string[]> {
  const refreshed: string[] = [];
  const adapters = loadConfigOrNull(orchDir)?.enabled.adapters ?? [];
  for (const id of adapters) {
    try {
      const adapter = resolveAdapter(id);
      if (!adapter.diagnoseShim) continue;
      const diagnosis = await adapter.diagnoseShim();
      if (diagnosis.status === "ok" || diagnosis.status === "skip") continue;
      if (!diagnosis.fix) continue;
      // An undeclared `destructive` means a safe fix; only a declared one is left for the operator.
      if (diagnosis.fix.destructive) continue;
      diagnosis.fix.apply();
      refreshed.push(id);
    } catch (error: unknown) {
      // A broken shim diagnosis warns; it never blocks the command that asked.
      process.stderr.write(`warning: ${id} integration refresh failed: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }
  return refreshed;
}
