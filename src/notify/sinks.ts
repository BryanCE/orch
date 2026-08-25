// The backend-owned sink-provider registry plus orch's builtin sink notifiers.
// Backends register here at import time, so this file must never import the
// router — router.ts composes these builtins at its own module init, and an
// import back into it would strand a provider in a half-initialized registry.
import { spawn, execFile } from "node:child_process";
import * as filesystem from "node:fs";
import * as path from "node:path";
import { packageRoot } from "../util.ts";
import { notificationText, payload, type NotifyEvent } from "./format.ts";

/** Provider port used by backend-owned notification sinks. */
export interface SinkProvider {
  id: string;
  onDefaults: readonly string[];
  available(): boolean | Promise<boolean>;
  send(title: string, body: string): boolean | Promise<boolean>;
  remediation?: string;
  label?: string;
  description?: string;
}

const sinkProviders = new Map<string, SinkProvider>();

let onRegister: ((provider: SinkProvider) => void) | undefined;

/** Register a backend-owned notification provider. */
export function registerSinkProvider(provider: SinkProvider): void {
  sinkProviders.set(provider.id, provider);
  onRegister?.(provider);
}

/** Every registered provider, in registration order. */
export function allSinkProviders(): SinkProvider[] {
  return [...sinkProviders.values()];
}

export function getSinkProvider(id: string): SinkProvider | undefined {
  return sinkProviders.get(id);
}

export function hasSinkProvider(id: string): boolean {
  return sinkProviders.has(id);
}

/** Subscribe the notifier registry to providers that register after it was created. */
export function onSinkProviderRegistered(listener: (provider: SinkProvider) => void): void {
  onRegister = listener;
}

/** A required configuration value collected for a notifier. */
export interface NotifierConfigField {
  /** Config key used by the notifier. */
  name: string;
  /** Human-readable prompt/label for the key. */
  label: string;
  description?: string;
  /** Whether setup and doctor should redact this value. */
  secret?: boolean;
};

/** Host-integration metadata kept separate from delivery behavior. */
export interface NotifierMetadata {
  /** Rich fields are used by setup; bare names remain contract-compatible. */
  requiredConfig: readonly (NotifierConfigField | string)[];
  description?: string;
};

/** Canonical host-integration contract. */
export interface Notifier {
  id: string;
  label: string;
  metadata: NotifierMetadata;
  /** A rejected availability probe is treated as unavailable by the registry. */
  available(config?: Record<string, unknown>): boolean | Promise<boolean>;
  /** Config is optional so phase-1 custom notifiers remain source-compatible. */
  deliver(event: NotifyEvent, config?: Record<string, unknown>): Promise<boolean>;
};

export function providerNotifier(provider: SinkProvider): Notifier {
  return {
    id: provider.id,
    label: provider.label ?? provider.id,
    metadata: { description: provider.description, requiredConfig: [] },
    available: () => provider.available(),
    deliver: async (event) => {
      const { title, body } = notificationText(event);
      return !!(await provider.send(title, body));
    },
  };
}

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

/** Built-in host integrations. Delivery always uses the canonical formatter above. */
export function createBuiltinNotifiers(): Notifier[] {
  return [
    ...allSinkProviders().map(providerNotifier),
    {
      id: "desktop",
      label: "Desktop",
      metadata: { description: "Desktop notifications with WSL fallback", requiredConfig: [] },
      available: () => desktopAvailable(),
      deliver: (event) => deliverDesktop(event),
    },
    {
      id: "webhook",
      label: "Webhook",
      metadata: { description: "HTTP POST notification", requiredConfig: [{ name: "url", label: "Webhook URL" }] },
      available: (config) => typeof fetch === "function" && (config?.url === undefined || (typeof config?.url === "string" && config.url.length > 0)),
      deliver: async (event, config = {}) => {
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
      id: "command",
      label: "Command",
      metadata: { description: "Run a command with canonical JSON on stdin", requiredConfig: [{ name: "command", label: "Command" }] },
      available: (config) => config?.command === undefined ? commandOnPath("sh") : commandAvailable(config),
      deliver: (event, config = {}) => {
        const command = stringArray(config.command);
        return command?.length ? run(command, payload(event)) : Promise.resolve(false);
      },
    },
  ];
}
