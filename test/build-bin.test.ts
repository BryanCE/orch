import { readFileSync, writeFileSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { BUILD_RUNTIME, stampBuildEntrypoint } from "../scripts/build-bin.ts";

const directories: string[] = [];

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
    expect(statSync(file).mode & 0o111).not.toBe(0);
  });
});
