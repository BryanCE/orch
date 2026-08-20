import * as files from "node:fs";
import { loadConfig, resolveWithSource, settingsPath, writeSettingsAllowedModels, writeSettingsDefault, writeSettingsModels, writeSettingsPreferredModels, type OrchConfig } from "../config.ts";
import { orchDir } from "../presence/store.ts";
import { errorMessage, isRecord } from "../util.ts";
import { readAssignFlag, resolveHarnessModels, validateSetupFlag } from "./setup.ts";
import { ADAPTER_IDS } from "../adapters/adapter.ts";
import { signedOutFix } from "../adapters/prerequisites.ts";
import { BACKEND_IDS } from "../backends/backend.ts";
import { die } from "./target.ts";

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
  let config: OrchConfig;
  try {
    config = loadConfig(orchDir());
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  const installed = config.installed.adapters;
  if (!installed.length) die("no harnesses are installed - run: orch setup");
  const only = readAssignFlag(args, "--harness") ?? readAssignFlag(args, "--agent");
  const targets = only === undefined ? installed : [validateSetupFlag("harness", only, installed)];

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

  // One model row per installed harness: each names models in its own vocabulary,
  // so there is no single "the model" to report.
  const modelRows = config.installed.adapters.map((harness) => ({
    key: `model (${harness})`,
    ...resolveWithSource<string>({ config: config.defaults.models[harness], fallback: "(none)" }),
  }));

  const provenance = [
    { key: "defaults.worktree", ...resolveWithSource<boolean>({ env: "ORCH_WORKTREE", config: rawSetting<boolean>(orchDir(), "defaults", "worktree"), fallback: config.defaults.worktree }) },
    { key: "adapter", ...resolveWithSource<string>({ env: "ORCH_ADAPTER", config: rawSetting<string>(orchDir(), "defaults", "adapter"), fallback: "(none)" }) },
    { key: "backend", ...resolveWithSource<string>({ env: "ORCH_BACKEND", config: rawSetting<string>(orchDir(), "defaults", "backend"), fallback: "(auto)" }) },
    { key: "daemon.tcp_port", ...resolveWithSource<number>({ env: "ORCH_DAEMON_PORT", config: rawSetting<number>(orchDir(), "daemon", "tcp_port"), fallback: config.daemon.tcp_port }) },
    { key: "fleet.spawn_cap", ...resolveWithSource<number>({ env: "ORCH_SPAWN_CAP", config: rawSetting<number>(orchDir(), "fleet", "spawn_cap"), fallback: config.fleet.spawn_cap }) },
    { key: "fleet.max_agents", ...resolveWithSource<number | string>({ config: rawSetting<number>(orchDir(), "fleet", "max_agents"), fallback: config.fleet.max_agents ?? "(none)" }) },
    { key: "fleet.workspace_caps", ...resolveWithSource<Record<string, number>>({ config: rawSetting<Record<string, number>>(orchDir(), "fleet", "workspace_caps"), fallback: config.fleet.workspace_caps }) },
    { key: "fleet.worker_peer_tools", ...resolveWithSource<boolean>({ config: rawSetting<boolean>(orchDir(), "fleet", "worker_peer_tools"), fallback: config.fleet.worker_peer_tools }) },
    { key: "fleet.cross_workspace", ...resolveWithSource<boolean>({ config: rawSetting<boolean>(orchDir(), "fleet", "cross_workspace"), fallback: config.fleet.cross_workspace }) },
    { key: "queue.max_retries", ...resolveWithSource<number>({ config: rawSetting<number>(orchDir(), "queue", "max_retries"), fallback: config.queue.max_retries }) },
    { key: "tiling.first_split", ...resolveWithSource<string>({ config: rawSetting<string>(orchDir(), "tiling", "first_split"), fallback: config.tiling.first_split }) },
    { key: "timeouts.dispatch_ack_ms", ...resolveWithSource<number>({ config: rawSetting<number>(orchDir(), "timeouts", "dispatch_ack_ms"), fallback: config.timeouts.dispatch_ack_ms }) },
    { key: "timeouts.wait_ms", ...resolveWithSource<number>({ config: rawSetting<number>(orchDir(), "timeouts", "wait_ms"), fallback: config.timeouts.wait_ms }) },
    { key: "timeouts.adapter_command_ms", ...resolveWithSource<number>({ config: rawSetting<number>(orchDir(), "timeouts", "adapter_command_ms"), fallback: config.timeouts.adapter_command_ms }) },
    { key: "timeouts.notify_ms", ...resolveWithSource<number>({ config: rawSetting<number>(orchDir(), "timeouts", "notify_ms"), fallback: config.timeouts.notify_ms }) },
    ...modelRows,
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
  const valueWidth = Math.max(...provenance.map((row) => formatValue(row.value).length));
  process.stdout.write(`settings  ${settingsPath(orchDir())}\n\n`);
  for (const { key, value, source } of provenance) {
    process.stdout.write(`  ${key.padEnd(width)}  ${formatValue(value).padEnd(valueWidth)}  ${source}\n`);
  }
  process.stdout.write("\n");
  process.stdout.write(`  installed.adapters  ${config.installed.adapters.join(", ") || "(none)"}\n`);
  process.stdout.write(`  installed.backends  ${config.installed.backends.join(", ") || "(none)"}\n`);
  for (const harness of config.installed.adapters) {
    // Two lists, never conflated: the quicklist that harness's own picker shows, then the
    // gate its spawns are held to. A model missing from the first is still launchable.
    process.stdout.write(modelListRow("picker", harness, config.models.preferred[harness] ?? [], "(none)"));
    process.stdout.write(modelListRow("allowed", harness, config.models.allowed[harness] ?? [], "(all offered)"));
  }
  process.stdout.write(`  hosts               ${Object.keys(config.hosts).length}\n`);
  process.stdout.write(`  workspaces          ${Object.keys(config.workspaces).length}\n`);
  process.stdout.write(`  notify              ${config.notify.length}\n`);
}
