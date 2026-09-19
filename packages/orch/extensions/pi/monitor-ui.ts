import { Key, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";
import type { HarnessContext } from "../../src/types/agent.ts";

export interface MonitorEntry {
  readonly key: string;
  readonly source: string;
  readonly status: string;
  readonly runtime: string;
  readonly output: string;
}

export interface MonitorView {
  list(): readonly MonitorEntry[];
  detail(key: string): MonitorEntry | undefined;
  stop(key: string): void;
  subscribe(listener: () => void): () => void;
}

interface MonitorTheme {
  fg(color: string, text: string): string;
}

interface MonitorComponent {
  render(width: number): string[];
  handleInput(data: string): void;
  invalidate(): void;
}

interface MonitorTui {
  requestRender(): void;
}

interface MonitorUi {
  setWidget(key: string, content: string[] | undefined, options?: { placement?: "aboveEditor" | "belowEditor" }): void;
  custom<T>(factory: (tui: MonitorTui, theme: MonitorTheme, keybindings: unknown, done: (value: T) => void) => MonitorComponent): Promise<T>;
}

interface MonitorHarness {
  registerCommand(name: string, options: { description?: string; handler(args: string | undefined, ctx: Pick<HarnessContext, "hasUI">): void | Promise<void> }): void;
}

const WIDGET_KEY = "orch-monitors";

class MonitorPanel implements MonitorComponent {
  private selected = 0;
  private entry: MonitorEntry | undefined;
  private unsub: (() => void) | undefined;
  private revision = 0;

  constructor(
    private readonly view: MonitorView,
    private readonly theme: MonitorTheme,
    private readonly tui: MonitorTui,
    private readonly done: () => void,
  ) {
    this.unsub = view.subscribe(() => { this.entry = undefined; this.invalidate(); tui.requestRender(); });
  }

  render(width: number): string[] {
    const entries = this.view.list();
    if (entries.length === 0) return [truncateToWidth(this.theme.fg("dim", "No monitors."), width)];
    if (this.entry) {
      const item = this.view.detail(this.entry.key) ?? this.entry;
      return [
        truncateToWidth(this.theme.fg("accent", `Monitor ${item.key}`), width),
        truncateToWidth(`source: ${item.source}`, width),
        truncateToWidth(`status: ${item.status}`, width),
        truncateToWidth(`runtime: ${item.runtime}`, width),
        truncateToWidth(`output: ${item.output || "(none)"}`, width),
        truncateToWidth(this.theme.fg("dim", "esc back · x stop"), width),
      ];
    }
    this.selected = Math.min(this.selected, entries.length - 1);
    return [
      truncateToWidth(this.theme.fg("accent", "Monitors"), width),
      ...entries.map((item, index) => truncateToWidth(`${index === this.selected ? ">" : " "} ${item.key}  ${item.status}`, width)),
      truncateToWidth(this.theme.fg("dim", "↑↓ navigate · enter details · esc close · x stop"), width),
    ];
  }

  handleInput(data: string): void {
    const entries = this.view.list();
    if (this.entry) {
      if (matchesKey(data, Key.escape)) { this.entry = undefined; this.invalidate(); this.tui.requestRender(); return; }
      if (data === "x") { this.view.stop(this.entry.key); this.entry = undefined; this.invalidate(); this.tui.requestRender(); }
      return;
    }
    if (matchesKey(data, Key.escape)) { this.dispose(); this.done(); return; }
    if (matchesKey(data, Key.down) && entries.length > 0) this.selected = Math.min(this.selected + 1, entries.length - 1);
    else if (matchesKey(data, Key.up) && entries.length > 0) this.selected = Math.max(this.selected - 1, 0);
    else if (matchesKey(data, Key.enter)) {
      const selected = entries[this.selected];
      if (selected) this.entry = selected;
    } else if (data === "x") {
      const selected = entries[this.selected];
      if (selected) this.view.stop(selected.key);
    }
    this.invalidate();
    this.tui.requestRender();
  }

  invalidate(): void { this.revision += 1; }
  dispose(): void { this.unsub?.(); this.unsub = undefined; }
}

/** Register the Pi-only monitor count widget and `/monitors` inspection command. */
export function registerPiMonitorUi(harness: MonitorHarness, ui: MonitorUi, view: MonitorView): void {
  const renderCount = (): void => {
    const count = view.list().length;
    ui.setWidget(WIDGET_KEY, count === 0 ? undefined : [`${count} monitor${count === 1 ? "" : "s"} · /monitors`], { placement: "belowEditor" });
  };
  const unsubscribe = view.subscribe(renderCount);
  renderCount();
  harness.registerCommand("monitors", {
    description: "Inspect orch monitors",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) return;
      await ui.custom<void>((tui, theme, _keybindings, done) => new MonitorPanel(view, theme, tui, done));
    },
  });
  void unsubscribe;
}

export type { MonitorComponent };
