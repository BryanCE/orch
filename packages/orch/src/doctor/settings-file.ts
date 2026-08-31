import * as filesystem from "node:fs";
import * as path from "node:path";
import { loadSettings, loadSettingsOrNull } from "../settings/read.ts";
import { settingsPath } from "../settings/schema.ts";
import { commandOutput, isWslRuntime } from "./shared.ts";
import { errorMessage } from "../util.ts";
import type { CheckResult } from "../types/doctor.ts";
import type { OrchSettings } from "../types/settings.ts";

export async function checkSpawnLimits(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const fleet: OrchSettings["fleet"] | undefined = loadSettingsOrNull(orchDir)?.fleet;
  const globalCap = fleet?.max_agents_total;
  const violations = globalCap === undefined || fleet === undefined
    ? []
    : Object.entries(fleet.max_agents_per_space).filter(([, cap]) => cap > globalCap);
  if (!violations.length) return { id: "spawn-limits", label: "Spawn limits", status: "ok", detail: "spawn limits are satisfiable" };
  return {
    id: "spawn-limits",
    label: "Spawn limits",
    status: "warn",
    detail: violations.map(([space, cap]) => `fleet.max_agents_per_space.${space} (${cap}) exceeds fleet.max_agents_total (${globalCap})`).join("; "),
  };
}

export async function checkCommandLocks(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const config = loadSettingsOrNull(orchDir);
  if (!config || config.locked_commands.length === 0) return { id: "command-locks", label: "Command locks", status: "skip", detail: "no locked_commands configured" };
  return {
    id: "command-locks",
    label: "Command locks",
    status: "skip",
    detail: `${config.locked_commands.length} locked command(s) are enforced by the selected harness bridge when available`,
  };
}

export async function checkSettingsFile(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const file = settingsPath(orchDir);
  if (!filesystem.existsSync(file)) return { id: "settings", label: "Settings validity", status: "ok", detail: "no settings.json" };
  try {
    loadSettings(orchDir);
    return { id: "settings", label: "Settings validity", status: "ok", detail: file };
  } catch (error: unknown) {
    return { id: "settings", label: "Settings validity", status: "fail", detail: errorMessage(error) };
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
