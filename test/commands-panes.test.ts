import { describe, expect, test } from "bun:test";
import { cmdPanes } from "../src/commands/panes.ts";
import { parseIdentity } from "../src/backends/identity.ts";

describe("commands/panes", () => {
  test("pane identity remains backend-neutral", () => expect(parseIdentity("headless~local~42")).toEqual({ backend: "headless", workspace: "local", handle: "42" }));
  test("exports the pane listing command directly", () => expect(cmdPanes).toBeFunction());
});
