import * as files from "node:fs";
import { loadConfig, resolveWithSource, settingsPath, writeSettingsDefault, type OrchConfig } from "../config.ts";
import { orchDir } from "../presence/store.ts";
import { errorMessage, isRecord } from "../util.ts";
import { readAssignFlag } from "./setup.ts";
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
function switchDefault(key: "adapter" | "backend", value: string): void {
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
    { key: "defaults.worktree", ...resolveWithSource<boolean>({ env: "ORCH_WORKTREE", config: rawSetting<boolean>(orchDir(), "defaults", "worktree"), fallback: config.defaults.worktree }) },
    { key: "defaults.adapter", ...resolveWithSource<string>({ env: "ORCH_ADAPTER", config: rawSetting<string>(orchDir(), "defaults", "adapter"), fallback: "(none)" }) },
    { key: "defaults.backend", ...resolveWithSource<string>({ env: "ORCH_BACKEND", config: rawSetting<string>(orchDir(), "defaults", "backend"), fallback: "(auto)" }) },
    { key: "defaults.model", ...resolveWithSource<string>({ env: "ORCH_MODEL", config: rawSetting<string>(orchDir(), "defaults", "model"), fallback: "(none)" }) },
    { key: "fleet.spawn_cap", ...resolveWithSource<number>({ env: "ORCH_SPAWN_CAP", config: rawSetting<number>(orchDir(), "fleet", "spawn_cap"), fallback: config.fleet.spawn_cap }) },
    { key: "fleet.max_agents", ...resolveWithSource<number | string>({ config: rawSetting<number>(orchDir(), "fleet", "max_agents"), fallback: config.fleet.max_agents ?? "(none)" }) },
    { key: "fleet.workspace_caps", ...resolveWithSource<Record<string, number>>({ config: rawSetting<Record<string, number>>(orchDir(), "fleet", "workspace_caps"), fallback: config.fleet.workspace_caps }) },
    { key: "fleet.worker_peer_tools", ...resolveWithSource<boolean>({ config: rawSetting<boolean>(orchDir(), "fleet", "worker_peer_tools"), fallback: config.fleet.worker_peer_tools }) },
    { key: "fleet.cross_workspace", ...resolveWithSource<boolean>({ config: rawSetting<boolean>(orchDir(), "fleet", "cross_workspace"), fallback: config.fleet.cross_workspace }) },
    { key: "queue.max_retries", ...resolveWithSource<number>({ config: rawSetting<number>(orchDir(), "queue", "max_retries"), fallback: config.queue.max_retries }) },
    { key: "timeouts.dispatch_ack_ms", ...resolveWithSource<number>({ config: rawSetting<number>(orchDir(), "timeouts", "dispatch_ack_ms"), fallback: config.timeouts.dispatch_ack_ms }) },
    { key: "timeouts.wait_ms", ...resolveWithSource<number>({ config: rawSetting<number>(orchDir(), "timeouts", "wait_ms"), fallback: config.timeouts.wait_ms }) },
    { key: "timeouts.adapter_command_ms", ...resolveWithSource<number>({ config: rawSetting<number>(orchDir(), "timeouts", "adapter_command_ms"), fallback: config.timeouts.adapter_command_ms }) },
    { key: "timeouts.notify_ms", ...resolveWithSource<number>({ config: rawSetting<number>(orchDir(), "timeouts", "notify_ms"), fallback: config.timeouts.notify_ms }) },
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
