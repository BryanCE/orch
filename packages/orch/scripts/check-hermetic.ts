#!/usr/bin/env bun
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * The suite may not reach the developer's live store.
 *
 * `orchDir()` is `ORCH_DIR ?? homedir()/.orch`, and ~70 test files clear ORCH_DIR in their
 * teardown, which is the right thing to do: it restores the unset state. That makes the
 * unset state the one that has to be safe. It was not. A fixture seeded after a teardown
 * wrote presence directories into the real ~/.orch and opened the real orch.db.
 *
 * `test/preload.ts` moves HOME somewhere disposable so the fallback is a sandbox. This gate
 * keeps that wiring in place, and keeps any test from computing a path around it.
 */
const packageRoot = join(import.meta.dirname, "..");
const repoRoot = join(packageRoot, "..", "..");
const PRELOAD = "test/preload.ts";

function fail(file: string, line: number, reason: string): never {
  console.log(`check:hermetic FAIL ${file}:${line} ${reason}`);
  process.exit(1);
}

function relPathOf(file: string): string {
  return file.replace(/\\/g, "/");
}

function assertPreloadIsWired(bunfig: string): void {
  if (!readFileSync(bunfig, "utf8").includes(PRELOAD)) {
    fail(relPathOf(bunfig), 1, `does not preload ${PRELOAD} - without it every test resolves the real store`);
  }
}

/** The preload is all that stands between a cleared ORCH_DIR and the live store. */
function assertPreloadMovesHome(): void {
  const text = readFileSync(join(packageRoot, PRELOAD), "utf8");
  for (const name of ["HOME", "USERPROFILE"]) {
    if (!new RegExp(`process\\.env\\.${name}\\s*=`).test(text)) {
      fail(PRELOAD, 1, `does not move ${name} to a sandbox, so orchDir() still falls back to the real store`);
    }
  }
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith(".ts") ? [path] : [];
  });
}

/** A test that builds a home-relative store path has stepped around the sandbox. */
function assertNoTestBuildsAHomeStore(): number {
  let scanned = 0;
  for (const file of sourceFiles(join(packageRoot, "test"))) {
    if (file.endsWith("preload.ts")) continue;
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      if (/homedir\(\)[^\n]*\.orch|["'`]~\/\.orch/.test(line)) {
        fail(relPathOf(file), index + 1, "builds a path into the real ~/.orch - use the directory the test made");
      }
    }
    scanned++;
  }
  return scanned;
}

function runAllChecks(): void {
  assertPreloadIsWired(join(repoRoot, "bunfig.toml"));
  assertPreloadIsWired(join(packageRoot, "bunfig.toml"));
  assertPreloadMovesHome();
  console.log(`check:hermetic OK (${assertNoTestBuildsAHomeStore()} test files scanned)`);
}

if (import.meta.main) runAllChecks();
