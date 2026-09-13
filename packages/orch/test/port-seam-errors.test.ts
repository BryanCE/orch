import { describe, expect, test } from "bun:test";
import { createHerdrCli, type HerdrExecutor } from "../src/backends/herdr/cli.ts";

const failExecutor: HerdrExecutor = () => {
    throw Object.assign(new Error("command failed"), {
      status: 23,
      stderr: "real stderr",
      stdout: "real stdout",
    });
};

describe("port seam error contract", () => {
  test("provider mutation errors preserve argv, exit status, stderr, and stdout", () => {
    const cli = createHerdrCli(failExecutor);
    expect(() => cli.ack(["pane", "rename", "p1", "new name"])).toThrow(
      /herdr pane rename p1 new name failed: exit status 23; stderr: real stderr; stdout: real stdout/,
    );
  });

  test("provider query errors throw instead of returning a sentinel", () => {
    const cli = createHerdrCli(failExecutor);
    expect(() => cli.panes()).toThrow(/herdr pane list failed: exit status 23; stderr: real stderr; stdout: real stdout/);
  });
});
