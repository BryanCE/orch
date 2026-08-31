import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { retryingAsync, retryingSync } from "../retry.ts";
import { orchDir } from "../presence/writer.ts";
import { clearCatalogues, readCatalogues, writeCatalogue } from "../store/catalogue-rows.ts";
import { binaryOnPath, errorMessage } from "../util.ts";
import type { StoredCatalogue } from "../types/store.ts";
import type { RetryPolicy } from "../types/core.ts";
import { commandLogger } from "../commands/logging.ts";

/** A cold registry on a slow machine takes far longer to print than a warm one, and giving up
 *  early strips every model out of setup rather than failing loudly. */
const CATALOGUE_TIMEOUT_MS = 60_000;

/** Some harnesses print hundreds of rows; node's 1 MB default truncates that into a throw. */
const CATALOGUE_MAX_BYTES = 32 * 1024 * 1024;

/** Re-reading a catalogue is free of side effects, so a slow or half-woken harness gets retried. */
const CATALOGUE_RETRY: RetryPolicy = { attempts: 2, delayMs: 500, backoff: 2 };

/** How long a stored answer stands before a read re-queries in the background. The stored answer
 *  is served either way — only a harness never asked before makes a caller wait. */
const CATALOGUE_REFRESH_MS = 24 * 60 * 60 * 1000;

/** A harness that could not answer is retried within the minute, not the day: the usual cause is
 *  a signed-out harness, and signing in must not take a day to take effect. */
const CATALOGUE_RETRY_MS = 60_000;

const CATALOGUE_EXEC = { encoding: "utf8", timeout: CATALOGUE_TIMEOUT_MS, maxBuffer: CATALOGUE_MAX_BYTES } as const;

const execFileAsync = promisify(execFile);

const querying = new Map<string, Promise<void>>();
let stored = new Map<string, StoredCatalogue>();
let storedFrom: string | undefined;

/** The store for the CURRENT $ORCH_DIR, read from disk once per directory — the env is read per
 *  call so a test that repoints it gets that directory's store, not the first one seen. */
function catalogues(): Map<string, StoredCatalogue> {
  const directory = orchDir();
  if (storedFrom !== directory) {
    stored = readCatalogues(directory);
    storedFrom = directory;
  }
  return stored;
}

function commandLine(bin: string, argv: readonly string[]): string {
  return `${bin} ${argv.join(" ")}`;
}

function isStale(entry: StoredCatalogue): boolean {
  return Date.now() - entry.at >= (entry.stdout ? CATALOGUE_REFRESH_MS : CATALOGUE_RETRY_MS);
}

function record(command: string, stdout: string): void {
  const entry = { at: Date.now(), stdout };
  catalogues().set(command, entry);
  writeCatalogue(orchDir(), command, entry);
}

/** An unanswerable harness lists nothing rather than failing the caller; the reason goes to stdout. */
function recordFailure(command: string, bin: string, error: unknown): void {
  commandLogger().warn("models.catalogue-failed", { command, bin, error: errorMessage(error) });
  process.stdout.write(`  warning: ${command} failed; ${bin} lists no models (${errorMessage(error)})\n`);
  record(command, "");
}

/** Re-stamp what the last successful query returned, so a failed refresh costs one cycle
 *  rather than making every read re-query. */
function keepLastAnswer(command: string): void {
  record(command, catalogues().get(command)?.stdout ?? "");
}

/** Ask the harness off the main path; concurrent callers join the one query. Failure is silent:
 *  nobody asked for this answer yet, and the last good one still stands. */
function queryInBackground(command: string, bin: string, argv: readonly string[]): Promise<void> {
  const running = querying.get(command);
  if (running) return running;
  const query = retryingAsync(command, () => execFileAsync(bin, [...argv], CATALOGUE_EXEC), CATALOGUE_RETRY)
    .then(({ stdout }) => { record(command, stdout); })
    .catch(() => { keepLastAnswer(command); })
    .finally(() => { querying.delete(command); });
  querying.set(command, query);
  return query;
}

/** Run a harness's model-listing command. A stored answer is served at once and re-queried in
 *  the background once stale, so only a harness never asked before makes the caller wait.
 *  Empty string when it cannot answer, reason on stdout. */
export function readModelCatalogue(bin: string, argv: readonly string[]): string {
  const command = commandLine(bin, argv);
  const answer = catalogues().get(command);
  if (answer) {
    if (isStale(answer)) void queryInBackground(command, bin, argv);
    return answer.stdout;
  }
  try {
    const stdout = retryingSync(command, () => execFileSync(bin, [...argv], { ...CATALOGUE_EXEC, stdio: ["ignore", "pipe", "ignore"] }), CATALOGUE_RETRY);
    record(command, stdout);
    return stdout;
  } catch (error: unknown) {
    recordFailure(command, bin, error);
    return "";
  }
}

/** Read a harness's catalogue into the store without making the caller wait, so the answer is
 *  already there when something asks. Speculative, so a harness whose binary is absent is
 *  skipped silently — orch warms every harness it knows of, selected or not. */
export function warmModelCatalogue(bin: string, argv: readonly string[]): Promise<void> {
  const command = commandLine(bin, argv);
  const answer = catalogues().get(command);
  if (answer) {
    if (isStale(answer)) void queryInBackground(command, bin, argv);
    return Promise.resolve();
  }
  if (!binaryOnPath(bin)) return Promise.resolve();
  return queryInBackground(command, bin, argv);
}

/** Forget every answer, in memory and on disk, so the next read asks the harnesses again. For
 *  the operator who just installed a model and will not wait out the refresh cycle. */
export function forgetModelCatalogues(): void {
  stored = new Map();
  storedFrom = undefined;
  clearCatalogues(orchDir());
}
