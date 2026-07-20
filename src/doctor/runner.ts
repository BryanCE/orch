import * as filesystem from "node:fs";
import * as path from "node:path";
import { loadConfigOrNull } from "../config.ts";
import { runSSH } from "../remote.ts";
import { getBackend } from "../backends/registry.ts";
import { resolveAdapter } from "../adapters/registry.ts";
import { PRESENCE_SCHEMA, STATUS_FILE } from "../presence/schema.ts";
import type { CheckResult } from "../doctor-types.ts";
import { binaryStatus, checkBins } from "./bins.ts";
import { checkBackendCapabilities } from "./backends.ts";
import { checkMalformedPresenceRecords, checkStalePresence } from "./presence.ts";
import { checkExtensionStaleness } from "./extensions.ts";
import { checkCommandLocks, checkConfig, checkOrchDirLocation, checkSpawnLimits, checkSpawnedRegistry, checkWorktreeGitignore } from "./config.ts";
import { checkNotifications, checkNotifiers, checkNotifySinks } from "./notify.ts";
import { checkDaemonLock, checkDaemonPresence, checkDaemonSocket, checkDaemonStaleness } from "./daemon.ts";
import { checkRemoteOrchDir, checkRemoteReachability, checkRemoteVersion, type SshRunner } from "./remote.ts";
import { checkRuntime } from "./runtime.ts";
import { readJson } from "./shared.ts";
import { isRecord, pidAlive } from "../util.ts";

export type { CheckResult } from "../doctor-types.ts";

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
  const agentsDir = path.join(orchDir, "agents");
  let entries: filesystem.Dirent[] = [];
  try { entries = filesystem.readdirSync(agentsDir, { withFileTypes: true }); } catch {}
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const status = readJson(path.join(agentsDir, entry.name, STATUS_FILE));
    if (!isRecord(status) || status.schema !== PRESENCE_SCHEMA || !pidAlive(status.pid)) continue;
    const adapter = typeof status.agent === "string" ? status.agent : undefined;
    const backend = typeof status.backend === "string" ? status.backend : undefined;
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
  // Read settings only to derive provider checks. An unconfigured install has no installed
  // providers, and checkConfig owns the user-facing failure result, so neither an absent nor a
  // malformed settings.json can prevent the neutral checks from running. doctor is the command
  // you reach for when the install is broken; it never refuses to run for want of configuration.
  let installedAdapters: string[] = [];
  let installedBackends: string[] = [];
  let configuredBackend: string | null = null;
  try {
    const config = loadConfigOrNull(orchDir);
    installedAdapters = config?.installed.adapters ?? [];
    installedBackends = config?.installed.backends ?? [];
    configuredBackend = config?.defaults.backend ?? null;
  } catch {}
  const bins = binaryStatus(installedAdapters);
  const providerChecks = installedAdapters.map((id) => [
    isolated(`bin-${id}`, `${id} binary`, () => bins[id]
      ? { id: `bin-${id}`, label: `${id} binary`, status: "ok", detail: `${id} is on PATH` }
      : { id: `bin-${id}`, label: `${id} binary`, status: "fail", detail: `${id} is not on PATH` }),
    isolated(`shim-${id}`, `${id} integration`, async () => {
      const adapter = resolveAdapter(id);
      return adapter.diagnoseShim ? await adapter.diagnoseShim() : { id: `shim-${id}`, label: `${id} integration`, status: "skip", detail: `${id} declares no integration shim` };
    }),
  ]).flat();
  const livePairs = await checkLiveFleetPairs(orchDir);
  return Promise.all([
    isolated("bins", "Required binaries", () => checkBins(bins, installedAdapters)),
    ...providerChecks,
    ...livePairs.map((pair) => Promise.resolve(pair)),
    isolated("backend-capabilities", "Backend capabilities", () => checkBackendCapabilities(installedBackends, configuredBackend)),
    isolated("malformed-presence", "Malformed presence records", () => checkMalformedPresenceRecords(orchDir)),
    isolated("stale-presence", "Stale presence dirs", () => checkStalePresence(orchDir)),
    isolated("extension-staleness", "Extension staleness", () => checkExtensionStaleness(orchDir)),
    isolated("spawned-registry", "Spawn registry", () => checkSpawnedRegistry(orchDir)),
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
