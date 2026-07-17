import { describe, expect, test } from "bun:test";
import { paneForeground, doReload } from "../src/commands/lifecycle.ts";

describe("commands/lifecycle", () => {
  test("capability helpers fail closed when absent", () => {
    expect(paneForeground({} as never, "p1")).toEqual([]);
    expect(doReload({ sendKeys: () => false } as never, "p1", "headless~local~1", "reload")).toEqual(expect.objectContaining({ pane: "p1", ok: false }) as ReturnType<typeof doReload>);
  });
  test("reports missing bridge pid without touching backend", () => expect(doReload({ sendKeys: () => { throw new Error("should not send"); } } as never, "p1", "missing~local~1", "reload")).toMatchObject({ ok: false }));
});
