import { afterEach, describe, expect, test } from "bun:test";
import { attachCommand, openViewers, planViewers } from "../src/daemon/server/spawn/viewers.ts";
import { parseSpawnFlags, resolveSpawnSettings } from "../src/commands/spawn/flags.ts";
import { errorMessage, orchEntrypoint } from "../src/util.ts";
import { FakePanedBackend, fakePane, withRegisteredBackend } from "./helpers/backend.ts";
import { testServices } from "./helpers/services.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { agentViewFixture } from "./helpers/views.ts";
import type { BackendGroup, BackendGroupLayout, CommandPlacementRequest, CommandPlacementRole, CreateGroupRequest, CreatedGroup, GroupHomeRole, GroupLayoutRole, LabelRole, Placement } from "../src/types/backend.ts";
import type { CreatedAgent } from "../src/types/command.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { Services } from "../src/types/services.ts";
import { planSpawn } from "../src/daemon/server/spawn/plan.ts";

const dirs: OrchDir[] = [];

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop()!);
});

/** The caller's recorded place: a pane `%0` of the fake plexer, in its coordinate `s1`. */
const IN_PLEXER = agentViewFixture("caller0001", { environment: { plexer: "tmux", handle: "%0" } }).environment;

/**
 * A plexer that opens places running a command, and records every one. Its
 * tabs and their places are its own state, so the tiling planner reads the
 * geometry the opens left behind.
 */
class ViewerBackend extends FakePanedBackend {
  readonly ran: CommandPlacementRequest[] = [];
  readonly createdGroups: CreateGroupRequest[] = [];
  readonly closedGroups: string[] = [];
  readonly labels: { readonly handle: string; readonly label: string }[] = [];
  private readonly tabs = new Map<string, string[]>();
  private next = 0;
  /** Opens that throw, by their order among all opens. */
  private readonly failing: ReadonlySet<number>;

  override readonly commandPlacement: CommandPlacementRole | null = {
    open: (request: CommandPlacementRequest): Placement => {
      this.ran.push(request);
      if (this.failing.has(this.ran.length)) throw new Error("the plexer refused the pane");
      if (typeof request.intoHandle === "string") return { handle: request.intoHandle };
      const handle = `%${++this.next}`;
      if (request.group !== undefined) this.tabs.get(request.group)?.push(handle);
      return { handle };
    },
  };

  override readonly groupHome: GroupHomeRole | null = {
    list: (): readonly BackendGroup[] => [...this.tabs].map(([id, places]) => group(id, places.length)),
    create: (request: CreateGroupRequest): CreatedGroup => {
      this.createdGroups.push(request);
      const id = `@${this.tabs.size + 1}`;
      const root = `%${++this.next}`;
      this.tabs.set(id, [root]);
      return { group: { ...group(id, 1), label: request.label ?? null }, rootHandle: root };
    },
    rename: () => undefined,
    close: (coordinate: string) => { this.closedGroups.push(coordinate); this.tabs.delete(coordinate); },
    focus: () => undefined,
    move: () => undefined,
  };

  override readonly groupLayout: GroupLayoutRole | null = {
    read: (id: string): BackendGroupLayout => ({
      group: id,
      placements: (this.tabs.get(id) ?? []).map((handle, index) => ({ handle, rect: { width: 80, height: 24, x: index * 80, y: 0 } })),
    }),
  };

  override readonly labeling: LabelRole | null = { setLabel: (handle, label) => { this.labels.push({ handle: String(handle), label }); } };

  constructor(options: { readonly tabs?: ReadonlyMap<string, readonly string[]>; readonly failing?: readonly number[] } = {}) {
    super({ id: "tmux", panes: [fakePane("%0", { space: "s1" })] });
    for (const [id, places] of options.tabs ?? []) this.tabs.set(id, [...places]);
    this.failing = new Set(options.failing ?? []);
  }
}

/** One tab as the fake lists it, labelled with its own id. */
function group(id: string, places: number): BackendGroup {
  return { id, label: id, workspace: "s1", focused: false, number: null, placementCount: places, status: null };
}

function services(fleet: Record<string, unknown> = {}): Services {
  const dir = tempOrchDir("orch-viewers-");
  dirs.push(dir);
  return testServices({
    orchDir: dir,
    settings: { enabled: { adapters: ["pi"], backends: ["headless", "tmux"] }, defaults: { adapter: "pi", backend: "headless", models: { pi: "openrouter/openai/gpt-5.6-luna" } }, fleet },
  });
}

/** `orch spawn <names> --host far --dir /far --prompt go`, plus any extra flags. */
function farSpawn(services: Services, names: readonly string[], extra: readonly string[] = []) {
  const settings = services.settings.current();
  return planSpawn(resolveSpawnSettings(parseSpawnFlags([...names, "--host", "far", "--dir", "/far", "--prompt", "go", ...extra]), settings).params, settings);
}

