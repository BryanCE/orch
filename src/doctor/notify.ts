import * as filesystem from "node:fs";
import * as path from "node:path";
import { loadConfigOrNull, NOTIFY_DEFAULT_ON } from "../config.ts";
import { createNotifierRegistry } from "../notify/router.ts";
import { allBackends } from "../backends/registry.ts";
import { binaryOnPath, errorMessage, packageRoot } from "../util.ts";
import { notifierRemediation } from "../notify/remediation.ts";
import type { BinaryStatus, CheckResult } from "../types/doctor.ts";
import type { NotifyEntry } from "../types/config.ts";

export function checkNotifications(_bins: BinaryStatus): CheckResult {
  if (allBackends().some((backend) => backend.isAvailable() && backend.isInsideSession())) {
    return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "native backend notification tier is available" };
  }
  if (binaryOnPath("notify-send")) return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "notify-send tier is available" };
  if (binaryOnPath("wsl-notify-send")) return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "wsl-notify-send tier is available" };
  const toast = path.join(packageRoot(), "scripts", "wsl-toast.ps1");
  if (binaryOnPath("powershell.exe") && filesystem.existsSync(toast)) {
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
    return { id, label, status: "fail", detail: errorMessage(error) };
  }
  if (!configured.length) return { id, label, status: "ok", detail: "no notifiers configured" };

  const registry = createNotifierRegistry();
  const failures: string[] = [];
  const warnings: string[] = [];
  for (const [index, entry] of configured.entries()) {
    const number = index + 1;
    const adapter = entry.id;
    const effectiveOn = entry.on ?? NOTIFY_DEFAULT_ON;
    if (!effectiveOn.includes("done")) {
      warnings.push(`${adapter}: effective "on" list omits "done"; fix: orch settings notify add ${adapter} --on=blocked,error,done`);
    }
    const errors = registry.validate(entry);
    if (errors.length) {
      failures.push(`${adapter || `notifier #${number}`}: ${errors.join(", ")}; fix: add ${errors.map((error) => {
        const field = /requires (\\w+)$/.exec(error)?.[1] ?? "the required field";
        return `${field} = \"...\"`;
      }).join(", ")} to [[notify]]`);
      continue;
    }
    const result = await registry.reachable(entry);
    if (!result.available) {
      const remediation = notifierRemediation(adapter, entry, registry.notifierFor(entry)?.remediation);
      failures.push(`${adapter || `notifier #${number}`}: ${result.reason ?? result.error ?? "unavailable"}; ${remediation}`);
    }
  }

  if (failures.length) return { id, label, status: "fail", detail: failures.join("; ") };
  if (warnings.length) return { id, label, status: "warn", detail: warnings.join("; ") };
  return { id, label, status: "ok", detail: `${configured.length} configured notifier${configured.length === 1 ? "" : "s"} are available` };
}

export function checkNotifySinks(orchDir: string, bins: BinaryStatus): CheckResult {
  const id = "notify-sinks";
  const label = "Notification sinks";
  const sinks = loadConfigOrNull(orchDir)?.notify ?? [];
  if (!sinks.length) return { id, label, status: "ok", detail: "no notify sinks configured" };

  const desktop = checkNotifications(bins);
  const unavailable: string[] = [];
  sinks.forEach((sink, index) => {
    const name = `${sink.id} sink #${index + 1}`;
    if (sink.id === "webhook") {
      try {
        const url = new URL(String(sink.url));
        if (url.protocol !== "http:" && url.protocol !== "https:") unavailable.push(`${name} URL is not http/https`);
      } catch {
        unavailable.push(`${name} URL is not well-formed`);
      }
    } else if (sink.id === "command") {
      const normalized = typeof sink.command === "string" ? ["sh", "-c", sink.command] : sink.command;
      const binary = Array.isArray(normalized) && typeof normalized[0] === "string" ? normalized[0] : undefined;
      if (!binary || !binaryOnPath(binary)) unavailable.push(`${name} binary ${JSON.stringify(binary ?? "")} is not on PATH`);
    } else if (desktop.status !== "ok") {
      unavailable.push(`${name} has no available desktop notification tier`);
    }
  });

  return unavailable.length
    ? { id, label, status: "warn", detail: `undeliverable: ${unavailable.join("; ")}` }
    : { id, label, status: "ok", detail: `${sinks.length} configured sink${sinks.length === 1 ? "" : "s"} look deliverable` };
}
