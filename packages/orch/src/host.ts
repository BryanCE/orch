import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { hostname, release } from "node:os";
import { HOST_OS_VALUES, type Host, type HostIdentity, type HostOs } from "./types/host.ts";

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

/** NixOS marks itself with `/etc/NIXOS`. */
export function isNixOs(): boolean {
  return hostOs() === "linux" && existsSync("/etc/NIXOS");
}

export function detectHost(): Host {
  return { os: hostOs(), wsl: isWsl() };
}

/** Where each OS keeps the id it minted for this machine at install. */
const LINUX_MACHINE_ID_FILES = ["/etc/machine-id", "/var/lib/dbus/machine-id"];

function linuxMachineId(): string | null {
  for (const file of LINUX_MACHINE_ID_FILES) {
    try {
      const id = readFileSync(file, "utf8").trim();
      if (id) return id;
    } catch { /* the next file, or none */ }
  }
  return null;
}

function windowsMachineId(): string | null {
  const out = execFileSync("reg", ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"], { encoding: "utf8", windowsHide: true });
  return /MachineGuid\s+REG_SZ\s+(\S+)/.exec(out)?.[1] ?? null;
}

function darwinMachineId(): string | null {
  const out = execFileSync("ioreg", ["-rd1", "-c", "IOPlatformExpertDevice"], { encoding: "utf8" });
  return /"IOPlatformUUID"\s*=\s*"([^"]+)"/.exec(out)?.[1] ?? null;
}

function machineId(os: HostOs): string {
  const id = os === "linux" ? linuxMachineId() : os === "windows" ? windowsMachineId() : darwinMachineId();
  if (id === null) {
    throw new Error(os === "linux"
      ? `orch cannot tell which machine this is: ${LINUX_MACHINE_ID_FILES.join(" and ")} are missing or empty. Run systemd-machine-id-setup.`
      : `orch cannot tell which machine this is: the ${os} machine id is unreadable.`);
  }
  return id;
}

let identity: HostIdentity | undefined;

/** This process's host. Hashed so the raw machine id, which other software keys on, never
 *  leaves the box. A WSL distro answers with its own id and a name saying it is WSL. */
export function hostIdentity(): HostIdentity {
  if (identity !== undefined) return identity;
  const os = hostOs();
  const id = createHash("sha256").update(`orch-host:${machineId(os)}`).digest("hex").slice(0, 32);
  identity = { id, name: isWsl() ? `${hostname()}-wsl` : hostname(), os };
  return identity;
}
