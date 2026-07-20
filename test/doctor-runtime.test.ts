import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { checkRuntime, runningRuntime, shebangRuntime, type RuntimeObservations } from "../src/doctor/runtime.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

const directories: string[] = [];

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-doctor-runtime-"));
  directories.push(directory);
  return directory;
}

/** Write an executable-looking file carrying `shebang` as its first line. */
function scriptWith(shebang: string): string {
  const file = path.join(tempDir(), "orch");
  fs.writeFileSync(file, `${shebang}\nconsole.log(1)\n`);
  return file;
}

/**
 * Every observation the check depends on, injected. The verdict table must be
 * provable without the suite happening to run under the runtime being asserted.
 */
function observed(overrides: Partial<RuntimeObservations> = {}): RuntimeObservations {
  return {
    running: "node",
    resolve: (bin) => `/usr/bin/${bin}`,
    entrypoint: () => ({ path: "/usr/bin/orch", runtime: "node" }),
    ...overrides,
  };
}

afterEach(() => {
  while (directories.length) fs.rmSync(directories.pop()!, { recursive: true, force: true });
});

describe("shebangRuntime", () => {
  test.each([
    ["#!/usr/bin/env node", "node"],
    ["#!/usr/bin/env bun", "bun"],
    ["#!/usr/bin/env deno", "deno"],
    ["#!/usr/local/bin/node", "node"],
  ] as const)("reads %s as %s", (shebang, expected) => {
    expect(shebangRuntime(scriptWith(shebang))).toBe(expected);
  });

  test("does not mistake a longer binary name for a runtime", () => {
    expect(shebangRuntime(scriptWith("#!/usr/bin/env nodemon"))).toBeNull();
  });

  test("returns null for a file with no shebang", () => {
    expect(shebangRuntime(scriptWith("// plain source"))).toBeNull();
  });

  test("returns null for an unreadable path", () => {
    expect(shebangRuntime(path.join(tempDir(), "absent"))).toBeNull();
  });
});

describe("runningRuntime", () => {
  test("reports the runtime this suite is executing under", () => {
    // The suite runs under bun; the point is that detection reads the runtime's own
    // version table rather than PATH, so it cannot disagree with what is executing.
    expect(["node", "deno", "bun"]).toContain(runningRuntime());
  });
});

describe("doctor runtime verdict table", () => {
  test.each(["node", "deno", "bun"] as const)("declared == actual (%s) is ok, no runtime privileged", (runtime) => {
    const orchDir = tempDir();
    writeSettingsFixture(orchDir, { runtime });

    const result = checkRuntime(orchDir, observed({
      running: runtime,
      entrypoint: () => ({ path: "/usr/bin/orch", runtime }),
    }));

    expect(result).toMatchObject({ id: "runtime", status: "ok" });
  });

  test("declared node but executing under bun fails", () => {
    const orchDir = tempDir();
    writeSettingsFixture(orchDir, { runtime: "node" });

    const result = checkRuntime(orchDir, observed({ running: "bun" }));

    expect(result).toMatchObject({ id: "runtime", status: "fail" });
    expect(result.detail).toContain("orch is running under bun");
    expect(result.detail).toContain("declares node");
  });

  test("declared bun but executing under node fails just as loudly", () => {
    const orchDir = tempDir();
    writeSettingsFixture(orchDir, { runtime: "bun" });

    const result = checkRuntime(orchDir, observed({
      running: "node",
      entrypoint: () => ({ path: "/usr/bin/orch", runtime: "bun" }),
    }));

    expect(result).toMatchObject({ id: "runtime", status: "fail" });
    expect(result.detail).toContain("orch is running under node");
  });

  // The regression that motivated the whole axis: a stale entrypoint shebang must be
  // caught even when doctor itself happens to be running under the declared runtime.
  test("entrypoint shebang mismatch fails even when the running runtime matches", () => {
    const orchDir = tempDir();
    writeSettingsFixture(orchDir, { runtime: "node" });

    const result = checkRuntime(orchDir, observed({
      running: "node",
      entrypoint: () => ({ path: "/usr/local/bin/orch", runtime: "bun" }),
    }));

    expect(result).toMatchObject({ id: "runtime", status: "fail" });
    expect(result.detail).toContain("bun shebang");
    expect(result.detail).toContain("/usr/local/bin/orch");
  });

  test("declared runtime absent from PATH fails", () => {
    const orchDir = tempDir();
    writeSettingsFixture(orchDir, { runtime: "deno" });

    const result = checkRuntime(orchDir, observed({
      running: "deno",
      resolve: (bin) => (bin === "deno" ? null : `/usr/bin/${bin}`),
      entrypoint: () => ({ path: "/usr/bin/orch", runtime: "deno" }),
    }));

    expect(result).toMatchObject({ id: "runtime", status: "fail" });
    expect(result.detail).toContain("deno is not on PATH");
  });

  test("an unresolvable orch entrypoint is not itself a failure", () => {
    const orchDir = tempDir();
    writeSettingsFixture(orchDir, { runtime: "node" });

    const result = checkRuntime(orchDir, observed({ entrypoint: () => null }));

    expect(result).toMatchObject({ id: "runtime", status: "ok" });
  });

  test("remediation names both directions — rebuild, or re-record the declaration", () => {
    const orchDir = tempDir();
    writeSettingsFixture(orchDir, { runtime: "node" });

    const result = checkRuntime(orchDir, observed({ running: "bun" }));

    expect(result.detail).toContain("bun run build:dev");
    expect(result.detail).toContain("orch setup --runtime bun");
  });

  test("skips rather than throwing when settings cannot be read", () => {
    const result = checkRuntime(path.join(tempDir(), "absent"), observed());

    expect(result).toMatchObject({ id: "runtime", status: "skip" });
  });
});
