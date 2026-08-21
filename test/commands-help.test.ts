import { describe, expect, test } from "bun:test";
import { helpTopic } from "../src/commands/help.ts";

describe("per-command help topics", () => {
  test("daemon help names every subcommand and the idle shutdown setting", () => {
    const topic = helpTopic("daemon");
    expect(topic).toContain("orch daemon start");
    expect(topic).toContain("stop");
    expect(topic).toContain("reload");
    expect(topic).toContain("idle_shutdown_minutes");
  });

  test("aliases resolve to their command's topic", () => {
    expect(helpTopic("kill")).toBe(helpTopic("close"));
    expect(helpTopic("new")).toBe(helpTopic("reset"));
    expect(helpTopic("-V")).toBe(helpTopic("version"));
  });

  test("an unknown name has no topic", () => {
    expect(helpTopic("frobnicate")).toBeNull();
  });

  test("every topic is printable text ending in a newline", () => {
    for (const name of ["status", "spawn", "dispatch", "queue", "lock", "review", "settings", "doctor", "setup", "close", "reset", "help"]) {
      const topic = helpTopic(name);
      expect(topic).not.toBeNull();
      expect(topic!.endsWith("\n")).toBe(true);
    }
  });
});
