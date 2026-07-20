import { confirm, isCancel } from "@clack/prompts";
import { execFileSync } from "node:child_process";
import * as files from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { allAdapters, resolveAdapter } from "../adapters/registry.ts";
import { allBackends, getBackend, resolveBackend } from "../backends/registry.ts";
import { loadConfig, loadConfigOrNull, reapUnreadableSettings, settingsPath, writeSettingsDefault, writeSettingsFullTree, writeSettingsInstalled, writeSettingsNotify, writeSettingsRuntime } from "../config.ts";
import { DEFAULT_RUNTIME, ORCH_RUNTIMES, type OrchRuntime } from "../runtime.ts";
import { ADAPTER_IDS } from "../adapters/adapter.ts";
import { BACKEND_IDS } from "../backends/backend.ts";
import { binaryStatus } from "../doctor/bins.ts";
import { shebangRuntime } from "../doctor/runtime.ts";
import { runDoctor, type CheckResult } from "../doctor/runner.ts";
import { withSpinner, promptText } from "../setup/io.ts";
import { probeNotifiers, buildSelectedNotifyEntries } from "../setup/notifiers.ts";
import { setupIntro, setupOutro, selectAdapters, selectDefaultAdapter, selectBackends, selectDefaultBackend, selectNotifiers, selectRuntime, chooseInstalls } from "../setup/wizard.ts";
import { loadPresence, orchDir, presenceDir, spawnedRecords } from "../presence/store.ts";
import { binaryPath, errorMessage, packageRoot } from "../util.ts";
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
function validateSetupFlag(kind: string, value: string, supported: readonly string[]): string {
  if (supported.includes(value)) return value;
  die(`Unknown ${kind} "${value}". Supported ${kind}s: ${supported.join(", ")}.`);
}

/** Resolve the setup harness set from a comma-separated flag, the multi-select wizard, or exit. Null on cancel. */
export async function resolveProviderSet(
  kind: string,
  flagName: string,
  flag: string | undefined,
  ids: readonly string[],
  interactive: boolean,
  pick: (options: readonly string[]) => Promise<string[] | null>,
): Promise<string[] | null> {
  if (flag !== undefined) {
    const list = [...new Set(flag.split(",").map((id) => id.trim()).filter(Boolean))];
    if (!list.length) die(`${flagName} needs at least one ${kind} id.`);
    for (const id of list) validateSetupFlag(kind, id, ids);
    return list;
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
export async function resolveActiveDefault(
  selected: readonly string[],
  flagProvided: boolean,
  interactive: boolean,
  pick: (options: readonly string[]) => Promise<string | null>,
): Promise<string | null> {
  if (selected.length === 1 || flagProvided || !interactive) return selected[0]!;
  return pick(selected);
}

/** Resolve the declared JS runtime from `--runtime`, the wizard, or the no-preference value.
 * Never inferred from PATH or from the runtime orch itself is executing under. Null on cancel. */
export async function resolveRuntime(
  flag: string | undefined,
  interactive: boolean,
  pick: () => Promise<OrchRuntime | null> = selectRuntime,
): Promise<OrchRuntime | null> {
  if (flag !== undefined) return validateSetupFlag("runtime", flag, ORCH_RUNTIMES) as OrchRuntime;
  // Non-interactive expresses no preference, and the recorded value for no preference is node.
  if (!interactive) return DEFAULT_RUNTIME;
  return pick();
}

/** The runtime named by the installed `orch` entrypoint's shebang, resolved through PATH and
 * followed to its real target. Null when orch is not yet on PATH (nothing to contradict). */
interface EntrypointRuntime {
  path: string;
  runtime: OrchRuntime | null;
}

function installedEntrypointRuntime(): EntrypointRuntime | null {
  const entrypoint = binaryPath("orch");
  if (!entrypoint) return null;
  let target = entrypoint;
  try {
    target = files.realpathSync(entrypoint);
  } catch {
    // A dangling link is reported by doctor; treat the link path as the target here.
  }
  return { path: target, runtime: shebangRuntime(target) };
}

/** Confirm-to-record prompt, defaulting to NO — a cancelled or declined prompt records nothing. */
async function promptConfirm(message: string): Promise<boolean> {
  const answer = await confirm({ message, initialValue: false });
  return !isCancel(answer) && answer === true;
}

/** Reconcile the operator's runtime selection against the installed entrypoint's shebang (11.1).
 * A selection the installed build contradicts would make setup's own closing doctor pass fail, so
 * it is confronted at selection time — naming the installed runtime, the selection, and the rebuild
 * command — and recorded only on explicit confirmation. Without confirmation (declined, or no TTY /
 * -y to prompt on) the consistent value the entrypoint already is gets recorded instead. */
export async function reconcileRuntimeToEntrypoint(
  selected: OrchRuntime,
  interactive: boolean,
  observe: () => EntrypointRuntime | null = installedEntrypointRuntime,
  askConfirm: () => Promise<boolean> = () => promptConfirm(`Record ${selected} anyway? It will not take effect until you run bun run build:dev.`),
): Promise<OrchRuntime> {
  const installed = observe();
  if (!installed?.runtime || installed.runtime === selected) return selected;
  process.stdout.write(
    `Runtime mismatch: the installed orch entrypoint (${installed.path}) is a ${installed.runtime} build, but you selected ${selected}.\n` +
    `  A ${selected} install requires a rebuild: bun run build:dev\n`,
  );
  if (interactive && (await askConfirm())) {
    process.stdout.write(`  recording ${selected} — pending rebuild; run bun run build:dev to make it real\n`);
    return selected;
  }
  process.stdout.write(`  recording ${installed.runtime} to match the installed entrypoint — re-run orch setup --runtime ${selected} after bun run build:dev to switch\n`);
  return installed.runtime;
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
      if (!picked.includes(bin)) process.stdout.write(`  skipped ${bin} — install later with: ${cmd}\n`);
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
      withSpinner(`Installing ${bin}…`, `${bin} installed`, () => execFileSync("bash", ["-c", cmd], { stdio: "ignore" }));
    } else {
      process.stdout.write(`  Installing ${bin}…\n`);
      execFileSync("bash", ["-c", cmd], { stdio: "inherit" });
    }
  } catch {
    process.stderr.write(`  ${bin} install failed — run manually: ${cmd}\n`);
  }
}

