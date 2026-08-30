import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isRpcResponse } from "../src/daemon/rpc.ts";
import { ensureHost, currentHostOs } from "../src/store/agent-rows.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { hosts } from "../src/db/schema.ts";
import { isRecord, osSide } from "../src/util.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];

afterEach(() => {
  closeAllStores();
  while (dirs.length > 0) removeTempDir(dirs.pop() ?? "");
});

describe("one spelling per shared fact", () => {
  test("osSide and the store agree for an injected Windows platform", () => {
    const directory = mkdtempSync(join(tmpdir(), "orch-one-spelling-"));
    dirs.push(directory);

    expect(osSide("win32")).toBe("windows");
    expect(osSide("linux")).toBe("linux");
    expect(currentHostOs("win32")).toBe(osSide("win32"));

    ensureHost(directory, "host", "Host", currentHostOs("win32"), 1);
    const stored = orm(directory).select({ os: hosts.os }).from(hosts).get();
    expect(stored?.os).toBe("windows");
  });

  test("the shared record guard rejects arrays and null", () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord({ answer: 42 })).toBe(true);
    expect(isRpcResponse([])).toBe(false);
    expect(isRpcResponse(null)).toBe(false);
  });
});
