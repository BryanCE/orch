import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { EXTENSION_NAMES } from "../src/bridge-bundle.ts";
import { SETTINGS_DEFAULTS } from "../src/config.ts";
import { provenDaemonPid, terminateDaemon } from "../src/daemon/lifecycle.ts";
import { loadPresence } from "../src/presence/store.ts";
import { pidAlive } from "../src/util.ts";
import { packagedSkillNames, resolveSkillRoot } from "../src/setup/skills.ts";

// `bun reset` erases every artifact an orch install writes, so the next
// build + install runs the first-time-user flow instead of half-adopting a
// stale tree. `--build` removes only build/install artifacts and preserves the
// configured store so doctor can re-link shims. Node-safe: no Bun.* APIs.
// Dry-run convention — no flag wipes for real, `--dry-run` only previews.
//
// Only orch's OWN artifacts go: the user's other pi extensions, Claude skills,
// hooks and codex settings are left exactly as they are.
const isDryRun = process.argv.includes("--dry-run");
/** Build cleanup preserves settings/store so doctor can re-link configured shims. */
const isBuildCleanup = process.argv.includes("--build");
const PACKAGE_NAME = "@bryance/orch";
const PACKAGE_TARBALL_PREFIX = "bryance-orch-";

const HOME = homedir();
const ORCH_DIR = process.env.ORCH_DIR ?? join(HOME, ".orch");
const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const CLAUDE_HOOK_SHIM = "claude-hooks";

/** One reversible-by-reinstall wipe. `describe` is imperative: "remove <path>". */
interface WipeStep {
  readonly describe: string;
  readonly execute: () => void | Promise<void>;
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
  const pid = provenDaemonPid(ORCH_DIR);
  if (pid === undefined) return null;
  return {
    describe: `stop orchd (pid ${pid})`,
    execute: () => terminateDaemon(pid, 5_000),
  };
}

function globalPackageRemoval(): WipeStep | null {
  let root: string;
  try {
    root = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
  const packagePath = join(root, ...PACKAGE_NAME.split("/"));
  if (!pathPresent(packagePath)) return null;
  return {
    describe: `npm uninstall -g ${PACKAGE_NAME}`,
    execute: () => {
      execFileSync("npm", ["uninstall", "-g", PACKAGE_NAME], { stdio: "inherit" });
    },
  };
}

function packageTarballRemovals(): WipeStep[] {
  return readdirSafe(REPO)
    .filter((entry) => entry.startsWith(PACKAGE_TARBALL_PREFIX) && entry.endsWith(".tgz"))
    .map((entry) => deletion(join(REPO, entry)))
    .filter(nonNull);
}

function binShimRemovals(): WipeStep[] {
  return ["orch", "pif"].map((name) => deletion(join(HOME, ".local", "bin", name))).filter(nonNull);
}

/** True for a link into an orch package — the mark of an orch-installed extension. */
function linksIntoOrch(entry: string): boolean {
  try {
    return readlinkSync(entry).includes(`${sep}orch${sep}`);
  } catch {
    return false;
  }
}

/**
 * Orch's own bundles in every harness dir it installs into — never the user's own
 * footer/subagent extensions.
 *
 * Current bundle names cover what THIS build installs; the link target covers
 * what older layouts did, which is how `herdr-agent-state.ts` outlived its
 * source file and sat dangling through every reinstall.
 */
const HARNESS_EXTENSION_DIRS = [
  join(HOME, ".pi", "agent", "extensions"),
  join(HOME, ".omp", "agent", "extensions"),
];

function harnessExtensionRemovals(): WipeStep[] {
  const orchInstalled = new Set<string>();
  for (const extensions of HARNESS_EXTENSION_DIRS) {
    for (const name of EXTENSION_NAMES) orchInstalled.add(join(extensions, `${name}.js`));
    for (const entry of readdirSafe(extensions)) {
      const file = join(extensions, entry);
      if (linksIntoOrch(file)) orchInstalled.add(file);
    }
  }
  return [...orchInstalled].map(deletion).filter(nonNull);
}

function readdirSafe(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

/** Whatever the repo packages is exactly what an install copied in, so it is
 *  also exactly what may be removed from the shared Claude directories. */
function packagedCopyRemovals(sourceDir: string, claudeDir: string): WipeStep[] {
  if (!existsSync(sourceDir)) return [];
  return readdirSync(sourceDir).map((entry) => deletion(join(HOME, ".claude", claudeDir, entry))).filter(nonNull);
}

/** The roots the install actually wrote skills to: what settings.json records, else the
 *  shipped defaults. Reading the raw file keeps the wipe working on a settings.json too
 *  malformed for the config loader — the exact state a reset exists to clear. */
function recordedSkillRoots(): string[] {
  const recorded = readJsonFile(join(ORCH_DIR, "settings.json"));
  const skills = recorded === null ? null : recorded.skills;
  const roots = isRecord(skills) ? skills.roots : undefined;
  const named = Array.isArray(roots) ? roots.filter((root): root is string => typeof root === "string") : [];
  return (named.length ? named : [...SETTINGS_DEFAULTS.skills.roots]).map(resolveSkillRoot);
}

/** Every packaged skill, removed from every root the install wrote it to. A build
 *  keeps them: only `orch setup` ever writes skills back, so a rebuild that removed
 *  them would leave the machine without them until the next full reinstall. */
function skillRemovals(): WipeStep[] {
  if (isBuildCleanup) return [];
  const roots = recordedSkillRoots();
  return packagedSkillNames(REPO).flatMap((name) => roots.map((root) => deletion(join(root, name)))).filter(nonNull);
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

function liveStorePresent(): boolean {
  const lock = readJsonFile(join(ORCH_DIR, "orchd.lock"));
  if (lock && typeof lock.pid === "number" && Number.isInteger(lock.pid) && pidAlive(lock.pid)) return true;
  try {
    return [...loadPresence(ORCH_DIR).values()].some((entry) => entry.alive);
  } catch {
    return false;
  }
}

function storeRemoval(): WipeStep | null {
  if (isBuildCleanup) return null;
  const step = deletion(ORCH_DIR);
  if (!step) return null;
  return {
    describe: step.describe,
    execute: async () => {
      if (liveStorePresent()) throw new Error(`refusing to remove live orch store ${ORCH_DIR}; stop agents and retry`);
      await step.execute();
    },
  };
}

const steps: WipeStep[] = [
  daemonStop(),
  storeRemoval(),
  globalPackageRemoval(),
  ...packageTarballRemovals(),
  ...binShimRemovals(),
  ...harnessExtensionRemovals(),
  ...skillRemovals(),
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
  process.stdout.write(`[dry-run] ${steps.length} steps. Re-run without --dry-run to ${isBuildCleanup ? "rebuild and reinstall" : "wipe, then run bun run build:dev"}.\n`);
  process.exit(0);
}

for (const step of steps) {
  await step.execute();
  process.stdout.write(`done: ${step.describe}\n`);
}
process.stdout.write(isBuildCleanup
  ? "build cleanup complete — rebuild and reinstall now.\n"
  : "wipe complete — run 'bun run build:dev', then 'orch setup' as a first-time user.\n");
