import { describe, expect, test } from "bun:test";
import { workerTools } from "../src/commands/spawn.ts";
import type { OrchConfig } from "../src/config.ts";

const config = (workerPeerTools?: boolean): OrchConfig => ({
  runtime: "node",
  installed: { adapters: [], backends: [] },
  locked_commands: [],
  defaults: { worktree: false },
  fleet: { worker_peer_tools: workerPeerTools ?? false, spawn_cap: 8, cross_workspace: false, workspace_caps: {} },
  models: { allowed: [] },
  queue: { max_retries: 1 },
  timeouts: { dispatch_ack_ms: 10_000, wait_ms: 300_000, adapter_command_ms: 60_000, notify_ms: 3_000 },
  notify: [],
  hosts: {},
  workspaces: {},
});

describe("worker tool policy", () => {
  test("default spawn omits peer tools", () => {
    const tools = workerTools(config());

    expect(tools).toBe("read,write,edit,bash,orch_ask");
    expect(tools).not.toContain("orch_agents");
    expect(tools).not.toContain("orch_send");
    expect(tools).not.toContain("orch_read");
  });

  test("explicitly disabled peer tools are omitted", () => {
    expect(workerTools(config(false))).toBe("read,write,edit,bash,orch_ask");
  });

  test("config enables all peer tools", () => {
    expect(workerTools(config(true))).toBe(
      "read,write,edit,bash,orch_ask,orch_agents,orch_send,orch_read",
    );
  });
});