/** Absolute path of a binary on PATH, or "" when absent. */
function whichBin(bin: string): string {
  try {
    return execFileSync("sh", ["-c", `command -v ${bin}`]).toString().trim();
  } catch {
    return "";
  }
}

/** Point `dest` at `src`, replacing any existing entry (symlink, or a full copy under --copy). */
function linkBin(src: string, dest: string, copy: boolean): void {
  files.mkdirSync(path.dirname(dest), { recursive: true });
  files.rmSync(dest, { recursive: true, force: true });
  if (copy) files.cpSync(src, dest, { recursive: true });
  else files.symlinkSync(src, dest);
  process.stdout.write(`  ${dest} ${copy ? "(copy)" : "→ " + src}\n`);
}

/** Persist the composition selections (runtime, installed sets, active defaults) to settings.json. */
function recordComposition(
  runtime: OrchRuntime,
  adapters: string[],
  defaultAdapter: string,
  backends: string[],
  defaultBackend: string,
): void {
  // Record the runtime FIRST: it is a required key with no default, so no other write can
  // produce a valid file until it is present. Re-recording the same value is a no-op change.
  writeSettingsRuntime(orchDir(), runtime);
  // Then the installed sets — writeSettingsDefault validates the default against them.
  writeSettingsInstalled(orchDir(), { adapters, backends });
  writeSettingsDefault(orchDir(), "adapter", defaultAdapter);
  writeSettingsDefault(orchDir(), "backend", defaultBackend);
  // Seed the complete live settings tree only after composition writes have landed.
  writeSettingsFullTree(orchDir());
  process.stdout.write(
    `Selection recorded in ${settingsPath(orchDir())}:\n` +
    `  runtime           = ${runtime}${runtime === "deno" ? "  (sandboxed shims)" : ""}\n` +
    `  adapters          = ${adapters.join(", ")}\n` +
    `  default adapter   = ${defaultAdapter}\n` +
    `  backends          = ${backends.join(", ")}\n` +
    `  default backend   = ${defaultBackend}\n`,
  );
}