function started(key: string, name: string): CreatedAgent {
  return { key, handle: key, name, cwd: "/far", branch: null };
}

describe("a far spawn shows each agent in a pane of the caller's plexer", () => {
  test("a new tab: the first agent takes its root place, the next splits beside it, each running orch attach", () => {
    const svc = services();
    const backend = new ViewerBackend();
    withRegisteredBackend(backend, () => {
      const plan = planViewers({ services: svc, settings: farSpawn(svc, ["one", "two"]), environment: IN_PLEXER, actor: null });
      expect(plan).not.toBeNull();
      const panes = openViewers(plan!, { orchDir: svc.orchDir, logger: svc.logger, cwd: "/here", notes: [] }, "far", [started("agent00001", "one"), started("agent00002", "two")]);

      expect(backend.createdGroups).toHaveLength(1);
      expect(backend.createdGroups[0]!.workspace).toBe("s1");
      expect(backend.createdGroups[0]!.label).toBe("one@far");
      expect(backend.ran.map((request) => request.command)).toEqual([
        [orchEntrypoint(), "attach", "agent00001"],
        [orchEntrypoint(), "attach", "agent00002"],
      ]);
      expect(backend.ran[0]!.intoHandle).toBe("%1");
      expect(backend.ran[1]!.intoHandle).toBeUndefined();
      expect(backend.ran[1]!.group).toBe("@1");
      for (const request of backend.ran) expect(request.env).toEqual({ ORCH_DIR: svc.orchDir });
      expect([...panes]).toEqual([["agent00001", "%1"], ["agent00002", "%2"]]);
      expect(backend.labels).toEqual([{ handle: "%1", label: "one@far" }, { handle: "%2", label: "two@far" }]);
    });
  });

  test("--tab naming an open tab fills it", () => {
    const svc = services();
    const backend = new ViewerBackend({ tabs: new Map([["@7", ["%70"]]]) });
    withRegisteredBackend(backend, () => {
      const plan = planViewers({ services: svc, settings: farSpawn(svc, ["one"], ["--tab", "@7"]), environment: IN_PLEXER, actor: null });
      openViewers(plan!, { orchDir: svc.orchDir, logger: svc.logger, cwd: "/here", notes: [] }, "far", [started("agent00001", "one")]);
      expect(backend.createdGroups).toEqual([]);
      expect(backend.ran).toHaveLength(1);
      expect(backend.ran[0]!.group).toBe("@7");
      expect(backend.ran[0]!.command).toEqual(attachCommand("agent00001"));
    });
  });

  test("a tab without room refuses the spawn before anything launches", () => {
    const svc = services({ max_agents_per_tab: 2 });
    const backend = new ViewerBackend({ tabs: new Map([["@7", ["%70", "%71"]]]) });
    withRegisteredBackend(backend, () => {
      let refusal: string | null = null;
      try {
        planViewers({ services: svc, settings: farSpawn(svc, ["one"], ["--tab", "@7"]), environment: IN_PLEXER, actor: null });
      } catch (error: unknown) {
        refusal = errorMessage(error);
      }
      expect(refusal).toContain("max_agents_per_tab");
      expect(backend.ran).toEqual([]);
    });
  });

  test("a pane that fails costs that pane only", () => {
    const svc = services();
    const backend = new ViewerBackend({ failing: [1] });
    withRegisteredBackend(backend, () => {
      const plan = planViewers({ services: svc, settings: farSpawn(svc, ["one", "two"]), environment: IN_PLEXER, actor: null });
      const panes = openViewers(plan!, { orchDir: svc.orchDir, logger: svc.logger, cwd: "/here", notes: [] }, "far", [started("agent00001", "one"), started("agent00002", "two")]);
      // The tab whose root could not run the first viewer is closed; the second opens its own.
      expect(backend.closedGroups).toEqual(["@1"]);
      expect(backend.createdGroups).toHaveLength(2);
      expect([...panes.keys()]).toEqual(["agent00002"]);
    });
  });
});

describe("no plexer here, no pane", () => {
  test("a caller in no plexer gets no viewer plan", () => {
    const svc = services();
    const environment = agentViewFixture("caller0001", { environment: { plexer: null, handle: null } }).environment;
    expect(planViewers({ services: svc, settings: farSpawn(svc, ["one"]), environment, actor: null })).toBeNull();
  });

  test("a caller in an environment that opens no place a person can see gets none", () => {
    const svc = services();
    const environment = agentViewFixture("caller0001", { environment: { plexer: "headless", handle: null } }).environment;
    expect(planViewers({ services: svc, settings: farSpawn(svc, ["one"]), environment, actor: null })).toBeNull();
  });
});
