import type { PaneHud } from "../types/plexer.ts";
/**
 * The plexer-neutral pane-HUD port.
 *
 * A harness shim (extensions/pi, extensions/claude, extensions/codex) wants to
 * surface agent state in whatever pane it is running in. It must not know WHICH
 * plexer that is: naming `backends/herdr/` from a harness module is the
 * harness×plexer pair code CLAUDE.md Rule 9 forbids, and Rule 10 keeps
 * plexer-gated behaviour under `src/backends/<plexer>/`.
 *
 * So shims depend on this port, and providers register themselves below. The
 * active provider is chosen by capability probe — "am I inside a live session of
 * this plexer?" — never by comparing a backend id. When no provider claims the
 * process (plain terminal, CI, a plexer with no HUD such as tmux today), the
 * no-op HUD is returned and every call is inert.
 *
 * Adding a HUD for another plexer means appending a provider here. It must never
 * mean editing a harness module.
 */
import {
  createPaneStatusReporter,
  herdrHudActive,
  herdrPaneHandle,
  notifyHerdr,
  readPaneLabels,
  registerBlockedSignalRelay,
  registerPaneStateHud,
} from "./herdr/hud.ts";

const NO_HUD: PaneHud = {
  paneHandle: null,
  registerPaneState: () => { /* no plexer to mirror into */ },
  statusReporter: () => () => { /* no pane status line */ },
  notify: () => { /* no plexer notifier */ },
  readLabels: () => Promise.resolve(false),
  registerBlockedRelay: () => { /* no plexer signal */ },
};

interface PaneHudProvider {
  /** True when this process is inside a live session of this provider's plexer. */
  isActive: () => boolean;
  hud: () => PaneHud;
}

const PROVIDERS: readonly PaneHudProvider[] = [
  {
    isActive: herdrHudActive,
    hud: () => ({
      paneHandle: herdrPaneHandle(),
      registerPaneState: registerPaneStateHud,
      statusReporter: createPaneStatusReporter,
      notify: notifyHerdr,
      readLabels: readPaneLabels,
      registerBlockedRelay: registerBlockedSignalRelay,
    }),
  },
];

/** The HUD for the plexer this process is running under, or an inert one. */
export function activePaneHud(): PaneHud {
  return PROVIDERS.find((provider) => provider.isActive())?.hud() ?? NO_HUD;
}
