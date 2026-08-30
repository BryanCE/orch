/**
 * The orchestrator seat's two views, adapted from Ben Davis's subagents UI
 * (davis7dotsh/my-pi-setup, extensions/subagents/src/ui/takeover.ts):
 * - PackDashboard: full overlay listing every agent this session spawned.
 * - AgentView: full view of ONE orch agent — live transcript window, an input
 *   line that steers it through orch delivery, `x` to abort via the dispatcher.
 *
 * The agents live in their own panes and never die with this seat; both views
 * are windows into orch, not hosts of anything.
 */
import type { ExtensionCommandContext, ExtensionUIContext, KeybindingsManager, Theme, ThemeColor } from "@earendil-works/pi-coding-agent";
import type { Component, Focusable } from "@earendil-works/pi-tui";
import { Input, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { ALERT_STATES, formatElapsed } from "../domain.ts";
import { transcriptLines } from "./transcript.ts";
import type { PackReadView, PackSnapshot, TranscriptCache } from "../../types/seat.ts";

const SQUARE = "■";
type TUI = Parameters<Parameters<ExtensionUIContext["custom"]>[0]>[0];

function stateColor(state: string): ThemeColor {
  if (state === "working" || state === "spawning") return "warning";
  if (ALERT_STATES.has(state)) return "error";
  if (state === "done") return "success";
  return "dim";
}

function stateGlyph(snapshot: PackSnapshot, theme: Theme): string {
  return theme.fg(stateColor(snapshot.state), SQUARE);
}

function stateWord(snapshot: PackSnapshot, theme: Theme): string {
  return theme.fg(stateColor(snapshot.state), snapshot.state);
}

function configuredKeys(keybindings: KeybindingsManager, binding: Parameters<KeybindingsManager["getKeys"]>[0]): string {
  return keybindings.getKeys(binding).join("/") || "unbound";
}

// --- Entry points --------------------------------------------------------------

async function openAgentView(ctx: ExtensionCommandContext, view: PackReadView, key: string): Promise<void> {
  if (!view.get(key)) return;
  view.refresh(key);
  await ctx.ui.custom<null>(
    (tui, theme, keybindings, done) => new AgentView(tui, theme, keybindings, key, view, done),
    {
      overlay: true,
      overlayOptions: { anchor: "center", width: "100%", maxHeight: "100%" },
    },
  );
}

export async function openPackDashboard(ctx: ExtensionCommandContext, view: PackReadView): Promise<void> {
  const selection: DashboardSelection = { index: 0 };

  while (true) {
    if (view.size() === 0) {
      ctx.ui.notify("No agents: this session has not spawned any", "info");
      return;
    }

    const picked = await ctx.ui.custom<string | null>(
      (tui, theme, keybindings, done) => new PackDashboard(tui, theme, keybindings, view, selection, done),
      {
        overlay: true,
        overlayOptions: { anchor: "center", width: "100%", maxHeight: "100%" },
      },
    );

    if (!picked) return;
    if (!view.get(picked)) continue;

    await openAgentView(ctx, view, picked);
    // Leaving the agent view falls back to the dashboard.
  }
}

// --- Dashboard (fullscreen overlay) ----------------------------------------------

interface DashboardSelection {
  id?: string;
  index: number;
}

export function reconcileDashboardSelection(selection: DashboardSelection, agents: readonly Pick<PackSnapshot, "key">[]): void {
  const stableIndex = selection.id ? agents.findIndex((snapshot) => snapshot.key === selection.id) : -1;
  selection.index = stableIndex >= 0
    ? stableIndex
    : Math.min(Math.max(0, selection.index), Math.max(0, agents.length - 1));
  selection.id = agents[selection.index]?.key;
}

class PackDashboard implements Component {
  private tui: TUI;
  private theme: Theme;
  private keybindings: KeybindingsManager;
  private view: PackReadView;
  private selection: DashboardSelection;
  private done: (value: string | null) => void;

  private closed = false;
  private ticker: ReturnType<typeof setInterval>;
  private unsubChange: () => void;

  constructor(
    tui: TUI,
    theme: Theme,
    keybindings: KeybindingsManager,
    view: PackReadView,
    selection: DashboardSelection,
    done: (value: string | null) => void,
  ) {
    this.tui = tui;
    this.theme = theme;
    this.keybindings = keybindings;
    this.view = view;
    this.selection = selection;
    this.done = done;
    // Elapsed times, costs, and states tick along at 1Hz.
    this.ticker = setInterval(() => this.tui.requestRender(), 1000);
    this.unsubChange = view.subscribe(() => this.tui.requestRender());
  }

  private agents(): readonly PackSnapshot[] {
    return this.view.list();
  }

  private cleanup(): boolean {
    if (this.closed) return false;
    this.closed = true;
    clearInterval(this.ticker);
    this.unsubChange();
    return true;
  }

  private close(result: string | null): void {
    if (this.cleanup()) this.done(result);
  }

  dispose(): void {
    this.cleanup();
  }

  handleInput(data: string): void {
    const agents = this.agents();
    reconcileDashboardSelection(this.selection, agents);

    if (this.keybindings.matches(data, "tui.select.cancel")) {
      this.close(null);
      return;
    }
    if (this.keybindings.matches(data, "tui.select.confirm")) {
      const snapshot = agents[this.selection.index];
      if (snapshot) this.close(snapshot.key);
      return;
    }
    if (this.keybindings.matches(data, "tui.select.up") || data === "k") {
      if (agents.length > 0) {
        this.selection.index = (this.selection.index - 1 + agents.length) % agents.length;
        this.selection.id = agents[this.selection.index]?.key;
        this.tui.requestRender();
      }
      return;
    }
    if (this.keybindings.matches(data, "tui.select.down") || data === "j") {
      if (agents.length > 0) {
        this.selection.index = (this.selection.index + 1) % agents.length;
        this.selection.id = agents[this.selection.index]?.key;
        this.tui.requestRender();
      }
      return;
    }
    if (data === "x") {
      const snapshot = agents[this.selection.index];
      if (snapshot?.state === "working") this.view.requestAbort(snapshot.key);
    }
  }

  private pad(text: string, width: number): string {
    const truncated = truncateToWidth(text, width);
    return truncated + " ".repeat(Math.max(0, width - visibleWidth(truncated)));
  }

  private borderSegment(width: number, title: string): string {
    const theme = this.theme;
    const label = title ? ` ${truncateToWidth(title, Math.max(0, width - 3))} ` : "";
    const labelWidth = visibleWidth(label);
    return theme.fg("border", "─")
      + (label ? theme.fg("text", label) : "")
      + theme.fg("border", "─".repeat(Math.max(0, width - 1 - labelWidth)));
  }

  render(width: number): string[] {
    const theme = this.theme;
    const agents = this.agents();
    reconcileDashboardSelection(this.selection, agents);

    const rows = this.tui.terminal.rows || 30;
    // Render exactly terminal rows - 1 so the overlay covers the header, chat,
    // editor, and extra footer lines while leaving pi's final footer row visible.
    const bodyHeight = Math.max(6, rows - 5);
    const innerWidth = width - 2;
    const lines: string[] = [];

    const headerLeft = theme.fg("accent", theme.bold("orch"));
    const headerRight = theme.fg("muted", `${agents.length} agent${agents.length === 1 ? "" : "s"}`);
    const headerPad = Math.max(1, width - visibleWidth(headerLeft) - visibleWidth(headerRight) - 4);
    lines.push(truncateToWidth(`  ${headerLeft}${" ".repeat(headerPad)}${headerRight}  `, width));

    const settled = agents.filter((snapshot) => snapshot.state !== "working").length;
    lines.push(theme.fg("border", "╭") + this.borderSegment(innerWidth, `agents · ${settled}/${agents.length} settled`) + theme.fg("border", "╮"));

    const divider = theme.fg("border", "│");
    const rowLines = this.renderRows(agents, innerWidth, bodyHeight);
    for (let i = 0; i < bodyHeight; i++) {
      lines.push(divider + this.pad(rowLines[i] ?? "", innerWidth) + divider);
    }

    lines.push(theme.fg("border", "╰") + theme.fg("border", "─".repeat(innerWidth)) + theme.fg("border", "╯"));
    lines.push(
      truncateToWidth(
        theme.fg(
          "dim",
          `  ${configuredKeys(this.keybindings, "tui.select.up")}/${configuredKeys(this.keybindings, "tui.select.down")}/jk select · ${configuredKeys(this.keybindings, "tui.select.confirm")} open · x abort · ${configuredKeys(this.keybindings, "tui.select.cancel")} close`,
        ),
        width,
      ),
    );
    return lines;
  }

  private renderRows(agents: readonly PackSnapshot[], width: number, height: number): string[] {
    const theme = this.theme;
    const out: string[] = [];

    let start = 0;
    if (agents.length > height) {
      start = Math.min(
        Math.max(0, this.selection.index - Math.floor(height / 2)),
        agents.length - height,
      );
    }
    const visible = agents.slice(start, start + height);

    for (let i = 0; i < visible.length; i++) {
      const snapshot = visible[i];
      if (!snapshot) continue;
      const index = start + i;
      const isSelected = index === this.selection.index;

      const marker = isSelected ? theme.fg("accent", "❯") : " ";
      const name = isSelected ? theme.fg("accent", snapshot.name) : theme.fg("text", snapshot.name);
      const left = ` ${marker} ${stateGlyph(snapshot, theme)} ${name}${snapshot.task ? ` ${theme.fg("dim", snapshot.task)}` : ""}`;

      const percent = snapshot.info.usage?.percent;
      const dot = theme.fg("dim", " · ");
      const rightParts = [
        ...(snapshot.model ? [theme.fg("muted", snapshot.model)] : []),
        ...(percent !== undefined ? [theme.fg("muted", `${Math.round(percent)}%`)] : []),
        ...(snapshot.cost !== undefined ? [theme.fg("muted", `$${snapshot.cost.toFixed(2)}`)] : []),
        theme.fg("muted", formatElapsed(snapshot)),
        stateWord(snapshot, theme),
      ];
      const right = `${rightParts.join(dot)} `;

      const rightWidth = visibleWidth(right);
      const leftMax = Math.max(0, width - rightWidth - 2);
      const leftTruncated = truncateToWidth(left, leftMax);
      const gap = Math.max(2, width - visibleWidth(leftTruncated) - rightWidth);
      out.push(truncateToWidth(leftTruncated + " ".repeat(gap) + right, width));
    }

    if (start > 0) {
      out[0] = truncateToWidth(theme.fg("dim", `   ... ${start} more`), width);
    }
    if (start + height < agents.length) {
      out[out.length - 1] = truncateToWidth(theme.fg("dim", `   ... ${agents.length - start - height} more`), width);
    }
    return out;
  }

  invalidate(): void { return; }
}

// --- Agent view (transcript window + steer input) -------------------------------

const TRANSCRIPT_SCROLL_STEP = 6;

class AgentView implements Component, Focusable {
  private tui: TUI;
  private theme: Theme;
  private keybindings: KeybindingsManager;
  private key: string;
  private view: PackReadView;
  private done: (value: null) => void;

  private input = new Input();
  /** Scroll offset in lines from the bottom of the transcript. 0 = pinned to bottom. */
  private scrollOffset = 0;
  private cache: TranscriptCache = { lines: [], readAt: 0, width: 0 };
  private unsubscribe: () => void;
  private renderTimer?: ReturnType<typeof setTimeout>;
  private ticker: ReturnType<typeof setInterval>;
  private closed = false;

  private _focused = false;
  get focused(): boolean {
    return this._focused;
  }
  set focused(value: boolean) {
    this._focused = value;
    this.input.focused = value;
  }

  constructor(
    tui: TUI,
    theme: Theme,
    keybindings: KeybindingsManager,
    key: string,
    view: PackReadView,
    done: (value: null) => void,
  ) {
    this.tui = tui;
    this.theme = theme;
    this.keybindings = keybindings;
    this.key = key;
    this.view = view;
    this.done = done;
    this.unsubscribe = view.subscribeTo(key, () => this.scheduleRender());
    // The transcript file grows without transitions; poll-render at 1Hz.
    this.ticker = setInterval(() => this.tui.requestRender(), 1000);
    this.input.onSubmit = (value: string) => {
      const text = value.trim();
      if (!text) return;
      this.input.setValue("");
      this.view.requestSend(this.key, text);
      this.scrollOffset = 0;
      this.tui.requestRender();
    };
  }

  private snap(): PackSnapshot | undefined {
    return this.view.get(this.key);
  }

  private scheduleRender(): void {
    if (this.renderTimer) return;
    // Bound repaint frequency so a chatty agent cannot starve input handling.
    this.renderTimer = setTimeout(() => {
      this.renderTimer = undefined;
      if (!this.closed) this.tui.requestRender();
    }, 50);
  }

  private cleanup(): boolean {
    if (this.closed) return false;
    this.closed = true;
    this.unsubscribe();
    clearInterval(this.ticker);
    if (this.renderTimer) clearTimeout(this.renderTimer);
    this.renderTimer = undefined;
    return true;
  }

  private close(): void {
    if (this.cleanup()) this.done(null);
  }

  dispose(): void {
    this.cleanup();
  }

  handleInput(data: string): void {
    if (this.keybindings.matches(data, "app.clear")) {
      const snapshot = this.snap();
      if (snapshot?.state === "working") this.view.requestAbort(this.key);
      return;
    }
    if (this.keybindings.matches(data, "app.interrupt") || this.keybindings.matches(data, "tui.select.cancel")) {
      this.close();
      return;
    }
    if (this.keybindings.matches(data, "tui.editor.cursorUp")) {
      this.scrollOffset += TRANSCRIPT_SCROLL_STEP;
      this.tui.requestRender();
      return;
    }
    if (this.keybindings.matches(data, "tui.editor.cursorDown")) {
      this.scrollOffset = Math.max(0, this.scrollOffset - TRANSCRIPT_SCROLL_STEP);
      this.tui.requestRender();
      return;
    }
    if (this.keybindings.matches(data, "tui.editor.pageUp")) {
      this.scrollOffset += this.viewportHeight();
      this.tui.requestRender();
      return;
    }
    if (this.keybindings.matches(data, "tui.editor.pageDown")) {
      this.scrollOffset = Math.max(0, this.scrollOffset - this.viewportHeight());
      this.tui.requestRender();
      return;
    }
    this.input.handleInput(data);
    this.tui.requestRender();
  }

  private viewportHeight(): number {
    const rows = this.tui.terminal.rows || 30;
    // The complete view renders viewport + 7 chrome rows; rows - 8 keeps the
    // overlay exactly terminal rows - 1.
    return Math.max(6, rows - 8);
  }

  render(width: number): string[] {
    const theme = this.theme;
    const border = theme.fg("borderAccent", "─".repeat(Math.max(1, width)));
    const lines: string[] = [];
    const snapshot = this.snap();

    if (!snapshot) {
      lines.push(border);
      lines.push(theme.fg("dim", `${this.key} is no longer tracked`));
      lines.push(border);
      return lines;
    }

    lines.push(border);
    const percent = snapshot.info.usage?.percent;
    const header =
      `${stateGlyph(snapshot, theme)} ` +
      theme.fg("accent", theme.bold(snapshot.name)) +
      theme.fg("muted", ` · ${snapshot.state} · ${formatElapsed(snapshot)}`) +
      (snapshot.model ? theme.fg("muted", ` · ${snapshot.model}`) : "") +
      (percent !== undefined ? theme.fg("muted", ` · ${Math.round(percent)}%`) : "") +
      (snapshot.cost !== undefined ? theme.fg("muted", ` · $${snapshot.cost.toFixed(2)}`) : "");
    lines.push(truncateToWidth(header, width));
    if (snapshot.task) lines.push(truncateToWidth(theme.fg("dim", snapshot.task), width));
    if (snapshot.info.asking) {
      lines.push(truncateToWidth(theme.fg("error", `? ${snapshot.info.asking.question}`), width));
    } else if (snapshot.lastError) {
      lines.push(truncateToWidth(theme.fg("error", snapshot.lastError), width));
    }
    lines.push(border);

    // Transcript viewport, pinned to the bottom unless scrolled.
    const viewport = this.viewportHeight();
    const transcript = transcriptLines(this.cache, snapshot.info.sessionPath, width, theme);
    const maxOffset = Math.max(0, transcript.length - viewport);
    if (this.scrollOffset > maxOffset) this.scrollOffset = maxOffset;
    const end = transcript.length - this.scrollOffset;
    const window = transcript.slice(Math.max(0, end - viewport), end);
    for (let i = 0; i < viewport; i++) {
      lines.push(window[i] ?? "");
    }

    lines.push(border);
    lines.push(...this.input.render(width));
    lines.push(
      truncateToWidth(
        theme.fg(
          "dim",
          `  enter steer through orch · ${configuredKeys(this.keybindings, "app.clear")} abort turn · ${configuredKeys(this.keybindings, "tui.editor.cursorUp")}/${configuredKeys(this.keybindings, "tui.editor.cursorDown")} scroll · esc back`,
        ),
        width,
      ),
    );
    return lines;
  }

  invalidate(): void { return; }
}
