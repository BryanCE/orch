// What a person sees of the monitor tool: a compact line for each event in the transcript, a
// widget naming each running watch, and `/monitors`, a board of every watch with its output.
import type { ExtensionCommandContext, ExtensionUIContext, KeybindingsManager, Theme } from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";
import { Text, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { formatElapsed } from "../seat/domain.ts";
import { hasTheme } from "../seat/index.ts";
import type { HarnessContext } from "orch/core/types/agent.ts";
import type { Watch, WatchEnd } from "./watch.ts";
import type { Watches } from "./watches.ts";
import { LiveRender } from "../ui/live-render.ts";

type TUI = Parameters<Parameters<ExtensionUIContext["custom"]>[0]>[0];

export const MONITOR_MESSAGE = "monitor";
const WIDGET_ID = "monitor";
const RUNNING = "◉";
const ENDED = "○";

/** How a watch ended, in words the agent and the board both read. */
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

/** One line naming a watch: its id, its state, how many events it sent, and for how long. */
function watchLine(watch: Watch, theme: Theme): string {
  const glyph = watch.running ? theme.fg("accent", RUNNING) : theme.fg("dim", ENDED);
  const facts = `${watch.events} event${watch.events === 1 ? "" : "s"} · ${formatElapsed(watch.startedAt)}`;
  return `${glyph} ${theme.fg("muted", watch.id)} ${watch.description} ${theme.fg("dim", `· ${facts}`)}`;
}

/** The transcript line for a monitor message: its header, then its first line or all of them. */
export function renderMonitorMessage(content: string, expanded: boolean, theme: Theme): string {
  const [header = "", ...lines] = content.split("\n");
  const shown = expanded ? lines : lines.slice(0, 1);
  const more = lines.length - shown.length;
  const body = shown.map((line) => `  ${line}`);
  if (more > 0) body.push(theme.fg("dim", `  … ${more} more line${more === 1 ? "" : "s"}`));
  return [`${theme.fg("accent", RUNNING)} ${theme.fg("muted", header)}`, ...body].join("\n");
}

/** Keep the widget above the editor naming each running watch, while any runs. */
export function showRunningWatches(ctx: HarnessContext, watches: Watches): () => void {
  const ui: unknown = ctx.ui;
  if (!ctx.hasUI || !hasTheme(ui)) return () => undefined;
  const theme = ui.theme;
  const draw = (): void => {
    const running = watches.running();
    ctx.ui.setWidget(WIDGET_ID, running.length === 0
      ? undefined
      : [...running.map((watch) => watchLine(watch, theme)), theme.fg("dim", "/monitors to view")]);
  };
  // The elapsed times tick along while a watch runs.
  const live = new LiveRender(draw, watches.subscribe(draw));
  draw();
  return () => {
    live.stop();
    ctx.ui.setWidget(WIDGET_ID, undefined);
  };
}

export async function openMonitorBoard(ctx: ExtensionCommandContext, watches: Watches): Promise<void> {
  if (watches.list().length === 0) {
    ctx.ui.notify("No monitors: nothing was watched in this session", "info");
    return;
  }
  await ctx.ui.custom<null>(
    (tui, theme, keybindings, done) => new MonitorBoard(tui, theme, keybindings, watches, done),
    { overlay: true, overlayOptions: { anchor: "center", width: "100%", maxHeight: "100%" } },
  );
}

/** Every watch of the session; enter opens one's output, x stops it, escape goes back. */
class MonitorBoard implements Component {
  private index = 0;
  private opened: string | null = null;
  private readonly live: LiveRender;

  constructor(
    private readonly tui: TUI,
    private readonly theme: Theme,
    private readonly keybindings: KeybindingsManager,
    private readonly watches: Watches,
    private readonly done: (value: null) => void,
  ) {
    this.live = new LiveRender(() => this.tui.requestRender(), watches.subscribe(() => this.tui.requestRender()));
  }

  invalidate(): void { return; }

  dispose(): void {
    this.live.stop();
  }

  private selected(): Watch | undefined {
    if (this.opened !== null) return this.watches.get(this.opened);
    const list = this.watches.list();
    this.index = Math.min(this.index, Math.max(0, list.length - 1));
    return list[this.index];
  }

  handleInput(data: string): void {
    if (this.keybindings.matches(data, "tui.select.cancel")) {
      if (this.opened !== null) this.opened = null;
      else if (this.live.stop()) this.done(null);
      this.tui.requestRender();
      return;
    }
    if (data === "x") {
      this.selected()?.halt({ kind: "stopped", by: "user" });
      return;
    }
    if (this.opened !== null) return;
    if (this.keybindings.matches(data, "tui.select.confirm")) this.opened = this.selected()?.id ?? null;
    else if (this.keybindings.matches(data, "tui.select.up") || data === "k") this.move(-1);
    else if (this.keybindings.matches(data, "tui.select.down") || data === "j") this.move(1);
    this.tui.requestRender();
  }

  private move(step: number): void {
    const count = this.watches.list().length;
    if (count > 0) this.index = (this.index + step + count) % count;
  }

  render(width: number): string[] {
    const bodyHeight = Math.max(6, (this.tui.terminal.rows || 30) - 5);
    const watch = this.opened === null ? undefined : this.watches.get(this.opened);
    const title = watch === undefined ? this.boardTitle() : `${watch.id} · ${watch.description}`;
    const body = watch === undefined ? this.boardRows(width - 2) : this.outputRows(watch, bodyHeight);
    const hint = watch === undefined ? "↑/↓/jk select · enter output · x stop · esc close" : "x stop · esc back";
    return frame(this.theme, width, title, body, bodyHeight, hint);
  }

  private boardTitle(): string {
    const running = this.watches.running().length;
    return `monitors · ${running} running of ${this.watches.list().length}`;
  }

  private boardRows(width: number): string[] {
    const theme = this.theme;
    return this.watches.list().flatMap((watch, row) => {
      const pointer = row === this.index ? theme.fg("accent", "› ") : "  ";
      const line = `${pointer}${watchLine(watch, theme)}`;
      const end = watch.end === null ? [] : [`    ${theme.fg("dim", endText(watch.end))}`];
      return [truncateToWidth(line, width), ...end];
    });
  }

  /** The newest lines of the watch's output, as many as fit. */
  private outputRows(watch: Watch, height: number): string[] {
    const status = watch.end === null ? `running · ${watch.command}` : endText(watch.end);
    return [this.theme.fg("dim", status), ...watch.tail.slice(-(height - 1))];
  }
}

/** A bordered overlay: title in the top border, body rows padded to the width, a hint below. */
function frame(theme: Theme, width: number, title: string, body: readonly string[], height: number, hint: string): string[] {
  const inner = width - 2;
  const label = ` ${truncateToWidth(title, Math.max(0, inner - 3))} `;
  const top = theme.fg("border", "╭─") + theme.fg("text", label) + theme.fg("border", "─".repeat(Math.max(0, inner - 1 - visibleWidth(label))) + "╮");
  const side = theme.fg("border", "│");
  const rows = Array.from({ length: height }, (_, row) => {
    const text = truncateToWidth(body[row] ?? "", inner);
    return side + text + " ".repeat(Math.max(0, inner - visibleWidth(text))) + side;
  });
  const bottom = theme.fg("border", "╰" + "─".repeat(inner) + "╯");
  return [top, ...rows, bottom, truncateToWidth(theme.fg("dim", `  ${hint}`), width)];
}

/** The renderer for monitor messages, as pi's transcript asks for one. */
export function monitorMessageComponent(content: string, expanded: boolean, outputPad: number, theme: Theme): Text {
  return new Text(renderMonitorMessage(content, expanded, theme), outputPad, 0);
}
