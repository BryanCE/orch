import { describe, expect, test } from "bun:test";
import { headlessBackend } from "../src/backends/headless/index.ts";
import { heldBackend } from "../src/backends/held/index.ts";
import { herdrBackend } from "../src/backends/herdr/index.ts";
import { orcaBackend } from "../src/backends/orca/index.ts";
import { tmuxBackend } from "../src/backends/tmux/index.ts";
import { nativeForm, offersForm } from "../src/types/form.ts";

describe("forms and backend stdio", () => {
  test("selects the native form from the first offered stdio", () => {
    expect(nativeForm(["terminal"])).toBe("tui");
    expect(nativeForm(["none"])).toBe("oneshot");
    expect(nativeForm(["terminal", "pipes"])).toBe("tui");
    expect(nativeForm([])).toBeNull();
  });

  test("checks whether a backend offers a form's stdio", () => {
    expect(offersForm(["terminal", "pipes"], "acp")).toBe(true);
    expect(offersForm(["terminal"], "acp")).toBe(false);
    expect(offersForm(["none"], "oneshot")).toBe(true);
  });

  test("declares each backend's offered stdio", () => {
    expect(herdrBackend.offers).toEqual(["terminal"]);
    expect(tmuxBackend.offers).toEqual(["terminal"]);
    expect(orcaBackend.offers).toEqual(["terminal"]);
    expect(headlessBackend.offers).toEqual(["none"]);
    expect(heldBackend.offers).toEqual(["terminal", "pipes"]);
  });
});
