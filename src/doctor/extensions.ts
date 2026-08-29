import { computeCodeHash } from "../daemon/lifecycle.ts";
import { EXTENSION_NAMES, extensionBundlePath } from "../extensions/bundles.ts";
import { loadPresence, presenceRootFault } from "../presence/store.ts";
import { packageRoot } from "../util.ts";
import type { CheckResult } from "../types/doctor.ts";

/**
 * Hashes of the bridge bundles currently on disk — one per harness, since each
 * ships its own composition root. A pane is judged against the whole set: an omp
 * agent whose hash matches omp's bundle is current, and comparing it against pi's
 * would report a fleet-wide failure that is really just "a different harness".
 */
export function shippedBundleHashes(bundlePath?: string): string[] {
  const bundles = bundlePath ? [bundlePath] : EXTENSION_NAMES.map((name) => extensionBundlePath(packageRoot(), name));
  return bundles.flatMap((bundle) => {
    try { return [computeCodeHash(bundle)]; } catch { return []; }
  });
}

/** Compare a bridge presence hash with the bundled bridges currently installed on disk. */
export function isBridgeExtensionStale(extensionHash: string | undefined, bundlePath?: string, shippedHashes?: ReadonlySet<string>): boolean {
  if (extensionHash === undefined) return false;
  const hashes = shippedHashes ?? new Set(shippedBundleHashes(bundlePath));
  if (!hashes.size) return false;
  return !hashes.has(extensionHash);
}

/** Verify Claude's orch hooks are installed and target this checkout's shim. */
export async function checkExtensionStaleness(orchDir: string, bundlePath?: string): Promise<CheckResult> {
  await Promise.resolve();
  const id = "extension-staleness";
  const label = "Extension staleness";
  const fault = presenceRootFault(orchDir);
  if (fault) return { id, label, status: "fail", detail: `${fault}; remove it so orch can create the agents directory` };
  const entries = loadPresence(orchDir);
  if (!entries.size) return { id, label, status: "ok", detail: "no live agents with extension hashes" };

  const diskHashes = shippedBundleHashes(bundlePath);
  if (!diskHashes.length) return { id, label, status: "warn", detail: "extension bundle not built; run: bun run build:ext" };
  const stale: string[] = [];
  let liveWithHash = 0;
  for (const entry of entries.values()) {
    const extensionHash = entry.status?.extensionHash;
    if (!entry.alive || typeof extensionHash !== "string") continue;
    liveWithHash += 1;
    if (!diskHashes.includes(extensionHash)) stale.push(entry.key);
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
