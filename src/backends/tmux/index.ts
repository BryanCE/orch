import type { AgentAdapter } from "../../adapters/adapter.ts";
import type { Backend, BackendCapabilities, BackendSpawnOpts, DeliverPayload } from "../backend.ts";
import type { Identity } from "../identity.ts";
import { binaryOnPath } from "../../util.ts";
import { bestEffortTmux } from "./cli.ts";

/** Handle owned by one tmux pane. */
export type TmuxHandle = string;

const TMUX_BACKEND = "tmux";
const FALLBACK_WORKSPACE = "tmux";

/** Backend for panes managed by a tmux session. */
export class TmuxBackend implements Backend<TmuxHandle> {
  readonly id = TMUX_BACKEND;
  readonly panes = true;
  readonly focusable = true;
  readonly canSendKeys = true;
  readonly caps: BackendCapabilities = { panes: true, focusable: true, canSendKeys: true };

  isAvailable(): boolean {
    return binaryOnPath("tmux");
  }

  isInsideSession(): boolean {
    return !!process.env.TMUX;
  }

  /** Resolve the session owning a pane. Kept protected for hermetic tests. */
  protected sessionOf(pane: string): string {
    return bestEffortTmux(["display-message", "-p", "-t", pane, "#{session_name}"])?.trim() ?? "";
  }

  mintIdentity(handle: TmuxHandle): Identity {
    return {
      backend: TMUX_BACKEND,
      workspace: this.sessionOf(handle) || FALLBACK_WORKSPACE,
      handle,
    };
  }

  /** Identity of the calling pane, resolved from tmux's environment. */
  currentIdentity(): Identity | null {
    const handle = process.env.TMUX_PANE;
    if (!handle) return null;
    const workspace = this.sessionOf(handle);
    if (!workspace) return null;
    return { backend: TMUX_BACKEND, workspace, handle };
  }

  spawn(adapter: AgentAdapter, opts: BackendSpawnOpts): TmuxHandle {
    if (!this.isInsideSession()) throw new Error("tmux spawn requires running inside a tmux session");
    const command = adapter.restrictedInteractiveCmd?.(opts) ?? adapter.interactiveCmd(opts);
    if (!command.trim()) throw new Error(`adapter ${String(adapter.id)} returned an empty interactive command`);

    const cwd = opts.cwd ?? process.cwd();
    const orchDir = opts.orchDir ?? process.env.ORCH_DIR ?? "";
    const output = bestEffortTmux([
      "new-window",
      "-P",
      "-F",
      "#{pane_id}",
      "-c",
      cwd,
      "-e",
      `ORCH_AGENT_KEY=${opts.key ?? ""}`,
      "-e",
      `ORCH_DIR=${orchDir}`,
      "--",
      "bash",
      "-lc",
      command,
    ]);
    const handle = output?.trim() ?? "";
    if (!handle) throw new Error("tmux new-window returned no pane id");
    bestEffortTmux(["select-layout", "-t", handle, "tiled"]);
    return handle;
  }

  close(handle: TmuxHandle): boolean {
    if (typeof handle !== "string" || handle.length === 0) return false;
    return bestEffortTmux(["kill-pane", "-t", handle]) !== null;
  }

  list(): TmuxHandle[] {
    const output = bestEffortTmux(["list-panes", "-a", "-F", "#{pane_id}"]);
    return output?.split(/\r?\n/).filter((pane) => pane.length > 0) ?? [];
  }

  /** Submit either payload kind as text followed by Enter. */
  deliver(handle: TmuxHandle, payload: DeliverPayload): boolean {
    return bestEffortTmux(["send-keys", "-t", handle, "--", payload.text]) !== null
      && bestEffortTmux(["send-keys", "-t", handle, "--", "Enter"]) !== null;
  }

  /** Select the target window and pane in tmux. */
  focus(handle: TmuxHandle): boolean {
    return bestEffortTmux(["select-window", "-t", handle]) !== null
      && bestEffortTmux(["select-pane", "-t", handle]) !== null;
  }

  /** Pass backend key names through to tmux unchanged. */
  sendKeys(handle: TmuxHandle, keys: readonly string[]): boolean {
    return bestEffortTmux(["send-keys", "-t", handle, "--", ...keys]) !== null;
  }

  /** Apply tmux's built-in tiled layout to the target group. */
  applyLayout(group: string, layout: "tiled"): boolean {
    return bestEffortTmux(["select-layout", "-t", group, layout]) !== null;
  }
}

/** Shared tmux backend instance. */
export const tmuxBackend = new TmuxBackend();
