import { expect, test } from "bun:test";
import { mintAgentId } from "../src/backends/identity.ts";
import { LAUNCH_ENV, launchCredential, readLaunchCredential } from "../src/identity/launch.ts";
import { CommandRefusal } from "../src/refusal.ts";

/** Run `body` with the launch env set to `value` (unset when undefined), restoring it afterwards. */
function withLaunchEnv(value: string | undefined, body: () => void): void {
  const previous = process.env[LAUNCH_ENV];
  try {
    if (value === undefined) delete process.env[LAUNCH_ENV];
    else process.env[LAUNCH_ENV] = value;
    body();
  } finally {
    if (previous === undefined) delete process.env[LAUNCH_ENV];
    else process.env[LAUNCH_ENV] = previous;
  }
}

test("an unset launch credential is absent", () => {
  withLaunchEnv(undefined, () => {
    expect(readLaunchCredential()).toEqual({ kind: "absent" });
    expect(launchCredential()).toBeNull();
  });
});

test("a minted launch credential is accepted", () => {
  const id = mintAgentId();
  withLaunchEnv(id, () => {
    expect(readLaunchCredential()).toEqual({ kind: "ok", id });
    expect(launchCredential()).toBe(id);
  });
});

test("a malformed launch credential is refused, never exited", () => {
  withLaunchEnv("not-an-id", () => {
    expect(readLaunchCredential()).toEqual({ kind: "malformed", value: "not-an-id" });
    expect(() => launchCredential()).toThrow(CommandRefusal);
  });
});
