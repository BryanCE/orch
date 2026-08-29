import { LocalProcessRole } from "../../src/backends/process.ts";
import { agentChannel, capture } from "../../src/presence/roles.ts";
import { getBackend, registerBackend } from "../../src/backends/registry.ts";
import type { Backend, BackendHandle, BackendId, BackendSpawnOpts, CreatedPane, EnvironmentIdentityRole, PaneHostRole, PaneInventoryRole, PaneTarget, ProcessRole, SpaceHomeRole } from "../../src/types/backend.ts";
import type { AgentAdapter } from "../../src/types/adapter.ts";

/** One pane a fake paned environment lists. Space vocabulary is orch's own
 *  (`TASKS/adr/0001-space-not-workspace.md`); the port's `workspace` field is
 *  the plexer coordinate the fake fills from it. */
export interface FakePane {
  readonly handle: string;
  readonly space: string | null;
  readonly name: string | null;
}

/** Build a complete {@link FakePane}; every field is supplied, never partial. */
export function fakePane(
  handle: string,
  overrides: { readonly space?: string | null; readonly name?: string | null } = {},
): FakePane {
  return { handle, space: overrides.space ?? null, name: overrides.name ?? null };
}

/** Build the COMPLETE port value a pane inventory returns for one fake pane. */
function paneTarget(pane: FakePane): PaneTarget {
  return {
    handle: pane.handle,
    workspace: pane.space,
    group: null,
    groupLabel: null,
    name: pane.name,
    agent: null,
    focused: false,
    status: null,
    sessionPath: null,
  };
}

/**
 * A complete, typed paned environment for tests that need pane roles.
 *
 * It composes exactly the roles a paned environment has (`TASKS/07-port-seam.md`):
 * process, orch's channel/capture, a pane host and a pane inventory. Every other
 * role is absent, which is the capability itself — there is no `capabilities`
 * object and nothing here is probed for method presence (`TASKS/02-scope.md` E13).
 */
export class FakePanedBackend implements Backend {
  readonly id: BackendId;
  /** Handles this environment was asked to close, in call order. */
  readonly closed: string[] = [];
  private readonly panes: FakePane[];
  private opened = 0;

  readonly process: ProcessRole = new LocalProcessRole();
  readonly channel = agentChannel;
  readonly capture = capture;
  readonly paneHost: PaneHostRole;
  readonly paneInventory: PaneInventoryRole;
  readonly paneInput = null;
  readonly paneForeground = null;
  readonly paneScreen = null;
  readonly paneZoom = null;
  readonly paneNaming = null;
  readonly agentNaming = null;
  readonly agentStatus = null;
  readonly groupHome = null;
  readonly groupLayout = null;
  // Declared at the PORT's type, not inferred as the literal `null`: a subclass
  // that composes one of these roles is still the same environment, and an
  // inferred `null` makes the helper claim a shape the port does not have.
  readonly spaceHome: SpaceHomeRole | null = null;
  readonly identity: EnvironmentIdentityRole | null = null;
  readonly handleLookup = null;
  readonly logPruning = null;
  readonly versionInfo = null;

  constructor(options: { readonly id?: BackendId; readonly panes?: readonly FakePane[] } = {}) {
    this.id = options.id ?? "headless";
    this.panes = [...(options.panes ?? [])];
    this.paneHost = {
      open: (): CreatedPane => {
        const pane = fakePane(`fake-pane-${++this.opened}`);
        this.panes.push(pane);
        return { handle: pane.handle };
      },
      close: (handle: BackendHandle): void => {
        const target = String(handle);
        this.closed.push(target);
        const index = this.panes.findIndex((pane) => pane.handle === target);
        if (index >= 0) this.panes.splice(index, 1);
      },
    };
    this.paneInventory = {
      current: () => null,
      list: (): readonly PaneTarget[] => this.panes.map(paneTarget),
    };
  }

  isAvailable(): boolean {
    return true;
  }

  isInsideSession(): boolean {
    return true;
  }

  spawn(_adapter: AgentAdapter, opts: BackendSpawnOpts): BackendHandle {
    const pane = fakePane(opts.key ?? `fake-pane-${++this.opened}`, { name: opts.name ?? null });
    this.panes.push(pane);
    return pane.handle;
  }

  workspaceNames(): Map<string, string> {
    return new Map();
  }
}

/**
 * Run `body` with `backend` registered under its id, restoring the previously
 * registered provider afterwards. Registration is the composition seam; the
 * shipped provider instance is never mutated.
 */
export function withRegisteredBackend<T>(backend: Backend, body: () => T): T {
  const previous = getBackend(backend.id);
  if (!previous) throw new Error(`no provider is registered as ${backend.id}; nothing to restore`);
  registerBackend(backend);
  try {
    return body();
  } finally {
    registerBackend(previous);
  }
}
