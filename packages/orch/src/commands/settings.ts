import * as files from "node:fs";
import { resolveWithSource } from "../settings/read.ts";
import { NOTIFY_DEFAULT_ON, settingsPath, SETTINGS_DEFAULTS } from "../settings/schema.ts";
import { displaySetting, displayValue } from "../settings/display.ts";
import { NOTIFY_STATES } from "../types/settings.ts";
import { buildSelectedNotifyEntries, probeNotifiers } from "../setup/notifiers.ts";
import { describeSkillPlacement, installSkills } from "../setup/skills.ts";
import { errorMessage, isRecord } from "../util.ts";
import { validateSetupFlag } from "../setup/flags.ts";
import { parseCommand } from "./registry.ts";
import type { Invocation, ParsedFlags } from "../cli/spec.ts";
import { resolveHarnessModels } from "../setup/composition.ts";
import { refreshAdapterCatalogues } from "../adapters/registry.ts";
import { isAdapterId } from "../adapters/adapter.ts";
import { ADAPTER_IDS } from "../types/adapter.ts";
import { signedOutFix } from "../adapters/prerequisites.ts";
import { BACKEND_IDS } from "../types/backend.ts";
import { isThinkingLevel } from "../policy/thinking.ts";
import { THINKING_LEVELS } from "../types/policy.ts";
import { die } from "./target.ts";
import { selfIdentity } from "../identity/self.ts";
import { AGENT_SETTINGS_GRANT, agentMayWriteSetting, agentSettingRefusal, withAgentGrant } from "../policy/agent-settings.ts";
import { nearestKeys } from "../settings/nearest.ts";
import { SETTINGS_REGISTRY, writeNotifyEntries, writeRegisteredSetting } from "../settings/registry.ts";
import { parseSettingValue } from "../settings/parse.ts";
import { runSettingsEditor } from "../settings/shell/index.ts";
import type { NotifierChoice } from "../types/notify.ts";
import type { NotifyEntry, NotifyState, OrchSettings, SettingKind, SettingSpec } from "../types/settings.ts";
import type { Services } from "../types/services.ts";
import type { OrchDir } from "../types/core.ts";

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
function rawSetting(orchDirPath: OrchDir, ...keys: string[]): unknown {
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

/** A REGISTERED caller (a spawned agent or a harness session) writes only what
 *  `agents.writable_settings` grants. An UNREGISTERED caller is the human. */
function refuseUngrantedAgentWrite(services: Pick<Services, "settings" | "orchDir">, key: string): void {
  if (selfIdentity(services.orchDir) === null) return;
  const settings = currentSettings(services);
  if (!agentMayWriteSetting(settings, key)) die(agentSettingRefusal(settings, key));
}

/** The registry entry for `key`, or an exit that names the nearest real keys. */
function writableSpec(key: string): SettingSpec {
  const spec = SETTINGS_REGISTRY.find((setting) => setting.key === key);
  if (spec === undefined) die(`Unknown setting ${JSON.stringify(key)}. Nearest valid keys: ${nearestSettingKeys(key)}.`);
  if (spec.write === undefined) die(`${key} is read-only; edit it with orch setup.`);
  return spec;
}

/** `orch settings grant <key>` / `revoke <key>`: flip whether an agent may write one setting. */
function grantSetting(services: Pick<Services, "settings" | "orchDir">, { positional }: Invocation, granted: boolean): void {
  const verb = granted ? "grant" : "revoke";
  const key = positional[0];
  if (key === undefined || positional.length !== 1) die(`usage: orch settings ${verb} <key>`);
  writableSpec(key);
  if (key === AGENT_SETTINGS_GRANT) die(`${key} never grants itself.`);
  refuseUngrantedAgentWrite(services, AGENT_SETTINGS_GRANT);
  const keys = withAgentGrant(currentSettings(services), key, granted);
  try { writeRegisteredSetting(services.settings, AGENT_SETTINGS_GRANT, keys); } catch (error: unknown) { die(errorMessage(error)); }
  process.stdout.write(`agents may write: ${keys.length ? keys.join(", ") : "(none)"}\n`);
}

function setSingleSetting(services: Pick<Services, "settings" | "orchDir">, key: string, input: string): void {
  const spec = writableSpec(key);
  refuseUngrantedAgentWrite(services, key);
  if (spec.env !== undefined && process.env[spec.env] !== undefined) {
    die(`${key} is overridden by ${spec.env}; remove the override before writing it.`);
  }
  const parsed = parseSettingValue(spec, input);
  if (!parsed.ok) die(`${key}: ${parsed.reason}.`);
  try { writeRegisteredSetting(services.settings, key, parsed.value); } catch (error: unknown) { die(errorMessage(error)); }
  process.stdout.write(`${key} = ${formatValue(parsed.value)}\n`);
}

function switchDefault(services: Pick<Services, "settings">, key: "adapter" | "backend", value: string): void {
  try {
    if (key === "adapter") writeRegisteredSetting(services.settings, "defaults.adapter", validateSetupFlag(key, value, ADAPTER_IDS));
    else writeRegisteredSetting(services.settings, "defaults.backend", validateSetupFlag(key, value, BACKEND_IDS));
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
async function settingsModels(services: Services, { flags }: Invocation): Promise<void> {
  const settings = currentSettings(services);
  const enabled = settings.enabled.adapters;
  if (!enabled.length) die("no harnesses are installed - run: orch setup");
  const only = flags.value("--harness");
  const targets = only === undefined ? enabled : [validateSetupFlag("harness", only, enabled)];

  // Catalogues are stored and refreshed on a cycle, so an operator who just installed a model
  // needs a way to say "ask again now" rather than picking from yesterday's list.
  if (flags.has("--refresh")) await refreshAdapterCatalogues(services.models);
  const chosen = await resolveHarnessModels(settings, services.models, flags.value("--model"), targets, process.stdout.isTTY === true);
  if (chosen === null) return;
  // Only the targeted harnesses were prompted, so each map merges over what is already
  // recorded; a harness this run never asked about keeps every list it had.
  writeRegisteredSetting(services.settings, "defaults.models", { ...settings.defaults.models, ...chosen.defaults });
  writeRegisteredSetting(services.settings, "models.preferred", { ...settings.models.preferred, ...chosen.preferred });
  writeRegisteredSetting(services.settings, "models.allowed", { ...settings.models.allowed, ...chosen.allowed });
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

function readSkillsFlags(flags: ParsedFlags): { readonly storeFlag: string | undefined; readonly install: boolean | undefined; readonly link: string[] | undefined } {
  const storeFlag = flags.value("--store");
  const linkFlag = flags.value("--link");
  const install = flags.has("--install") ? true : flags.has("--no-install") ? false : undefined;
  const link = linkFlag?.split(",").map((root) => root.trim()).filter(Boolean);
  if (install === undefined && storeFlag === undefined && link === undefined) {
    die("usage: orch settings skills [--install|--no-install] [--store=<dir>] [--link=<dir>[,<dir>...]]");
  }
  if (storeFlag !== undefined && !storeFlag.trim()) die("--store needs a directory.");
  if (linkFlag !== undefined && !link?.length) die("--link needs at least one directory.");
  return { storeFlag, install, link };
}

function writeSkillsSettings(services: Services, install: boolean | undefined, storeFlag: string | undefined, link: string[] | undefined): { readonly wanted: boolean; readonly roots: { readonly store: string; readonly link: string[] } } {
  const current = currentSettings(services).skills;
  const wanted = install ?? current.install;
  writeRegisteredSetting(services.settings, "skills.install", wanted);
  if (storeFlag !== undefined) writeRegisteredSetting(services.settings, "skills.store", storeFlag.trim());
  if (link !== undefined) writeRegisteredSetting(services.settings, "skills.link", link);
  const roots = { store: storeFlag?.trim() ?? current.store, link: link ?? current.link };
  return { wanted, roots };
}

function printInstalledSkills(wanted: boolean, roots: { readonly store: string; readonly link: string[] }): void {
  process.stdout.write(
    `skills.install = ${wanted}\nskills.store   = ${roots.store}\nskills.link    = ${roots.link.join(", ")}\n`,
  );
  if (!wanted) return;
  for (const placed of installSkills(roots)) process.stdout.write(`  ${describeSkillPlacement(placed)}\n`);
}

/**
 * Turn skill installation on or off, and re-point the store or the harness links.
 * `--install` writes every packaged skill straight away, so the setting and what is on
 * disk never disagree; `--no-install` records the refusal and leaves whatever the user
 * has there alone, since those files are theirs to remove.
 */
function settingsSkills(services: Services, { flags }: Invocation): void {
  const { storeFlag, install, link } = readSkillsFlags(flags);
  const { wanted, roots } = writeSkillsSettings(services, install, storeFlag, link);
  printInstalledSkills(wanted, roots);
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
function rejectUndeclaredFlags(given: ReadonlyMap<string, string | true>, fields: NotifierChoice["requiredFields"]): void {
  const declared = fields.map((field) => `--${field.name}`);
  const undeclared = [...given.keys()].filter((name) => !declared.includes(name));
  if (undeclared.length) die(`Unknown flag ${undeclared.join(", ")}. This sink takes: ${["--on", ...declared].join(" ")}.`);
}

/** The value of one sink field flag, or undefined when it was not given. A bare flag is no value. */
function sinkFieldValue(given: ReadonlyMap<string, string | true>, name: string): string | undefined {
  const held = given.get(`--${name}`);
  return held === true ? undefined : held;
}

/** Read `--on=<state,...>` as the states this sink fires on, or exit naming the supported set. */
function readNotifyStates(flag: string | undefined): NotifyState[] | undefined {
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
async function addNotifyEntry(services: Services, { flags, positional, undeclared }: Invocation): Promise<void> {
  const id = positional[0];
  if (id === undefined || positional.length !== 1) die(NOTIFY_USAGE);
  const choices = await probeNotifiers(currentSettings(services));
  const choice = choices.find((notifier) => notifier.id === id);
  if (!choice) die(`Unknown notify sink "${id}". Supported: ${choices.map((notifier) => notifier.id).join(", ")}.`);
  rejectUndeclaredFlags(undeclared, choice.requiredFields);

  const recorded = currentSettings(services).notify.find((entry) => entry.id === id);
  const recordedFields: Record<string, unknown> = {};
  if (recorded !== undefined) {
    for (const [key, value] of Object.entries(recorded)) recordedFields[key] = value;
  }
  const config = {
    ...pickDeclaredFields(choice.requiredFields, (name) => recordedFields[name]),
    ...pickDeclaredFields(choice.requiredFields, (name) => sinkFieldValue(undeclared, name)),
    on: readNotifyStates(flags.value("--on")) ?? recorded?.on,
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
  writeNotifyEntries(services.settings, merged);
  process.stdout.write(`notify  ${services.settings.file}\n\n`);
  for (const entry of written.entries) process.stdout.write(notifyEntryRow(entry));
  if (!choice.available) process.stdout.write(`\n  ${choice.remediation}\n`);
  process.stdout.write("\nverify delivery with: orch doctor\n");
}

function removeNotifyEntry(services: Services, { positional }: Invocation): void {
  const id = positional[0];
  if (id === undefined || positional.length !== 1) die(NOTIFY_USAGE);
  const configured = currentSettings(services).notify;
  const entry = configured.find((candidate) => candidate.id === id);
  if (!entry) die(`No "${id}" notify sink is configured. Configured: ${configured.map((candidate) => candidate.id).join(", ") || "(none)"}.`);
  writeNotifyEntries(services.settings, configured.filter((candidate) => candidate.id !== entry.id));
  process.stdout.write(`removed notify sink ${id} from ${services.settings.file}\n`);
}

/** List, add, or remove the settings.json `notify` sinks the daemon delivers through. */
async function settingsNotify(services: Services, invocation: Invocation): Promise<void> {
  switch (invocation.command.name) {
    case "add": return addNotifyEntry(services, invocation);
    case "remove": return removeNotifyEntry(services, invocation);
    default:
      if (invocation.positional.length) die(NOTIFY_USAGE);
      printNotifyEntries(services, invocation.flags.has("--json"));
  }
}

async function launchSettingsEditor(services: Services): Promise<void> {
  try {
    await runSettingsEditor(services.settings);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

function switchSettingsDefaults(services: Pick<Services, "settings">, harness: string | undefined, plexer: string | undefined): boolean {
  if (harness !== undefined) switchDefault(services, "adapter", harness);
  if (plexer !== undefined) switchDefault(services, "backend", plexer);
  if (harness !== undefined || plexer !== undefined) return true;
  return false;
}

interface ProvenanceRow {
  readonly key: string;
  readonly value: unknown;
  readonly source: string;
  readonly display: string;
  /** Whether `agents.writable_settings` lets an agent write this key. */
  readonly agentWritable: boolean;
}

function collectSettingsProvenance(services: Pick<Services, "orchDir">, settings: OrchSettings): ProvenanceRow[] {
  // One model row per installed harness: each names models in its own vocabulary,
  // so there is no single "the model" to report.
  const modelRows = settings.enabled.adapters.map((harness) => {
    const resolved = resolveWithSource<string>({ settings: settings.defaults.models[harness], fallback: "(none)" });
    return { key: `model (${harness})`, ...resolved, display: formatValue(resolved.value), agentWritable: false };
  });

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
  return provenance;
}

function printSettingsOutput(services: Pick<Services, "settings">, settings: OrchSettings, provenance: readonly ProvenanceRow[], json: boolean): void {
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

/** Print each resolvable setting with its winning source, set one, or switch the active default via --harness/--plexer. */
function settingsRoot(services: Services, { flags, positional }: Invocation): void {
  const [key, input] = positional;
  if (key !== undefined && input !== undefined && positional.length === 2) return setSingleSetting(services, key, input);
  if (positional.length) die("usage: orch settings [<key> <value>] [--json] [--harness <id>] [--plexer <id>]");
  const settings = currentSettings(services);
  if (switchSettingsDefaults(services, flags.value("--harness"), flags.value("--plexer"))) return;
  const provenance = collectSettingsProvenance(services, settings);
  printSettingsOutput(services, settings, provenance, flags.has("--json"));
}

/** `orch settings` and every subcommand under it. A bare call on a TTY opens the editor. */
export async function cmdSettings(services: Services, args: string[]): Promise<void> {
  if (shouldLaunchSettingsEditor(args)) return launchSettingsEditor(services);
  const invocation = parseCommand("settings", args);
  switch (invocation.path[1]) {
    case "models": return settingsModels(services, invocation);
    case "thinking": return settingsThinking(services, invocation);
    case "skills": return settingsSkills(services, invocation);
    case "notify": return settingsNotify(services, invocation);
    default: return settingsRoot(services, invocation);
  }
}

/**
 * Set the thinking effort a launch uses when nothing overrides it.
 *
 * Thinking is its own axis, configurable through orch rather
 * than by hand-editing settings.json, and it applies to any model and any harness.
 * A bare level sets the global default; `--harness=<id>` sets that harness's override,
 * and `--clear` with `--harness` removes it.
 */
function settingsThinking(services: Services, { flags, positional }: Invocation): void {
  const harnessFlag = flags.value("--harness");
  const clear = flags.has("--clear");
  const level = positional[0];
  if (positional.length > 1) die("usage: orch settings thinking [<level>] [--harness <id>] [--clear]");

  if (harnessFlag !== undefined && !isAdapterId(harnessFlag)) {
    throw new Error(`unknown harness ${JSON.stringify(harnessFlag)}; known harnesses: ${ADAPTER_IDS.join(", ")}`);
  }
  if (clear) {
    if (harnessFlag === undefined) throw new Error("--clear needs --harness=<id>: the global default always has a value");
    const current = currentSettings(services).defaults.thinking_by_harness ?? {};
    const byHarness = { ...current };
    delete byHarness[harnessFlag];
    writeRegisteredSetting(services.settings, "defaults.thinking_by_harness", byHarness);
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
    writeRegisteredSetting(services.settings, "defaults.thinking", level);
    process.stdout.write(`thinking  ${level}\n`);
  } else {
    const current = currentSettings(services).defaults.thinking_by_harness ?? {};
    writeRegisteredSetting(services.settings, "defaults.thinking_by_harness", { ...current, [harnessFlag]: level });
    process.stdout.write(`thinking (${harnessFlag})  ${level}\n`);
  }
}
