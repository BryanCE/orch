import { describe, expect, test } from "bun:test";
import { workerTools } from "../src/policy/workers.ts";
import { SETTINGS_DEFAULTS } from "../src/settings/schema.ts";
import type { OrchSettings } from "../src/types/settings.ts";

const settings = (workerPeerTools?: boolean, allowTools: string[] = []): OrchSettings => ({
  ...SETTINGS_DEFAULTS,
  runtime: "node",
  enabled: { adapters: [], backends: [] },
  locked_commands: [],
  defaults: { models: {}, worktree: false },
  fleet: { worker_peer_tools: workerPeerTools ?? false, max_agents_per_pack: 10, max_depth: 1, cross_space: false, max_agents_per_space: {} },
  models: { allowed: {}, preferred: {} },
  workers: { inherit_extensions: true, exclude_extensions: [], builtin_tools: true, allow_tools: allowTools },
  queue: { max_retries: 1 },
  daemon: { tcp_port: 3716, idle_shutdown_minutes: 30 },
  timeouts: { dispatch_ack_ms: 10_000, wait_ms: 300_000, adapter_command_ms: 60_000, notify_ms: 3_000 },
  notify: [],
  hosts: {},
  spaces: {},
  tiling: { first_split: "rows" },
  skills: { install: true, roots: ["~/.claude/skills", "~/.agents/skills"] },
});

describe("worker tool policy", () => {
  test("no configured allowlist restricts nothing", () => {
    // A hardcoded allowlist is what left workers without grep or subagent tools.
    expect(workerTools(settings())).toBeUndefined();
    expect(workerTools(settings(true))).toBeUndefined();
  });

  test("a configured allowlist always carries orch's own tools", () => {
    const tools = workerTools(settings(false, ["read", "bash"]));

    expect(tools).toBe("read,bash,orch_ask");
    expect(tools).not.toContain("orch_send");
  });

  test("peer tools join the allowlist when the fleet enables them", () => {
    expect(workerTools(settings(true, ["read"]))).toBe("read,orch_ask,orch_agents,orch_send,orch_read");
  });
});
