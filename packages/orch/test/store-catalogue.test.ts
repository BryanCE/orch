import { afterEach, describe, expect, test } from "bun:test";
import { closeAllStores } from "../src/store/connection.ts";
import { createModelCatalogue } from "../src/adapters/model-catalogue.ts";
import { binaryStamp } from "../src/util.ts";
import { recordingLogger } from "./helpers/logger.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
import {
  clearCatalogues,
  readCatalogues,
  writeCatalogue,
} from "../src/store/catalogue-rows.ts";

const tempDirs: OrchDir[] = [];

afterEach(() => {
  closeAllStores();
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

function fixture(): OrchDir {
  const orchDir = tempOrchDir("orch-catalogue-");
  tempDirs.push(orchDir);
  return orchDir;
}

describe("catalogue rows", () => {
  test("empty store reads an empty Map", () => {
    expect(readCatalogues(fixture())).toEqual(new Map());
  });

  test("write then read round-trips binary, at and stdout", () => {
    const orchDir = fixture();
    writeCatalogue(orchDir, "claude", { binary: "/bin/claude@1", at: 123, stdout: "catalogue output" });

    expect(readCatalogues(orchDir)).toEqual(
      new Map([["claude", { binary: "/bin/claude@1", at: 123, stdout: "catalogue output" }]]),
    );
  });

  test("writing the same command twice keeps one row with newer values", () => {
    const orchDir = fixture();
    writeCatalogue(orchDir, "claude", { binary: "/bin/claude@1", at: 123, stdout: "old output" });
    writeCatalogue(orchDir, "claude", { binary: "/bin/claude@2", at: 456, stdout: "new output" });

    expect(readCatalogues(orchDir)).toEqual(
      new Map([["claude", { binary: "/bin/claude@2", at: 456, stdout: "new output" }]]),
    );
  });

  test("an entry with empty stdout is not stored", () => {
    const orchDir = fixture();
    writeCatalogue(orchDir, "claude", { binary: "/bin/claude@1", at: 123, stdout: "" });

    expect(readCatalogues(orchDir)).toEqual(new Map());
  });

  test("clearCatalogues empties the store", () => {
    const orchDir = fixture();
    writeCatalogue(orchDir, "claude", { binary: "/bin/claude@1", at: 123, stdout: "catalogue output" });
    clearCatalogues(orchDir);

    expect(readCatalogues(orchDir)).toEqual(new Map());
  });

  test("two commands coexist and updating one does not touch the other", () => {
    const orchDir = fixture();
    writeCatalogue(orchDir, "claude", { binary: "/bin/claude@1", at: 123, stdout: "claude output" });
    writeCatalogue(orchDir, "codex", { binary: "/bin/codex@1", at: 456, stdout: "codex output" });
    writeCatalogue(orchDir, "claude", { binary: "/bin/claude@1", at: 789, stdout: "updated claude" });

    expect(readCatalogues(orchDir)).toEqual(
      new Map([
        ["claude", { binary: "/bin/claude@1", at: 789, stdout: "updated claude" }],
        ["codex", { binary: "/bin/codex@1", at: 456, stdout: "codex output" }],
      ]),
    );
  });
});

describe("model catalogue binary stamp", () => {
  const argv = ["-e", "process.stdout.write('fresh')"];
  const command = `bun ${argv.join(" ")}`;

  test("a stored answer from the same binary is served without asking", () => {
    const orchDir = fixture();
    writeCatalogue(orchDir, command, { binary: binaryStamp("bun"), at: Date.now(), stdout: "stored" });

    expect(createModelCatalogue(orchDir, recordingLogger().logger).read("bun", argv)).toBe("stored");
  });

  test("a stored answer from another binary is asked again and replaced", () => {
    const orchDir = fixture();
    writeCatalogue(orchDir, command, { binary: "/old/bun@1", at: Date.now(), stdout: "stored" });

    expect(createModelCatalogue(orchDir, recordingLogger().logger).read("bun", argv)).toBe("fresh");
    expect(readCatalogues(orchDir).get(command)?.binary).toBe(binaryStamp("bun"));
  });
});
