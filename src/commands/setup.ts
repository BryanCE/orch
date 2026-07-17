import { execFileSync } from "node:child_process";
import * as files from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { allAdapters, resolveAdapter } from "../adapters/registry.ts";
import { allBackends, getBackend } from "../backends/registry.ts";
import { loadConfig, resolveWithSource, settingsPath, writeSettingsDefault, writeSettingsInstalled, writeSettingsNotify, type OrchConfig } from "../config.ts";
import { applyFixes, binaryStatus, runDoctor, type CheckResult } from "../doctor.ts";
import { renderDoctorResults, pickFixes } from "../setup/doctor-wizard.ts";
import { withSpinner, promptText } from "../setup/io.ts";
import { probeNotifiers, buildSelectedNotifyEntries } from "../setup/notifiers.ts";
import { setupIntro, setupOutro, selectAdapters, selectDefaultAdapter, selectBackends, selectDefaultBackend, selectNotifiers, chooseInstalls } from "../setup/wizard.ts";
import { isRecord, orchDir, presenceDir } from "../store.ts";
import { renderTable } from "../table.ts";
import { errorMessage, packageRoot } from "../util.ts";
import { runCommand } from "./index.ts";
import { die } from "./target.ts";

const HOME = os.homedir();

/** The install action for one provider id: exactly one of a real install command or a
 * documentation URL, plus an optional ordered list of prerequisite provider ids installed
 * first. Keyed by real provider id, so an installer can never drift from its provider. */
export interface InstallerEntry {
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
export function validateSetupFlag(kind: string, value: string, supported: readonly string[]): string {
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
      if (!picked.includes(bin)) process.stdout.write(`  skipped ${bin} — install later with: ${cmd}\n`);
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
      withSpinner(`Installing ${bin}…`, `${bin} installed`, () => execFileSync("bash", ["-c", cmd], { stdio: "ignore" }));
    } else {
      process.stdout.write(`  Installing ${bin}…\n`);
      execFileSync("bash", ["-c", cmd], { stdio: "inherit" });
    }
  } catch {
    process.stderr.write(`  ${bin} install failed — run manually: ${cmd}\n`);
  }
}

