import { describe, expect, test } from "bun:test";
import { registryTargetMatches, resolveRegistryRecord } from "../src/commands/target.ts";
import type { PresenceEntry } from "../src/presence/store.ts";
import type { SpawnedRecord } from "../src/store/spawned-rows.ts";

const presence = (key: string, alive: boolean): PresenceEntry => ({ key, dir: key, status: null, result: null, alive });

const row = (pane: string, name: string): SpawnedRecord => ({ pane, name });

describe("lifecycle target resolution", () => {
  test("prefers one live record over dead rows sharing its name", () => {
    const records = [row("live-key", "worker"), row("dead-key", "worker")];
    const found = resolveRegistryRecord(records, new Map([
      ["live-key", presence("live-key", true)],
      ["dead-key", presence("dead-key", false)],
    ]), "worker");
    expect(found?.pane).toBe("live-key");
  });

  test("reports the target and disambiguating keys for live ambiguity", () => {
    expect(() => resolveRegistryRecord(
      [row("key-a", "worker"), row("key-b", "worker")],
      new Map([["key-a", presence("key-a", true)], ["key-b", presence("key-b", true)]]),
      "worker",
    )).toThrow(/Ambiguous target "worker".*key-a.*key-b/);
  });

  test("cleanup can still resolve a dead row when no live match exists", () => {
    const found = resolveRegistryRecord([row("dead-key", "worker")], new Map([["dead-key", presence("dead-key", false)]]), "worker");
    expect(found?.pane).toBe("dead-key");
  });

  test("matches a stale bare pane row by its handle without parsing pane as an identity", () => {
    expect(registryTargetMatches({ pane: "w7:pJ", handle: "w7:pW", name: "lease-hardening" }, "lease-hardening")).toBe(true);
    expect(registryTargetMatches({ pane: "w7:pN", handle: "w7:pN" }, "w7:pN")).toBe(true);
  });

});
