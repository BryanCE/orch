import { describe, expect, test } from "bun:test";
import { workerTools } from "../src/policy/workers.ts";
import type { OrchConfig } from "../src/config.ts";

const config = (workerPeerTools?: boolean, allowTools: string[] = []): OrchConfig => ({
  runtime: "node",
  installed: { adapters: [], backends: [] },
  locked_commands: [],
  defaults: { models: {}, worktree: false },
  fleet: { worker_peer_tools: workerPeerTools ?? false, spawn_cap: 8, cross_workspace: false, workspace_caps: {} },
  models: { allowed: {} },
  workers: { inherit_extensions: true, exclude_extensions: [], builtin_tools: true, allow_tools: allowTools },
  queue: { max_retries: 1 },
  daemon: { tcp_port: 3716 },
  timeouts: { dispatch_ack_ms: 10_000, wait_ms: 300_000, adapter_command_ms: 60_000, notify_ms: 3_000 },
  notify: [],
  hosts: {},
  workspaces: {},
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
