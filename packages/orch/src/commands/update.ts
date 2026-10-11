import { confirm, isCancel } from "@clack/prompts";
import { spawnSync } from "node:child_process";
import { backupOrchState, restoreOrchState } from "../store/backup.ts";
import { livePresenceHolders } from "../store/connection.ts";
import { provenDaemonPid, terminateDaemon } from "../daemon/client/process.ts";
import { errorMessage, packageManifest, pidAlive } from "../util.ts";
import { SETTINGS_DEFAULTS } from "../settings/schema.ts";
import { usageError } from "../cli/usage.ts";
import { parseCommand } from "./registry.ts";
import {
  breakingNotes, compareReleases, installRelease, installedOrchBin, latestRelease,
  notesBetween, npmRunner, parseReleaseVersion,
} from "../update/release.ts";
import type { PackageRunner, ReleaseVersion } from "../update/release.ts";
import { finishUpdate, type FinishReport, type FinishServices } from "../update/finish.ts";
import type { StateBackup } from "../store/backup.ts";
import type { Services } from "../types/services.ts";
import type { OrchSettings } from "../types/settings.ts";

export interface UpdateDeps {
  readonly runner: PackageRunner;
  readonly confirm: (question: string) => Promise<boolean>;
  readonly finish: (services: FinishServices) => Promise<FinishReport>;
  readonly runInstalledFinish: (bin: string, yes: boolean) => number;
}

async function promptConfirm(question: string): Promise<boolean> {
  const answer = await confirm({ message: question, initialValue: false });
  return !isCancel(answer) && answer === true;
}

export const UPDATE_DEPS: UpdateDeps = {
  runner: npmRunner,
  confirm: promptConfirm,
  finish: (services) => finishUpdate(services),
  runInstalledFinish: (bin, yes) => {
    const result = spawnSync(bin, ["update", "--finish", ...(yes ? ["--yes"] : [])], { stdio: "inherit" });
    return result.status ?? 1;
  },
};

function printFinish(report: FinishReport): void {
  if (report.kind === "failed") {
    process.stderr.write(`update finish failed at ${report.step}: ${report.reason}\n`);
    return;
  }
  if (report.settingsChanges.length) process.stdout.write(`Settings changes:\n${report.settingsChanges.map((change) => `  - ${change}\n`).join("")}`);
  if (report.fixes.length) process.stdout.write(`Doctor fixes:\n${report.fixes.map((fix) => `  - ${fix}\n`).join("")}`);
  if (report.failing.length) process.stdout.write(`Doctor checks still failing:\n${report.failing.map((row) => `  - ${row.label}: ${row.detail}\n`).join("")}`);
}

