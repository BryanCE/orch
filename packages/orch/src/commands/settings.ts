import * as files from "node:fs";
import { loadConfig, NOTIFY_DEFAULT_ON, resolveWithSource, settingsPath, SETTINGS_DEFAULTS } from "../config.ts";
import { NOTIFY_STATES } from "../types/config.ts";
import { buildSelectedNotifyEntries, probeNotifiers } from "../setup/notifiers.ts";
import { installSkills } from "../setup/skills.ts";
import { orchDir } from "../presence/store.ts";
import { errorMessage, isRecord } from "../util.ts";
import { readAssignFlag, resolveHarnessModels, validateSetupFlag } from "./setup.ts";
import { refreshAdapterCatalogues } from "../adapters/registry.ts";
import { isAdapterId } from "../adapters/adapter.ts";
import { ADAPTER_IDS } from "../types/adapter.ts";
import { signedOutFix } from "../adapters/prerequisites.ts";
import { BACKEND_IDS } from "../types/backend.ts";
import { isThinkingLevel } from "../policy/thinking.ts";
import { THINKING_LEVELS } from "../types/policy.ts";
import { die } from "./target.ts";
import { SETTINGS_REGISTRY, writeRegisteredSetting } from "../settings/registry.ts";
import { runSettingsEditor } from "../settings/shell.ts";
import type { NotifierChoice } from "../types/notify.ts";
import type { NotifyEntry, NotifyState, OrchConfig, SettingKind, SettingSpec } from "../types/config.ts";

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
function rawSetting(orchDirPath: string, ...keys: string[]): unknown {
  try {
    let value: unknown = JSON.parse(files.readFileSync(settingsPath(orchDirPath), "utf8"));
    for (const key of keys) {
      if (!isRecord(value) || !(key in value)) return undefined;
      value = value[key];
    }
    return value;
  } catch {
    // Absent or invalid — loadConfig already surfaced any real error before this ran.
    return undefined;
  }
}

/** Switch the active default adapter/backend through its registry declaration. */
/** Read an env override according to the setting's DECLARED kind, never by
 *  sniffing whatever the fallback happened to be. */
function envSettingValue(environment: string, type: SettingKind): unknown {
  if (type.kind === "boolean") return environment === "true" || environment === "1";
  if (type.kind === "integer") return Number(environment);
  return environment;
}

function formatValue(value: unknown): string {
  // Rule 11: NULL is not-applicable. An unset setting is not the literal "null".
  if (value === undefined || value === null) return "(none)";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value) ?? "(none)";
}

/** One harness's model list as a settings row: its count and specs, or what empty means for it. */
function modelListRow(label: string, harness: string, models: readonly string[], empty: string): string {
  return `  ${`${label} (${harness})`.padEnd(20)}${models.length ? `${models.length}: ${models.join(", ")}` : empty}\n`;
}

function editDistance(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0]!;
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = row[j]!;
      row[j] = left[i - 1] === right[j - 1]
        ? diagonal
        : Math.min(diagonal + 1, above + 1, row[j - 1]! + 1);
      diagonal = above;
    }
  }
  return row[right.length]!;
}

function nearestSettingKeys(key: string): string {
  return SETTINGS_REGISTRY
    .map((setting) => ({ key: setting.key, distance: editDistance(key, setting.key) }))
    .sort((left, right) => left.distance - right.distance || left.key.localeCompare(right.key))
    .slice(0, 3)
    .map((entry) => entry.key)
    .join(", ");
}

interface ParsedSettingValue { readonly ok: true; readonly value: unknown }
interface RejectedSettingValue { readonly ok: false; readonly reason: string }
type SettingValueResult = ParsedSettingValue | RejectedSettingValue;

