import * as files from "node:fs";
import { deleteSettingsNotify, loadConfig, NOTIFY_DEFAULT_ON, NOTIFY_STATES, resolveWithSource, settingsPath, writeSettingsAllowedModels, writeSettingsDefault, writeSettingsModels, writeSettingsNotify, writeSettingsPreferredModels, writeSettingsSkills, writeSettingsThinking, SETTINGS_DEFAULTS, type NotifyEntry, type NotifyState, type OrchConfig } from "../config.ts";
import { buildSelectedNotifyEntries, probeNotifiers, type NotifierChoice } from "../setup/notifiers.ts";
import { installSkills } from "../setup/skills.ts";
import { orchDir } from "../presence/store.ts";
import { errorMessage, isRecord } from "../util.ts";
import { readAssignFlag, resolveHarnessModels, validateSetupFlag } from "./setup.ts";
import { refreshAdapterCatalogues } from "../adapters/registry.ts";
import { ADAPTER_IDS, isAdapterId } from "../adapters/adapter.ts";
import { signedOutFix } from "../adapters/prerequisites.ts";
import { BACKEND_IDS } from "../backends/backend.ts";
import { isThinkingLevel, THINKING_LEVELS } from "../policy/thinking.ts";
import { die } from "./target.ts";

/** The effective settings, or a plain-language exit. A load error (invalid settings, a
 *  legacy config.toml) must never reach the user as a stack trace or a partial table. */
