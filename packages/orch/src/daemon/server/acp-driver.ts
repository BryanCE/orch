// The `acp` form's driver: the harness's ACP binding on pipes, one session per process.
import { openAcpLink } from "../../acp/link.ts";
import { packageManifest } from "../../util.ts";
import { probeBinding } from "./acp-probe.ts";
import type { AcpRole } from "../../types/adapter.ts";
import type { BackendSpawnOpts } from "../../types/backend.ts";
import type { HeldSessionDriver } from "../../types/held-session.ts";

/** Drive a harness through its ACP binding. */
export function acpDriver(acp: AcpRole): HeldSessionDriver {
  return {
    sharesSessions: acp.sharesSessions,
    launch: (opts: BackendSpawnOpts) => ({
      argv: acp.argv(opts),
      env: acp.env(opts),
      async open(child, open, events, context) {
        const opened = await openAcpLink({ input: child.input, output: child.output }, open, packageManifest(), events);
        try {
          // The binding starts on its own default; the launch's model and thinking level replace it.
          // A model the binding does not offer refuses the launch by name. A level it does not offer
          // is skipped, as t3code does: the binding keeps its own.
          if (opts.model !== undefined) await opened.session.setModel(opts.model);
          if (opts.thinking !== undefined && !await opened.session.setThinking(opts.thinking)) {
            context.logger.warn("acp.thinking-not-offered", { thinking: opts.thinking });
          }
        } catch (error: unknown) {
          opened.link.close();
          throw error;
        }
        return { link: opened.link, sessionId: opened.session.sessionId };
      },
    }),
    async reopens(pipes, settings) {
      const offered = await probeBinding(pipes, acp, settings.timeouts.acp_probe_ms).catch(() => null);
      return offered !== null && (offered.load || offered.resume);
    },
  };
}
