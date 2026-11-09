// `orch close --stream`: end the CLI streams (`orch events`, `orch monitor`) subscribed to this
// orchd. Each one named its process when it subscribed; orchd ends that process, so its
// reconnect loop goes with it.
import { signalOtherProcess } from "../../../backends/process.ts";
import { observedHere } from "../../../local-process.ts";
import { errorMessage } from "../../../util.ts";
import type { DaemonState } from "../state.ts";
import type { ResultOf } from "../../client/protocol.ts";

export function endStreams(state: DaemonState): ResultOf<"end-streams"> {
  let ended = 0;
  for (const pid of state.server?.streamPids() ?? []) {
    try {
      signalOtherProcess(observedHere(pid, null), "SIGTERM");
      ended += 1;
    } catch (error: unknown) {
      state.services.logger.debug("streams.end-failed", { pid, error: errorMessage(error) });
    }
  }
  return { ended };
}
