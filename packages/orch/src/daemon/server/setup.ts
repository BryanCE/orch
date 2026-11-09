// What `orch setup` does to this machine: probe and install prerequisites, install each harness's
// integration, wire orch's bins onto PATH. orchd runs it; the CLI asks, prompts, and prints the lines.
import type { OrchDir } from "../../types/core.ts";
import { execFileSync } from "node:child_process";
import * as files from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getBackend, resolveBackend } from "../../backends/registry.ts";
import { resolveAdapter } from "../../adapters/registry.ts";
import { installCommand, PREREQUISITES } from "../../shared/prerequisites.ts";
import { hostOs, isNixOs } from "../../host.ts";
import { binaryStatus } from "./doctor/bins.ts";
import { shebangRuntime, writeShebangRuntime } from "./doctor/runtime.ts";
import { ORCH_DING_BIN } from "../../notify/ding.ts";
import { ARROW, binaryOnPath, binaryPath, errorMessage, orchRootAbove, packageRoot } from "../../util.ts";
import type { Logger } from "../../types/core.ts";
import type { OrchRuntime } from "../../runtime.ts";
import type { AdapterId, AgentAdapter } from "../../types/adapter.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { BackendId } from "../../types/backend.ts";
import type { ShimBoundaryPlan } from "../../types/command.ts";
import type { ParamsOf, ResultOf } from "../client/protocol.ts";
import type { Services } from "../../types/services.ts";

/** One line of setup output, for the CLI to print. */
type Say = (line: string) => void;

/** A step's output, collected for its answer. */
function collector(): { lines: string[]; say: Say } {
  const lines: string[] = [];
  return { lines, say: (line) => { lines.push(line); } };
}

/** $HOME first, at call time: `wireBinaries` writes real files under it, so a caller that
 *  redirects HOME must get the redirect. os.homedir() reads passwd, not the environment. */
function home(): string {
  return process.env.HOME ?? os.homedir();
}

/** The shell an install command is written for: PowerShell on Windows, sh elsewhere. */
function installShell(cmd: string): [string, string[]] {
  return hostOs() === "windows"
    ? ["powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", cmd]]
    : ["sh", ["-c", cmd]];
}

/** Install one prerequisite. A failure names the command to run by hand. */
function runInstall(logger: Logger, bin: string, cmd: string, say: Say): void {
  const [shell, args] = installShell(cmd);
  say(`  Installing ${bin}...`);
  try {
    execFileSync(shell, args, { stdio: "ignore" });
  } catch {
    logger.warn("setup.install-failed", { bin, command: cmd });
    say(`  ${bin} install failed - run manually: ${cmd}`);
  }
}

function copyBin(src: string, dest: string): "copy" {
  files.cpSync(src, dest, { recursive: true });
  return "copy";
}

/** Windows refuses a symlink to an account without Developer Mode, so a copy is the
 *  only link it will make. Setup has to finish there, not abort on EPERM. */
function symlinkOrCopyBin(src: string, dest: string): "link" | "copy" {
  try {
    files.symlinkSync(src, dest);
    return "link";
  } catch {
    return copyBin(src, dest);
  }
}

/** Point `dest` at `src`, replacing any existing entry (symlink, or a full copy under --copy). */
function linkBin(src: string, dest: string, copy: boolean, say: Say): void {
  files.mkdirSync(path.dirname(dest), { recursive: true });
  files.rmSync(dest, { recursive: true, force: true });
  const wired = copy ? copyBin(src, dest) : symlinkOrCopyBin(src, dest);
  say(`  ${dest} ${wired === "copy" ? "(copy)" : ARROW + " " + src}`);
}

interface MissingPrerequisite { bin: string; cmd: string }
interface ManualPrerequisite { id: string; url: string }

interface PrerequisiteProbe {
  readonly missing: MissingPrerequisite[];
  readonly manual: ManualPrerequisite[];
}

/** Probe each selected provider's prerequisite binaries, reporting each, and queue what is missing.
 *  Prerequisites are scoped to the selected providers only. Each selected provider id is probed
 *  under the id-is-binary invariant; install-only dependencies are resolved from the provider's
 *  declared needs and are never probed as an unconditional requirement. */
