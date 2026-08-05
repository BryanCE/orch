import * as filesystem from "node:fs";
import * as path from "node:path";
import { computeCodeHash } from "../daemon/lifecycle.ts";
import { EXTENSION_NAMES, extensionBundlePath } from "../bridge-bundle.ts";
import { PRESENCE_SCHEMA, STATUS_FILE } from "../presence/schema.ts";
import type { CheckResult } from "../check-result.ts";
import { readAgentEntries, readJson } from "./shared.ts";
import { packageRoot, pidAlive } from "../util.ts";

interface AgentStatus {
  pid?: unknown;
  extensionHash?: unknown;
}

/** Only a record stamped with the current PRESENCE_SCHEMA counts as a live agent. */
function isAgentStatus(value: unknown): value is AgentStatus {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return (value as { schema?: unknown }).schema === PRESENCE_SCHEMA;
}

/**
 * Hashes of the bridge bundles currently on disk — one per harness, since each
 * ships its own composition root. A pane is judged against the whole set: an omp
 * agent whose hash matches omp's bundle is current, and comparing it against pi's
 * would report a fleet-wide failure that is really just "a different harness".
 */
function shippedBundleHashes(bundlePath?: string): string[] {
  const bundles = bundlePath ? [bundlePath] : EXTENSION_NAMES.map((name) => extensionBundlePath(packageRoot(), name));
  return bundles.flatMap((bundle) => {
    try { return [computeCodeHash(bundle)]; } catch { return []; }
  });
}

/** Compare a bridge presence hash with the bundled bridges currently installed on disk. */
export function isBridgeExtensionStale(extensionHash: string | undefined, bundlePath?: string): boolean {
  if (extensionHash === undefined) return false;
  const hashes = shippedBundleHashes(bundlePath);
  if (!hashes.length) return false;
  return !hashes.includes(extensionHash);
}

/** Verify Claude's orch hooks are installed and target this checkout's shim. */
export async function checkExtensionStaleness(orchDir: string, bundlePath?: string): Promise<CheckResult> {
  await Promise.resolve();
  const id = "extension-staleness";
  const label = "Extension staleness";
  const agentsDir = path.join(orchDir, "agents");
  let entries: filesystem.Dirent[] | undefined;
  try {
    entries = readAgentEntries(orchDir);
  } catch (error: unknown) {
    return { id, label, status: "fail", detail: error instanceof Error ? error.message : String(error) };
  }
  if (!entries) return { id, label, status: "ok", detail: "no live agents with extension hashes" };

  const diskHashes = shippedBundleHashes(bundlePath);
  if (!diskHashes.length) return { id, label, status: "warn", detail: "extension bundle not built; run: bun run build:ext" };
  const stale: string[] = [];
  let liveWithHash = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const status = readJson(path.join(agentsDir, entry.name, STATUS_FILE));
      if (!isAgentStatus(status) || !pidAlive(status.pid) || typeof status.extensionHash !== "string") continue;
      liveWithHash += 1;
      if (!diskHashes.includes(status.extensionHash)) stale.push(entry.name);
    } catch {}
  }

  if (stale.length) {
    return {
      id,
      label,
      status: "warn",
      detail: `stale extension panes: ${stale.join(", ")}; hint: ${stale.map((name) => `orch reload ${name}`).join("; ")}`,
    };
  }
  if (!liveWithHash) return { id, label, status: "ok", detail: "no live agents with extension hashes" };
  return { id, label, status: "ok", detail: `all live extension hashes match a shipped bundle (${diskHashes.join(", ")})` };
}
