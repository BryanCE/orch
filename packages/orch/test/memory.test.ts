import { describe, expect, test } from "bun:test";
import { availableMemoryMb, formatMemoryLine, memoryRefusal } from "../src/policy/memory.ts";

const settings = { fleet: { max_agents_per_pack: 10, max_agents_per_tab: 4, max_depth: 1, max_agents_per_space: {}, min_free_memory_mb: 2048, worker_peer_tools: false, cross_space: false } };

describe("spawn memory floor", () => {
  // Fifteen live agents on one host drove free memory to zero before any count cap was reached.
  test("refuses a spawn under the floor and names the setting and the way out", () => {
    const refusal = memoryRefusal(settings, 512);
    expect(refusal).toContain("512 MiB");
    expect(refusal).toContain("fleet.min_free_memory_mb (2048 MiB)");
    expect(refusal).toContain("orch close <name>");
  });

  test("allows a spawn at or over the floor", () => {
    expect(memoryRefusal(settings, 2048)).toBeNull();
  });

  test("the capacity line marks memory under the floor", () => {
    expect(formatMemoryLine(settings, 4096)).toBe("memory 4096/2048 MiB available/floor");
    expect(formatMemoryLine(settings, 100)).toBe("memory 100/2048 MiB available/floor LOW: spawns refused");
  });

  test("reads a whole number of MiB from the machine", () => {
    expect(Number.isInteger(availableMemoryMb())).toBe(true);
  });
});
