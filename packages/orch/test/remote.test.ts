import { describe, expect, test } from "bun:test";
import { parseTarget, formatTarget } from "../src/entities.ts";

describe("host-prefixed targets", () => {
  const hosts = { gpu1: { dest: "bryan@gpu1" }, lab: { dest: "lab.example" } };

  test("round-trips local and host-prefixed grammar", () => {
    for (const target of ["w6:p3", "pi-2", "gpu1/w6:p3", "lab/pi-2"]) {
      const parsed = parseTarget(target, hosts);
      expect(formatTarget(parsed)).toBe(target);
    }
  });

  test("reports unknown host and configured names", () => {
    expect(() => parseTarget("missing/pi-2", hosts)).toThrow("Unknown host \"missing\". Configured hosts: gpu1, lab");
  });
});