function probePrerequisites(adapters: readonly AdapterId[], backends: readonly BackendId[], say: Say): PrerequisiteProbe {
  const bins = binaryStatus([...adapters, ...backends]);
  const missing: MissingPrerequisite[] = [];
  const manual: ManualPrerequisite[] = [];
  const queueInstall = (id: string): void => {
    const entry = PREREQUISITES[id];
    const cmd = installCommand(id, isNixOs(), hostOs());
    if (cmd) {
      for (const need of entry?.needs ?? []) {
        if (binaryOnPath(need)) continue;
        const needCmd = installCommand(need, isNixOs(), hostOs());
        if (needCmd && !missing.some((candidate) => candidate.bin === need)) missing.push({ bin: need, cmd: needCmd });
      }
      if (!missing.some((candidate) => candidate.bin === id)) missing.push({ bin: id, cmd });
    } else if (entry?.docsUrl) {
      manual.push({ id, url: entry.docsUrl });
    } else {
      manual.push({ id, url: "(no installer known - install manually)" });
    }
  };
  for (const id of adapters) {
    const binPath = bins[id] ? binaryPath(id) ?? "" : "";
    say(`  ${binPath ? "ok      " : "MISSING "}${id}${binPath ? `  (${binPath})` : ""}`);
    if (!bins[id]) queueInstall(id);
  }
  for (const id of backends) {
    const available = getBackend(id)!.isAvailable();
    const binPath = available && bins[id] ? binaryPath(id) ?? "" : "";
    say(`  ${available ? "ok      " : "MISSING "}${id}${binPath ? `  (${binPath})` : ""}`);
    if (!available) queueInstall(id);
  }
  return { missing, manual };
}

/** `setup-prerequisites`: what is here, and what is missing with the command that installs it. */
export function setupPrerequisites(params: ParamsOf<"setup-prerequisites">): ResultOf<"setup-prerequisites"> {
  const { lines, say } = collector();
  const { missing, manual } = probePrerequisites(params.adapters, params.backends, say);
  for (const { id, url } of manual) say(`  install ${id} manually: ${url}`);
  return { lines, missing };
}

/** `setup-install`: install the named missing prerequisites, in the probe's order, so a
 *  provider's `needs` (bun before pi) land first. */
export function setupInstall(logger: Logger, params: ParamsOf<"setup-install">): ResultOf<"setup-install"> {
  const { lines, say } = collector();
  // The probe's own report was the `setup-prerequisites` answer; only what is missing counts here.
  const { missing } = probePrerequisites(params.adapters, params.backends, collector().say);
  for (const { bin, cmd } of missing.filter((candidate) => params.bins.includes(candidate.bin))) {
    runInstall(logger, bin, cmd, say);
    // fresh installs land in ~/.bun/bin or ~/.local/bin before the shell rc picks them up
    process.env.PATH = [path.join(home(), ".bun", "bin"), path.join(home(), ".local", "bin"), process.env.PATH].join(path.delimiter);
    const now = binaryPath(bin);
    say(now ? `  ok      ${bin}  (${now})` : `  ${bin} still not on PATH - open a new shell and re-run orch setup`);
  }
  return { lines };
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
async function installAdapterShims(orchDir: OrchDir, settings: OrchSettings, logger: Logger, adapters: readonly AdapterId[], copy: boolean, say: Say): Promise<string[]> {
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
        await plan.role.installShim(orchDir, settings, logger, { copy });
      } catch (error: unknown) {
        const gap = `${id}: integration install failed - ${errorMessage(error)}`;
        logger.warn("setup.shim-install-failed", { adapter: id, error: errorMessage(error) });
        say(`  WARNING ${gap}`);
        gaps.push(gap);
      }
    } else {
      logger.warn("setup.shim-unavailable", { adapter: id, reason: plan.reason });
      say(`  ANSWER ${plan.text}`);
      gaps.push(plan.text);
    }
  }
  return gaps;
}

/** Point the installed entrypoint at the runtime just recorded. Without this a
 *  deno or bun install ends setup with a failing runtime check and a fix to run
 *  by hand, because the build that produced the entrypoint predates the choice. */
function alignEntrypointToRuntime(runtime: OrchRuntime, say: Say): void {
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
  try {
    writeShebangRuntime(target, runtime);
  } catch (error: unknown) {
    say(`  could not point ${target} at ${runtime}: ${errorMessage(error)}. Re-run setup as the owner of that file, or choose runtime node.`);
    return;
  }
  say(`  entrypoint ${target} now runs under ${runtime}`);
}

