import * as files from "node:fs";
import { resolveWithSource } from "../settings/read.ts";
import { NOTIFY_DEFAULT_ON, settingsPath, SETTINGS_DEFAULTS } from "../settings/schema.ts";
import { displaySetting, displayValue } from "../settings/display.ts";
import { NOTIFY_STATES } from "../types/settings.ts";
import { buildSelectedNotifyEntries, probeNotifiers } from "../setup/notifiers.ts";
import { describeSkillPlacement, installSkills } from "../setup/skills.ts";
import { errorMessage, isRecord } from "../util.ts";
import { readAssignFlag, validateSetupFlag } from "../setup/flags.ts";
import { resolveHarnessModels } from "../setup/composition.ts";
import { refreshAdapterCatalogues } from "../adapters/registry.ts";
import { isAdapterId } from "../adapters/adapter.ts";
import { ADAPTER_IDS } from "../types/adapter.ts";
import { signedOutFix } from "../adapters/prerequisites.ts";
import { BACKEND_IDS } from "../types/backend.ts";
import { isThinkingLevel } from "../policy/thinking.ts";
import { THINKING_LEVELS } from "../types/policy.ts";
import { die } from "./target.ts";
import { nearestKeys } from "../settings/nearest.ts";
import { SETTINGS_REGISTRY, writeNotifyEntries, writeRegisteredSetting } from "../settings/registry.ts";
import { parseSettingValue } from "../settings/parse.ts";
import { runSettingsEditor } from "../settings/shell.ts";
import type { NotifierChoice } from "../types/notify.ts";
import type { NotifyEntry, NotifyState, OrchSettings, SettingKind } from "../types/settings.ts";
import type { Services } from "../types/services.ts";

/** The effective settings, or a plain-language exit. A load error (invalid settings, a
 *  legacy config.toml) must never reach the user as a stack trace or a partial table. */
