import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PI_EXTENSION_NAMES } from "../src/bridge-bundle.ts";

// `bun reset` erases every artifact an orch install writes, so the next
// build + install runs the first-time-user flow instead of half-adopting a
// stale tree. Node-safe: no Bun.* APIs. Dry-run convention — no flag wipes for
// real, `--dry-run` only previews.
//
// Only orch's OWN artifacts go: the user's other pi extensions, Claude skills,
// hooks and codex settings are left exactly as they are.
const isDryRun = process.argv.includes("--dry-run");

const HOME = homedir();
const ORCH_DIR = process.env.ORCH_DIR ?? join(HOME, ".orch");
const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const CLAUDE_HOOK_SHIM = "claude-hooks";

/** One reversible-by-reinstall wipe. `describe` is imperative: "remove <path>". */
interface WipeStep {
  readonly describe: string;
  readonly execute: () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True for a broken symlink too, which `existsSync` reports as absent. */
function pathPresent(target: string): boolean {
  try {
    lstatSync(target);
    return true;
  } catch {
    return false;
  }
}

function readJsonFile(file: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function deletion(target: string): WipeStep | null {
  if (!pathPresent(target)) return null;
  return { describe: `remove ${target}`, execute: () => rmSync(target, { recursive: true, force: true }) };
}

function daemonStop(): WipeStep | null {
  const lock = readJsonFile(join(ORCH_DIR, "orchd.lock"));
  const pid = lock?.pid;
  if (typeof pid !== "number" || !Number.isInteger(pid)) return null;
  return {
    describe: `stop orchd (pid ${pid})`,
    execute: () => {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // Already gone: the lock outlived the process, and the dir goes next.
      }
    },
  };
}

function globalPackageRemoval(): WipeStep | null {
  let root: string;
  try {
    root = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
  if (!pathPresent(join(root, "orch"))) return null;
  return {
    describe: "npm uninstall -g orch",
    execute: () => execFileSync("npm", ["uninstall", "-g", "orch"], { stdio: "inherit" }),
  };
}

function binShimRemovals(): WipeStep[] {
  return ["orch", "pif"].map((name) => deletion(join(HOME, ".local", "bin", name))).filter(nonNull);
}

/** Orch's bundled pi extensions only — never the user's own footer/subagent ones. */
function piExtensionRemovals(): WipeStep[] {
  const extensions = join(HOME, ".pi", "agent", "extensions");
  return PI_EXTENSION_NAMES.map((name) => deletion(join(extensions, `${name}.js`))).filter(nonNull);
}

/** Whatever the repo packages is exactly what an install copied in, so it is
 *  also exactly what may be removed from the shared Claude directories. */
function packagedCopyRemovals(sourceDir: string, claudeDir: string): WipeStep[] {
  if (!existsSync(sourceDir)) return [];
  return readdirSync(sourceDir).map((entry) => deletion(join(HOME, ".claude", claudeDir, entry))).filter(nonNull);
}

function claudeHookRemoval(): WipeStep | null {
  const file = join(HOME, ".claude", "settings.json");
  const settings = readJsonFile(file);
  const hooks = settings && isRecord(settings.hooks) ? settings.hooks : null;
  if (!hooks) return null;

  const survivorsByEvent = new Map<string, unknown[]>();
  let dropped = 0;
  for (const [event, entries] of Object.entries(hooks)) {
    if (!Array.isArray(entries)) continue;
    const survivors = entries.filter((entry) => !isOrchHook(entry));
    if (survivors.length === entries.length) continue;
    dropped += entries.length - survivors.length;
    survivorsByEvent.set(event, survivors);
  }
  if (dropped === 0) return null;

  return {
    describe: `strip ${dropped} orch hook ${dropped === 1 ? "entry" : "entries"} from ${file}`,
    execute: () => {
      for (const [event, survivors] of survivorsByEvent) hooks[event] = survivors;
      writeFileSync(file, JSON.stringify(settings, null, 2) + "\n");
    },
  };
}

function isOrchHook(entry: unknown): boolean {
  if (!isRecord(entry) || !Array.isArray(entry.hooks)) return false;
  return entry.hooks.some((hook: unknown) =>
    isRecord(hook) && typeof hook.command === "string" && hook.command.includes(CLAUDE_HOOK_SHIM));
}

function codexNotifyRemoval(): WipeStep | null {
  const file = join(HOME, ".codex", "config.toml");
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return null;
  }
  const lines = raw.split(/\r?\n/);
  const survivors = lines.filter((line) => !(/^\s*notify\s*=/.test(line) && line.includes("codex-notify")));
  if (survivors.length === lines.length) return null;
  return {
    describe: `strip the orch notify line from ${file}`,
    execute: () => writeFileSync(file, survivors.join("\n")),
  };
}

function nonNull<T>(step: T | null): step is T {
  return step !== null;
}

const steps: WipeStep[] = [
  daemonStop(),
  deletion(ORCH_DIR),
  globalPackageRemoval(),
  ...binShimRemovals(),
  ...piExtensionRemovals(),
  ...packagedCopyRemovals(join(REPO, "skills", "claude"), "skills"),
  ...packagedCopyRemovals(join(REPO, "agents"), "agents"),
  claudeHookRemoval(),
  codexNotifyRemoval(),
  deletion(join(REPO, "dist")),
].filter(nonNull);

if (steps.length === 0) {
  process.stdout.write("already new-user state: nothing orch installed is present.\n");
  process.exit(0);
}

if (isDryRun) {
  for (const step of steps) process.stdout.write(`[dry-run] would ${step.describe}\n`);
  process.stdout.write(`[dry-run] ${steps.length} steps. Re-run without --dry-run to wipe, then: bun run build:dev\n`);
  process.exit(0);
}

for (const step of steps) {
  step.execute();
  process.stdout.write(`done: ${step.describe}\n`);
}
process.stdout.write("wipe complete — run 'bun run build:dev', then 'orch setup' as a first-time user.\n");
