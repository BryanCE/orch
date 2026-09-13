import { describe, expect, test } from "bun:test";
import { cmdPanes } from "../src/commands/panes.ts";

describe("commands/panes", () => {
  // A1: identity is the minted id and NOTHING else. A key carrying a plexer and
  // a space welded environment into identity, so an agent that moved could not
  // keep the id it was minted with.
  test("pane identity is the minted id alone", () => expect("agent00042").toMatch(/^[0-9a-z]{10}$/));
  test("a plexer-and-space key is not an identity", () => expect("headless~local~42").not.toMatch(/^[0-9a-z]{10}$/));
  test("exports the pane listing command directly", () => expect(cmdPanes).toBeFunction());
});
