import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores } from "../src/store/connection.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import {
  clearCatalogues,
  readCatalogues,
  writeCatalogue,
} from "../src/store/catalogue-rows.ts";

const tempDirs: string[] = [];

afterEach(() => {
  closeAllStores();
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

function fixture(): string {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-catalogue-"));
  tempDirs.push(orchDir);
  return orchDir;
}

describe("catalogue rows", () => {
  test("empty store reads an empty Map", () => {
    expect(readCatalogues(fixture())).toEqual(new Map());
  });

  test("write then read round-trips at and stdout", () => {
    const orchDir = fixture();
    writeCatalogue(orchDir, "claude", { at: 123, stdout: "catalogue output" });

    expect(readCatalogues(orchDir)).toEqual(
      new Map([["claude", { at: 123, stdout: "catalogue output" }]]),
    );
  });

  test("writing the same command twice keeps one row with newer values", () => {
    const orchDir = fixture();
    writeCatalogue(orchDir, "claude", { at: 123, stdout: "old output" });
    writeCatalogue(orchDir, "claude", { at: 456, stdout: "new output" });

    expect(readCatalogues(orchDir)).toEqual(
      new Map([["claude", { at: 456, stdout: "new output" }]]),
    );
  });

  test("an entry with empty stdout is not stored", () => {
    const orchDir = fixture();
    writeCatalogue(orchDir, "claude", { at: 123, stdout: "" });

    expect(readCatalogues(orchDir)).toEqual(new Map());
  });

  test("clearCatalogues empties the store", () => {
    const orchDir = fixture();
    writeCatalogue(orchDir, "claude", { at: 123, stdout: "catalogue output" });
    clearCatalogues(orchDir);

    expect(readCatalogues(orchDir)).toEqual(new Map());
  });

  test("two commands coexist and updating one does not touch the other", () => {
    const orchDir = fixture();
    writeCatalogue(orchDir, "claude", { at: 123, stdout: "claude output" });
    writeCatalogue(orchDir, "codex", { at: 456, stdout: "codex output" });
    writeCatalogue(orchDir, "claude", { at: 789, stdout: "updated claude" });

    expect(readCatalogues(orchDir)).toEqual(
      new Map([
        ["claude", { at: 789, stdout: "updated claude" }],
        ["codex", { at: 456, stdout: "codex output" }],
      ]),
    );
  });
});
