import { describe, expect, test } from "bun:test";
import { workerTools } from "../src/commands.ts";
import type { OrchConfig } from "../src/config.ts";

const config = (workerPeerTools?: boolean): OrchConfig => ({
  installed: { adapters: [], backends: [] },
  defaults: workerPeerTools === undefined ? {} : { worker_peer_tools: workerPeerTools },
  queue: { max_retries: 1 },
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
