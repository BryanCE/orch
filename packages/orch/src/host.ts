import { release } from "node:os";
import { HOST_OS_VALUES, type Host, type HostOs } from "./types/host.ts";

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

export function isWsl(
  input: { readonly release: string; readonly wslDistro: string | undefined } = {
    release: release(),
    wslDistro: process.env.WSL_DISTRO_NAME,
  },
): boolean {
  if (input.wslDistro !== undefined && input.wslDistro !== "") return true;
  return /microsoft|wsl/i.test(input.release);
}

export function detectHost(): Host {
  return { os: hostOs(), wsl: isWsl() };
}
