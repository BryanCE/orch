import { loadConfigOrNull } from "../../config.ts";
import { orchDir } from "../../presence/writer.ts";
import { herdrAck, herdrReachable } from "./cli.ts";
import { HERDR_SINK_ID } from "../backend.ts";
import type { SinkProvider } from "../../notify/sinks.ts";

/** True when herdr is one of the plexers orch launches agents into. */
function herdrRunsAgents(): boolean {
  return loadConfigOrNull(orchDir())?.enabled.backends.includes("herdr") ?? false;
}

/** Herdr-owned native notification sink. */
export const herdrNotificationProvider: SinkProvider = {
  id: HERDR_SINK_ID,
  label: "Herdr",
  description: "Herdr native notifications",
  remediation: "fix: enable the herdr plexer in orch setup, and start herdr so its control socket answers",
  // Where orch SPAWNS decides whether herdr notifications mean anything; the shell
  // that happens to be running setup, an install, or the daemon decides nothing.
  // Gating on HERDR_ENV tied the sink to the caller's pane and hid it from every
  // `orch setup` run outside one.
  available: () => herdrRunsAgents() && herdrReachable(),
  send: (title, body) => {
    herdrAck(["notification", "show", title, "--body", body]);
    return true;
  },
};
