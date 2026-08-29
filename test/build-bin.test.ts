import { readFileSync, writeFileSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { BUILD_RUNTIME, stampBuildEntrypoint } from "../scripts/build-bin.ts";
import { isRecord } from "../src/util.ts";

const directories: string[] = [];

interface PackageManifest {
  readonly bin: Readonly<Record<string, string>>;
  readonly files: readonly string[];
  readonly scripts: Readonly<Record<string, string>>;
}

/** The manifest as npm reads it. Narrowed rather than cast: a manifest missing
 *  any of these is a broken package, and the failure should say which. */
function packageManifest(): PackageManifest {
  const parsed: unknown = JSON.parse(readFileSync(join(import.meta.dir, "..", "package.json"), "utf8"));
  if (!isRecord(parsed)) throw new Error("package.json is not an object");
  const { bin, files, scripts } = parsed;
  if (!isRecord(bin) || !isRecord(scripts) || !Array.isArray(files)) {
    throw new Error("package.json is missing bin, files or scripts");
  }
  return {
    bin: stringRecord(bin, "bin"),
    files: files.map((entry, index) => {
      if (typeof entry !== "string") throw new Error(`package.json files[${index}] is not a string`);
      return entry;
    }),
    scripts: stringRecord(scripts, "scripts"),
  };
}

function stringRecord(value: Record<string, unknown>, field: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "string") throw new Error(`package.json ${field}.${key} is not a string`);
    out[key] = entry;
  }
  return out;
}

afterEach(() => {
  while (directories.length) rmSync(directories.pop()!, { recursive: true, force: true });
});

describe("build entrypoint", () => {
  test("always stamps a node shebang and executable mode", () => {
    const directory = mkdtempSync(join(tmpdir(), "orch-build-bin-"));
    directories.push(directory);
    const file = join(directory, "orch.js");
    writeFileSync(file, "#!/usr/bin/env bun\nexport {}\n");

    stampBuildEntrypoint(file);

    expect(BUILD_RUNTIME).toBe("node");
    expect(readFileSync(file, "utf8").split("\n", 1)[0]).toBe("#!/usr/bin/env node");
    // NTFS carries no executable bit, so `chmod` there can only ever clear or set
    // read-only and the mode reads back 0. The permission is asserted where the
    // filesystem can hold one; the shebang is asserted everywhere.
    if (process.platform !== "win32") expect(statSync(file).mode & 0o111).not.toBe(0);
  });
});

/**
 * TASKS/02-scope.md K2 — the installed `orch` runs the PACKAGED
 * `dist/bin/orch.js`, so a source edit does not take effect until
 * `bun run build:dev` rebuilds and reinstalls.
 *
 * This is not a preference, it is the reason a "fixed" CLI keeps behaving the
 * old way: the binary on PATH is a COPY, and editing `bin/orch.ts` changes
 * nothing about it. Rule 6 also makes it a shipping constraint - the packaged
 * entrypoint is node-built, because the distributable must run without bun.
 */
describe("the installed CLI is the packaged build, never live source (K2)", () => {
  const manifest = packageManifest();

  test("the `orch` bin points at the packaged entrypoint, not bin/orch.ts", () => {
    expect(manifest.bin.orch).toBe("./dist/bin/orch.js");
    // A bin pointing at the .ts source would need bun on the user's machine,
    // which is exactly what Rule 6 forbids the distributable from requiring.
    expect(manifest.bin.orch).not.toContain(".ts");
  });

  test("the packaged entrypoint is built for node, from the source entrypoint", () => {
    // `build:bin` is the only producer of dist/bin/orch.js, and it targets node.
    expect(manifest.scripts["build:bin"]).toContain("bin/orch.ts");
    expect(manifest.scripts["build:bin"]).toContain("--target=node");
    expect(manifest.scripts["build:bin"]).toContain("dist/bin/orch.js");
    expect(BUILD_RUNTIME).toBe("node");
  });

  test("a global install cannot happen without a build in front of it", () => {
    // This is the whole of K2: the install step REBUILDS first, so there is no
    // path that copies a stale dist onto PATH and no path that installs source.
    const install = manifest.scripts["install:global"] ?? "";
    expect(install).toContain("build:cli");
    expect(install.indexOf("build:cli")).toBeLessThan(install.indexOf("npm install -g"));
    expect(manifest.scripts["build:dev"]).toContain("install:global");
  });

  test("the package ships dist/, so what is installed is what was built", () => {
    expect(manifest.files).toContain("dist/");
  });
});
