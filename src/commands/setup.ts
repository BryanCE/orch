import { confirm, isCancel } from "@clack/prompts";
import { execFileSync } from "node:child_process";
import * as files from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { allAdapters, resolveAdapter } from "../adapters/registry.ts";
import { allBackends, getBackend, resolveBackend } from "../backends/registry.ts";
import { loadConfig, loadConfigOrNull, reapUnreadableSettings, settingsPath, writeSettingsDefault, writeSettingsFullTree, writeSettingsModels, writeSettingsAllowedModels, writeSettingsInstalled, writeSettingsNotify, writeSettingsRuntime } from "../config.ts";
import { DEFAULT_RUNTIME, ORCH_RUNTIMES, type OrchRuntime } from "../runtime.ts";
import { ADAPTER_IDS, type AdapterId, type AgentAdapter, type HarnessModel } from "../adapters/adapter.ts";
import { BACKEND_IDS, type BackendId } from "../backends/backend.ts";
import { assertModelOffered } from "../policy/model.ts";
import { binaryStatus } from "../doctor/bins.ts";
import { shebangRuntime, writeShebangRuntime } from "../doctor/runtime.ts";
import { runDoctor, type CheckResult } from "../doctor/runner.ts";
import { withSpinner, promptText } from "../setup/io.ts";
import { probeNotifiers, buildSelectedNotifyEntries } from "../setup/notifiers.ts";
import { setupIntro, setupOutro, selectAdapters, selectDefaultAdapter, selectBackends, selectDefaultBackend, selectDefaultModel, selectAllowedModels, selectNotifiers, selectRuntime, chooseInstalls } from "../setup/wizard.ts";
import { loadPresence, orchDir, presenceDir, spawnedRecords } from "../presence/store.ts";
import { binaryOnPath, binaryPath, errorMessage, packageRoot } from "../util.ts";
import { writeRpc } from "./daemon.ts";
import { cmdSpawn, resolveAdapterOrDie, workerPrompt } from "./spawn.ts";
import { die, resultText } from "./target.ts";

const HOME = os.homedir();

/** The install action for one provider id: exactly one of a real install command or a
 * documentation URL, plus an optional ordered list of prerequisite provider ids installed
 * first. Keyed by real provider id, so an installer can never drift from its provider. */
interface InstallerEntry {
  install?: string;
  docsUrl?: string;
  needs?: readonly string[];
}

const INSTALLERS: Record<string, InstallerEntry> = {
  // bun is never probed on its own — it surfaces only as pi's declared dependency.
  pi: { install: "bun add -g @earendil-works/pi-coding-agent", needs: ["bun"] },
  omp: { install: "bun add -g @oh-my-pi/pi-coding-agent", needs: ["bun"] },
  claude: { install: "curl -fsSL https://claude.ai/install.sh | bash" },
  codex: { docsUrl: "https://github.com/openai/codex" },
  bun: { install: "curl -fsSL https://bun.sh/install | bash" },
  tmux: { docsUrl: "https://github.com/tmux/tmux/wiki/Installing" },
  herdr: { docsUrl: "https://github.com/BryanCE/orch#readme" },
};

/** Read the value following `name` in `args`, or undefined when the flag is absent. */
export function readValueFlag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

/** Read a flag written as `--name value` or `--name=value`. */
export function readAssignFlag(args: string[], name: string): string | undefined {
  const assigned = args.find((arg) => arg.startsWith(`${name}=`));
  if (assigned !== undefined) return assigned.slice(name.length + 1);
  return readValueFlag(args, name);
}

/** Validate a provided setup flag value against the supported ids, or exit. */
/** Narrow one flag value to the closed provider set, or exit naming every supported id. */
export function validateSetupFlag<Id extends string>(kind: string, value: string, supported: readonly Id[]): Id {
  const known = supported.find((id) => id === value);
  if (known !== undefined) return known;
  die(`Unknown ${kind} "${value}". Supported ${kind}s: ${supported.join(", ")}.`);
}

