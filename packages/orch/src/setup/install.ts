import { execFileSync } from "node:child_process";
import * as files from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getBackend } from "../backends/registry.ts";
import { resolveAdapter } from "../adapters/registry.ts";
import { PREREQUISITES } from "../adapters/prerequisites.ts";
import { binaryStatus } from "../doctor/bins.ts";
import { shebangRuntime, writeShebangRuntime } from "../doctor/runtime.ts";
import { withSpinner } from "./io.ts";
import { chooseInstalls } from "./wizard.ts";
import { binaryOnPath, binaryPath, errorMessage, packageRoot } from "../util.ts";
import { commandLogger } from "../commands/logging.ts";
import type { OrchRuntime } from "../runtime.ts";
import type { AdapterId, AgentAdapter } from "../types/adapter.ts";
import type { BackendId } from "../types/backend.ts";
import type { ShimBoundaryPlan } from "../types/command.ts";

/** $HOME first, at call time: `wireBinaries` writes real files under it, so a caller that
 *  redirects HOME must get the redirect. os.homedir() reads passwd, not the environment. */
function home(): string {
  return process.env.HOME ?? os.homedir();
}

/** Print the manual install commands for each missing prerequisite. */
export function printInstallHints(missing: readonly { bin: string; cmd: string }[]): void {
  for (const { bin, cmd } of missing) process.stdout.write(`  install ${bin}: ${cmd}\n`);
}

/** Decide which missing prerequisites to install: multiselect when interactive, all with -y, none otherwise. Null on cancel. */
export async function resolveInstallTargets(
  missing: readonly { bin: string; cmd: string }[],
  interactive: boolean,
  yes: boolean,
  noInstall: boolean,
): Promise<string[] | null> {
  if (!missing.length || noInstall) {
    printInstallHints(missing);
    return [];
  }
  if (interactive) {
    const picked = await chooseInstalls(missing);
    if (picked === null) return null;
    for (const { bin, cmd } of missing)
      if (!picked.includes(bin)) process.stdout.write(`  skipped ${bin} - install later with: ${cmd}\n`);
    return picked;
  }
  if (yes) return missing.map(({ bin }) => bin);
  printInstallHints(missing);
  return [];
}

/** Install one prerequisite: silent under a spinner when interactive, streamed otherwise. */
export function runInstall(bin: string, cmd: string, interactive: boolean): void {
  try {
    if (interactive) {
      withSpinner(`Installing ${bin}...`, `${bin} installed`, () => execFileSync("bash", ["-c", cmd], { stdio: "ignore" }));
    } else {
      process.stdout.write(`  Installing ${bin}...\n`);
      execFileSync("bash", ["-c", cmd], { stdio: "inherit" });
    }
  } catch {
    commandLogger().warn("setup.install-failed", { bin, command: cmd });
    process.stdout.write(`  ${bin} install failed - run manually: ${cmd}\n`);
  }
}

/** Point `dest` at `src`, replacing any existing entry (symlink, or a full copy under --copy). */
export function linkBin(src: string, dest: string, copy: boolean): void {
  files.mkdirSync(path.dirname(dest), { recursive: true });
  files.rmSync(dest, { recursive: true, force: true });
  if (copy) files.cpSync(src, dest, { recursive: true });
  else files.symlinkSync(src, dest);
  process.stdout.write(`  ${dest} ${copy ? "(copy)" : "-> " + src}\n`);
}

export interface MissingPrerequisite { bin: string; cmd: string }
export interface ManualPrerequisite { id: string; url: string }

export function reportAdapterPrerequisites(
  adapters: readonly AdapterId[],
  bins: Record<string, boolean>,
  queueInstall: (id: string) => void,
): void {
  for (const id of adapters) {
    const binPath = bins[id] ? binaryPath(id) ?? "" : "";
    process.stdout.write(`  ${binPath ? "ok      " : "MISSING "}${id}${binPath ? `  (${binPath})` : ""}\n`);
    if (!bins[id]) queueInstall(id);
  }
}

export function reportBackendPrerequisites(
  backends: readonly BackendId[],
  bins: Record<string, boolean>,
  queueInstall: (id: string) => void,
): void {
  for (const id of backends) {
    const available = getBackend(id)!.isAvailable();
    const binPath = available && bins[id] ? binaryPath(id) ?? "" : "";
    process.stdout.write(`  ${available ? "ok      " : "MISSING "}${id}${binPath ? `  (${binPath})` : ""}\n`);
    if (!available) queueInstall(id);
  }
}

export async function installSelectedPrerequisites(
  missing: readonly MissingPrerequisite[],
  interactive: boolean,
  yes: boolean,
  noInstall: boolean,
): Promise<boolean> {
  const toInstall = await resolveInstallTargets(missing, interactive, yes, noInstall);
  if (toInstall === null) return false;
  // Install in the queued order so a provider's `needs` (e.g. bun before pi) land first.
  for (const { bin, cmd } of missing.filter((candidate) => toInstall.includes(candidate.bin))) {
    runInstall(bin, cmd, interactive);
    // fresh installs land in ~/.bun/bin or ~/.local/bin before the shell rc picks them up
    process.env.PATH = `${path.join(home(), ".bun", "bin")}:${path.join(home(), ".local", "bin")}:${process.env.PATH}`;
    const now = binaryPath(bin);
    process.stdout.write(now ? `  ok      ${bin}  (${now})\n` : `  ${bin} still not on PATH - open a new shell and re-run orch setup\n`);
  }
  return true;
}

