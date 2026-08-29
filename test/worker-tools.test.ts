import { describe, expect, test } from "bun:test";
import { workerTools } from "../src/policy/workers.ts";
import { SETTINGS_DEFAULTS, type OrchConfig } from "../src/config.ts";

const config = (workerPeerTools?: boolean, allowTools: string[] = []): OrchConfig => ({
  ...SETTINGS_DEFAULTS,
  runtime: "node",
  enabled: { adapters: [], backends: [] },
  locked_commands: [],
  defaults: { models: {}, worktree: false },
  fleet: { worker_peer_tools: workerPeerTools ?? false, spawn_cap: 8, cross_space: false, space_caps: {} },
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
    expect(workerTools(config())).toBeUndefined();
    expect(workerTools(config(true))).toBeUndefined();
  });

  test("a configured allowlist always carries orch's own tools", () => {
    const tools = workerTools(config(false, ["read", "bash"]));

    expect(tools).toBe("read,bash,orch_ask");
    expect(tools).not.toContain("orch_send");
  });

  test("peer tools join the allowlist when the fleet enables them", () => {
    expect(workerTools(config(true, ["read"]))).toBe("read,orch_ask,orch_agents,orch_send,orch_read");
  });
});
