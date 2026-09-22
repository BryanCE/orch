import type { AgentAdapter, SpawnOpts } from "../../src/types/adapter.ts";

/** One complete adapter fixture; overrides replace individual port members. */
export function fakeAdapter(overrides: Partial<AgentAdapter> = {}): AgentAdapter {
  const interactiveCmd = overrides.interactiveCmd ?? ((): string => "fake-agent");
  return {
    id: "pi",
    thinking: null,
    workerLaunch: null,
    modelControl: null,
    lifecycleControl: null,
    sessionView: null,
    workspaceTrust: null,
    shim: null,
    defaultModel: null,
    models: null,
    modelWarm: null,
    bridge: null,
    presenceRegistration: null,
    commandGate: false,
    interactiveCmd,
    interactiveArgv: (opts: SpawnOpts): readonly string[] => interactiveCmd(opts).split(" "),
    headlessCmd: (): string[] => ["true"],
    detectState: () => "unknown",
    steer: () => undefined,
    extractResult: () => undefined,
    ...overrides,
  };
}
