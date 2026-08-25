/**
 * The catalogues harnesses have already answered, kept on disk under $ORCH_DIR. Asking a
 * harness what it can run is a cold shell-out; storing the answer is what makes every run
 * after the first one instant.
 */
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { atomicWrite, orchDir } from "../presence/writer.ts";
import { isRecord } from "../util.ts";

/** Bump on any shape change. A file carrying another stamp is malformed, not older: it is
 *  dropped and the harnesses are asked again. */
export const CATALOGUE_SCHEMA = 1;

const CATALOGUE_FILE = "model-catalogues.json";

/** One harness's answer to its model-listing command, and when it answered. */
export interface StoredCatalogue {
  at: number;
  stdout: string;
}

function cataloguePath(): string {
  return join(orchDir(), CATALOGUE_FILE);
}

function parseCatalogues(payload: unknown): Map<string, StoredCatalogue> {
  const stored = new Map<string, StoredCatalogue>();
  if (!isRecord(payload) || payload.schemaVersion !== CATALOGUE_SCHEMA || !isRecord(payload.catalogues)) return stored;
  for (const [command, entry] of Object.entries(payload.catalogues)) {
    if (isRecord(entry) && typeof entry.at === "number" && typeof entry.stdout === "string") stored.set(command, { at: entry.at, stdout: entry.stdout });
  }
  return stored;
}

/** Every catalogue this machine has read, keyed by the command that produced it. Empty when
 *  the file is absent, unreadable, or stamped for another schema. */
export function readCatalogues(): Map<string, StoredCatalogue> {
  try {
    return parseCatalogues(JSON.parse(readFileSync(cataloguePath(), "utf8")));
  } catch {
    return new Map();
  }
}

/** Persist the answered catalogues. An entry with no output is skipped — a harness that could
 *  not answer has no catalogue, and storing one would outlive the reason it failed. */
export function writeCatalogues(catalogues: ReadonlyMap<string, StoredCatalogue>): void {
  const answered = [...catalogues].filter(([, entry]) => entry.stdout);
  try {
    mkdirSync(orchDir(), { recursive: true });
  } catch { /* a cache that cannot be written costs a re-query, never data */ }
  atomicWrite(cataloguePath(), { schemaVersion: CATALOGUE_SCHEMA, catalogues: Object.fromEntries(answered) });
}

/** Discard every stored catalogue so the harnesses are asked again. */
export function clearCatalogues(): void {
  rmSync(cataloguePath(), { force: true });
}
