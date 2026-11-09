import { existsSync } from "node:fs";
import { release } from "node:os";
import { HOST_OS_VALUES, type Host, type HostId, type HostOs } from "./types/host.ts";

/** Whether a value is a host id: non-blank text with no surrounding space. */
export function isHostId(value: unknown): value is HostId {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}

/** The one mint for a host id: from this host's own identity, a stored row, or a wire value. */
export function hostIdFrom(value: string): HostId {
  if (!isHostId(value)) throw new Error(`not a host id: ${JSON.stringify(value)}`);
  return value;
}

export function isHostOs(value: unknown): value is HostOs {
  return HOST_OS_VALUES.some((os) => os === value);
}

export function hostOsOf(platform: NodeJS.Platform): HostOs {
  if (platform === "win32") return "windows";
  if (platform === "darwin") return "darwin";
  if (platform === "linux") return "linux";
  throw new Error(`unsupported host OS ${platform}`);
}

export function hostOs(): HostOs {
  return hostOsOf(process.platform);
}

/** The one place orch knows how each OS runs a shell line - `sh` is not a Windows program. */
const HOST_SHELL: Record<HostOs, readonly [string, ...string[]]> = {
  linux: ["sh", "-c"],
  darwin: ["sh", "-c"],
  windows: ["cmd.exe", "/d", "/s", "/c"],
};

/** The argv prefix that runs one shell line on this host. */
export function hostShell(): readonly [string, ...string[]] {
  return HOST_SHELL[hostOs()];
}

export function isWsl(
  input: { readonly release: string; readonly wslDistro: string | undefined } = {
    release: release(),
    wslDistro: process.env.WSL_DISTRO_NAME,
  },
): boolean {
  if (input.wslDistro !== undefined && input.wslDistro !== "") return true;
  return /microsoft|wsl/i.test(input.release);
}

/** NixOS marks itself with `/etc/NIXOS`. */
export function isNixOs(): boolean {
  return hostOs() === "linux" && existsSync("/etc/NIXOS");
}

export function detectHost(): Host {
  return { os: hostOs(), wsl: isWsl() };
}