function fail(message: string): void {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function timeoutSettings(services: Services): OrchSettings["timeouts"] {
  try {
    return services.settings.currentOrNull()?.timeouts ?? SETTINGS_DEFAULTS.timeouts;
  } catch {
    return SETTINGS_DEFAULTS.timeouts;
  }
}

function printNotes(notes: ReturnType<typeof notesBetween>): void {
  for (const entry of notes) {
    process.stdout.write(`  ${entry.version}\n${entry.notes.map((note) => `    - ${note}\n`).join("")}`);
  }
}

function printJump(current: ReleaseVersion, target: ReleaseVersion, notes: ReturnType<typeof notesBetween>): void {
  process.stdout.write(`orch ${current} -> ${target}\n`);
  printNotes(notes);
}

type Preparation =
  | { readonly kind: "ready"; readonly backup: StateBackup }
  | { readonly kind: "refused"; readonly reason: string };

/** Nothing live may hold the store, orchd is stopped, and settings.json and orch.db are copied aside. */
async function prepare(services: Services, current: ReleaseVersion, timeoutMs: number): Promise<Preparation> {
  const workers = livePresenceHolders(services.orchDir).workers;
  if (workers.length) return { kind: "refused", reason: `Live workers block update (${workers.join(", ")}); close them first with orch close --all` };
  const pid = provenDaemonPid(services.orchDir);
  if (pid !== undefined) {
    await terminateDaemon(pid, timeoutMs);
    if (pidAlive(pid)) return { kind: "refused", reason: `Timed out stopping orchd (pid ${pid}); raise timeouts.daemon_stop_ms` };
  }
  return { kind: "ready", backup: backupOrchState(services.orchDir, `update-${current}`) };
}

export async function runUpdate(services: Services, args: string[], deps: UpdateDeps): Promise<void> {
  const invocation = parseCommand("update", args);
  if (invocation.positional.length) throw usageError(invocation, `orch update takes no arguments, got ${invocation.positional.join(" ")}`);
  const targetArg = invocation.flags.value("--to");
  const check = invocation.flags.has("--check");
  const finishOnly = invocation.flags.has("--finish");
  const yes = invocation.flags.has("--yes");
  if (finishOnly) {
    const report = await deps.finish(services);
    printFinish(report);
    if (report.kind === "failed") process.exitCode = 1;
    return;
  }
  if (check && (targetArg !== undefined || yes)) throw usageError(invocation, "--check cannot be combined with --to or --yes");

  const manifest = packageManifest();
  const current = parseReleaseVersion(manifest.version);
  if (current === null) throw new Error(`Invalid installed orch version: ${manifest.version}`);
  const timeouts = timeoutSettings(services);
  const target = targetArg === undefined
    ? latestRelease(manifest.name, deps.runner, timeouts.update_query_ms)
    : parseReleaseVersion(targetArg);
  if (target === null) throw usageError(invocation, `invalid release version "${targetArg}"`);
  if (compareReleases(target, current) < 0) {
    fail(`Refusing downgrade: orch only moves forward; ${current} is installed`);
    return;
  }
  const notes = notesBetween(breakingNotes(manifest.name, target, deps.runner, timeouts.update_query_ms), current, target);
  if (check) {
    if (compareReleases(target, current) === 0) process.stdout.write(`orch ${current} is the newest\n`);
    else printJump(current, target, notes);
    return;
  }
  printJump(current, target, notes);
  if (!yes) {
    if (process.stdin.isTTY !== true) {
      fail("No terminal is available. Rerun with --yes to update without prompting.");
      return;
    }
    if (!(await deps.confirm(`Install orch ${target}?`))) return;
  }

  const updateInstallMs = timeouts.update_install_ms;
  const daemonStopMs = timeouts.daemon_stop_ms;
  const preparation = await prepare(services, current, daemonStopMs);
  if (preparation.kind === "refused") {
    fail(preparation.reason);
    return;
  }
  const { backup } = preparation;
  if (compareReleases(target, current) === 0) {
    const report = await deps.finish(services);
    printFinish(report);
    if (report.kind === "failed") {
      restoreOrchState(backup);
      fail(`Migration failed; restored settings.json and orch.db; backup kept at ${backup.dir}`);
      return;
    }
    process.stdout.write(`orch ${current} migrated in place; backup at ${backup.dir}\n`);
    return;
  }
  try {
    installRelease(manifest.name, target, deps.runner, updateInstallMs);
  } catch (error: unknown) {
    restoreOrchState(backup);
    fail(`${errorMessage(error)}; orch ${current} stays installed; settings.json and orch.db restored; backup kept at ${backup.dir}`);
    return;
  }
  let finishCode: number;
  try {
    finishCode = deps.runInstalledFinish(installedOrchBin(deps.runner, timeouts.update_query_ms), yes);
  } catch (error: unknown) {
    finishCode = 1;
    process.stderr.write(`${errorMessage(error)}\n`);
  }
  if (finishCode !== 0) {
    try {
      installRelease(manifest.name, current, deps.runner, updateInstallMs);
      restoreOrchState(backup);
      fail(`rolled back to ${current}; settings.json and orch.db restored; backup kept at ${backup.dir}`);
    } catch (error: unknown) {
      fail(`Update failed and reinstalling ${current} failed: ${errorMessage(error)}. Restore manually with: npm install -g ${manifest.name}@${current}. Backup kept at ${backup.dir}`);
    }
    return;
  }
  process.stdout.write(`updated ${current} -> ${target}; backup at ${backup.dir}\n`);
}

export async function cmdUpdate(services: Services, args: string[]): Promise<void> {
  return runUpdate(services, args, UPDATE_DEPS);
}
