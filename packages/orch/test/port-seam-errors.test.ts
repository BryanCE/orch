import { describe, expect, test } from "bun:test";
import * as herdrCli from "../src/backends/herdr/cli.ts";

const { herdrAck, herdrPanes, setHerdrExecutor } = herdrCli;

function failHerdr(): () => void {
  return setHerdrExecutor(() => {
    throw Object.assign(new Error("command failed"), {
      status: 23,
      stderr: "real stderr",
      stdout: "real stdout",
    });
  });
}

describe("port seam error contract", () => {
  test("provider mutation errors preserve argv, exit status, stderr, and stdout", () => {
    const restoreExecutor = failHerdr();
    try {
      expect(() => herdrAck(["pane", "rename", "p1", "new name"])).toThrow(
        /herdr pane rename p1 new name failed: exit status 23; stderr: real stderr; stdout: real stdout/,
      );
    } finally {
      restoreExecutor();
    }
  });

  test("provider query errors throw instead of returning a sentinel", () => {
    const restoreExecutor = failHerdr();
    try {
      expect(() => herdrPanes()).toThrow(/herdr pane list failed: exit status 23; stderr: real stderr; stdout: real stdout/);
    } finally {
      restoreExecutor();
    }
  });
});
