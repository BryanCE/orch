import { execFileSync } from "node:child_process";
import { retryingSync, type RetryPolicy } from "../retry.ts";
import { errorMessage } from "../util.ts";

/** A cold registry on a slow machine takes far longer to print than a warm one, and giving up
 *  early strips every model out of setup rather than failing loudly. */
const CATALOGUE_TIMEOUT_MS = 60_000;

/** Some harnesses print hundreds of rows; node's 1 MB default truncates that into a throw. */
const CATALOGUE_MAX_BYTES = 32 * 1024 * 1024;

/** Re-reading a catalogue is free of side effects, so a slow or half-woken harness gets retried. */
const CATALOGUE_RETRY: RetryPolicy = { attempts: 2, delayMs: 500, backoff: 2 };

/** How long one answer stands. orchd is long-lived and gates EVERY spawn on the catalogue; without
 *  this it shells out per spawn and the spawn RPC times out waiting on it. */
const CATALOGUE_TTL_MS = 60_000;

const answered = new Map<string, { at: number; stdout: string }>();

function runCatalogueCommand(bin: string, argv: readonly string[]): string {
  return execFileSync(bin, [...argv], {
    encoding: "utf8",
    timeout: CATALOGUE_TIMEOUT_MS,
    maxBuffer: CATALOGUE_MAX_BYTES,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

/** Run a harness's model-listing command. Empty string when it cannot answer, reason on stderr. */
export function readModelCatalogue(bin: string, argv: readonly string[]): string {
  const command = `${bin} ${argv.join(" ")}`;
  const fresh = answered.get(command);
  if (fresh && Date.now() - fresh.at < CATALOGUE_TTL_MS) return fresh.stdout;

  let stdout: string;
  try {
    stdout = retryingSync(command, () => runCatalogueCommand(bin, argv), CATALOGUE_RETRY);
  } catch (error: unknown) {
    process.stderr.write(`  warning: ${command} failed; ${bin} lists no models (${errorMessage(error)})\n`);
    stdout = "";
  }
  answered.set(command, { at: Date.now(), stdout });
  return stdout;
}
