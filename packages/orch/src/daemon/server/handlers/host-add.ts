// `orch host add`, done by orchd: fetch the keys a host presents, trust the ones the human
// confirmed, make orch's own key, and run the one login that puts that key in place on the host.
// The login asks for the person's password on its terminal, so orchd holds it in a PTY and
// streams its screen to the `orch host add` that asked, which types into it.
import { homedir } from "node:os";
import { callerKindOf } from "../../../policy/caller.ts";
import { orchPublicKey, scanHostKeys, trustHostKeys } from "../../../hosts/keys.ts";
import { announcesWindows, authorizeArgv, authorizeStep } from "../../../hosts/authorize.ts";
import { hostIdentity } from "../../../hosts/identity.ts";
import { attachHeld } from "./screen.ts";
import type { CallerCredential } from "../../../types/core.ts";
import type { RpcHandler } from "../../../types/daemon.ts";
import type { HeldTerminal, PtyExit } from "../../../types/pty.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";
import type { DaemonState } from "../state.ts";

/** Adding a host decides which machines orch may reach: the human's alone. */
function requireOperator(state: DaemonState, caller: CallerCredential): void {
  if (callerKindOf(state.directory, caller) !== "operator") throw new Error("orch host add is the human's to run: it decides which machines orch may reach.");
}

export function scanHost(state: DaemonState, params: ParamsOf<"host-scan">): ResultOf<"host-scan"> {
  requireOperator(state, params.caller);
  const scan = scanHostKeys(params.host, state.services.settings.current().links);
  return { keys: [...scan.keys], windows: announcesWindows(scan.banner) };
}

export function trustHost(state: DaemonState, params: ParamsOf<"host-trust">): ResultOf<"host-trust"> {
  requireOperator(state, params.caller);
  trustHostKeys(state.directory, params.host, state.services.settings.current().links, params.keys);
  return { ok: true };
}

export function hostKey(state: DaemonState, params: ParamsOf<"host-key">): ResultOf<"host-key"> {
  const publicKey = orchPublicKey(state.directory, state.services.settings.current().links);
  return { publicKey, ...authorizeStep(params.host, publicKey, hostIdentity().id) };
}

function loginEnded(exit: PtyExit): string {
  return exit.signal === null ? `the login exited with code ${exit.exitCode}` : `the login was ended by signal ${exit.signal}`;
}

/** Start the login in a PTY held under the caller's key, and stream its screen on this connection. */
export function authorizeHostHandler(state: DaemonState): RpcHandler<"host-authorize"> {
  return async (params, _emit, context) => {
    if (context.peer !== undefined) throw new Error("a linked host's orchd never adds a host");
    requireOperator(state, params.caller);
    const settings = state.services.settings.current();
    const links = settings.links;
    const publicKey = orchPublicKey(state.directory, links);
    const held = state.held;
    const key = params.key;
    await held.start(key, {
      file: links.ssh_command,
      args: authorizeArgv(state.directory, params.host, links, publicKey, hostIdentity().id),
      cwd: homedir(),
      env: process.env,
    });
    const login: HeldTerminal = { kind: "login", id: key };
    attachHeld(held, context.screens, login, { cols: params.cols, rows: params.rows }, settings.attach.queue_bytes, {
      reason: loginEnded,
      // Nobody is left to type into the login once its viewer lets go.
      release: () => { if (held.has(login)) held.kill(key); },
    });
    return { ok: true };
  };
}