/** Probe each selected provider's prerequisite binaries, then install the chosen missing ones.
 * Returns false only when an interactive install multiselect is cancelled, so the caller can abort. */
export async function installPrerequisites(
  adapters: readonly AdapterId[],
  backends: readonly BackendId[],
  interactive: boolean,
  yes: boolean,
  noInstall: boolean,
): Promise<boolean> {
  // Prerequisites are scoped to the selected providers only. Each selected provider id is
  // probed under the id-is-binary invariant; install-only dependencies are resolved from
  // the provider's declared needs and are never probed as an unconditional requirement.
  process.stdout.write("Prerequisites:\n");
  const bins = binaryStatus([...adapters, ...backends]);
  const missing: MissingPrerequisite[] = [];
  const manual: ManualPrerequisite[] = [];
  const queueInstall = (id: string): void => {
    const entry = PREREQUISITES[id];
    if (entry?.install) {
      for (const need of entry.needs ?? []) {
        if (binaryOnPath(need)) continue;
        const needCmd = PREREQUISITES[need]?.install;
        if (needCmd && !missing.some((candidate) => candidate.bin === need)) missing.push({ bin: need, cmd: needCmd });
      }
      if (!missing.some((candidate) => candidate.bin === id)) missing.push({ bin: id, cmd: entry.install });
    } else if (entry?.docsUrl) {
      manual.push({ id, url: entry.docsUrl });
    } else {
      manual.push({ id, url: "(no installer known - install manually)" });
    }
  };
  reportAdapterPrerequisites(adapters, bins, queueInstall);
  reportBackendPrerequisites(backends, bins, queueInstall);
  for (const { id, url } of manual) process.stdout.write(`  install ${id} manually: ${url}\n`);
  return installSelectedPrerequisites(missing, interactive, yes, noInstall);
}

export function planShimInstall(adapter: AgentAdapter): ShimBoundaryPlan {
  if (adapter.shim) return { outcome: "invoke", role: adapter.shim };
  return {
    outcome: "answer",
    reason: "no-environment-role",
    exitCode: 0,
    text: `${adapter.id}: no environment integration role - agents will lack presence reporting`,
  };
}

/** Install every selected adapter's integration through its own provider port (L4 Builder —
 * no identity branch). Returns the gaps: an adapter expected to install a shim but unable to. */
export async function installAdapterShims(adapters: readonly AdapterId[], copy: boolean): Promise<string[]> {
  // Every selected adapter, every run — installShim is idempotent and additive, and
  // an adapter skipped for being already-selected keeps whatever stale artifact the
  // last build left. An adapter with no installShim is a loud, recorded gap (D10):
  // its integration is expected but unbuildable, never silently skipped.
  const gaps: string[] = [];
  for (const id of adapters) {
    const adapter = resolveAdapter(id);
    const plan = planShimInstall(adapter);
    if (plan.outcome === "invoke") {
      try {
        await plan.role.installShim({ copy });
      } catch (error: unknown) {
        const gap = `${id}: integration install failed - ${errorMessage(error)}`;
        commandLogger().warn("setup.shim-install-failed", { adapter: id, error: errorMessage(error) });
        process.stdout.write(`  WARNING ${gap}\n`);
        gaps.push(gap);
      }
    } else {
      commandLogger().warn("setup.shim-unavailable", { adapter: id, reason: plan.reason });
      process.stdout.write(`  ANSWER ${plan.text}\n`);
      gaps.push(plan.text);
    }
  }
  return gaps;
}

/** Point the installed entrypoint at the runtime just recorded. Without this a
 *  deno or bun install ends setup with a failing runtime check and a fix to run
 *  by hand, because the build that produced the entrypoint predates the choice. */
export function alignEntrypointToRuntime(runtime: OrchRuntime): void {
  const entrypoint = binaryPath("orch");
  if (!entrypoint) return;
  let target = entrypoint;
  try {
    target = files.realpathSync(entrypoint);
  } catch {
    // A dangling link is doctor's to report; leave it alone rather than write through it.
    return;
  }
  if (shebangRuntime(target) === runtime) return;
  writeShebangRuntime(target, runtime);
  process.stdout.write(`  entrypoint ${target} now runs under ${runtime}\n`);
}

/** Wire the `orch`/`pif`/`orch-ding` bins onto PATH (repo-clone case; `bun add -g` already
 * links bins). A bin already resolving into this package is left alone; a stale one is repointed. */
export function wireBinaries(copy: boolean): void {
  process.stdout.write("bins:\n");
  const pkgRoot = packageRoot();
  const binDir = path.join(home(), ".local", "bin");
  for (const [name, rel] of [
    ["orch", path.join("dist", "bin", "orch.js")],
    ["pif", path.join("bin", "pif")],
    ["orch-ding", path.join("dist", "bin", "orch-ding.js")],
  ] as const) {
    const resolved = binaryPath(name);
    const packageBin = path.join(pkgRoot, rel);
    if (resolved) {
      let realResolved = "";
      try {
        realResolved = files.realpathSync(resolved);
      } catch {
        // A missing or unreadable target is stale; replace it below.
      }
      const relative = realResolved ? path.relative(pkgRoot, realResolved) : "";
      const belongsToPackage =
        !!realResolved && !path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`);
      if (belongsToPackage) {
        process.stdout.write(`  ok      ${name}  (${resolved})\n`);
        continue;
      }
      linkBin(packageBin, resolved, copy);
      process.stdout.write(`  replaced stale bin ${name}  (${resolved})\n`);
      continue;
    }
    linkBin(packageBin, path.join(binDir, name), copy);
  }
}