/** Resolve the setup harness set from a comma-separated flag, the multi-select wizard, or exit. Null on cancel. */
export async function resolveProviderSet<Id extends string>(
  kind: string,
  flagName: string,
  flag: string | undefined,
  ids: readonly Id[],
  interactive: boolean,
  pick: (options: readonly Id[]) => Promise<Id[] | null>,
): Promise<Id[] | null> {
  if (flag !== undefined) {
    const list = [...new Set(flag.split(",").map((id) => id.trim()).filter(Boolean))];
    if (!list.length) die(`${flagName} needs at least one ${kind} id.`);
    return list.map((id) => validateSetupFlag(kind, id, ids));
  }
  if (interactive) {
    const picked = await pick(ids);
    if (picked === null) return null;
    if (!picked.length) die(`Select at least one ${kind}.`);
    return picked;
  }
  die(`orch setup needs ${flagName} <id[,id...]> in non-interactive mode. Supported ${kind}s: ${ids.join(", ")}.`);
}

/** Pick the active default from a selected set: the sole member, the flag/non-interactive first entry, or a prompt. Null on cancel. */
export async function resolveActiveDefault<Id extends string>(
  selected: readonly Id[],
  flagProvided: boolean,
  interactive: boolean,
  pick: (options: readonly Id[]) => Promise<Id | null>,
): Promise<Id | null> {
  if (selected.length === 1 || flagProvided || !interactive) return selected[0]!;
  return pick(selected);
}

/** A model for EVERY installed harness. Each names models in its own vocabulary, so one
 *  string cannot serve them all — recording only the default harness's is what left
 *  `orch spawn --agent claude` handing a pi model to claude's gate. Null when the user cancels. */
export async function resolveHarnessModels(
  flag: string | undefined,
  harnesses: readonly AdapterId[],
  interactive: boolean,
): Promise<HarnessModelChoices | null> {
  const config = loadConfigOrNull(orchDir());
  const choices: HarnessModelChoices = { defaults: {}, allowed: {} };
  for (const id of harnesses) {
    const harness = resolveAdapter(id);
    const chosen = await resolveDefaultModel(flag, harness, interactive);
    if (chosen === null) return null;
    choices.defaults[id] = chosen;

    const offered = harness.listModels?.() ?? [];
    if (!interactive || !offered.length) continue;
    const allowed = await selectAllowedModels(id, offered, config?.models.allowed[id] ?? []);
    if (allowed === null) return null;
    if (allowed.length) choices.allowed[id] = allowed;
  }
  return choices;
}

/** What each installed harness may launch, and what it launches by default. */
export interface HarnessModelChoices {
  defaults: Partial<Record<AdapterId, string>>;
  allowed: Partial<Record<AdapterId, string[]>>;
}

/** The model spawns of ONE harness launch on: `--model=`, else a pick from what that harness
 * reports it can run, else its own default when non-interactive. orch decides and records; the
 * harness only enumerates. Null when the user cancels. */
