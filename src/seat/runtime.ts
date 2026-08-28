/**
 * Layer composition and the sync entry-point boundary — the counterpart of
 * Davis's runtime.ts (davis7dotsh/my-pi-setup, extensions/subagents/src/
 * runtime.ts), with one orch source layer where he registers three process
 * backends. The TUI and command handlers are imperative, so the runtime hands
 * them the manager's synchronous read view and a dispose for shutdown.
 */
import { ManagedRuntime, Layer } from "effect";
import { PackManager, PackManagerLive, type PackManagerShape } from "./manager.ts";
import { packSourceLayer, type PackSourceConfig } from "./source.ts";

export interface PackRuntime {
  readonly manager: PackManagerShape;
  dispose(): Promise<void>;
}

export function createPackRuntime(config: PackSourceConfig): PackRuntime {
  const runtime = ManagedRuntime.make(
    PackManagerLive.pipe(Layer.provide(packSourceLayer(config))),
  );
  const manager = runtime.runSync(PackManager);
  return {
    manager,
    dispose: () => runtime.dispose(),
  };
}
