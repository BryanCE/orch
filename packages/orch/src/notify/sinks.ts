// The backend-owned sink-provider registry plus orch's builtin sink notifiers.
// Backends register here at import time, so this file must never import the
// router — router.ts composes these builtins at its own module init, and an
// import back into it would strand a provider in a half-initialized registry.
import { spawn, execFile } from "node:child_process";
import * as filesystem from "node:fs";
import * as path from "node:path";
import { packageRoot } from "../util.ts";
import { hostOs } from "../host.ts";
import { SETTINGS_DEFAULTS } from "../settings/schema.ts";
import { notificationText, payload } from "./format.ts";
import { playDing, soundAvailable } from "./ding.ts";
import type { Notifier, NotifyEvent } from "../types/notify.ts";
import type { HostOs } from "../types/host.ts";

const registeredNotifiers = new Map<string, Notifier>();

export function registerNotifier(notifier: Notifier): void { registeredNotifiers.set(notifier.id, notifier); }
export function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) return null;
  return value;
}

function commandOnPath(command: string): boolean {
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (dir && filesystem.existsSync(path.join(dir, command))) return true;
  }
  return false;
}

function run(command: string[], stdin?: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const proc = spawn(command[0]!, command.slice(1), {
        stdio: [stdin === undefined ? "ignore" : "pipe", "ignore", "ignore"],
      });
      proc.on("error", () => resolve(false));
      proc.on("close", (code) => resolve(code === 0));
      if (stdin !== undefined && proc.stdin) {
        proc.stdin.write(stdin);
        proc.stdin.end();
      }
    } catch {
      resolve(false);
    }
  });
}

function toastScript(): string {
  return path.join(packageRoot(), "scripts", "wsl-toast.ps1");
}

async function windowsToast(title: string, body: string): Promise<boolean> {
  const script = toastScript();
  try {
    const windowsPath = await new Promise<string>((resolve) => {
      execFile("wslpath", ["-w", script], { encoding: "utf8" }, (error, stdout) => {
        resolve(error ? "" : stdout.trim());
      });
    });
    if (!windowsPath) return false;
    return await run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", windowsPath, "-Title", title, "-Body", body]);
  } catch {
    return false;
  }
}

/** One way to show a desktop notification on this host. */
export interface DesktopTier {
  readonly name: string;
  readonly available: () => boolean;
  readonly deliver: (title: string, body: string) => Promise<boolean>;
}

/** The title and body arrive as `argv`, so no AppleScript quoting can break. */
const APPLESCRIPT_NOTIFY = ["-e", "on run argv", "-e", "display notification (item 2 of argv) with title (item 1 of argv)", "-e", "end run"];

/** Tried in order; delivery falls through to the next tier when one fails. */
const DESKTOP_TIERS: readonly DesktopTier[] = [
  { name: "notify-send", available: () => commandOnPath("notify-send"), deliver: (title, body) => run(["notify-send", title, body]) },
  { name: "wsl-notify-send", available: () => commandOnPath("wsl-notify-send"), deliver: (title, body) => run(["wsl-notify-send", title, body]) },
  { name: "osascript", available: () => commandOnPath("osascript"), deliver: (title, body) => run(["osascript", ...APPLESCRIPT_NOTIFY, title, body]) },
  {
    name: "powershell.exe toast",
    available: () => commandOnPath("powershell.exe") && commandOnPath("wslpath") && filesystem.existsSync(toastScript()),
    deliver: windowsToast,
  },
];

/** The first desktop tier this host can use, or undefined when it has none. */
export function desktopTier(): DesktopTier | undefined {
  return DESKTOP_TIERS.find((tier) => tier.available());
}

async function deliverDesktop(event: NotifyEvent): Promise<boolean> {
  const { title, body } = notificationText(event);
  for (const tier of DESKTOP_TIERS) {
    if (tier.available() && await tier.deliver(title, body)) return true;
  }
  return false;
}

export function commandAvailable(config: Record<string, unknown>): boolean {
  const command = stringArray(config.command);
  return !!command?.[0] && (command[0].includes(path.sep) ? filesystem.existsSync(command[0]) : commandOnPath(command[0]));
}

/** The single place the command sink knows an OS apart - `sh` is not a Windows program. */
const HOST_SHELL: Record<HostOs, readonly [string, ...string[]]> = {
  linux: ["sh", "-c"],
  darwin: ["sh", "-c"],
  windows: ["cmd.exe", "/d", "/s", "/c"],
};

export function hostShell(): readonly [string, ...string[]] {
  return HOST_SHELL[hostOs()];
}

/** A configured command as argv. Delivery and doctor both normalize here. */
export function commandArgv(command: string | readonly string[]): string[] {
  return typeof command === "string" ? [...hostShell(), command] : [...command];
}

/** Built-in host integrations. Delivery always uses the canonical formatter above. */
export function createBuiltinNotifiers(): Notifier[] {
  return [
    ...registeredNotifiers.values(),
    {
      id: "desktop",
      label: "Desktop",
      metadata: { description: "Desktop notifications on Linux, macOS and WSL", requiredConfig: [] },
      available: () => desktopTier() !== undefined,
      deliver: (event, _config) => deliverDesktop(event),
    },
    {
      id: "webhook",
      label: "Webhook",
      metadata: { description: "HTTP POST notification", requiredConfig: [{ name: "url", label: "Webhook URL" }] },
      available: (_settings) => typeof fetch === "function",
      deliver: async (event, config, settings) => {
        if (typeof config.url !== "string" || !config.url) return false;
        const response = await fetch(config.url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload(event),
          signal: AbortSignal.timeout((settings ?? SETTINGS_DEFAULTS).timeouts.notify_ms),
        });
        return response.ok;
      },
    },
    {
      id: "sound",
      label: "Sound",
      metadata: { description: "Play a notification sound on this machine", requiredConfig: [] },
      available: () => soundAvailable(),
      deliver: (_event, _config) => playDing(),
    },
    {
      id: "command",
      label: "Command",
      metadata: { description: "Run a command with canonical JSON on stdin", requiredConfig: [{ name: "command", label: "Command" }] },
      available: (_settings) => commandOnPath(hostShell()[0]),
      deliver: (event, config) => {
        const command = stringArray(config.command);
        return command?.length ? run(command, payload(event)) : Promise.resolve(false);
      },
    },
  ];
}
