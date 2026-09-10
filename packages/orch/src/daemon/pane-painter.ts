// Painting an agent's pane is the DAEMON's job.
//
// It used to be the agent's: every harness bundle carried a plexer HUD so it
// could paint the pane it sat in, which put a plexer's socket and CLI inside
// every shipped artifact (CLAUDE.md Rule 10, and T5 of the presence-durability
// tasks). orchd already watches every state transition and already knows which
// pane an agent occupies, so it can paint from what it has and the bundle needs
// to know nothing about panes at all.
//
// Plexer-neutral: this reaches the plexer only through `backends/hud.ts`, whose
// provider is chosen by capability probe. Adding a plexer adds no line here.
import { activePaneHud } from "../backends/hud.ts";
import { environmentOf } from "../store/agent-view.ts";
import type { PaneStatusSnapshot } from "../types/plexer.ts";

type PaneSink = (snapshot: PaneStatusSnapshot) => void;

/** Paint one agent's pane with its current state.
 *
 * The sinks are kept because each one suppresses an unchanged status line, and
 * a sink rebuilt per event would forget what it last painted and report every
 * time. They are keyed by pane as well as by agent: an agent that MOVED needs a
 * sink aimed at the pane it is in now, not the one it was born in. */
export function createPanePainter(orchDir: string): (agentId: string, snapshot: PaneStatusSnapshot) => void {
  const sinks = new Map<string, PaneSink>();

  function paneOf(agentId: string): string | null {
    try {
      return environmentOf(orchDir, agentId).handle;
    } catch {
      return null;
    }
  }

  return (agentId: string, snapshot: PaneStatusSnapshot): void => {
    const pane = paneOf(agentId);
    if (pane === null) return;
    const sinkKey = `${agentId} ${pane}`;
    let sink = sinks.get(sinkKey);
    if (!sink) {
      sink = activePaneHud(agentId).statusReporter(pane);
      sinks.set(sinkKey, sink);
    }
    sink(snapshot);
  };
}
