import { afterEach, describe, expect, test } from "bun:test";
import { herdrAck, herdrPanes, setHerdrExecutor } from "../src/backends/herdr/cli.ts";

let restoreExecutor: (() => void) | undefined;

afterEach(() => {
  restoreExecutor?.();
  restoreExecutor = undefined;
});

function failHerdr(): void {
  restoreExecutor = setHerdrExecutor(() => {
    throw Object.assign(new Error("command failed"), {
      status: 23,
      stderr: "real stderr",
      stdout: "real stdout",
    });
  });
}

describe("port seam error contract", () => {
  test("provider mutation errors preserve argv, exit status, stderr, and stdout", () => {
    failHerdr();
    expect(() => herdrAck(["pane", "rename", "p1", "new name"])).toThrow(
      /herdr pane rename p1 new name failed: exit status 23; stderr: real stderr; stdout: real stdout/,
    );
  });

  test("provider query errors throw instead of returning a sentinel", () => {
    failHerdr();
    expect(() => herdrPanes()).toThrow(/herdr pane list failed: exit status 23; stderr: real stderr; stdout: real stdout/);
  });
});