function realTarget(file: string): string | null {
  try {
    return files.realpathSync(file);
  } catch {
    return null;
  }
}

interface BinOnPath { readonly name: string; readonly resolved: string; readonly packageBin: string }

/** Repoint a bin already on PATH. Leave it when it is this package's, or another tool's. */
function repointBin(bin: BinOnPath, pkgRoot: string, copy: boolean, say: Say): void {
  const target = realTarget(bin.resolved);
  const owner = target === null ? null : orchRootAbove(target);
  if (owner === pkgRoot) {
    say(`  ok      ${bin.name}  (${bin.resolved})`);
    return;
  }
  if (target !== null && owner === null) {
    say(`  skipped ${bin.name}: ${bin.resolved} is not orch's; put ${path.dirname(bin.packageBin)} ahead of it on PATH`);
    return;
  }
  try {
    linkBin(bin.packageBin, bin.resolved, copy, say);
  } catch (error: unknown) {
    say(`  could not replace stale ${bin.name} at ${bin.resolved}: ${errorMessage(error)}`);
    return;
  }
  say(`  replaced stale bin ${bin.name}  (${bin.resolved})`);
}

/** Wire the `orch`/`orch-ding` bins onto PATH (repo-clone case; `bun add -g` already links bins). */
export function wireBinaries(pkgRoot: string, copy: boolean, say: Say): void {
  say("bins:");
  const binDir = path.join(home(), ".local", "bin");
  for (const [name, rel] of [
    ["orch", path.join("dist", "bin", "orch.js")],
    [ORCH_DING_BIN, path.join("dist", "bin", `${ORCH_DING_BIN}.js`)],
  ] as const) {
    const resolved = binaryPath(name);
    const packageBin = path.join(pkgRoot, rel);
    if (resolved) repointBin({ name, resolved, packageBin }, pkgRoot, copy, say);
    else linkBin(packageBin, path.join(binDir, name), copy, say);
  }
}

/** Validate each selected (installed) adapter through its own provider port. */
async function diagnoseAdapters(orchDir: OrchDir, settings: OrchSettings, logger: Logger, adapters: readonly AdapterId[], say: Say): Promise<void> {
  for (const id of adapters) {
    const adapter = resolveAdapter(id);
    if (!adapter.shim) continue;
    const result = await adapter.shim.diagnoseShim(orchDir, settings, logger);
    say(`  ${result.status.toUpperCase()} ${result.label}: ${result.detail}`);
  }
}

/**
 * Why a headless smoke round-trip cannot run here, or null when it can.
 *
 * The smoke launches the DEFAULT ADAPTER's binary, so a missing harness is as
 * disqualifying as a missing backend — setup used to report `MISSING pi` and
 * then try to spawn pi anyway, turning a known-absent prerequisite into a
 * spawn failure that read like a broken install.
 */
function smokeBlocker(settings: OrchSettings): string | null {
  try {
    if (!resolveBackend({ configured: "headless" }).isAvailable()) return "headless backend is unavailable here";
  } catch {
    return "headless backend is unavailable here";
  }
  const adapter = settings.defaults.adapter;
  if (!adapter) return "no default harness is recorded";
  if (!binaryOnPath(adapter)) return `${adapter} is not on PATH`;
  return null;
}

/** `setup-integrate`: each harness's integration, orch's bins, the entrypoint's runtime, then
 *  each integration's own diagnosis. Reads settings.json as setup just recorded it. */
export async function setupIntegrate(services: Pick<Services, "orchDir" | "settings" | "logger">, params: ParamsOf<"setup-integrate">): Promise<ResultOf<"setup-integrate">> {
  const { lines, say } = collector();
  const settings = services.settings.reload();
  if (settings === null) throw new Error(`setup recorded no settings in ${services.settings.file}`);
  const gaps = await installAdapterShims(services.orchDir, settings, services.logger, params.adapters, params.copy, say);
  wireBinaries(packageRoot(), params.copy, say);
  alignEntrypointToRuntime(params.runtime, say);
  await diagnoseAdapters(services.orchDir, settings, services.logger, params.adapters, say);
  return { lines, gaps, smokeBlocker: smokeBlocker(settings) };
}
