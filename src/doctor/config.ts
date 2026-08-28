import * as filesystem from "node:fs";
import * as path from "node:path";
import { loadConfig, loadConfigOrNull, settingsPath, type OrchConfig } from "../config.ts";
import { resolveAdapter } from "../adapters/registry.ts";
import type { CheckResult } from "../check-result.ts";
import { commandOutput, isWslRuntime } from "./shared.ts";

export async function checkSpawnLimits(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const fleet: OrchConfig["fleet"] | undefined = loadConfigOrNull(orchDir)?.fleet;
  const globalCap = fleet?.max_agents;
  const violations = globalCap === undefined || fleet === undefined
    ? []
    : Object.entries(fleet.workspace_caps).filter(([, cap]) => cap > globalCap);
  if (!violations.length) return { id: "spawn-limits", label: "Spawn limits", status: "ok", detail: "spawn limits are satisfiable" };
  return {
    id: "spawn-limits",
    label: "Spawn limits",
    status: "warn",
    detail: violations.map(([workspace, cap]) => `fleet.workspace_caps.${workspace} (${cap}) exceeds fleet.max_agents (${globalCap})`).join("; "),
  };
}

export async function checkCommandLocks(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const config = loadConfigOrNull(orchDir);
  if (!config || config.locked_commands.length === 0) return { id: "command-locks", label: "Command locks", status: "skip", detail: "no locked_commands configured" };
  const unenforced = config.enabled.adapters.filter((id) => !resolveAdapter(id).capabilities.enforcesCommandLocks);
  if (unenforced.length === 0) return { id: "command-locks", label: "Command locks", status: "ok", detail: `${config.locked_commands.length} locked command(s); every enabled adapter enforces them` };
  return {
    id: "command-locks",
    label: "Command locks",
    status: "warn",
    detail: `locked_commands set but ${unenforced.join(", ")} cannot enforce them (no pre-tool seam) - those agents get the worker-prompt clause only; the pi fleet is hard-enforced`,
  };
}

export async function checkConfig(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const file = settingsPath(orchDir);
  if (!filesystem.existsSync(file)) return { id: "config", label: "Config validity", status: "ok", detail: "no settings.json" };
  try {
    loadConfig(orchDir);
    return { id: "config", label: "Config validity", status: "ok", detail: file };
  } catch (error: unknown) {
    return { id: "config", label: "Config validity", status: "fail", detail: error instanceof Error ? error.message : String(error) };
  }
}

export function isDrvFsPath(resolved: string): boolean {
  return resolved.toLowerCase().startsWith("/mnt/");
}

export async function checkOrchDirLocation(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const id = "orchdir-location";
  const label = "ORCH_DIR location";
  let resolved: string;
  try {
    resolved = filesystem.realpathSync(orchDir);
  } catch {
    resolved = path.resolve(orchDir);
  }
  if (!isWslRuntime() || !isDrvFsPath(resolved)) {
    return { id, label, status: "ok", detail: "ORCH_DIR is on the Linux filesystem" };
  }
  return {
    id,
    label,
    status: "warn",
    detail: `ORCH_DIR resolves to ${resolved}; move $ORCH_DIR onto the Linux filesystem (e.g. under $HOME) because SQLite WAL on DrvFs (/mnt) is slow and unsafe`,
  };
}

export async function checkWorktreeGitignore(): Promise<CheckResult> {
  const worktrees = path.join(process.cwd(), ".orch-worktrees");
  if (!filesystem.existsSync(worktrees)) return { id: "worktree-gitignore", label: "Worktree gitignore", status: "skip", detail: ".orch-worktrees does not exist" };
  const result = await commandOutput("git", ["check-ignore", "-q", ".orch-worktrees"]);
  return result.ok
    ? { id: "worktree-gitignore", label: "Worktree gitignore", status: "ok", detail: ".orch-worktrees is gitignored" }
    : {
        id: "worktree-gitignore",
        label: "Worktree gitignore",
        status: "warn",
        detail: ".orch-worktrees is not gitignored; fix: printf '\n.orch-worktrees/\n' >> .gitignore",
      };
}
