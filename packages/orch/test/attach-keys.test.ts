import { describe, expect, test } from "bun:test";
import { detachByte, splitAtDetach } from "../src/cli/detach-key.ts";
import { attachTitle, screenOutput } from "../src/commands/attach.ts";
import { SETTINGS_DEFAULTS } from "../src/settings/schema.ts";

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);
const text = (data: Uint8Array): string => new TextDecoder().decode(data);

describe("the detach key", () => {
  test("is the control byte its chord names", () => {
    expect(detachByte("ctrl-]")).toBe(0x1d);
    expect(detachByte("ctrl-a")).toBe(0x01);
    expect(detachByte("CTRL-Q")).toBe(0x11);
    expect(detachByte("ctrl-\\")).toBe(0x1c);
    expect(detachByte(SETTINGS_DEFAULTS.attach.detach_key)).toBe(0x1d);
  });

  test("refuses a chord that is not ctrl- and one character", () => {
    expect(() => detachByte("alt-x")).toThrow("a detach key is ctrl-");
    expect(() => detachByte("ctrl-ab")).toThrow("a detach key is ctrl-");
    expect(() => detachByte("ctrl-1")).toThrow("a detach key is ctrl-");
  });

  test("passes every other key through untouched", () => {
    const typed = bytes("ls -la\r\x1b[Aé");
    const { forward, detached } = splitAtDetach(typed, 0x1d);
    expect(detached).toBe(false);
    expect(text(forward)).toBe("ls -la\r\x1b[Aé");
  });

  test("detaches, sending what came before it and nothing after", () => {
    const { forward, detached } = splitAtDetach(bytes("abc\x1ddef"), 0x1d);
    expect(detached).toBe(true);
    expect(text(forward)).toBe("abc");
    const alone = splitAtDetach(bytes("\x1d"), 0x1d);
    expect(alone.detached).toBe(true);
    expect(alone.forward.length).toBe(0);
  });
});

describe("the viewer's terminal", () => {
  test("a snapshot clears the screen before drawing; output is written as is", () => {
    expect(screenOutput({ kind: "snapshot", data: "hello" })).toBe("\x1b[H\x1b[2J\x1b[3Jhello");
    expect(screenOutput({ kind: "data", data: "\x1b[1mbold" })).toBe("\x1b[1mbold");
  });

  test("the title names the agent and its host", () => {
    expect(attachTitle("api-routes", "gpu1")).toBe("\x1b]0;api-routes on gpu1\x07");
  });
});
