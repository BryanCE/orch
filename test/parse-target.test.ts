import { describe, expect, test } from "bun:test";
import { formatTarget, parseTarget } from "../src/entities.ts";

const hosts = {
  box1: { dest: "user@box1.example" },
  box2: { dest: "user@box2.example" },
};

describe("<host>/<target> grammar", () => {
  test("keeps targets without a host unchanged", () => {
    expect(parseTarget("w-2", hosts)).toEqual({ host: null, target: "w-2" });
  });

  test("parses configured host prefixes", () => {
    expect(parseTarget("box1/w-2", hosts)).toEqual({ host: "box1", target: "w-2" });
  });

  test("rejects unknown hosts and lists configured hosts", () => {
    expect(() => parseTarget("unknownhost/x", hosts)).toThrow(
      'Unknown host "unknownhost". Configured hosts: box1, box2',
    );
  });

  test("rejects empty hosts and targets", () => {
    expect(() => parseTarget("box1/", hosts)).toThrow();
    expect(() => parseTarget("/x", hosts)).toThrow();
  });

  test("formats local and host-prefixed targets", () => {
    expect(formatTarget({ host: "box1", target: "w-2" })).toBe("box1/w-2");
    expect(formatTarget({ host: null, target: "w-2" })).toBe("w-2");
  });
});