/** Probe each selected provider's prerequisite binaries, then install the chosen missing ones.
 * Returns false only when an interactive install multiselect is cancelled, so the caller can abort. */
async function installPrerequisites(
  adapters: string[],
  backends: string[],
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
        if (whichBin(need)) continue;
        const needCmd = INSTALLERS[need]?.install;
        if (needCmd && !missing.some((candidate) => candidate.bin === need)) missing.push({ bin: need, cmd: needCmd });
      }
      if (!missing.some((candidate) => candidate.bin === id)) missing.push({ bin: id, cmd: entry.install });
    } else if (entry?.docsUrl) {
      manual.push({ id, url: entry.docsUrl });
    } else {
      manual.push({ id, url: "(no installer known — install manually)" });
    }
  };
  for (const id of adapters) {
    const resolved = bins[id] ? whichBin(id) : "";
    process.stdout.write(`  ${resolved ? "ok      " : "MISSING "}${id}${resolved ? `  (${resolved})` : ""}\n`);
    if (!bins[id]) queueInstall(id);
  }
  for (const id of backends) {
    const available = getBackend(id)!.isAvailable();
    const resolved = available && bins[id] ? whichBin(id) : "";
    process.stdout.write(`  ${available ? "ok      " : "MISSING "}${id}${resolved ? `  (${resolved})` : ""}\n`);
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
    const now = whichBin(bin);
    process.stdout.write(now ? `  ok      ${bin}  (${now})\n` : `  ${bin} still not on PATH — open a new shell and re-run orch setup\n`);
  }
  return true;
}

/** Install each newly-selected adapter's integration through its own provider port (L4 Builder —
 * no identity branch). Returns the gaps: an adapter expected to install a shim but unable to. */
async function installAdapterShims(
  adapters: string[],
  priorAdapters: readonly string[],
  copy: boolean,
): Promise<string[]> {
  // An adapter with no installShim is a loud, recorded gap (D10): its integration is
  // expected but unbuildable, never silently skipped.
  const gaps: string[] = [];
  for (const id of adapters.filter((adapterId) => !priorAdapters.includes(adapterId))) {
    const adapter = resolveAdapter(id);
    if (adapter.installShim) {
      try {
        await adapter.installShim({ copy });
      } catch (error: unknown) {
        const gap = `${id}: integration install failed — ${errorMessage(error)}`;
        process.stderr.write(`  WARNING ${gap}\n`);
        gaps.push(gap);
      }
    } else if (adapter.diagnoseShim) {
      const gap = `${id}: no integration installer available yet — ${id} agents will lack presence reporting`;
      process.stderr.write(`  WARNING ${gap}\n`);
      gaps.push(gap);
    }
  }
  return gaps;
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
    const resolved = whichBin(name);
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
    process.stdout.write("  kept — orch clean can reap them later\n");
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
    process.stderr.write(`Smoke failed: could not spawn a headless agent — ${errorMessage(error)}\n`);
    process.exitCode = 1;
    return false;
  }
  try {
    await step.dispatch(key, step.buildPrompt(key));
  } catch (error: unknown) {
    process.stderr.write(
      `Smoke failed: orch could not deliver work — the dispatch was rejected (${errorMessage(error)}).\n` +
      `  "setup completed" does not yet mean orch can deliver work; check 'orch daemon status' and 'orch tail ${key}'.\n`,
    );
    step.cleanup(key);
    process.exitCode = 1;
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
      `Smoke failed: the dispatch was accepted but no result came back within ${Math.round(step.timeoutMs / 1000)}s — orch did not complete a work round-trip.\n` +
      `  Check the harness auth and 'orch tail ${key}'.\n`,
    );
    process.exitCode = 1;
    return false;
  }
  process.stdout.write("Smoke ok — orch spawned a headless agent, dispatched a prompt, and read a result back. orch can deliver work.\n");
  return true;
}

