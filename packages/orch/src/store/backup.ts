import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import { settingsPath } from "../settings/schema.ts";
import type { OrchDir } from "../types/core.ts";
import { storeFiles } from "./connection.ts";

export const BACKUPS_DIR = "backups";

export type BackedUpFile =
  | { readonly kind: "copied"; readonly file: string; readonly copy: string }
  | { readonly kind: "absent"; readonly file: string };

export interface StateBackup {
  readonly dir: string;
  readonly files: readonly BackedUpFile[];
}

/** `$ORCH_DIR/backups/<label>-<ISO stamp with : and . replaced by ->/` */
export function backupDir(orchDir: OrchDir, label: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return join(orchDir, BACKUPS_DIR, `${label}-${stamp}`);
}

/** Copy settings.json and every store file that exists into a fresh backup directory. */
export function backupOrchState(orchDir: OrchDir, label: string): StateBackup {
  const dir = backupDir(orchDir, label);
  mkdirSync(dir, { recursive: true });
  const files: BackedUpFile[] = [];
  for (const file of [settingsPath(orchDir), ...storeFiles(orchDir)]) {
    if (!existsSync(file)) {
      files.push({ kind: "absent", file });
      continue;
    }
    const copy = join(dir, basename(file));
    copyFileSync(file, copy);
    files.push({ kind: "copied", file, copy });
  }
  return { dir, files };
}

/** Restore each backed-up file and remove files that were absent at backup time. */
export function restoreOrchState(backup: StateBackup): void {
  for (const file of backup.files) {
    switch (file.kind) {
      case "copied":
        copyFileSync(file.copy, file.file);
        break;
      case "absent":
        rmSync(file.file, { force: true });
        break;
      default: {
        const exhaustive: never = file;
        return exhaustive;
      }
    }
  }
}
