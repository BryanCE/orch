// The `acp` form's driver: the harness's ACP binding on pipes, one binding process per agent.
import { openAcpLink } from "../../acp/link.ts";
import { definedEnv, packageManifest } from "../../util.ts";
import { probeBinding } from "./acp-probe.ts";
import type { AcpRole } from "../../types/adapter.ts";
import type { HeldSessionDriver } from "../../types/held-session.ts";

/** Drive a harness through its ACP binding. */
export function acpDriver(acp: AcpRole): HeldSessionDriver {
  return {
    sharesSessions: acp.sharesSessions,
    terminal: null,
    connect(opts, env, context) {
      const child = context.pipes.spawn({ argv: acp.argv(opts), cwd: opts.cwd ?? process.cwd(), env: definedEnv({ ...process.env, ...env, ...acp.env(opts) }) });
      let released = false;
      return Promise.resolve({
        process: {
          pid: child.pid,
          exited: child.exited.then(() => undefined),
          shared: false,
          onStderr: (listener) => { child.onStderr(listener); },
          release: () => {
            if (released) return;
            released = true;
            child.kill();
          },
        },
        async open(open, events) {
          const opened = await openAcpLink({ input: child.input, output: child.output }, open, packageManifest(), events);
          try {
            // The binding starts on its own default; the launch's model and thinking level replace
            // it. A model the binding does not offer refuses the launch by name. A level it does
            // not offer is skipped, as t3code does: the binding keeps its own.
            if (opts.model !== undefined) await opened.session.setModel(opts.model);
            if (opts.thinking !== undefined && !await opened.session.setThinking(opts.thinking)) {
              context.logger.warn("acp.thinking-not-offered", { thinking: opts.thinking });
            }
          } catch (error: unknown) {
            opened.link.close();
            throw error;
          }
          return {
            link: opened.link,
            get sessionId() { return opened.session.sessionId; },
            close: async () => {
              opened.link.close();
              await opened.session.ended;
            },
          };
        },
      });
    },
    async reopens(pipes, settings) {
      const offered = await probeBinding(pipes, acp, settings.timeouts.acp_probe_ms).catch(() => null);
      return offered !== null && (offered.load || offered.resume);
    },
    async probe(context) {
      const answer = await probeBinding(context.pipes, acp, context.settings.timeouts.acp_probe_ms);
      return { name: answer.name ?? acp.argv({}).join(" "), version: answer.version ?? `ACP protocol ${String(answer.protocolVersion)}` };
    },
  };
}