/** Whether a headless smoke round-trip can even be attempted here. */
function headlessSmokeUsable(): boolean {
  try {
    return resolveBackend({ configured: "headless" }).isAvailable();
  } catch {
    return false;
  }
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
  const adapterIds = allAdapters().map((adapter) => adapter.id);
  const backendIds = allBackends().map((entry) => entry.id);
  const interactive = process.stdin.isTTY && !yes;
  if (interactive) setupIntro();

  // setup is the ONE recovery path: a settings.json from an older schema (or otherwise invalid)
  // is malformed data, not something to migrate — reap it so re-recording can proceed.
  const reaped = reapUnreadableSettings(orchDir());
  if (reaped) process.stdout.write(`  previous settings.json was unreadable (older schema or invalid values) — moved aside to ${reaped}, re-recording from scratch\n`);

  // First run has no settings.json at all; that is the signal to run this wizard, not an error.
  const priorInstalled = loadConfigOrNull(orchDir())?.installed ?? { adapters: [], backends: [] };
  const selectedRuntime = await resolveRuntime(runtimeFlag, interactive);
  if (selectedRuntime === null) return;
  const runtime = await reconcileRuntimeToEntrypoint(selectedRuntime, interactive);
  const adapters = await resolveProviderSet("adapter", "--agent", adapterFlag, adapterIds, interactive, selectAdapters);
  if (adapters === null) return;
  const defaultAdapter = await resolveActiveDefault(adapters, adapterFlag !== undefined, interactive, selectDefaultAdapter);
  if (defaultAdapter === null) return;
  const backends = await resolveProviderSet("backend", "--backend", backendFlag, backendIds, interactive, selectBackends);
  if (backends === null) return;
  const defaultBackend = await resolveActiveDefault(backends, backendFlag !== undefined, interactive, selectDefaultBackend);
  if (defaultBackend === null) return;

  recordComposition(runtime, adapters, defaultAdapter, backends, defaultBackend);

  if (!(await installPrerequisites(adapters, backends, interactive, yes, noInstall))) return;

  process.stdout.write("Presence dir:\n");
  files.mkdirSync(presenceDir(), { recursive: true });
  process.stdout.write(`  ${presenceDir()}\n`);

  const gaps = await installAdapterShims(adapters, priorInstalled.adapters, copy);

  // Notifier configuration is an interactive-only step; --yes / non-interactive adds nothing.
  if (interactive) await configureNotifiers();

  wireBinaries(copy);

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
  // spend a model turn) and can be turned off with --no-smoke; either way a broken write path here
  // fails loudly rather than shipping a green "setup completed" that cannot dispatch.
  if (interactive && !args.includes("--no-smoke")) {
    if (!headlessSmokeUsable()) {
      process.stdout.write("Smoke test skipped — headless backend is unavailable here.\n");
    } else {
      process.stdout.write("Smoke test — verifying orch can deliver work (headless spawn + dispatch + result)…\n");
      if (!(await runSetupSmoke(process.cwd()))) return;
    }
  } else if (!interactive) {
    process.stdout.write("Smoke test skipped (non-interactive) — run `orch setup` on a TTY to verify orch can deliver work.\n");
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
    process.stderr.write(`  notifier ${error.id}: missing required fields — ${error.missing.join(", ")}\n`);
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
  return `orch is not set up yet — no harness/backend recorded in ${settingsPath(orchDir())}.\n`
    + `Run: orch setup\n`
    + `Non-interactive: orch setup --yes --agent <${ADAPTER_IDS.join("|")}> `
    + `--backend <${BACKEND_IDS.join("|")}> [--runtime ${ORCH_RUNTIMES.join("|")}]`;
}

/** Walk the first run through the setup wizard, then dispatch the original command via the injected dispatcher. */
export async function runFirstTimeSetup(argv: string[], dispatch: (argv: string[]) => void): Promise<void> {
  process.stdout.write("First run — no harness/backend recorded yet, walking through setup.\n\n");
  await cmdSetup([]);
  // A cancelled wizard records nothing; exit instead of looping back into the gate.
  if (compositionUnrecorded()) process.exit(1);
  dispatch(argv);
}