/** True for a settings hook entry whose command runs the orch claude-hooks shim (any path, any form). */
export async function cmdSetup(args: string[]) {
  const copy = args.includes("--copy");
  const yes = args.includes("--yes") || args.includes("-y");
  const noInstall = args.includes("--no-install");
  const pkgRoot = packageRoot();
  const link = (src: string, dest: string) => {
    files.mkdirSync(path.dirname(dest), { recursive: true });
    files.rmSync(dest, { recursive: true, force: true });
    if (copy) files.cpSync(src, dest, { recursive: true });
    else files.symlinkSync(src, dest);
    process.stdout.write(`  ${dest} ${copy ? "(copy)" : "→ " + src}\n`);
  };
  const which = (bin: string): string => {
    try {
      return execFileSync("sh", ["-c", `command -v ${bin}`]).toString().trim();
    } catch {
      return "";
    }
  };

  const adapterFlag = readAssignFlag(args, "--agent") ?? readAssignFlag(args, "--adapter") ?? readAssignFlag(args, "--harness");
  const backendFlag = readAssignFlag(args, "--backend") ?? readAssignFlag(args, "--plexer");
  const adapterIds = allAdapters().map((adapter) => adapter.id);
  const backendIds = allBackends().map((entry) => entry.id);
  const interactive = process.stdin.isTTY && !yes;
  if (interactive) setupIntro();

  const priorInstalled = loadConfig(orchDir()).installed;
  const adapters = await resolveProviderSet("adapter", "--agent", adapterFlag, adapterIds, interactive, selectAdapters);
  if (adapters === null) return;
  const defaultAdapter = await resolveActiveDefault(adapters, adapterFlag !== undefined, interactive, selectDefaultAdapter);
  if (defaultAdapter === null) return;
  const backends = await resolveProviderSet("backend", "--backend", backendFlag, backendIds, interactive, selectBackends);
  if (backends === null) return;
  const defaultBackend = await resolveActiveDefault(backends, backendFlag !== undefined, interactive, selectDefaultBackend);
  if (defaultBackend === null) return;

  // Write the installed sets FIRST — writeSettingsDefault validates the default against them.
  writeSettingsInstalled(orchDir(), { adapters, backends });
  writeSettingsDefault(orchDir(), "adapter", defaultAdapter);
  writeSettingsDefault(orchDir(), "backend", defaultBackend);
  process.stdout.write(
    `Selection recorded in ${settingsPath(orchDir())}:\n` +
    `  adapters          = ${adapters.join(", ")}\n` +
    `  default adapter   = ${defaultAdapter}\n` +
    `  backends          = ${backends.join(", ")}\n` +
    `  default backend   = ${defaultBackend}\n`,
  );

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
        if (which(need)) continue;
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
    const resolved = bins[id] ? which(id) : "";
    process.stdout.write(`  ${resolved ? "ok      " : "MISSING "}${id}${resolved ? `  (${resolved})` : ""}\n`);
    if (!bins[id]) queueInstall(id);
  }
  for (const id of backends) {
    const available = getBackend(id)!.isAvailable();
    const resolved = available && bins[id] ? which(id) : "";
    process.stdout.write(`  ${available ? "ok      " : "MISSING "}${id}${resolved ? `  (${resolved})` : ""}\n`);
    if (!available) queueInstall(id);
  }
  for (const { id, url } of manual) process.stdout.write(`  install ${id} manually: ${url}\n`);

  const toInstall = await resolveInstallTargets(missing, interactive, yes, noInstall);
  if (toInstall === null) return;
  // Install in the queued order so a provider's `needs` (e.g. bun before pi) land first.
  for (const { bin, cmd } of missing.filter((candidate) => toInstall.includes(candidate.bin))) {
    runInstall(bin, cmd, interactive);
    // fresh installs land in ~/.bun/bin or ~/.local/bin before the shell rc picks them up
    process.env.PATH = `${path.join(HOME, ".bun", "bin")}:${path.join(HOME, ".local", "bin")}:${process.env.PATH}`;
    const now = which(bin);
    process.stdout.write(now ? `  ok      ${bin}  (${now})\n` : `  ${bin} still not on PATH — open a new shell and re-run orch setup\n`);
  }

  process.stdout.write("Presence dir:\n");
  files.mkdirSync(presenceDir(), { recursive: true });
  process.stdout.write(`  ${presenceDir()}\n`);

  // Each selected adapter installs its own integration (L4 Builder — no identity branch).
  // An adapter with no installShim is a loud, recorded gap (D10): its integration is
  // expected but unbuildable, never silently skipped.
  const gaps: string[] = [];
  for (const id of adapters.filter((adapterId) => !priorInstalled.adapters.includes(adapterId))) {
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

  // Notifier configuration is an interactive-only step; --yes / non-interactive adds nothing.
  if (interactive) await configureNotifiers();


  // bins on PATH (repo-clone case; bun add -g already links bins)
  process.stdout.write("bins:\n");
  const binDir = path.join(HOME, ".local", "bin");
  for (const [name, rel] of [
    ["orch", path.join("dist", "bin", "orch.js")],
    ["pif", path.join("bin", "pif")],
  ] as const) {
    const resolved = which(name);
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
      link(packageBin, resolved);
      process.stdout.write(`  replaced stale bin ${name}  (${resolved})\n`);
      continue;
    }
    link(packageBin, path.join(binDir, name));
  }

  // Validate each selected (installed) adapter through its own provider port.
  for (const id of adapters) {
    const adapter = resolveAdapter(id);
    if (!adapter.diagnoseShim) continue;
    const result = await adapter.diagnoseShim();
    process.stdout.write(`  ${result.status.toUpperCase()} ${result.label}: ${result.detail}\n`);
  }
  process.stdout.write("Running doctor checks...\n");
  const doctorResults = await runDoctor(orchDir());
  process.stdout.write(`Doctor: ${doctorResults.filter((result) => result.status === "ok" || result.status === "skip").length}/${doctorResults.length} checks passed\n`);
  if (gaps.length) {
    process.stdout.write("Setup incomplete:\n" + gaps.map((gap) => `  - ${gap}`).join("\n") + "\n");
    process.exitCode = 1;
    return;
  }
  const doneMessage = "Done. Open a backend workspace and try: orch spawn 2 --tab Team1";
  if (interactive) setupOutro(doneMessage);
  else process.stdout.write(`${doneMessage}\n`);
}

