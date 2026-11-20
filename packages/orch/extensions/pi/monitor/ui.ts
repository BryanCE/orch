// What a person sees of the monitor tool, laid out as Claude Code lays out its own monitors:
// a footer item counting the running watches, ↓ from an empty editor to select it, and a panel
// in place of the editor that lists the watches and shows one's status, script and output.
// Each event also shows in the transcript as one compact line.
import type { ExtensionUIContext, Theme } from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";
import { Text, matchesKey, truncateToWidth, visibleWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import { formatElapsed } from "../seat/domain.ts";
import { hasTheme } from "../seat/index.ts";
import { LiveRender } from "../ui/live-render.ts";
import type { Watch, WatchEnd } from "./watch.ts";
import type { Watches } from "./watches.ts";

type TUI = Parameters<Parameters<ExtensionUIContext["custom"]>[0]>[0];

/** The UI surface the monitor's views need from the harness. */
export type MonitorUi = Pick<ExtensionUIContext, "setStatus" | "onTerminalInput" | "getEditorText" | "custom" | "notify" | "theme">;

export const MONITOR_MESSAGE = "monitor";
const STATUS_ID = "monitor";
const RUNNING = "◉";
const ENDED = "○";
/** Rows of the panel that are not the output box: title, kind, facts, labels, hints. */
const PANEL_CHROME_ROWS = 14;
/** The width of a fact's label column, `Runtime:` and a gap. */
const LABEL_WIDTH = 10;

export function isMonitorUi(ui: unknown): ui is MonitorUi {
  if (!hasTheme(ui)) return false;
  return ["setStatus", "onTerminalInput", "getEditorText", "custom", "notify"].every((name) => typeof Reflect.get(ui, name) === "function");
}

/** How a watch ended, in words the agent and the panel both read. */
export function endText(end: WatchEnd): string {
  switch (end.kind) {
    case "exited":
      return end.code === null ? "was killed" : `exited with code ${end.code}`;
    case "stopped":
      return end.by === "user" ? "was stopped by the user" : "was stopped";
    case "timed-out":
      return "reached its timeout and was stopped; start it again if you still need it";
    case "flooded":
      return `sent more than ${end.limit} events in a minute and was stopped; watch it again with a tighter filter`;
    case "failed":
      return `could not start: ${end.error}`;
    default: {
      const exhaustive: never = end;
      return exhaustive;
    }
  }
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** The transcript line for a monitor message: its header, then its first line or all of them. */
export function renderMonitorMessage(content: string, expanded: boolean, theme: Theme): string {
  const [header = "", ...lines] = content.split("\n");
  const shown = expanded ? lines : lines.slice(0, 1);
  const more = lines.length - shown.length;
  const body = shown.map((line) => `  ${line}`);
  if (more > 0) body.push(theme.fg("dim", `  … ${plural(more, "more line")}`));
  return [`${theme.fg("accent", RUNNING)} ${theme.fg("muted", header)}`, ...body].join("\n");
}

/** The renderer for monitor messages, as pi's transcript asks for one. */
export function monitorMessageComponent(content: string, expanded: boolean, outputPad: number, theme: Theme): Text {
  return new Text(renderMonitorMessage(content, expanded, theme), outputPad, 0);
}

/**
 * The footer item: `◉ 2 monitors · ↓ to manage` while any watch runs. ↓ from an empty editor
 * selects it; enter or space opens the panel; escape, ↑ or any other key lets go of it.
 */
export function attachMonitorFooter(ui: MonitorUi, watches: Watches): () => void {
  let selected = false;
  let panelOpen = false;

  const draw = (): void => {
    const running = watches.running().length;
    if (running === 0) selected = false;
    const label = plural(running, "monitor");
    const theme = ui.theme;
    ui.setStatus(STATUS_ID, running === 0
      ? undefined
      : selected
        ? `${theme.inverse(` ${label} `)}${theme.fg("dim", " · enter to view · esc to cancel")}`
        : `${theme.fg("accent", RUNNING)} ${label}${theme.fg("dim", " · ↓ to manage")}`);
  };

  const release = (): void => {
    selected = false;
    draw();
  };

  const open = (): void => {
    panelOpen = true;
    void openMonitorPanel(ui, watches).finally(() => { panelOpen = false; });
  };

  const stopInput = ui.onTerminalInput((data) => {
    if (panelOpen) return undefined;
    if (!selected) {
      if (!matchesKey(data, "down") || watches.running().length === 0 || ui.getEditorText() !== "") return undefined;
      selected = true;
      draw();
      return { consume: true };
    }
    release();
    if (matchesKey(data, "enter") || matchesKey(data, "space")) open();
    else if (!matchesKey(data, "escape") && !matchesKey(data, "up")) return undefined;
    return { consume: true };
  });
  const unsubscribe = watches.subscribe(draw);
  draw();
  return () => {
    stopInput();
    unsubscribe();
    ui.setStatus(STATUS_ID, undefined);
  };
}

/** The panel in place of the editor: the watch list, or one watch when the session has one. */
export async function openMonitorPanel(ui: Pick<ExtensionUIContext, "custom" | "notify">, watches: Watches): Promise<void> {
  if (watches.list().length === 0) {
    ui.notify("No monitors: nothing was watched in this session", "info");
    return;
  }
  await ui.custom<null>((tui, theme, _keybindings, done) => new MonitorPanel(tui, theme, watches, done));
}

class MonitorPanel implements Component {
  private index = 0;
  private opened: string | null;
  private readonly live: LiveRender;

  constructor(
    private readonly tui: TUI,
    private readonly theme: Theme,
    private readonly watches: Watches,
    private readonly done: (value: null) => void,
  ) {
    const list = watches.list();
    this.opened = list.length === 1 ? list[0]!.id : null;
    this.live = new LiveRender(() => this.tui.requestRender(), watches.subscribe(() => this.tui.requestRender()));
  }

  invalidate(): void { return; }

  dispose(): void {
    this.live.stop();
  }

  private close(): void {
    if (this.live.stop()) this.done(null);
  }

  private selected(): Watch | undefined {
    if (this.opened !== null) return this.watches.get(this.opened);
    const list = this.watches.list();
    this.index = Math.min(this.index, Math.max(0, list.length - 1));
    return list[this.index];
  }

  handleInput(data: string): void {
    if (matchesKey(data, "escape")) this.close();
    else if (data === "x") this.selected()?.halt({ kind: "stopped", by: "user" });
    else if (this.opened !== null) this.detailInput(data);
    else this.listInput(data);
    this.tui.requestRender();
  }

  private detailInput(data: string): void {
    if (matchesKey(data, "enter") || matchesKey(data, "space")) this.close();
    else if (matchesKey(data, "left")) {
      if (this.watches.list().length > 1) this.opened = null;
      else this.close();
    }
  }

  private listInput(data: string): void {
    const count = this.watches.list().length;
    if (matchesKey(data, "enter") || matchesKey(data, "space")) this.opened = this.selected()?.id ?? null;
    else if (matchesKey(data, "up") || data === "k") this.index = (this.index - 1 + count) % count;
    else if (matchesKey(data, "down") || data === "j") this.index = (this.index + 1) % count;
  }

  render(width: number): string[] {
    const watch = this.opened === null ? undefined : this.watches.get(this.opened);
    const lines = watch === undefined ? this.listLines() : this.detailLines(watch, width);
    return lines.map((line) => truncateToWidth(line, width));
  }

  private listLines(): string[] {
    const theme = this.theme;
    const rows = this.watches.list().map((watch, row) => {
      const pointer = row === this.index ? theme.fg("accent", "› ") : "  ";
      const glyph = watch.running ? theme.fg("accent", RUNNING) : theme.fg("dim", ENDED);
      const state = watch.end === null ? `${plural(watch.events, "event")} · ${formatElapsed(watch.startedAt)}` : endText(watch.end);
      return `${pointer}${glyph} ${watch.description} ${theme.fg("dim", `· ${state}`)}`;
    });
    return [
      `${theme.fg("accent", theme.bold("Monitors"))} ${theme.fg("dim", `· ${this.watches.running().length} running`)}`,
      "",
      ...rows,
      "",
      theme.fg("dim", "↑/↓ to select · Enter to view · x to stop · Esc to close"),
    ];
  }

  private detailLines(watch: Watch, width: number): string[] {
    const theme = this.theme;
    const boxRows = Math.max(3, (this.tui.terminal.rows || 30) - PANEL_CHROME_ROWS);
    const shown = watch.tail.slice(-boxRows);
    const back = this.watches.list().length > 1 ? "← to go back · " : "";
    return [
      theme.fg("accent", theme.bold(watch.description)),
      theme.fg("dim", "monitor"),
      "",
      ...fact(theme, "Status:", watch.end === null ? "running" : endText(watch.end), width),
      ...fact(theme, "Runtime:", formatElapsed(watch.startedAt), width),
      ...fact(theme, "Script:", watch.command, width),
      "",
      theme.bold("Output"),
      ...outputBox(theme, shown, boxRows, width),
      theme.fg("dim", theme.italic(`Showing ${plural(shown.length, "line")}`)),
      "",
      theme.fg("dim", `${back}x to stop · Enter/Space to close · Esc to close`),
    ];
  }
}

/** A labelled fact; a long value wraps onto lines indented under its first. */
function fact(theme: Theme, label: string, value: string, width: number): string[] {
  const [first = "", ...rest] = wrapTextWithAnsi(value, Math.max(1, width - LABEL_WIDTH));
  const indent = " ".repeat(LABEL_WIDTH);
  return [`${theme.bold(label.padEnd(LABEL_WIDTH))}${first}`, ...rest.map((line) => `${indent}${line}`)];
}

/** The output lines in a rounded box of a fixed height, each cut to the box's width. */
function outputBox(theme: Theme, lines: readonly string[], height: number, width: number): string[] {
  const inner = Math.max(1, width - 4);
  const border = (text: string): string => theme.fg("border", text);
  const rows = Array.from({ length: height }, (_, row) => {
    const text = truncateToWidth(lines[row] ?? "", inner);
    return `${border("│")} ${text}${" ".repeat(Math.max(0, inner - visibleWidth(text)))} ${border("│")}`;
  });
  return [border(`╭${"─".repeat(inner + 2)}╮`), ...rows, border(`╰${"─".repeat(inner + 2)}╯`)];
}
