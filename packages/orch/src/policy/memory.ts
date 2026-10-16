import * as fs from "node:fs";
import * as os from "node:os";
import type { OrchSettings } from "../types/settings.ts";

const BYTES_PER_MIB = 1024 * 1024;
const KIB_PER_MIB = 1024;

/** Linux's `MemAvailable` in MiB: free memory plus the cache the kernel can drop. Null off Linux. */
function linuxAvailableMb(): number | null {
  let meminfo: string;
  try {
    meminfo = fs.readFileSync("/proc/meminfo", "utf8");
  } catch {
    return null;
  }
  const kib = /^MemAvailable:\s+(\d+)\s+kB$/m.exec(meminfo)?.[1];
  return kib === undefined ? null : Math.floor(Number(kib) / KIB_PER_MIB);
}

/** The memory this machine can still give a new agent, in MiB. */
export function availableMemoryMb(): number {
  return linuxAvailableMb() ?? Math.floor(os.freemem() / BYTES_PER_MIB);
}

/** Why a spawn would push the machine under `fleet.min_free_memory_mb`, or null when it fits. */
export function memoryRefusal(settings: Pick<OrchSettings, "fleet">, availableMb: number): string | null {
  const floor = settings.fleet.min_free_memory_mb;
  if (availableMb >= floor) return null;
  return `only ${availableMb} MiB of memory is available, under fleet.min_free_memory_mb (${floor} MiB). Close agents you no longer need (orch close <name>), then spawn again.`;
}

/** The memory part of the capacity line. */
export function formatMemoryLine(settings: Pick<OrchSettings, "fleet">, availableMb: number): string {
  const low = availableMb < settings.fleet.min_free_memory_mb ? " LOW: spawns refused" : "";
  return `memory ${availableMb}/${settings.fleet.min_free_memory_mb} MiB available/floor${low}`;
}
