import { describe, expect, test } from "bun:test";
import { HerdrBackend } from "../src/backends/herdr/index.ts";
import { TmuxBackend } from "../src/backends/tmux/index.ts";
import { HeadlessBackend } from "../src/backends/headless/index.ts";
import type { Backend } from "../src/types/backend.ts";

/**
 * TASKS/10-review-findings.md 2.2 — "keep ONLY the nullable role objects — their
 * nullness IS the capability."
 *
 * Every plexer operation used to be reachable two ways: a top-level method AND a
 * one-line role forwarder to it. Two surfaces for one operation is what made call
 * sites hedge (`paneInventory?.list() ?? inventory?.()`), and it is why a role
 * could exist and still throw (bug 1.5). A capability is present exactly when its
 * role is non-null, so an operation must have NO second address.
 */
/**
 * Each operation, named by the role that OWNS it and the top-level method that
 * used to answer for it too. The second address is what must not exist.
 */
const OPERATION_OWNED_BY_A_ROLE: ReadonlyMap<string, string> = new Map([
  ["close", "paneHost.close"],
  ["list", "paneInventory.list"],
  ["inventory", "paneInventory.list"],
  ["focus", "paneHost/groupHome focus"],
  ["sendKeys", "paneInput.sendKeys"],
  ["read", "paneScreen.read"],
  ["zoom", "paneZoom.setZoom"],
  ["renamePane", "paneNaming.renamePane"],
  ["renameAgent", "agentNaming.renameAgent"],
  ["waitAgentStatus", "agentStatus.wait"],
  ["workspaces", "spaceHome.list"],
  ["createWorkspace", "spaceHome.create"],
  ["focusWorkspace", "spaceHome.focus"],
  ["handleFor", "handleLookup.handleFor"],
  ["pruneLogs", "logPruning.prune"],
  ["currentIdentity", "identity.current"],
  ["version", "versionInfo.installed"],
]);

describe("a backend exposes each operation exactly once (2.2)", () => {
  for (const [id, make] of [
    ["herdr", (): Backend => new HerdrBackend()],
    ["tmux", (): Backend => new TmuxBackend()],
    ["headless", (): Backend => new HeadlessBackend()],
  ] as const) {
    test(`${id} publishes no operation beside the role that owns it`, () => {
      const backend = make();
      const secondAddresses = [...OPERATION_OWNED_BY_A_ROLE]
        .filter(([name]) => Reflect.has(backend, name))
        .map(([name, owner]) => `${name} (owned by ${owner})`);
      expect(secondAddresses).toEqual([]);
    });
  }
});
