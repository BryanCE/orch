// The backend-owned sink-provider registry plus orch's builtin sink notifiers.
// Backends register here at import time, so this file must never import the
// router — router.ts composes these builtins at its own module init, and an
// import back into it would strand a provider in a half-initialized registry.
import { spawn, execFile } from "node:child_process";
import * as filesystem from "node:fs";
import * as path from "node:path";
import { osSide, packageRoot } from "../util.ts";
import { notificationText, payload } from "./format.ts";
import { playDing, soundAvailable } from "./ding.ts";
import type { Notifier, NotifyEvent } from "../types/notify.ts";
import type { OsSide } from "../types/core.ts";

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

async function windowsToast(title: string, body: string): Promise<boolean> {
  if (!commandOnPath("powershell.exe")) return false;
  const script = path.join(packageRoot(), "scripts", "wsl-toast.ps1");
  if (!filesystem.existsSync(script)) return false;
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

async function deliverDesktop(event: NotifyEvent): Promise<boolean> {
  const { title, body } = notificationText(event);
  if (await run(["notify-send", title, body])) return true;
  if (commandOnPath("wsl-notify-send") && await run(["wsl-notify-send", title, body])) return true;
  return windowsToast(title, body);
}

function desktopAvailable(): boolean {
  if (commandOnPath("notify-send") || commandOnPath("wsl-notify-send")) return true;
  return commandOnPath("powershell.exe") && commandOnPath("wslpath") && filesystem.existsSync(path.join(packageRoot(), "scripts", "wsl-toast.ps1"));
}

export function commandAvailable(config: Record<string, unknown>): boolean {
  const command = stringArray(config.command);
  return !!command?.[0] && (command[0].includes(path.sep) ? filesystem.existsSync(command[0]) : commandOnPath(command[0]));
}

/** The single place the command sink knows an OS apart - `sh` is not a Windows program. */
const HOST_SHELL: Record<OsSide, readonly [string, ...string[]]> = {
  linux: ["sh", "-c"],
  darwin: ["sh", "-c"],
  windows: ["cmd.exe", "/d", "/s", "/c"],
};

export function hostShell(): readonly [string, ...string[]] {
  return HOST_SHELL[osSide()];
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
      metadata: { description: "Desktop notifications with WSL fallback", requiredConfig: [] },
      available: () => desktopAvailable(),
      deliver: (event, _config) => deliverDesktop(event),
    },
    {
      id: "webhook",
      label: "Webhook",
      metadata: { description: "HTTP POST notification", requiredConfig: [{ name: "url", label: "Webhook URL" }] },
      available: (config) => typeof fetch === "function" && (config?.url === undefined || (typeof config?.url === "string" && config.url.length > 0)),
      deliver: async (event, config) => {
        if (typeof config.url !== "string" || !config.url) return false;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        try {
          const response = await fetch(config.url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: payload(event),
            signal: controller.signal,
          });
          return response.ok;
        } finally {
          clearTimeout(timeout);
        }
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
      available: (config) => config?.command === undefined ? commandOnPath(hostShell()[0]) : commandAvailable(config),
      deliver: (event, config) => {
        const command = stringArray(config.command);
        return command?.length ? run(command, payload(event)) : Promise.resolve(false);
      },
    },
  ];
}
