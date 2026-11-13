import { describe, expect, test } from "bun:test";
import { claudeAdapter } from "../src/adapters/claude.ts";
import { codexAdapter } from "../src/adapters/codex.ts";
import { opencodeAdapter } from "../src/adapters/opencode.ts";
import { piAdapter } from "../src/adapters/pi.ts";
import { harnessTraits } from "../src/daemon/server/spawn/index.ts";

describe("a spawn's start-up signal follows the form", () => {
  test("an acp agent is up when its session link attaches", () => {
    expect(harnessTraits(codexAdapter, "acp").startup).toBe("bridge");
  });

  test("an opencode server agent is up when its session link attaches", () => {
    expect(harnessTraits(opencodeAdapter, "server").startup).toBe("bridge");
  });

  test("a codex tui agent has no start-up signal", () => {
    expect(harnessTraits(codexAdapter, "tui").startup).toBeNull();
  });

  test("a claude tui agent is up on its start hook", () => {
    expect(harnessTraits(claudeAdapter, "tui").startup).toBe("start");
  });

  test("a pi agent is up when its bridge attaches, in any form", () => {
    expect(harnessTraits(piAdapter, "tui").startup).toBe("bridge");
    expect(harnessTraits(piAdapter, null).startup).toBe("bridge");
  });
});
