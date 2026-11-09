import { describe, expect, test } from "bun:test";
import { hostOs } from "../src/host.ts";
import { hostIdentity } from "../src/hosts/identity.ts";

describe("which host this process runs on", () => {
  test("is a hashed id, the same on every call, never the hostname", () => {
    const first = hostIdentity();
    expect(first.id).toMatch(/^[0-9a-f]{32}$/);
    expect(hostIdentity()).toEqual(first);
    expect(first.id).not.toBe(first.name);
    expect(first.os).toBe(hostOs());
  });
});
