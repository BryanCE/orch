import { existsSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// `bun reset` wipes ORCH_DIR back to brand-new-user state so `orch setup` runs
// the first-run flow. Node-safe: no Bun.* APIs. Dry-run convention — no flag
// mutates for real, `--dry-run` only previews.
const isDryRun = process.argv.includes("--dry-run");
const orchDir = process.env.ORCH_DIR ?? join(homedir(), ".orch");

function daemonPid(): number | null {
  const lock = join(orchDir, "orchd.lock");
  if (!existsSync(lock)) return null;
  try {
    const record = JSON.parse(readFileSync(lock, "utf8")) as { pid?: unknown };
    return typeof record.pid === "number" && Number.isInteger(record.pid) ? record.pid : null;
  } catch {
    return null;
  }
}

function stopDaemon(pid: number): void {
  try {
    process.kill(pid, "SIGTERM");
    process.stdout.write(`stopped orchd (pid ${pid})\n`);
  } catch {
    process.stdout.write(`orchd pid ${pid} already gone\n`);
  }
}

if (!existsSync(orchDir)) {
  process.stdout.write(`already new-user state: ${orchDir} does not exist — run 'orch setup'.\n`);
  process.exit(0);
}

const pid = daemonPid();

if (isDryRun) {
  process.stdout.write(`[dry-run] would remove ORCH_DIR: ${orchDir}\n`);
  if (pid !== null) process.stdout.write(`[dry-run] would stop orchd (pid ${pid})\n`);
  process.stdout.write(`[dry-run] after reset, 'orch setup' runs as a first-time user.\n`);
  process.exit(0);
}

if (pid !== null) stopDaemon(pid);
rmSync(orchDir, { recursive: true, force: true });
process.stdout.write(`reset complete — removed ${orchDir}. Run 'orch setup' to start fresh.\n`);
