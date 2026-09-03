import type { PaneHud } from "../types/plexer.ts";
/**
 * The plexer-neutral pane-HUD port.
 *
 * orchd surfaces an agent's state in whatever pane that agent occupies, and must
 * not know WHICH plexer that is: naming `backends/herdr/` from the daemon is the
 * pair code CLAUDE.md Rule 9 forbids, and Rule 10 keeps plexer-gated behaviour
 * under `src/backends/<plexer>/`.
 *
 * So the daemon depends on this port, and providers register themselves below.
 * The active provider is chosen by capability probe — "is this agent in a pane of
 * mine?" — never by comparing a backend id. When no provider claims the agent
 * (plain terminal, CI, a plexer with no HUD such as tmux today), the no-op HUD is
 * returned and every call is inert.
 *
 * Adding a HUD for another plexer means appending a provider here.
 */
import {
  createPaneStatusReporter,
  herdrHudActive,
  notifyHerdr,
  readPaneLabels,
} from "./herdr/hud.ts";

const NO_HUD: PaneHud = {
  statusReporter: () => () => { /* no pane status line */ },
  notify: () => { /* no plexer notifier */ },
  readLabels: () => Promise.resolve(false),
};

interface PaneHudProvider {
  /** True when this process is inside a live session of this provider's plexer. */
  isActive: (id: string | null) => boolean;
  hud: (id: string | null) => PaneHud;
}

const PROVIDERS: readonly PaneHudProvider[] = [
  {
    isActive: herdrHudActive,
    hud: (id) => ({
      statusReporter: (paneId) => createPaneStatusReporter(id, paneId),
      notify: notifyHerdr,
      readLabels: (apply) => readPaneLabels(id, apply),
    }),
  },
];

/** The HUD for the plexer this process is running under, or an inert one. */
export function activePaneHud(id: string | null): PaneHud {
  return PROVIDERS.find((provider) => provider.isActive(id))?.hud(id) ?? NO_HUD;
}
