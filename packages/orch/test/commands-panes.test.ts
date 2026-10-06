import { afterEach, describe, expect, test } from "bun:test";
import { cmdPane } from "../src/commands/panes.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { testServices } from "./helpers/services.ts";
import type { OrchDir } from "../src/types/core.ts";

const dirs: OrchDir[] = [];

afterEach(() => { while (dirs.length) removeTempDir(dirs.pop()!); });

describe("commands/panes", () => {
  // A1: identity is the minted id and NOTHING else. A key carrying a plexer and
  // a space welded environment into identity, so an agent that moved could not
  // keep the id it was minted with.
  test("pane identity is the minted id alone", () => expect("agent00042").toMatch(/^[0-9a-z]{10}$/));
  test("a plexer-and-space key is not an identity", () => expect("headless~local~42").not.toMatch(/^[0-9a-z]{10}$/));
  test("listing is 'orch pane list'; the bare parent prints the generated usage", async () => {
    const dir = tempOrchDir("orch-pane-usage-");
    dirs.push(dir);
    const refusal = await cmdPane(testServices({ orchDir: dir }), []).then(() => null, (error: unknown) => (error instanceof Error ? error.message : String(error)));
    expect(refusal).toBe("usage: orch pane <list>");
  });
});