function parseSettingValue(spec: SettingSpec, input: string): SettingValueResult {
  const kind = spec.type;
  switch (kind.kind) {
    case "boolean":
      if (input === "true") return { ok: true, value: true };
      if (input === "false") return { ok: true, value: false };
      return { ok: false, reason: "expected true or false" };
    case "integer": {
      if (!/^-?\d+$/.test(input)) return { ok: false, reason: "expected an integer" };
      const value = Number(input);
      if (!Number.isSafeInteger(value)) return { ok: false, reason: "expected a safe integer" };
      if (kind.min !== undefined && value < kind.min) return { ok: false, reason: `expected an integer >= ${kind.min}` };
      if (kind.max !== undefined && value > kind.max) return { ok: false, reason: `expected an integer <= ${kind.max}` };
      return { ok: true, value };
    }
    case "choice":
      return kind.choices.includes(input)
        ? { ok: true, value: input }
        : { ok: false, reason: `expected one of: ${kind.choices.join(", ")}` };
    case "multi": {
      const values = input.split(",").map((value) => value.trim()).filter(Boolean);
      const invalid = values.filter((value) => !kind.choices.includes(value));
      if (!values.length || invalid.length) return { ok: false, reason: `expected comma-separated values from: ${kind.choices.join(", ")}` };
      return { ok: true, value: values };
    }
    case "text":
      return input.length > 0 ? { ok: true, value: input } : { ok: false, reason: "expected non-empty text" };
    case "list": {
      let value: unknown;
      try { value = JSON.parse(input); } catch { return { ok: false, reason: "expected a JSON array or object" }; }
      if (value === null || typeof value !== "object") return { ok: false, reason: "expected a JSON array or object" };
      return { ok: true, value };
    }
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

/** Bare settings opens the editor only when attached to a TTY; flags and JSON stay non-interactive. */
export function shouldLaunchSettingsEditor(args: readonly string[], isTTY = process.stdin.isTTY === true): boolean {
  return isTTY && args.length === 0;
}

function setSingleSetting(args: string[]): boolean {
  const [key, input, ...extra] = args;
  if (key === undefined || key.startsWith("--") || input === undefined || extra.length > 0) return false;
  const spec = SETTINGS_REGISTRY.find((setting) => setting.key === key);
  if (spec === undefined) die(`Unknown setting ${JSON.stringify(key)}. Nearest valid keys: ${nearestSettingKeys(key)}.`);
  if (spec.write === undefined) die(`${key} is read-only; edit it with orch setup.`);
  if (spec.env !== undefined && process.env[spec.env] !== undefined) {
    die(`${key} is overridden by ${spec.env}; remove the override before writing it.`);
  }
  const parsed = parseSettingValue(spec, input);
  if (!parsed.ok) die(`${key}: ${parsed.reason}.`);
  try { writeRegisteredSetting(orchDir(), key, parsed.value); } catch (error: unknown) { die(errorMessage(error)); }
  process.stdout.write(`${key} = ${formatValue(parsed.value)}\n`);
  return true;
}

function switchDefault(key: "adapter" | "backend", value: string): void {
  try {
    if (key === "adapter") writeRegisteredSetting(orchDir(), "defaults.adapter", validateSetupFlag(key, value, ADAPTER_IDS));
    else writeRegisteredSetting(orchDir(), "defaults.backend", validateSetupFlag(key, value, BACKEND_IDS));
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
  writeRegisteredSetting(orchDir(), "defaults.models", { ...config.defaults.models, ...chosen.defaults });
  writeRegisteredSetting(orchDir(), "models.preferred", { ...config.models.preferred, ...chosen.preferred });
  writeRegisteredSetting(orchDir(), "models.allowed", { ...config.models.allowed, ...chosen.allowed });
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
  writeRegisteredSetting(orchDir(), "skills.install", wanted);
  if (roots !== undefined) writeRegisteredSetting(orchDir(), "skills.roots", roots);
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
  const isNotifyState = (state: string): state is NotifyState => NOTIFY_STATES.some((known) => known === state);
  const unsupported = states.filter((state) => !isNotifyState(state));
  if (!states.length || unsupported.length) die(`--on takes a comma-separated list of: ${NOTIFY_STATES.join(", ")}.`);
  return states.filter(isNotifyState);
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
  const recordedFields: Record<string, unknown> = {};
  if (recorded !== undefined) {
    for (const [key, value] of Object.entries(recorded)) recordedFields[key] = value;
  }
  const config = {
    ...pickDeclaredFields(choice.requiredFields, (name) => recordedFields[name]),
    ...pickDeclaredFields(choice.requiredFields, (name) => readAssignFlag(flags, `--${name}`)),
    on: readNotifyStates(flags) ?? recorded?.on,
  };

  const written = await buildSelectedNotifyEntries([{ id, config }]);
  const missing = written.errors.flatMap((error) => error.missing);
  if (missing.length) die(`${id} needs ${missing.map((field) => `--${field}=<value>`).join(" ")}.`);

  const configured = currentConfig().notify;
  const replacement = written.entries[0];
  if (replacement === undefined) die(`${id} produced no settings entry.`);
  const merged = configured.some((entry) => entry.id === id)
    ? configured.map((entry) => entry.id === id ? replacement : entry)
    : [...configured, replacement];
  writeRegisteredSetting(orchDir(), "notify", merged);
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
  writeRegisteredSetting(orchDir(), "notify", configured.filter((candidate) => candidate.id !== entry.id));
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
export async function cmdSettings(args: string[]): Promise<void> {
  if (shouldLaunchSettingsEditor(args)) {
    try {
      await runSettingsEditor(orchDir());
    } catch (error: unknown) {
      die(errorMessage(error));
    }
    return;
  }
  if (setSingleSetting(args)) return;
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

  interface ProvenanceRow { readonly key: string; readonly value: unknown; readonly source: string }
  const provenance: ProvenanceRow[] = [];
  // Every declared setting, in the registry's own declaration order. The registry
  // is the single source of truth for a setting (TASKS/14-settings-tui.md), and
  // that includes whether the CLI shows it at all and what it is called. The
  // hand-written switch that used to stand here dropped 23 of the 42 declared
  // keys out of both the table and --json — every retention.*, every workers.*,
  // logging.level, fleet.max_agents_per_pack, locked_commands — and gave two of them a
  // second name. A setting nobody can print is a setting nobody can find.
  for (const spec of SETTINGS_REGISTRY) {
    const configured = spec.read(config);
    const raw = rawSetting(orchDir(), ...spec.key.split("."));
    const environment = spec.env === undefined ? undefined : process.env[spec.env];
    const value = environment !== undefined ? envSettingValue(environment, spec.type) : configured ?? null;
    const source = environment !== undefined ? "env" : raw !== undefined ? "settings.json" : "default";
    provenance.push({ key: spec.key, value, source });
  }
  provenance.push(...modelRows);

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
  process.stdout.write(`  spaces              ${Object.keys(config.spaces).length}\n`);
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
    const current = currentConfig().defaults.thinking_by_harness ?? {};
    const byHarness = { ...current };
    delete byHarness[harnessFlag];
    writeRegisteredSetting(orchDir(), "defaults.thinking_by_harness", byHarness);
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
    writeRegisteredSetting(orchDir(), "defaults.thinking", level);
    process.stdout.write(`thinking  ${level}\n`);
  } else {
    const current = currentConfig().defaults.thinking_by_harness ?? {};
    writeRegisteredSetting(orchDir(), "defaults.thinking_by_harness", { ...current, [harnessFlag]: level });
    process.stdout.write(`thinking (${harnessFlag})  ${level}\n`);
  }
}
