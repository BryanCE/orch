import { loadConfigOrNull } from "../../config.ts";
import { orchDir } from "../../presence/writer.ts";
import { herdrAck, herdrReachable } from "./cli.ts";
import { HERDR_SINK_ID } from "../backend.ts";
import type { Notifier } from "../../notify/sinks.ts";
import { notificationText } from "../../notify/format.ts";

/** True when herdr is one of the plexers orch launches agents into. */
function herdrRunsAgents(): boolean {
  return loadConfigOrNull(orchDir())?.enabled.backends.includes("herdr") ?? false;
}

/** Herdr-owned native notification sink. */
export const herdrNotifier: Notifier = {
  id: HERDR_SINK_ID,
  label: "Herdr",
  metadata: { description: "Herdr native notifications", requiredConfig: [] },
  remediation: "fix: enable the herdr plexer in orch setup, and start herdr so its control socket answers",
  // Where orch SPAWNS decides whether herdr notifications mean anything; the shell
  // that happens to be running setup, an install, or the daemon decides nothing.
  // Gating on HERDR_ENV tied the sink to the caller's pane and hid it from every
  // `orch setup` run outside one.
  available: () => herdrRunsAgents() && herdrReachable(),
  // herdrAck is synchronous and throws on failure; wrapping it in `async` promised
  // an await that never existed.
  deliver: (event) => {
    const { title, body } = notificationText(event);
    herdrAck(["notification", "show", title, "--body", body]);
    return Promise.resolve(true);
  },
};