function currentSettings(services: Pick<Services, "settings">): OrchSettings {
  try {
    return services.settings.current();
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
    // Absent or invalid — loadSettings already surfaced any real error before this ran.
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
  // Rule 11: NULL is not-applicable. An unset setting is not the literal "null" — the one
  // way this printing differs from every other place a settings value is shown.
  if (value === null) return "(none)";
  return displayValue(value);
}

/** One harness's model list as a settings row: its count and specs, or what empty means for it. */
function modelListRow(label: string, harness: string, models: readonly string[], empty: string): string {
  return `  ${`${label} (${harness})`.padEnd(20)}${models.length ? `${models.length}: ${models.join(", ")}` : empty}\n`;
}

function nearestSettingKeys(key: string): string {
  return nearestKeys(key, SETTINGS_REGISTRY.map((setting) => setting.key), 3).join(", ");
}

/** Bare settings opens the editor only when attached to a TTY; flags and JSON stay non-interactive. */
export function shouldLaunchSettingsEditor(args: readonly string[], isTTY = process.stdin.isTTY === true): boolean {
  return isTTY && args.length === 0;
}

function setSingleSetting(services: Pick<Services, "orchDir">, args: string[]): boolean {
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
  try { writeRegisteredSetting(services.orchDir, key, parsed.value); } catch (error: unknown) { die(errorMessage(error)); }
  process.stdout.write(`${key} = ${formatValue(parsed.value)}\n`);
  return true;
}

function switchDefault(services: Pick<Services, "orchDir">, key: "adapter" | "backend", value: string): void {
  try {
    if (key === "adapter") writeRegisteredSetting(services.orchDir, "defaults.adapter", validateSetupFlag(key, value, ADAPTER_IDS));
    else writeRegisteredSetting(services.orchDir, "defaults.backend", validateSetupFlag(key, value, BACKEND_IDS));
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
export async function cmdSettingsModels(services: Services, args: string[]): Promise<void> {
  const settings = currentSettings(services);
  const enabled = settings.enabled.adapters;
  if (!enabled.length) die("no harnesses are installed - run: orch setup");
  const only = readAssignFlag(args, "--harness") ?? readAssignFlag(args, "--agent");
  const targets = only === undefined ? enabled : [validateSetupFlag("harness", only, enabled)];

  // Catalogues are stored and refreshed on a cycle, so an operator who just installed a model
  // needs a way to say "ask again now" rather than picking from yesterday's list.
  if (args.includes("--refresh")) await refreshAdapterCatalogues(services.orchDir);
  const chosen = await resolveHarnessModels(settings, readAssignFlag(args, "--model"), targets, process.stdout.isTTY === true);
  if (chosen === null) return;
  // Only the targeted harnesses were prompted, so each map merges over what is already
  // recorded; a harness this run never asked about keeps every list it had.
  writeRegisteredSetting(services.orchDir, "defaults.models", { ...settings.defaults.models, ...chosen.defaults });
  writeRegisteredSetting(services.orchDir, "models.preferred", { ...settings.models.preferred, ...chosen.preferred });
  writeRegisteredSetting(services.orchDir, "models.allowed", { ...settings.models.allowed, ...chosen.allowed });
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
 * Turn skill installation on or off, and re-point the store or the harness links.
 * `--install` writes every packaged skill straight away, so the setting and what is on
 * disk never disagree; `--no-install` records the refusal and leaves whatever the user
 * has there alone, since those files are theirs to remove.
 */
export function cmdSettingsSkills(services: Services, args: string[]): void {
  const storeFlag = readAssignFlag(args, "--store");
  const linkFlag = readAssignFlag(args, "--link");
  const install = args.includes("--install") ? true : args.includes("--no-install") ? false : undefined;
  const link = linkFlag?.split(",").map((root) => root.trim()).filter(Boolean);
  if (install === undefined && storeFlag === undefined && link === undefined) {
    die("usage: orch settings skills [--install|--no-install] [--store=<dir>] [--link=<dir>[,<dir>...]]");
  }
  if (storeFlag !== undefined && !storeFlag.trim()) die("--store needs a directory.");
  if (linkFlag !== undefined && !link?.length) die("--link needs at least one directory.");

  const current = currentSettings(services).skills;
  const wanted = install ?? current.install;
  writeRegisteredSetting(services.orchDir, "skills.install", wanted);
  if (storeFlag !== undefined) writeRegisteredSetting(services.orchDir, "skills.store", storeFlag.trim());
  if (link !== undefined) writeRegisteredSetting(services.orchDir, "skills.link", link);
  const roots = { store: storeFlag?.trim() ?? current.store, link: link ?? current.link };
  process.stdout.write(
    `skills.install = ${wanted}\nskills.store   = ${roots.store}\nskills.link    = ${roots.link.join(", ")}\n`,
  );
  if (!wanted) return;
  for (const placed of installSkills(roots)) process.stdout.write(`  ${describeSkillPlacement(placed)}\n`);
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

function printNotifyEntries(services: Services, json: boolean): void {
  const configured = currentSettings(services).notify;
  if (json) {
    process.stdout.write(JSON.stringify(configured, null, 2) + "\n");
    return;
  }
  process.stdout.write(`notify  ${services.settings.file}\n\n`);
  if (!configured.length) {
    process.stdout.write("  (none configured)\n");
    return;
  }
  process.stdout.write(`  ${"sink".padEnd(8)}  ${"on".padEnd(26)}  target\n`);
  for (const entry of configured) process.stdout.write(notifyEntryRow(entry));
}

/** Record one sink over whatever it already had, so a re-add changes only what the flags name. */
async function addNotifyEntry(services: Services, args: string[]): Promise<void> {
  const [id, ...flags] = args;
  if (id === undefined || id.startsWith("--")) die(NOTIFY_USAGE);
  const choices = await probeNotifiers();
  const choice = choices.find((notifier) => notifier.id === id);
  if (!choice) die(`Unknown notify sink "${id}". Supported: ${choices.map((notifier) => notifier.id).join(", ")}.`);
  rejectUndeclaredFlags(flags, choice.requiredFields);

  const recorded = currentSettings(services).notify.find((entry) => entry.id === id);
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

  const configured = currentSettings(services).notify;
  const replacement = written.entries[0];
  if (replacement === undefined) die(`${id} produced no settings entry.`);
  const merged = configured.some((entry) => entry.id === id)
    ? configured.map((entry) => entry.id === id ? replacement : entry)
    : [...configured, replacement];
  writeNotifyEntries(services.orchDir, merged);
  process.stdout.write(`notify  ${services.settings.file}\n\n`);
  for (const entry of written.entries) process.stdout.write(notifyEntryRow(entry));
  if (!choice.available) process.stdout.write(`\n  ${choice.remediation}\n`);
  process.stdout.write("\nverify delivery with: orch doctor\n");
}

function removeNotifyEntry(services: Services, args: string[]): void {
  const [id] = args;
  if (id === undefined) die(NOTIFY_USAGE);
  const configured = currentSettings(services).notify;
  const entry = configured.find((candidate) => candidate.id === id);
  if (!entry) die(`No "${id}" notify sink is configured. Configured: ${configured.map((candidate) => candidate.id).join(", ") || "(none)"}.`);
  writeNotifyEntries(services.orchDir, configured.filter((candidate) => candidate.id !== entry.id));
  process.stdout.write(`removed notify sink ${id} from ${services.settings.file}\n`);
}

/** List, add, or remove the settings.json `notify` sinks the daemon delivers through. */
export async function cmdSettingsNotify(services: Services, args: string[]): Promise<void> {
  const [verb, ...rest] = args;
  if (verb === undefined || verb === "list" || verb.startsWith("--")) {
    printNotifyEntries(services, args.includes("--json"));
    return;
  }
  if (verb === "add") return addNotifyEntry(services, rest);
  if (verb === "remove") return removeNotifyEntry(services, rest);
  die(NOTIFY_USAGE);
}

/** Print each resolvable setting with its winning source, or switch the active default via --harness/--plexer. */
export async function cmdSettings(services: Services, args: string[]): Promise<void> {
  if (shouldLaunchSettingsEditor(args)) {
    try {
      await runSettingsEditor(services.orchDir, currentSettings(services));
    } catch (error: unknown) {
      die(errorMessage(error));
    }
    return;
  }
  if (setSingleSetting(services, args)) return;
  const harness = readAssignFlag(args, "--harness") ?? readAssignFlag(args, "--agent");
  const plexer = readAssignFlag(args, "--plexer") ?? readAssignFlag(args, "--backend");
  const json = args.includes("--json");

  const settings = currentSettings(services);

  if (harness !== undefined) switchDefault(services, "adapter", harness);
  if (plexer !== undefined) switchDefault(services, "backend", plexer);
  if (harness !== undefined || plexer !== undefined) return;

  // One model row per installed harness: each names models in its own vocabulary,
  // so there is no single "the model" to report.
  const modelRows = settings.enabled.adapters.map((harness) => {
    const resolved = resolveWithSource<string>({ settings: settings.defaults.models[harness], fallback: "(none)" });
    return { key: `model (${harness})`, ...resolved, display: formatValue(resolved.value) };
  });

  interface ProvenanceRow { readonly key: string; readonly value: unknown; readonly source: string; readonly display: string }
  const provenance: ProvenanceRow[] = [];
  // Every declared setting, in the registry's own declaration order. The registry
  // is the single source of truth for a setting, and
  // that includes whether the CLI shows it at all and what it is called. The
  // hand-written switch that used to stand here dropped 23 of the 42 declared
  // keys out of both the table and --json — every retention.*, every workers.*,
  // logging.level, fleet.max_agents_per_pack, locked_commands — and gave two of them a
  // second name. A setting nobody can print is a setting nobody can find.
  for (const spec of SETTINGS_REGISTRY) {
    const configured = spec.read(settings);
    const raw = rawSetting(services.orchDir, ...spec.key.split("."));
    const environment = spec.env === undefined ? undefined : process.env[spec.env];
    const value = environment !== undefined ? envSettingValue(environment, spec.type) : configured ?? null;
    const source = environment !== undefined ? "env" : raw !== undefined ? "settings.json" : "default";
    provenance.push({ key: spec.key, value, source, display: value === null ? "(none)" : displaySetting(value, spec.type) });
  }
  provenance.push(...modelRows);

  const enabledSet = settings.enabled.adapters.length > 0 || settings.enabled.backends.length > 0;
  if (json) {
    const out: Record<string, unknown> = {};
    for (const { key, value, source } of provenance) out[key] = { value, source };
    out.enabled = { value: settings.enabled, source: enabledSet ? "settings.json" : "default" };
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    return;
  }

  const width = Math.max(...provenance.map((row) => row.key.length));
  const valueWidth = Math.max(...provenance.map((row) => row.display.length));
  process.stdout.write(`settings  ${services.settings.file}\n\n`);
  for (const { key, display, source } of provenance) {
    process.stdout.write(`  ${key.padEnd(width)}  ${display.padEnd(valueWidth)}  ${source}\n`);
  }
  process.stdout.write("\n");
  process.stdout.write(`  enabled.adapters  ${settings.enabled.adapters.join(", ") || "(none)"}\n`);
  process.stdout.write(`  enabled.backends  ${settings.enabled.backends.join(", ") || "(none)"}\n`);
  for (const harness of settings.enabled.adapters) {
    // Two lists, never conflated: the quicklist that harness's own picker shows, then the
    // gate its spawns are held to. A model missing from the first is still launchable.
    process.stdout.write(modelListRow("picker", harness, settings.models.preferred[harness] ?? [], "(none)"));
    process.stdout.write(modelListRow("allowed", harness, settings.models.allowed[harness] ?? [], "(all offered)"));
  }
  process.stdout.write(`  hosts               ${Object.keys(settings.hosts).length}\n`);
  process.stdout.write(`  spaces              ${Object.keys(settings.spaces).length}\n`);
  process.stdout.write(`  notify              ${settings.notify.length}\n`);
}

/**
 * Set the thinking effort a launch uses when nothing overrides it.
 *
 * Thinking is its own axis, configurable through orch rather
 * than by hand-editing settings.json, and it applies to any model and any harness.
 * A bare level sets the global default; `--harness=<id>` sets that harness's override,
 * and `--clear` with `--harness` removes it.
 */
export function cmdSettingsThinking(services: Services, args: string[]): void {
  const harnessFlag = args.find((argument) => argument.startsWith("--harness="))?.slice("--harness=".length);
  const clear = args.includes("--clear");
  const level = args.find((argument) => !argument.startsWith("--"));

  if (harnessFlag !== undefined && !isAdapterId(harnessFlag)) {
    throw new Error(`unknown harness ${JSON.stringify(harnessFlag)}; known harnesses: ${ADAPTER_IDS.join(", ")}`);
  }
  if (clear) {
    if (harnessFlag === undefined) throw new Error("--clear needs --harness=<id>: the global default always has a value");
    const current = currentSettings(services).defaults.thinking_by_harness ?? {};
    const byHarness = { ...current };
    delete byHarness[harnessFlag];
    writeRegisteredSetting(services.orchDir, "defaults.thinking_by_harness", byHarness);
    process.stdout.write(`cleared the thinking override for ${harnessFlag}\n`);
    return;
  }
  if (level === undefined) {
    const settings = currentSettings(services);
    process.stdout.write(`thinking  ${settings.defaults.thinking ?? SETTINGS_DEFAULTS.defaults.thinking}\n`);
    for (const [harness, value] of Object.entries(settings.defaults.thinking_by_harness ?? {})) {
      process.stdout.write(`thinking (${harness})  ${String(value)}\n`);
    }
    return;
  }
  if (!isThinkingLevel(level)) {
    throw new Error(`unknown thinking level ${JSON.stringify(level)}; valid levels: ${THINKING_LEVELS.join(", ")}`);
  }
  if (harnessFlag === undefined) {
    writeRegisteredSetting(services.orchDir, "defaults.thinking", level);
    process.stdout.write(`thinking  ${level}\n`);
  } else {
    const current = currentSettings(services).defaults.thinking_by_harness ?? {};
    writeRegisteredSetting(services.orchDir, "defaults.thinking_by_harness", { ...current, [harnessFlag]: level });
    process.stdout.write(`thinking (${harnessFlag})  ${level}\n`);
  }
}
