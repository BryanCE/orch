import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * TASKS/13-logging.md slice 4 (TASKS/15-burndown.md B1): every `process.stderr.write`
 * under `src/` and `extensions/` is a diagnosis line wearing an output hat. Each one is
 * now either a structured log record (`src/log.ts`) or, where it is genuinely what the
 * human asked to see, a `process.stdout.write`. Output and logging never share a call,
 * and stderr is neither channel.
 *
 * A text scan, not a runtime probe: the next stderr write is a compile-time-invisible
 * regression, and only a test over the source itself catches it.
 */

const ROOT = join(import.meta.dir, "..");
const SCANNED = ["src", "extensions"] as const;

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) files.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry)) files.push(full);
  }
  return files;
}

function stderrWriteSites(): string[] {
  const sites: string[] = [];
  for (const scanned of SCANNED) {
    for (const file of sourceFiles(join(ROOT, scanned))) {
      readFileSync(file, "utf8").split("\n").forEach((line, index) => {
        if (/process\.stderr\.write\s*\(/.test(line)) sites.push(`${relative(ROOT, file)}:${index + 1}`);
      });
    }
  }
  return sites;
}

describe("orch has one diagnosis channel (the logger) and one output channel (stdout)", () => {
  test("no runtime source writes to process.stderr", () => {
    expect(stderrWriteSites()).toEqual([]);
  });

  test("the scan actually covers the tree it claims to", () => {
    // A recursive scan that silently finds zero files passes vacuously — the
    // exact failure Rule 10 records for check-bridge. Pin that it sees both roots.
    expect(sourceFiles(join(ROOT, "src")).length).toBeGreaterThan(50);
    expect(sourceFiles(join(ROOT, "extensions")).length).toBeGreaterThan(0);
  });
});