export async function resolveDefaultModel(
  flag: string | undefined,
  harness: AgentAdapter,
  interactive: boolean,
  pick: (harnessId: string, offered: readonly HarnessModel[], suggested: string | undefined) => Promise<string | null> = selectDefaultModel,
): Promise<string | null> {
  const offered = harness.listModels?.() ?? [];
  const suggested = harness.defaultModelString?.();
  const chosen = flag ?? (interactive ? await pick(harness.id, offered, suggested) : suggested ?? offered[0]?.spec);
  if (chosen === null) return null;
  if (!chosen) die(`no default model: pass --model=<model[:thinking]> or run setup interactively (${harness.id} lists none)`);
  try {
    assertModelOffered(harness, chosen);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  return chosen;
}

/** Resolve the declared JS runtime from `--runtime`, the wizard, or the no-preference value.
 * Never inferred from PATH or from the runtime orch itself is executing under. Null on cancel. */
export async function resolveRuntime(
  flag: string | undefined,
  interactive: boolean,
  pick: () => Promise<OrchRuntime | null> = selectRuntime,
): Promise<OrchRuntime | null> {
  if (flag !== undefined) return validateSetupFlag("runtime", flag, ORCH_RUNTIMES);
  // Non-interactive expresses no preference, and the recorded value for no preference is node.
  if (!interactive) return DEFAULT_RUNTIME;
  return pick();
}

/** Confirm-to-record prompt, defaulting to NO — a cancelled or declined prompt records nothing. */
async function promptConfirm(message: string): Promise<boolean> {
  const answer = await confirm({ message, initialValue: false });
  return !isCancel(answer) && answer === true;
}

/** Print the manual install commands for each missing prerequisite. */
function printInstallHints(missing: readonly { bin: string; cmd: string }[]): void {
  for (const { bin, cmd } of missing) process.stdout.write(`  install ${bin}: ${cmd}\n`);
}

/** Decide which missing prerequisites to install: multiselect when interactive, all with -y, none otherwise. Null on cancel. */
async function resolveInstallTargets(
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
function runInstall(bin: string, cmd: string, interactive: boolean): void {
  try {
    if (interactive) {
      withSpinner(`Installing ${bin}...`, `${bin} installed`, () => execFileSync("bash", ["-c", cmd], { stdio: "ignore" }));
    } else {
      process.stdout.write(`  Installing ${bin}...\n`);
      execFileSync("bash", ["-c", cmd], { stdio: "inherit" });
    }
  } catch {
    process.stderr.write(`  ${bin} install failed - run manually: ${cmd}\n`);
  }
}

/** Point `dest` at `src`, replacing any existing entry (symlink, or a full copy under --copy). */
function linkBin(src: string, dest: string, copy: boolean): void {
  files.mkdirSync(path.dirname(dest), { recursive: true });
  files.rmSync(dest, { recursive: true, force: true });
  if (copy) files.cpSync(src, dest, { recursive: true });
  else files.symlinkSync(src, dest);
  process.stdout.write(`  ${dest} ${copy ? "(copy)" : "-> " + src}\n`);
}

/** How many models a harness is restricted to, or nothing when it is unrestricted. */
function allowedNote(allowed: readonly string[] | undefined): string {
  return allowed?.length ? `  (restricted to ${allowed.length})` : "";
}

/** Persist the composition selections (runtime, installed sets, active defaults) to settings.json. */
function recordComposition(
  runtime: OrchRuntime,
  adapters: AdapterId[],
  defaultAdapter: AdapterId,
  backends: BackendId[],
  defaultBackend: BackendId,
  models: HarnessModelChoices,
): void {
  // Record the runtime FIRST: it is a required key with no default, so no other write can
  // produce a valid file until it is present. Re-recording the same value is a no-op change.
  writeSettingsRuntime(orchDir(), runtime);
  // Then the installed sets — writeSettingsDefault validates the default against them.
  writeSettingsInstalled(orchDir(), { adapters, backends });
  writeSettingsDefault(orchDir(), "adapter", defaultAdapter);
  writeSettingsDefault(orchDir(), "backend", defaultBackend);
  // Every launch path resolves its harness's model from here. Recording them is not
  // optional: an install without one fails at the first spawn, including setup's own smoke.
  writeSettingsModels(orchDir(), models.defaults);
  writeSettingsAllowedModels(orchDir(), models.allowed);
  // Seed the complete live settings tree only after composition writes have landed.
  writeSettingsFullTree(orchDir());
  process.stdout.write(
    `Selection recorded in ${settingsPath(orchDir())}:\n` +
    `  runtime           = ${runtime}${runtime === "deno" ? "  (sandboxed shims)" : ""}\n` +
    `  adapters          = ${adapters.join(", ")}\n` +
    `  default adapter   = ${defaultAdapter}\n` +
    `  backends          = ${backends.join(", ")}\n` +
    `  default backend   = ${defaultBackend}\n` +
    adapters.map((id) => `  model (${id})${" ".repeat(Math.max(0, 11 - id.length))} = ${models.defaults[id] ?? "(none)"}${allowedNote(models.allowed[id])}\n`).join(""),
  );
}

/** Probe each selected provider's prerequisite binaries, then install the chosen missing ones.
 * Returns false only when an interactive install multiselect is cancelled, so the caller can abort. */
async function installPrerequisites(
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
  const missing: { bin: string; cmd: string }[] = [];
  const manual: { id: string; url: string }[] = [];
  const queueInstall = (id: string): void => {
    const entry = INSTALLERS[id];
    if (entry?.install) {
      for (const need of entry.needs ?? []) {
        if (binaryOnPath(need)) continue;
        const needCmd = INSTALLERS[need]?.install;
        if (needCmd && !missing.some((candidate) => candidate.bin === need)) missing.push({ bin: need, cmd: needCmd });
      }
      if (!missing.some((candidate) => candidate.bin === id)) missing.push({ bin: id, cmd: entry.install });
    } else if (entry?.docsUrl) {
      manual.push({ id, url: entry.docsUrl });
    } else {
      manual.push({ id, url: "(no installer known - install manually)" });
    }
  };
  for (const id of adapters) {
    const binPath = bins[id] ? binaryPath(id) ?? "" : "";
    process.stdout.write(`  ${binPath ? "ok      " : "MISSING "}${id}${binPath ? `  (${binPath})` : ""}\n`);
    if (!bins[id]) queueInstall(id);
  }
  for (const id of backends) {
    const available = getBackend(id)!.isAvailable();
    const binPath = available && bins[id] ? binaryPath(id) ?? "" : "";
    process.stdout.write(`  ${available ? "ok      " : "MISSING "}${id}${binPath ? `  (${binPath})` : ""}\n`);
    if (!available) queueInstall(id);
  }
  for (const { id, url } of manual) process.stdout.write(`  install ${id} manually: ${url}\n`);

  const toInstall = await resolveInstallTargets(missing, interactive, yes, noInstall);
  if (toInstall === null) return false;
  // Install in the queued order so a provider's `needs` (e.g. bun before pi) land first.
  for (const { bin, cmd } of missing.filter((candidate) => toInstall.includes(candidate.bin))) {
    runInstall(bin, cmd, interactive);
    // fresh installs land in ~/.bun/bin or ~/.local/bin before the shell rc picks them up
    process.env.PATH = `${path.join(HOME, ".bun", "bin")}:${path.join(HOME, ".local", "bin")}:${process.env.PATH}`;
    const now = binaryPath(bin);
    process.stdout.write(now ? `  ok      ${bin}  (${now})\n` : `  ${bin} still not on PATH - open a new shell and re-run orch setup\n`);
  }
  return true;
}

/** Install every selected adapter's integration through its own provider port (L4 Builder —
 * no identity branch). Returns the gaps: an adapter expected to install a shim but unable to. */
async function installAdapterShims(adapters: readonly AdapterId[], copy: boolean): Promise<string[]> {
  // Every selected adapter, every run — installShim is idempotent and additive, and
  // an adapter skipped for being already-selected keeps whatever stale artifact the
  // last build left. An adapter with no installShim is a loud, recorded gap (D10):
  // its integration is expected but unbuildable, never silently skipped.
  const gaps: string[] = [];
  for (const id of adapters) {
    const adapter = resolveAdapter(id);
    if (adapter.installShim) {
      try {
        await adapter.installShim({ copy });
      } catch (error: unknown) {
        const gap = `${id}: integration install failed - ${errorMessage(error)}`;
        process.stderr.write(`  WARNING ${gap}\n`);
        gaps.push(gap);
      }
    } else if (adapter.diagnoseShim) {
      const gap = `${id}: no integration installer available yet - ${id} agents will lack presence reporting`;
      process.stderr.write(`  WARNING ${gap}\n`);
      gaps.push(gap);
    }
  }
  return gaps;
}

/** Point the installed entrypoint at the runtime just recorded. Without this a
 *  deno or bun install ends setup with a failing runtime check and a fix to run
 *  by hand, because the build that produced the entrypoint predates the choice. */
function alignEntrypointToRuntime(runtime: OrchRuntime): void {
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

/** Wire the `orch`/`pif` bins onto PATH (repo-clone case; `bun add -g` already links bins).
 * A bin already resolving into this package is left alone; a stale one is repointed. */
function wireBinaries(copy: boolean): void {
  process.stdout.write("bins:\n");
  const pkgRoot = packageRoot();
  const binDir = path.join(HOME, ".local", "bin");
  for (const [name, rel] of [
    ["orch", path.join("dist", "bin", "orch.js")],
    ["pif", path.join("bin", "pif")],
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

/** Surface the reappable malformed presence records the closing doctor pass found and, on a TTY,
 * offer to reap them (default: keep) — so setup resolves what it can rather than reporting it as a
 * post-setup failure (11.2). Non-interactive runs report only. Returns whether any were reaped. */
export async function offerReapMalformedRecords(
  results: readonly CheckResult[],
  interactive: boolean,
  askConfirm: (count: number) => Promise<boolean> = (count) => promptConfirm(`Reap ${count} malformed presence record${count === 1 ? "" : "s"} now?`),
): Promise<boolean> {
  const malformed = results.find((result) => result.id === "malformed-presence");
  const records = malformed?.ignoredRecords ?? [];
  if (!records.length) return false;
  process.stdout.write(
    `Malformed presence records (${records.length}):\n` +
    records.map((record) => `  - ${record.path}: ${record.reason}`).join("\n") + "\n",
  );
  if (!interactive || !(await askConfirm(records.length))) {
    process.stdout.write("  kept - orch clean can reap them later\n");
    return false;
  }
  for (const record of records) files.rmSync(record.path, { recursive: true, force: true });
  process.stdout.write(`  reaped ${records.length} record${records.length === 1 ? "" : "s"}\n`);
  return true;
}

/** The four IO steps of the closing smoke round-trip, injected so the orchestration is testable
 * without a live daemon, a model, or a real spawn. Each default is a thin wrapper over the same
 * plumbing `orch spawn`/`orch run`/`orch result` use — the smoke reuses those paths, never
 * reimplements them. */
export interface SmokeSteps {
  /** Spawn one headless agent and return its identity key; throws when none is recorded. */
  spawnHeadless: (cwd: string) => Promise<string>;
  /** Build the trivial prompt dispatched to the agent. */
  buildPrompt: (key: string) => string;
  /** Deliver the prompt through orchd — throws when the write path rejects it. */
  dispatch: (key: string, text: string) => Promise<void>;
  /** The agent's result text once it has produced one, else undefined. */
  readResultText: (key: string) => string | undefined;
  /** Best-effort teardown of the smoke agent. */
  cleanup: (key: string) => void;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  timeoutMs: number;
}

/** Spawn one headless agent through the real `orch spawn` path and return the newly-recorded key. */
async function spawnHeadlessSmokeAgent(cwd: string): Promise<string> {
  const before = new Set(spawnedRecords().keys());
  await cmdSpawn(["1", "--backend", "headless", "--name", "orch-smoke", "--cwd", cwd]);
  const after = spawnedRecords();
  const key = [...after.keys()].find((candidate) => !before.has(candidate) && after.get(candidate)?.backend === "headless");
  if (!key) throw new Error("headless spawn recorded no new agent");
  return key;
}

/** Build the worker-headed trivial prompt for the smoke agent, using its recorded adapter. */
function buildSmokePrompt(key: string): string {
  const config = loadConfig(orchDir());
  const adapterId = spawnedRecords().get(key)?.adapter ?? config.defaults.adapter ?? "";
  const adapter = adapterId ? resolveAdapterOrDie(adapterId) : undefined;
  return workerPrompt("Reply with the single word: ready", false, adapter, config.locked_commands);
}

/** Best-effort close of the headless smoke agent by its key. */
function closeSmokeAgent(key: string): void {
  try {
    const backend = resolveBackend({ configured: "headless" });
    const handle = backend.list().find((candidate) => (candidate as { key?: string }).key === key);
    if (handle) backend.close(handle);
  } catch {
    // A leaked headless process is reaped by `orch clean`; never let teardown mask the verdict.
  }
}

const defaultSmokeSteps: SmokeSteps = {
  spawnHeadless: spawnHeadlessSmokeAgent,
  buildPrompt: buildSmokePrompt,
  dispatch: (key, text) => writeRpc("dispatch", { target: key, text }).then(() => undefined),
  readResultText: (key) => resultText(loadPresence().get(key)?.result),
  cleanup: closeSmokeAgent,
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  timeoutMs: 60_000,
};

/** The closing smoke round-trip (12.5): spawn a headless agent, dispatch a trivial prompt through
 * orchd, and read the result back — so "setup completed" means orch can actually deliver work. A
 * broken write path fails loudly and sets a non-zero exit code; returns true only on a real
 * round-trip. Every step is injectable so the failure paths are testable without a live agent. */
export async function runSetupSmoke(cwd: string, steps: Partial<SmokeSteps> = {}): Promise<boolean> {
  const step = { ...defaultSmokeSteps, ...steps };
  let key: string;
  try {
    key = await step.spawnHeadless(cwd);
  } catch (error: unknown) {
    process.stderr.write(`Smoke failed: could not spawn a headless agent - ${errorMessage(error)}\n`);
    return false;
  }
  try {
    await step.dispatch(key, step.buildPrompt(key));
  } catch (error: unknown) {
    process.stderr.write(
      `Smoke failed: orch could not deliver work - the dispatch was rejected (${errorMessage(error)}).\n` +
      `  "setup completed" does not yet mean orch can deliver work; check 'orch daemon status' and 'orch tail ${key}'.\n`,
    );
    step.cleanup(key);
    return false;
  }
  const deadline = step.now() + step.timeoutMs;
  let result: string | undefined;
  while (step.now() < deadline) {
    result = step.readResultText(key);
    if (result) break;
    await step.sleep(500);
  }
  step.cleanup(key);
  if (!result) {
    process.stderr.write(
      `Smoke failed: the dispatch was accepted but no result came back within ${Math.round(step.timeoutMs / 1000)}s - orch did not complete a work round-trip.\n` +
      `  Check the harness auth and 'orch tail ${key}'.\n`,
    );
    return false;
  }
  process.stdout.write("Smoke ok - orch spawned a headless agent, dispatched a prompt, and read a result back. orch can deliver work.\n");
  return true;
}

/**
 * Why a headless smoke round-trip cannot run here, or null when it can.
 *
 * The smoke launches the DEFAULT ADAPTER's binary, so a missing harness is as
 * disqualifying as a missing backend — setup used to report `MISSING pi` and
 * then try to spawn pi anyway, turning a known-absent prerequisite into a
 * spawn failure that read like a broken install.
 */
function smokeBlocker(): string | null {
  try {
    if (!resolveBackend({ configured: "headless" }).isAvailable()) return "headless backend is unavailable here";
  } catch {
    return "headless backend is unavailable here";
  }
  const adapter = loadConfig(orchDir()).defaults.adapter;
  if (!adapter) return "no default harness is recorded";
  if (!binaryOnPath(adapter)) return `${adapter} is not on PATH`;
  return null;
}

/** Onboarding wizard: record the composition, install prerequisites and adapter shims, wire bins,
 * then run a closing doctor pass. Each step is a single-purpose helper; this orchestrates them. */
export async function cmdSetup(args: string[]) {
  const copy = args.includes("--copy");
  const yes = args.includes("--yes") || args.includes("-y");
  const noInstall = args.includes("--no-install");

  const runtimeFlag = readAssignFlag(args, "--runtime");
  const adapterFlag = readAssignFlag(args, "--agent") ?? readAssignFlag(args, "--adapter") ?? readAssignFlag(args, "--harness");
  const backendFlag = readAssignFlag(args, "--backend") ?? readAssignFlag(args, "--plexer");
  const modelFlag = readAssignFlag(args, "--model");
  const adapterIds = allAdapters().map((adapter) => adapter.id);
  const backendIds = allBackends().map((entry) => entry.id);
  const interactive = process.stdin.isTTY && !yes;
  if (interactive) setupIntro();

  // setup is the ONE recovery path: a settings.json from an older schema (or otherwise invalid)
  // is malformed data, not something to migrate — reap it so re-recording can proceed.
  const reaped = reapUnreadableSettings(orchDir());
  if (reaped) process.stdout.write(`  previous settings.json was unreadable (older schema or invalid values) - moved aside to ${reaped}, re-recording from scratch\n`);

  const selectedRuntime = await resolveRuntime(runtimeFlag, interactive);
  if (selectedRuntime === null) return;
  const adapters = await resolveProviderSet("adapter", "--agent", adapterFlag, adapterIds, interactive, selectAdapters);
  if (adapters === null) return;
  const defaultAdapter = await resolveActiveDefault(adapters, adapterFlag !== undefined, interactive, selectDefaultAdapter);
  if (defaultAdapter === null) return;
  const backends = await resolveProviderSet("backend", "--backend", backendFlag, backendIds, interactive, selectBackends);
  if (backends === null) return;
  const defaultBackend = await resolveActiveDefault(backends, backendFlag !== undefined, interactive, selectDefaultBackend);
  if (defaultBackend === null) return;
  const harnessModels = await resolveHarnessModels(modelFlag, adapters, interactive);
  if (harnessModels === null) return;

  recordComposition(selectedRuntime, adapters, defaultAdapter, backends, defaultBackend, harnessModels);

  if (!(await installPrerequisites(adapters, backends, interactive, yes, noInstall))) return;

  process.stdout.write("Presence dir:\n");
  files.mkdirSync(presenceDir(), { recursive: true });
  process.stdout.write(`  ${presenceDir()}\n`);

  const gaps = await installAdapterShims(adapters, copy);

  // Notifier configuration is an interactive-only step; --yes / non-interactive adds nothing.
  if (interactive) await configureNotifiers();

  wireBinaries(copy);
  alignEntrypointToRuntime(selectedRuntime);

  // Validate each selected (installed) adapter through its own provider port.
  for (const id of adapters) {
    const adapter = resolveAdapter(id);
    if (!adapter.diagnoseShim) continue;
    const result = await adapter.diagnoseShim();
    process.stdout.write(`  ${result.status.toUpperCase()} ${result.label}: ${result.detail}\n`);
  }

  process.stdout.write("Running doctor checks...\n");
  let doctorResults = await runDoctor(orchDir());
  // Re-run after a reap so the passed/total count reflects the reaped records, not the pre-reap state.
  if (await offerReapMalformedRecords(doctorResults, interactive)) doctorResults = await runDoctor(orchDir());
  process.stdout.write(`Doctor: ${doctorResults.filter((result) => result.status === "ok" || result.status === "skip").length}/${doctorResults.length} checks passed\n`);
  if (gaps.length) {
    process.stdout.write("Setup incomplete:\n" + gaps.map((gap) => `  - ${gap}`).join("\n") + "\n");
    process.exitCode = 1;
    return;
  }

  // Closing smoke round-trip (12.5): the default interactive path proves orch can actually deliver
  // work before claiming "Done". A real spawn is skipped without a TTY (unattended runs must not
  // spend a model turn) and can be turned off with --no-smoke.
  //
  // It REPORTS; it does not gate. The install is already complete and correct by this point, so a
  // failed round-trip must not fail setup's exit code — doing so aborted the `&&` chain that runs
  // `orch doctor` and `orch daemon start` after it, turning one broken agent into a broken install.
  if (interactive && !args.includes("--no-smoke")) {
    const blocker = smokeBlocker();
    if (blocker) {
      process.stdout.write(`Smoke test skipped - ${blocker}.\n`);
    } else {
      process.stdout.write("Smoke test - verifying orch can deliver work (headless spawn + dispatch + result)...\n");
      await runSetupSmoke(process.cwd());
    }
  } else if (!interactive) {
    process.stdout.write("Smoke test skipped (non-interactive) - run `orch setup` on a TTY to verify orch can deliver work.\n");
  } else {
    process.stdout.write("Smoke test skipped (--no-smoke).\n");
  }

  const doneMessage = "Done. Open a backend workspace and try: orch spawn 2 --tab Team1";
  if (interactive) setupOutro(doneMessage);
  else process.stdout.write(`${doneMessage}\n`);
}

/** Interactive notifier onboarding: probe available notifiers, pick a set, collect each one's
 * declared fields, and persist them as settings.json `notify` entries. A cancel skips the step. */
async function configureNotifiers(): Promise<void> {
  const available = (await probeNotifiers()).filter((notifier) => notifier.available);
  if (!available.length) return;
  const picked = await selectNotifiers(available.map((notifier) => notifier.id));
  if (!picked?.length) return;
  const selections: { id: string; config: Record<string, unknown> }[] = [];
  for (const id of picked) {
    const choice = available.find((notifier) => notifier.id === id)!;
    const config: Record<string, unknown> = {};
    for (const field of choice.requiredFields) {
      const answer = await promptText(`${id}: ${field.label ?? field.name}`);
      if (answer === null) return; // cancel skips the whole notifier step
      // Keep command strings in settings; the notifier router normalizes them at delivery time.
      config[field.name] = answer;
    }
    selections.push({ id, config });
  }
  const result = await buildSelectedNotifyEntries(selections);
  for (const error of result.errors) {
    process.stderr.write(`  notifier ${error.id}: missing required fields - ${error.missing.join(", ")}\n`);
  }
  if (result.entries.length) {
    writeSettingsNotify(orchDir(), result.entries);
    process.stdout.write(`  recorded ${result.entries.length} notifier(s): ${result.entries.map((entry) => entry.id).join(", ")}\n`);
  }
}

/** True while setup has never recorded a harness selection — including the first run, where
 * settings.json does not exist yet. "No settings.json" is the signal to run the wizard, not an
 * error, so this gate goes through the non-throwing `loadConfigOrNull` probe rather than
 * `loadConfig` (which treats an absent file as the hard error it is for every other command).
 * A present-but-malformed file still throws here, exactly as before. */
export function compositionUnrecorded(): boolean {
  return !loadConfigOrNull(orchDir())?.defaults.adapter;
}

/** The plain-language line for a command that needs a recorded setup when there is no TTY to walk
 * the wizard on. Names what is missing, the file, and the exact command that fixes it — a refusal
 * to proceed is communicated, never thrown as a stack trace. */
export function setupRequiredMessage(): string {
  // The accepted ids are compile-time constants, so the message lists them rather than printing
  // <id> and leaving the reader to go find them.
  return `orch is not set up yet - no harness/backend recorded in ${settingsPath(orchDir())}.\n`
    + `Run: orch setup\n`
    + `Non-interactive: orch setup --yes --agent <${ADAPTER_IDS.join("|")}> `
    + `--backend <${BACKEND_IDS.join("|")}> [--runtime ${ORCH_RUNTIMES.join("|")}]`;
}

/** Walk the first run through the setup wizard, then dispatch the original command via the injected dispatcher. */
export async function runFirstTimeSetup(argv: string[], dispatch: (argv: string[]) => void): Promise<void> {
  process.stdout.write("First run - no harness/backend recorded yet, walking through setup.\n\n");
  await cmdSetup([]);
  // A cancelled wizard records nothing; exit instead of looping back into the gate.
  if (compositionUnrecorded()) process.exit(1);
  dispatch(argv);
}