function currentConfig(): OrchConfig {
  try {
    return loadConfig(orchDir());
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

/** Read a raw nested setting so normalized defaults do not claim settings.json provenance. */
function rawSetting<T>(orchDirPath: string, ...keys: string[]): T | undefined {
  try {
    let value: unknown = JSON.parse(files.readFileSync(settingsPath(orchDirPath), "utf8"));
    for (const key of keys) {
      if (!isRecord(value) || !(key in value)) return undefined;
      value = value[key];
    }
    return value as T;
  } catch {
    // Absent or invalid — loadConfig already surfaced any real error before this ran.
    return undefined;
  }
}

/** Switch the active default adapter/backend; writeSettingsDefault throws when the id is not installed. */
function formatValue(value: unknown): string {
  if (value === undefined) return "(none)";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value) ?? "(none)";
}

/** One harness's model list as a settings row: its count and specs, or what empty means for it. */
function modelListRow(label: string, harness: string, models: readonly string[], empty: string): string {
  return `  ${`${label} (${harness})`.padEnd(20)}${models.length ? `${models.length}: ${models.join(", ")}` : empty}\n`;
}

function switchDefault(key: "adapter" | "backend", value: string): void {
  try {
    if (key === "adapter") writeSettingsDefault(orchDir(), key, validateSetupFlag(key, value, ADAPTER_IDS));
    else writeSettingsDefault(orchDir(), key, validateSetupFlag(key, value, BACKEND_IDS));
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  process.stdout.write(`default ${key} = ${value}\n`);
}

/**
 * Re-run the per-harness model pickers against the installed set and record the result.
 * Every harness names models in its own vocabulary, so this walks them one at a time: the
 * default it launches on, then the one list that is both what it may launch and what its
 * own picker cycles.
 */
export async function cmdSettingsModels(args: string[]): Promise<void> {
  const config = currentConfig();
  const enabled = config.enabled.adapters;
  if (!enabled.length) die("no harnesses are installed - run: orch setup");
  const only = readAssignFlag(args, "--harness") ?? readAssignFlag(args, "--agent");
  const targets = only === undefined ? enabled : [validateSetupFlag("harness", only, enabled)];

  // Catalogues are stored and refreshed on a cycle, so an operator who just installed a model
  // needs a way to say "ask again now" rather than picking from yesterday's list.
  if (args.includes("--refresh")) await refreshAdapterCatalogues();
  const chosen = await resolveHarnessModels(readAssignFlag(args, "--model"), targets, process.stdout.isTTY === true);
  if (chosen === null) return;
  // Only the targeted harnesses were prompted, so each map merges over what is already
  // recorded; a harness this run never asked about keeps every list it had.
  writeSettingsModels(orchDir(), { ...config.defaults.models, ...chosen.defaults });
  writeSettingsPreferredModels(orchDir(), { ...config.models.preferred, ...chosen.preferred });
  writeSettingsAllowedModels(orchDir(), { ...config.models.allowed, ...chosen.allowed });
  for (const id of targets) {
    const recorded = chosen.defaults[id];
    if (!recorded) {
      process.stdout.write(`  ${id}: unchanged - ${id} listed no models; ${signedOutFix(id)}\n`);
      continue;
    }
    const allowed = chosen.allowed[id] ?? [];
    process.stdout.write(
      `  ${id}: default ${recorded}`
      + `, models ${allowed.length ? allowed.join(", ") : "(all offered)"}\n`,
    );
  }
}

/**
 * Turn skill installation on or off, and re-point or re-write the roots. `--install`
 * copies every packaged skill into the recorded roots straight away, so the setting and
 * what is on disk never disagree; `--no-install` records the refusal and leaves whatever
 * the user has there alone, since those files are theirs to remove.
 */
export function cmdSettingsSkills(args: string[]): void {
  const rootsFlag = readAssignFlag(args, "--roots");
  const install = args.includes("--install") ? true : args.includes("--no-install") ? false : undefined;
  const roots = rootsFlag?.split(",").map((root) => root.trim()).filter(Boolean);
  if (install === undefined && roots === undefined) {
    die("usage: orch settings skills [--install|--no-install] [--roots=<dir>[,<dir>...]]");
  }
  if (rootsFlag !== undefined && !roots?.length) die("--roots needs at least one directory.");

  const current = currentConfig().skills;
  const wanted = install ?? current.install;
  writeSettingsSkills(orchDir(), { install: wanted, roots });
  const target = roots ?? current.roots;
  process.stdout.write(`skills.install = ${wanted}\nskills.roots   = ${target.join(", ")}\n`);
  if (!wanted) return;
  for (const written of installSkills(target)) process.stdout.write(`  ${written}\n`);
}

const NOTIFY_USAGE = "usage: orch settings notify [list] [--json]\n"
  + "       orch settings notify add <sink> [--<field>=<value>...] [--on=<state,...>]\n"
  + "       orch settings notify remove <sink>";

/** Every notifier declares the config fields it needs, so no sink's fields are named here. */
function pickDeclaredFields(
  fields: NotifierChoice["requiredFields"],
  read: (name: string) => unknown,
): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  for (const field of fields) {
    const value = read(field.name);
    if (value !== undefined) config[field.name] = value;
  }
  return config;
}

/** Exit on a flag this sink never declared, rather than silently recording nothing for it. */
function rejectUndeclaredFlags(args: string[], fields: NotifierChoice["requiredFields"]): void {
  const declared = ["--on", ...fields.map((field) => `--${field.name}`)];
  const undeclared = args.filter((arg, index) =>
    arg.startsWith("--")
    && !declared.includes(arg.split("=")[0] ?? arg)
    && !declared.includes(args[index - 1] ?? ""));
  if (undeclared.length) die(`Unknown flag ${undeclared.join(", ")}. This sink takes: ${declared.join(" ")}.`);
}

/** Read `--on=<state,...>` as the states this sink fires on, or exit naming the supported set. */
function readNotifyStates(args: string[]): NotifyState[] | undefined {
  const flag = readAssignFlag(args, "--on");
  if (flag === undefined) return undefined;
  const states = flag.split(",").map((state) => state.trim()).filter(Boolean);
  const unsupported = states.filter((state) => !NOTIFY_STATES.includes(state as NotifyState));
  if (!states.length || unsupported.length) die(`--on takes a comma-separated list of: ${NOTIFY_STATES.join(", ")}.`);
  return states as NotifyState[];
}

function notifyEntryTarget(entry: NotifyEntry): string {
  if ("command" in entry) return formatValue(entry.command);
  if ("url" in entry) return entry.url;
  return "";
}

function notifyEntryRow(entry: NotifyEntry): string {
  return `  ${entry.id.padEnd(8)}  ${(entry.on ?? NOTIFY_DEFAULT_ON).join(",").padEnd(26)}  ${notifyEntryTarget(entry)}\n`;
}

function printNotifyEntries(json: boolean): void {
  const configured = currentConfig().notify;
  if (json) {
    process.stdout.write(JSON.stringify(configured, null, 2) + "\n");
    return;
  }
  process.stdout.write(`notify  ${settingsPath(orchDir())}\n\n`);
  if (!configured.length) {
    process.stdout.write("  (none configured)\n");
    return;
  }
  process.stdout.write(`  ${"sink".padEnd(8)}  ${"on".padEnd(26)}  target\n`);
  for (const entry of configured) process.stdout.write(notifyEntryRow(entry));
}

/** Record one sink over whatever it already had, so a re-add changes only what the flags name. */
async function addNotifyEntry(args: string[]): Promise<void> {
  const [id, ...flags] = args;
  if (id === undefined || id.startsWith("--")) die(NOTIFY_USAGE);
  const choices = await probeNotifiers();
  const choice = choices.find((notifier) => notifier.id === id);
  if (!choice) die(`Unknown notify sink "${id}". Supported: ${choices.map((notifier) => notifier.id).join(", ")}.`);
  rejectUndeclaredFlags(flags, choice.requiredFields);

  const recorded = currentConfig().notify.find((entry) => entry.id === id);
  const recordedFields = { ...recorded } as Record<string, unknown>;
  const config = {
    ...pickDeclaredFields(choice.requiredFields, (name) => recordedFields[name]),
    ...pickDeclaredFields(choice.requiredFields, (name) => readAssignFlag(flags, `--${name}`)),
    on: readNotifyStates(flags) ?? recorded?.on,
  };

  const written = await buildSelectedNotifyEntries([{ id, config }]);
  const missing = written.errors.flatMap((error) => error.missing);
  if (missing.length) die(`${id} needs ${missing.map((field) => `--${field}=<value>`).join(" ")}.`);

  writeSettingsNotify(orchDir(), written.entries);
  process.stdout.write(`notify  ${settingsPath(orchDir())}\n\n`);
  for (const entry of written.entries) process.stdout.write(notifyEntryRow(entry));
  if (!choice.available) process.stdout.write(`\n  ${choice.remediation}\n`);
  process.stdout.write("\nverify delivery with: orch doctor\n");
}

function removeNotifyEntry(args: string[]): void {
  const [id] = args;
  if (id === undefined) die(NOTIFY_USAGE);
  const configured = currentConfig().notify;
  const entry = configured.find((candidate) => candidate.id === id);
  if (!entry) die(`No "${id}" notify sink is configured. Configured: ${configured.map((candidate) => candidate.id).join(", ") || "(none)"}.`);
  deleteSettingsNotify(orchDir(), entry.id);
  process.stdout.write(`removed notify sink ${id} from ${settingsPath(orchDir())}\n`);
}

/** List, add, or remove the settings.json `notify` sinks the daemon delivers through. */
export async function cmdSettingsNotify(args: string[]): Promise<void> {
  const [verb, ...rest] = args;
  if (verb === undefined || verb === "list" || verb.startsWith("--")) {
    printNotifyEntries(args.includes("--json"));
    return;
  }
  if (verb === "add") return addNotifyEntry(rest);
  if (verb === "remove") return removeNotifyEntry(rest);
  die(NOTIFY_USAGE);
}

/** Print each resolvable setting with its winning source, or switch the active default via --harness/--plexer. */
export function cmdSettings(args: string[]): void {
  const harness = readAssignFlag(args, "--harness") ?? readAssignFlag(args, "--agent");
  const plexer = readAssignFlag(args, "--plexer") ?? readAssignFlag(args, "--backend");
  const json = args.includes("--json");

  const config = currentConfig();

  if (harness !== undefined) switchDefault("adapter", harness);
  if (plexer !== undefined) switchDefault("backend", plexer);
  if (harness !== undefined || plexer !== undefined) return;

  // One model row per installed harness: each names models in its own vocabulary,
  // so there is no single "the model" to report.
  const modelRows = config.enabled.adapters.map((harness) => ({
    key: `model (${harness})`,
    ...resolveWithSource<string>({ config: config.defaults.models[harness], fallback: "(none)" }),
  }));

  const provenance = [
    { key: "defaults.worktree", ...resolveWithSource<boolean>({ env: "ORCH_WORKTREE", config: rawSetting<boolean>(orchDir(), "defaults", "worktree"), fallback: config.defaults.worktree }) },
    // Thinking is its own axis (TASKS/12), so it is listed as its own setting and
    // never as part of a model id.
    { key: "defaults.thinking", ...resolveWithSource<string>({ env: "ORCH_THINKING", config: rawSetting<string>(orchDir(), "defaults", "thinking"), fallback: config.defaults.thinking ?? SETTINGS_DEFAULTS.defaults.thinking }) },
    { key: "adapter", ...resolveWithSource<string>({ env: "ORCH_ADAPTER", config: rawSetting<string>(orchDir(), "defaults", "adapter"), fallback: "(none)" }) },
    { key: "backend", ...resolveWithSource<string>({ env: "ORCH_BACKEND", config: rawSetting<string>(orchDir(), "defaults", "backend"), fallback: "(auto)" }) },
    { key: "daemon.tcp_port", ...resolveWithSource<number>({ env: "ORCH_DAEMON_PORT", config: rawSetting<number>(orchDir(), "daemon", "tcp_port"), fallback: config.daemon.tcp_port }) },
    { key: "daemon.idle_shutdown_minutes", ...resolveWithSource<number>({ config: rawSetting<number>(orchDir(), "daemon", "idle_shutdown_minutes"), fallback: config.daemon.idle_shutdown_minutes }) },
    { key: "fleet.spawn_cap", ...resolveWithSource<number>({ env: "ORCH_SPAWN_CAP", config: rawSetting<number>(orchDir(), "fleet", "spawn_cap"), fallback: config.fleet.spawn_cap }) },
    { key: "fleet.max_agents", ...resolveWithSource<number | string>({ config: rawSetting<number>(orchDir(), "fleet", "max_agents"), fallback: config.fleet.max_agents ?? "(none)" }) },
    { key: "fleet.workspace_caps", ...resolveWithSource<Record<string, number>>({ config: rawSetting<Record<string, number>>(orchDir(), "fleet", "workspace_caps"), fallback: config.fleet.workspace_caps }) },
    { key: "fleet.worker_peer_tools", ...resolveWithSource<boolean>({ config: rawSetting<boolean>(orchDir(), "fleet", "worker_peer_tools"), fallback: config.fleet.worker_peer_tools }) },
    { key: "fleet.cross_workspace", ...resolveWithSource<boolean>({ config: rawSetting<boolean>(orchDir(), "fleet", "cross_workspace"), fallback: config.fleet.cross_workspace }) },
    { key: "queue.max_retries", ...resolveWithSource<number>({ config: rawSetting<number>(orchDir(), "queue", "max_retries"), fallback: config.queue.max_retries }) },
    { key: "tiling.first_split", ...resolveWithSource<string>({ config: rawSetting<string>(orchDir(), "tiling", "first_split"), fallback: config.tiling.first_split }) },
    { key: "skills.install", ...resolveWithSource<boolean>({ config: rawSetting<boolean>(orchDir(), "skills", "install"), fallback: config.skills.install }) },
    { key: "skills.roots", ...resolveWithSource<string[]>({ config: rawSetting<string[]>(orchDir(), "skills", "roots"), fallback: config.skills.roots }) },
    { key: "timeouts.dispatch_ack_ms", ...resolveWithSource<number>({ config: rawSetting<number>(orchDir(), "timeouts", "dispatch_ack_ms"), fallback: config.timeouts.dispatch_ack_ms }) },
    { key: "timeouts.wait_ms", ...resolveWithSource<number>({ config: rawSetting<number>(orchDir(), "timeouts", "wait_ms"), fallback: config.timeouts.wait_ms }) },
    { key: "timeouts.adapter_command_ms", ...resolveWithSource<number>({ config: rawSetting<number>(orchDir(), "timeouts", "adapter_command_ms"), fallback: config.timeouts.adapter_command_ms }) },
    { key: "timeouts.notify_ms", ...resolveWithSource<number>({ config: rawSetting<number>(orchDir(), "timeouts", "notify_ms"), fallback: config.timeouts.notify_ms }) },
    ...modelRows,
  ];

  const enabledSet = config.enabled.adapters.length > 0 || config.enabled.backends.length > 0;
  if (json) {
    const out: Record<string, unknown> = {};
    for (const { key, value, source } of provenance) out[key] = { value, source };
    out.enabled = { value: config.enabled, source: enabledSet ? "settings.json" : "default" };
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    return;
  }

  const width = Math.max(...provenance.map((row) => row.key.length));
  const valueWidth = Math.max(...provenance.map((row) => formatValue(row.value).length));
  process.stdout.write(`settings  ${settingsPath(orchDir())}\n\n`);
  for (const { key, value, source } of provenance) {
    process.stdout.write(`  ${key.padEnd(width)}  ${formatValue(value).padEnd(valueWidth)}  ${source}\n`);
  }
  process.stdout.write("\n");
  process.stdout.write(`  enabled.adapters  ${config.enabled.adapters.join(", ") || "(none)"}\n`);
  process.stdout.write(`  enabled.backends  ${config.enabled.backends.join(", ") || "(none)"}\n`);
  for (const harness of config.enabled.adapters) {
    // Two lists, never conflated: the quicklist that harness's own picker shows, then the
    // gate its spawns are held to. A model missing from the first is still launchable.
    process.stdout.write(modelListRow("picker", harness, config.models.preferred[harness] ?? [], "(none)"));
    process.stdout.write(modelListRow("allowed", harness, config.models.allowed[harness] ?? [], "(all offered)"));
  }
  process.stdout.write(`  hosts               ${Object.keys(config.hosts).length}\n`);
  process.stdout.write(`  workspaces          ${Object.keys(config.workspaces).length}\n`);
  process.stdout.write(`  notify              ${config.notify.length}\n`);
}

/**
 * Set the thinking effort a launch uses when nothing overrides it.
 *
 * `TASKS/12-thinking.md`: thinking is its own axis, configurable through orch rather
 * than by hand-editing settings.json, and it applies to any model and any harness.
 * A bare level sets the global default; `--harness=<id>` sets that harness's override,
 * and `--clear` with `--harness` removes it.
 */
export function cmdSettingsThinking(args: string[]): void {
  const harnessFlag = args.find((argument) => argument.startsWith("--harness="))?.slice("--harness=".length);
  const clear = args.includes("--clear");
  const level = args.find((argument) => !argument.startsWith("--"));

  if (harnessFlag !== undefined && !isAdapterId(harnessFlag)) {
    throw new Error(`unknown harness ${JSON.stringify(harnessFlag)}; known harnesses: ${ADAPTER_IDS.join(", ")}`);
  }
  if (clear) {
    if (harnessFlag === undefined) throw new Error("--clear needs --harness=<id>: the global default always has a value");
    writeSettingsThinking(orchDir(), { byHarness: { [harnessFlag]: null } });
    process.stdout.write(`cleared the thinking override for ${harnessFlag}\n`);
    return;
  }
  if (level === undefined) {
    const config = currentConfig();
    process.stdout.write(`thinking  ${config.defaults.thinking ?? SETTINGS_DEFAULTS.defaults.thinking}\n`);
    for (const [harness, value] of Object.entries(config.defaults.thinking_by_harness ?? {})) {
      process.stdout.write(`thinking (${harness})  ${String(value)}\n`);
    }
    return;
  }
  if (!isThinkingLevel(level)) {
    throw new Error(`unknown thinking level ${JSON.stringify(level)}; valid levels: ${THINKING_LEVELS.join(", ")}`);
  }
  if (harnessFlag === undefined) {
    writeSettingsThinking(orchDir(), { thinking: level });
    process.stdout.write(`thinking  ${level}\n`);
  } else {
    writeSettingsThinking(orchDir(), { byHarness: { [harnessFlag]: level } });
    process.stdout.write(`thinking (${harnessFlag})  ${level}\n`);
  }
}