/** Interactive notifier onboarding: probe available notifiers, pick a set, collect each one's
 * declared fields, and persist them as settings.json `notify` entries. A cancel skips the step. */
export async function configureNotifiers(): Promise<void> {
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
      // A "command" field is a shell string orch runs via `sh -c`.
      config[field.name] = field.name === "command" ? ["sh", "-c", answer] : answer;
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

// ---- settings (inspect effective settings + provenance, switch active defaults) ----

/** The raw `queue.max_retries` set in settings.json, or undefined when the file omits it —
 * so its provenance reads honestly rather than the value loadConfig defaults it to. */
export function rawMaxRetries(orchDirPath: string): number | undefined {
  try {
    const parsed: unknown = JSON.parse(files.readFileSync(settingsPath(orchDirPath), "utf8"));
    if (isRecord(parsed) && isRecord(parsed.queue) && typeof parsed.queue.max_retries === "number") return parsed.queue.max_retries;
  } catch {
    // Absent or invalid — loadConfig already surfaced any real error before this ran.
  }
  return undefined;
}

/** Switch the active default adapter/backend; writeSettingsDefault throws when the id is not installed. */
export function switchDefault(key: "adapter" | "backend", value: string): void {
  try {
    writeSettingsDefault(orchDir(), key, value);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  process.stdout.write(`default ${key} = ${value}\n`);
}

/** Print each resolvable setting with its winning source, or switch the active default via --harness/--plexer. */
export function cmdSettings(args: string[]): void {
  const harness = readAssignFlag(args, "--harness") ?? readAssignFlag(args, "--agent");
  const plexer = readAssignFlag(args, "--plexer") ?? readAssignFlag(args, "--backend");
  const json = args.includes("--json");

  // A load error (invalid settings, legacy config.toml) surfaces loudly with no partial table.
  let config: OrchConfig;
  try {
    config = loadConfig(orchDir());
  } catch (error: unknown) {
    die(errorMessage(error));
  }

  if (harness !== undefined) switchDefault("adapter", harness);
  if (plexer !== undefined) switchDefault("backend", plexer);
  if (harness !== undefined || plexer !== undefined) return;

  const provenance = [
    { key: "adapter", ...resolveWithSource<string>({ env: "ORCH_ADAPTER", config: config.defaults.adapter, fallback: "(none)" }) },
    { key: "backend", ...resolveWithSource<string>({ env: "ORCH_BACKEND", config: config.defaults.backend, fallback: "(auto)" }) },
    { key: "model", ...resolveWithSource<string>({ env: "ORCH_MODEL", config: config.defaults.model, fallback: "(none)" }) },
    { key: "spawn_cap", ...resolveWithSource<number>({ env: "ORCH_SPAWN_CAP", config: config.defaults.spawn_cap, fallback: 8 }) },
    { key: "worktree", ...resolveWithSource<boolean>({ env: "ORCH_WORKTREE", config: config.defaults.worktree, fallback: false }) },
    { key: "worker_peer_tools", ...resolveWithSource<boolean>({ config: config.defaults.worker_peer_tools, fallback: false }) },
    { key: "queue.max_retries", ...resolveWithSource<number>({ config: rawMaxRetries(orchDir()), fallback: 1 }) },
  ];

  const installedSet = config.installed.adapters.length > 0 || config.installed.backends.length > 0;
  if (json) {
    const out: Record<string, unknown> = {};
    for (const { key, value, source } of provenance) out[key] = { value, source };
    out.installed = { value: config.installed, source: installedSet ? "settings.json" : "default" };
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    return;
  }

  const width = Math.max(...provenance.map((row) => row.key.length));
  const valueWidth = Math.max(...provenance.map((row) => String(row.value).length));
  process.stdout.write(`settings  ${settingsPath(orchDir())}\n\n`);
  for (const { key, value, source } of provenance) {
    process.stdout.write(`  ${key.padEnd(width)}  ${String(value).padEnd(valueWidth)}  ${source}\n`);
  }
  process.stdout.write("\n");
  process.stdout.write(`  installed.adapters  ${config.installed.adapters.join(", ") || "(none)"}\n`);
  process.stdout.write(`  installed.backends  ${config.installed.backends.join(", ") || "(none)"}\n`);
  process.stdout.write(`  hosts               ${Object.keys(config.hosts).length}\n`);
  process.stdout.write(`  workspaces          ${Object.keys(config.workspaces).length}\n`);
  process.stdout.write(`  notify              ${config.notify.length}\n`);
}

export async function runInteractiveDoctor(initial: CheckResult[]): Promise<void> {
  let results = initial;
  renderDoctorResults(results);
  const fixable = results.filter((r) => r.fix && (r.id.startsWith("shim-") || r.id.startsWith("fleet-pair-"))).map((r) => ({ id: r.id, label: r.label, description: r.fix!.description, destructive: r.fix!.destructive }));
  const selected = await pickFixes(fixable);
  if (selected === null) return;
  if (selected.length) {
    const chosen = new Set(selected);
    const toApply = results.filter((r) => r.fix && !r.fix.destructive && (r.id.startsWith("shim-") || r.id.startsWith("fleet-pair-")) && chosen.has(r.id));
    withSpinner(
      `Applying ${toApply.length} fix${toApply.length === 1 ? "" : "es"}…`,
      "fixes applied",
      () => { for (const r of toApply) r.fix!.apply(); },
    );
    results = await runDoctor(orchDir());
    renderDoctorResults(results);
  }
  if (results.some((r) => r.status === "fail" || r.status === "warn")) process.exitCode = 1;
}

export async function cmdDoctor(args: string[]) {
  const json = args.includes("--json");
  const yes = args.includes("-y") || args.includes("--yes");
  const fix = args.includes("--fix") || yes;
  let results = await runDoctor(orchDir());
  // A TTY session that did not demand json or an unattended -y apply gets the
  // interactive fix menu (bare `doctor` and `doctor --fix` both land here).
  if (!json && !yes && process.stdin.isTTY) return runInteractiveDoctor(results);
  // Unattended: -y (or --fix with no TTY to prompt on) applies every fix.
  const changes = fix
    ? applyFixes(results.filter((r) => !r.fix?.destructive && (r.id.startsWith("shim-") || r.id.startsWith("fleet-pair-")))).applied
    : [];
  if (fix && changes.length) results = await runDoctor(orchDir());
  if (json) {
    process.stdout.write(JSON.stringify({ results, changes }, null, 2) + "\n");
  } else {
    const rows = results.map((r) => [r.status.toUpperCase(), r.label, r.detail]);
    process.stdout.write(renderTable(["STATUS", "CHECK", "DETAIL"], rows, [8, 24, 80]) + "\n");
    if (changes.length) process.stdout.write("Changes made:\n" + changes.map((c) => `  - ${c}`).join("\n") + "\n");
  }
  if (results.some((r) => r.status === "fail" || r.status === "warn")) process.exitCode = 1;
}

/** True while setup has never recorded a harness selection. */
export function compositionUnrecorded(): boolean {
  return !loadConfig(orchDir()).defaults.adapter;
}

/** Walk the first run through the setup wizard, then dispatch the original command. */
export async function runFirstTimeSetup(argv: string[]): Promise<void> {
  process.stdout.write("First run — no harness/backend recorded yet, walking through setup.\n\n");
  await cmdSetup([]);
  // A cancelled wizard records nothing; exit instead of looping back into the gate.
  if (compositionUnrecorded()) process.exit(1);
  runCommand(argv);
}
