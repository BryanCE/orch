// This machine's identity: its hashed machine id, read from the file or the OS tool that holds
// it. Reading it starts `reg` or `ioreg`, so only orchd asks; a client gets the host from orchd.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { hostname } from "node:os";
import { hostIdFrom, hostOs, isWsl } from "../host.ts";
import type { HostId, HostIdentity, HostOs } from "../types/host.ts";

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

/** Windows' machine id, read with `reg`: `reg` on Windows, `reg.exe` from inside WSL. */
function windowsMachineId(command = "reg"): string | null {
  const out = execFileSync(command, ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"], { encoding: "utf8", windowsHide: true });
  return /MachineGuid\s+REG_SZ\s+(\S+)/.exec(out)?.[1] ?? null;
}

function darwinMachineId(): string | null {
  const out = execFileSync("ioreg", ["-rd1", "-c", "IOPlatformExpertDevice"], { encoding: "utf8" });
  return /"IOPlatformUUID"\s*=\s*"([^"]+)"/.exec(out)?.[1] ?? null;
}

/** A machine id as orch publishes it: hashed, so the raw id other software keys on never leaves the box. */
function publishedHostId(machine: string): HostId {
  return hostIdFrom(createHash("sha256").update(`orch-host:${machine}`).digest("hex").slice(0, 32));
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
  const id = publishedHostId(machineId(os));
  identity = { id, name: isWsl() ? `${hostname()}-wsl` : hostname(), os };
  return identity;
}

let box: ReadonlySet<HostId> | undefined;

/** The hosts whose processes the OS here answers for: this host, and from inside WSL the
 *  Windows side of the same machine, whose pids WSL reaches through interop. Every other
 *  host is somewhere else, reached over a link or not at all. */
export function boxHostIds(): ReadonlySet<HostId> {
  if (box !== undefined) return box;
  const ids = new Set<HostId>([hostIdentity().id]);
  if (isWsl()) {
    try {
      const windows = windowsMachineId("reg.exe");
      if (windows !== null) ids.add(publishedHostId(windows));
    } catch { /* interop off: the Windows side is not reachable from here */ }
  }
  box = ids;
  return box;
}
