import * as filesystem from "node:fs";
import * as path from "node:path";
import { loadConfigOrNull, type NotifyEntry } from "../config.ts";
import { createNotifierRegistry, loadSinks, type Sink } from "../notify/router.ts";
import { allBackends } from "../backends/registry.ts";
import type { CheckResult } from "../check-result.ts";
import type { BinaryStatus } from "./bins.ts";
import { isWslRuntime, onPath, repoDir } from "./shared.ts";

export function checkNotifications(_bins: BinaryStatus): CheckResult {
  if (allBackends().some((backend) => backend.isAvailable() && backend.isInsideSession())) {
    return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "native backend notification tier is available" };
  }
  if (onPath("notify-send")) return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "notify-send tier is available" };
  if (onPath("wsl-notify-send")) return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "wsl-notify-send tier is available" };
  const toast = path.join(repoDir, "scripts", "wsl-toast.ps1");
  if (onPath("powershell.exe") && filesystem.existsSync(toast)) {
    return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "powershell.exe toast tier is available" };
  }
  return { id: "notifications", label: "Desktop notifications", status: "warn", detail: "no desktop notification tier is available" };
}

/** Validate configured notifier entries and probe each adapter in isolation. */
export async function checkNotifiers(orchDir: string): Promise<CheckResult> {
  const id = "notifiers";
  const label = "Notifiers";
  let configured: NotifyEntry[];
  try {
    // An install with no settings.json has no notifiers, which is a healthy state to report.
    // Only a settings.json that exists and is malformed is a failure worth naming here.
    configured = loadConfigOrNull(orchDir)?.notify ?? [];
  } catch (error: unknown) {
    return { id, label, status: "fail", detail: error instanceof Error ? error.message : String(error) };
  }
  if (!configured.length) return { id, label, status: "ok", detail: "no notifiers configured" };

  const registry = createNotifierRegistry();
  const failures: string[] = [];
  for (const [index, entry] of configured.entries()) {
    const number = index + 1;
    const adapter = entry.id;
    const config: Record<string, unknown> = { ...entry };
    delete config.id;
    delete config.on;
    if (adapter === "command" && typeof config.command === "string") {
      config.command = ["sh", "-c", config.command];
    }
    const errors = registry.validate(adapter, config);
    if (errors.length) {
      failures.push(`${adapter || `notifier #${number}`}: ${errors.join(", ")}; fix: add ${errors.map((error) => {
        const field = /requires (\\w+)$/.exec(error)?.[1] ?? "the required field";
        return `${field} = \"...\"`;
      }).join(", ")} to [[notify]]`);
      continue;
    }
    const result = await registry.probe(adapter, config);
    if (!result.available) {
      let remediation = "fix: verify the adapter installation and configuration";
      if (adapter === "desktop") {
        remediation = isWslRuntime()
          ? "fix: install notify-send (`sudo apt install libnotify-bin`) or ensure powershell.exe and wslpath are reachable"
          : "fix: install notify-send (`sudo apt install libnotify-bin`)";
      } else if (adapter === "command") {
        const command = Array.isArray(config.command) && typeof config.command[0] === "string" ? config.command[0] : "the command";
        remediation = `fix: install ${command} (for example: sudo apt install ${command})`;
      }
      failures.push(`${adapter || `notifier #${number}`}: ${result.reason ?? result.error ?? "unavailable"}; ${remediation}`);
    }
  }

  return failures.length
    ? { id, label, status: "fail", detail: failures.join("; ") }
    : { id, label, status: "ok", detail: `${configured.length} configured notifier${configured.length === 1 ? "" : "s"} are available` };
}

export function checkNotifySinks(orchDir: string, bins: BinaryStatus): CheckResult {
  const id = "notify-sinks";
  const label = "Notification sinks";
  const sinks = loadSinks(orchDir);
  if (!sinks.length) return { id, label, status: "ok", detail: "no notify sinks configured" };

  const desktop = checkNotifications(bins);
  const unavailable: string[] = [];
  sinks.forEach((sink: Sink, index) => {
    const name = `${sink.type} sink #${index + 1}`;
    if (sink.type === "webhook") {
      try {
        const url = new URL(String(sink.url));
        if (url.protocol !== "http:" && url.protocol !== "https:") unavailable.push(`${name} URL is not http/https`);
      } catch {
        unavailable.push(`${name} URL is not well-formed`);
      }
    } else if (sink.type === "command") {
      const command = (sink as { command?: unknown }).command;
      const normalized = typeof command === "string" ? ["sh", "-c", command] : command;
      const binary = Array.isArray(normalized) && typeof normalized[0] === "string" ? normalized[0] : undefined;
      if (!binary || !onPath(binary)) unavailable.push(`${name} binary ${JSON.stringify(binary ?? "")} is not on PATH`);
    } else if (desktop.status !== "ok") {
      unavailable.push(`${name} has no available desktop notification tier`);
    }
  });

  return unavailable.length
    ? { id, label, status: "warn", detail: `undeliverable: ${unavailable.join("; ")}` }
    : { id, label, status: "ok", detail: `${sinks.length} configured sink${sinks.length === 1 ? "" : "s"} look deliverable` };
}
