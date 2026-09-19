import { describe, expect, test } from "bun:test";
import { registerPiMonitorUi, type MonitorEntry, type MonitorView } from "../extensions/pi/monitor-ui.ts";

function fixture() {
  const items: MonitorEntry[] = [
    { key: "a", source: "pi", status: "working", runtime: "node", output: "hello" },
    { key: "b", source: "codex", status: "done", runtime: "deno", output: "bye" },
  ];
  const listeners: (() => void)[] = [];
  const stopped: string[] = [];
  const view: MonitorView = {
    list: () => items,
    detail: (key) => items.find((item) => item.key === key),
    stop: (key) => { stopped.push(key); },
    subscribe: (listener) => { listeners.push(listener); return () => undefined; },
  };
  let component: { render(width: number): string[]; handleInput(data: string): void } | undefined;
  let command: ((args: string | undefined, ctx: { hasUI: boolean }) => Promise<void> | void) | undefined;
  const widgets: (string[] | undefined)[] = [];
  registerPiMonitorUi(
    { registerCommand: (_name, options) => { command = options.handler; } },
    {
      setWidget: (_key, content) => { widgets.push(content); },
      custom: <T>(factory) => {
        component = factory({ requestRender: () => undefined }, { fg: (_color, text) => text }, undefined, () => undefined);
        return new Promise<T>(() => undefined);
      },
    },
    view,
  );
  return { items, listeners, stopped, widgets, get component() { return component; }, command };
}

describe("Pi monitor inspection UI", () => {
  test("renders accent count widget and list/details navigation", async () => {
    const f = fixture();
    expect(f.widgets.at(-1)).toEqual(["2 monitors · /monitors"]);
    void f.command?.(undefined, { hasUI: true });
    const panel = f.component;
    if (!panel) throw new Error("panel was not opened");
    expect(panel.render(80).join("\n")).toContain("Monitors");
    panel.handleInput("\x1b[B");
    panel.handleInput("\r");
    const detail = panel.render(80).join("\n");
    expect(detail).toContain("source: codex");
    expect(detail).toContain("runtime: deno");
    expect(detail).toContain("output: bye");
    panel.handleInput("x");
    expect(f.stopped).toEqual(["b"]);
  });

  test("change callback refreshes the count widget", () => {
    const f = fixture();
    f.items.pop();
    f.listeners.forEach((listener) => listener());
    expect(f.widgets.at(-1)).toEqual(["1 monitor · /monitors"]);
  });
});
