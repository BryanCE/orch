import type { AgentAdapter } from "../../src/types/adapter.ts";

/** One complete adapter fixture; overrides replace individual port members. */
export function fakeAdapter(overrides: Partial<AgentAdapter> = {}): AgentAdapter {
  return {
    id: "pi",
    thinking: null,
    workerLaunch: null,
    modelControl: null,
    lifecycleControl: null,
    sessionView: null,
    workspaceTrust: null,
    shim: null,
    settingsFile: null,
    defaultModel: null,
    models: null,
    modelWarm: null,
    compaction: null,
    bridge: null,
    hooks: null,
    acp: null,
    server: null,
    resume: null,
    commandGate: false,
    readOnly: null,
    interactiveArgv: overrides.interactiveArgv ?? ((): readonly string[] => ["fake-agent"]),
    headlessCmd: (): string[] => ["true"],
    detectState: () => "unknown",
    steer: () => undefined,
    extractResult: () => undefined,
    install: {},
    preferredForm: null,
    skillsDir: null,
    ...overrides,
  };
}
