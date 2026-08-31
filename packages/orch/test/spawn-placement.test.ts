import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveSpawnPlacement } from "../src/commands/spawn.ts";
import { homeHandle, openHome } from "../src/store/home-rows.ts";
import { orm } from "../src/store/connection.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { FakePanedBackend } from "./helpers/backend.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { Backend, CreateHomeRequest, CreatedHome, EnvironmentIdentityRole, HomeSubject, Identity, PlexerHome, SpaceHomeRole } from "../src/types/backend.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";

/**
 * The spawn half.
 *
 * `resolveSpawnSpace` used to hand `home.create(...).coordinate` back as orch's
 * SPACE id. That is E10's failure in one line: a plexer's coordinate wearing an
 * orch noun. It also never wrote a `spaces` row, so `requireSpace` refused the
 * very spawn that had just opened the window.
 *
 * The two are different facts and the seam returns both. `space` is orch's own
 * grouping — user-created and OPTIONAL (A7), never minted from a path. The
 * `workspace` is the plexer coordinate panes open in, and when orch is not
 * itself inside the plexer that coordinate is a home opened for THIS PACK and
 * marked as orch's (E8).
 */

const dirs: string[] = [];

beforeEach(() => {
  isolateOrchEnv();
  // Placement receives identity explicitly from the fake backend; this caller
  // fixture models a human/driver session with no inherited orch stamp.
});

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop()!);
  restoreOrchEnv();
});

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-placement-"));
  dirs.push(dir);
  orm(dir);
  return dir;
}

function seedOrch(dir: string, id: string): string {
  ensureHarness(dir, "pi", "pi", 1);
  insertAgent(dir, { id, harnessId: "pi", cwd: "/work", name: id, createdAt: 1 });
  return id;
}

class RecordingHomeRole implements SpaceHomeRole<string> {
  readonly created: { subject: HomeSubject; request: CreateHomeRequest }[] = [];
  readonly closed: string[] = [];
  readonly renamed: { coordinate: string; label: string }[] = [];
  readonly focused: string[] = [];
  private next = 0;
  list(): readonly PlexerHome[] { return []; }
  create(subject: HomeSubject, request: CreateHomeRequest): CreatedHome<string> {
    this.created.push({ subject, request });
    const coordinate = `w${++this.next}`;
    return { coordinate, rootHandle: `${coordinate}:p1` };
  }
  rename(coordinate: string, label: string): void { this.renamed.push({ coordinate, label }); }
  close(coordinate: string): void { this.closed.push(coordinate); }
  focus(coordinate: string): void { this.focused.push(coordinate); }
}

/** A plexer that can hold a home, optionally with the calling process inside it.
 *  A SUBCLASS, not a spread: spreading a class instance drops its prototype
 *  methods and the value stops being a Backend at all. */
class HomedBackend extends FakePanedBackend {
  override readonly spaceHome: SpaceHomeRole | null;
  override readonly identity: EnvironmentIdentityRole;
  private readonly inside: boolean;

  constructor(home: SpaceHomeRole | null, inside: boolean, self: Identity | null) {
    super({ id: "herdr" });
    this.spaceHome = home;
    this.inside = inside;
    this.identity = { current: (_id: string | null): Identity | null => self };
  }

  /** Rule 11: WHERE the caller sits is environment. It is answered by the
   *  plexer's own environment, never by whether orch minted the caller an id. */
  override isInsideSession(): boolean {
    return this.inside;
  }
}

/** `inside` is the environment fact (in a pane of this plexer); `self` is the
 *  identity fact (an orch-minted id, or none for a human's own pane). */
function homedBackend(home: SpaceHomeRole | null, inside: boolean, self: Identity | null = null): Backend {
  return new HomedBackend(home, inside, self);
}

/** A grant gate that records whether it was asked, so a test can assert orch did
 *  NOT ask the human to approve a window it was never going to open. */
function gate(): { asked: number; grantNewHome: () => void } {
  const state = { asked: 0, grantNewHome: (): void => { state.asked += 1; } };
  return state;
}

describe("spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10)", () => {
  test("a named space is orch's own id, and the workspace is its RECORDED home", () => {
    const dir = fixture();
    seedSpace(dir, "space00001");
    const home = new RecordingHomeRole();
    openHome({ directory: dir, subject: { kind: "space", id: "space00001" }, plexerId: "herdr", home, cwd: "/work", label: "research" });
    const grant = gate();

    const placement = resolveSpawnPlacement({
      directory: dir, backend: homedBackend(home, false), space: "space00001",
      packRootId: seedOrch(dir, "packroot01"), cwd: "/work", label: "api", grantNewHome: grant.grantNewHome,
    });

    // E10: the space orch reports is orch's id. The coordinate is a separate
    // field, and it is the one the plexer gets back.
    expect(placement.space).toBe("space00001");
    expect(placement.workspace).toBe("w1");
    // The space already had a home. Opening a second one would put an unasked
    // window on the human's screen.
    expect(home.created).toHaveLength(1);
    expect(grant.asked).toBe(0);
  });

  test("with no space, orch INSIDE the plexer spawns beside itself and opens nothing", () => {
    const dir = fixture();
    const home = new RecordingHomeRole();
    const grant = gate();

    const placement = resolveSpawnPlacement({
      directory: dir, backend: homedBackend(home, true, { id: "insideorch" }), space: null,
      packRootId: seedOrch(dir, "packroot02"), cwd: "/work", label: "api", grantNewHome: grant.grantNewHome,
    });

    // A7: a space is optional, and nothing mints one from a path.
    expect(placement.space).toBeNull();
    // No coordinate: the plexer places the fleet where the caller already is.
    expect(placement.workspace).toBeUndefined();
    expect(home.created).toEqual([]);
    expect(grant.asked).toBe(0);
  });

  // Rule 11: environment is never identity. A human's own pane has HERDR_PANE_ID
  // and NO launch env — it is inside the plexer and has no orch identity, and
  // those are two different facts. 2026-08-29: the placement answered "inside?"
  // with a non-null identity result, so a Claude session the user launched in
  // a herdr pane was told it was OUTSIDE herdr and asked for a grant to open a
  // window it never needed.
  test("a caller INSIDE the plexer with NO orch identity (a human's pane) spawns beside itself", () => {
    const dir = fixture();
    const home = new RecordingHomeRole();
    const grant = gate();

    const placement = resolveSpawnPlacement({
      directory: dir, backend: homedBackend(home, true, null), space: null,
      packRootId: seedOrch(dir, "packroot02b"), cwd: "/work", label: "api", grantNewHome: grant.grantNewHome,
    });

    expect(placement.space).toBeNull();
    expect(placement.workspace).toBeUndefined();
    expect(home.created).toEqual([]);
    expect(grant.asked).toBe(0);
  });

  test("with no space and orch OUTSIDE the plexer, the PACK gets its own marked home", () => {
    const dir = fixture();
    const orch = seedOrch(dir, "packroot03");
    const home = new RecordingHomeRole();
    const grant = gate();

    const placement = resolveSpawnPlacement({
      directory: dir, backend: homedBackend(home, false), space: null,
      packRootId: orch, cwd: "/home/bryan/work", label: "api", grantNewHome: grant.grantNewHome,
    });

    // E8: allowable, but never unmarked, and never at orch's own discretion -
    // it puts a window on the human's screen, so the human is asked first.
    expect(grant.asked).toBe(1);
    expect(home.created[0]?.subject).toEqual({ kind: "pack", id: orch });
    expect(home.created[0]?.request.label ?? "").toContain("orch");
    // E9/E10: the coordinate is the workspace and is RECORDED against the pack.
    // It is never orch's space, which stays absent because nobody created one.
    expect(placement.workspace).toBe("w1");
    expect(placement.space).toBeNull();
    expect(homeHandle(dir, { kind: "pack", id: orch }, "herdr")).toBe("w1");
  });

  test("the same pack spawning again reuses its home and asks the human nothing", () => {
    const dir = fixture();
    const orch = seedOrch(dir, "packroot04");
    const home = new RecordingHomeRole();
    const grant = gate();
    const request = {
      directory: dir, backend: homedBackend(home, false), space: null,
      packRootId: orch, cwd: "/work", label: "api", grantNewHome: grant.grantNewHome,
    };

    const first = resolveSpawnPlacement(request);
    const second = resolveSpawnPlacement(request);

    expect(second.workspace).toBe(first.workspace);
    // One home, one grant. A second window per wave is exactly the "random
    // agents with no discoverable origin" this row exists to prevent, inverted.
    expect(home.created).toHaveLength(1);
    expect(grant.asked).toBe(1);
  });

  test("an environment that holds nothing answers with an absence, never a refusal", () => {
    const dir = fixture();
    const grant = gate();

    const placement = resolveSpawnPlacement({
      directory: dir, backend: homedBackend(null, false), space: null,
      packRootId: seedOrch(dir, "packroot05"), cwd: "/work", label: "api", grantNewHome: grant.grantNewHome,
    });

    // E13/E14: `spaceHome === null` IS the capability, and orch never reaches
    // for what the environment lacks - there is nothing to catch and nothing to
    // ask a human to approve.
    expect(placement).toEqual({ space: null, workspace: undefined });
    expect(grant.asked).toBe(0);
  });

  test("a space with no home HERE places the fleet without borrowing another plexer's", () => {
    const dir = fixture();
    seedSpace(dir, "space00002");
    const home = new RecordingHomeRole();
    openHome({ directory: dir, subject: { kind: "space", id: "space00002" }, plexerId: "tmux", home, cwd: "/work", label: "research" });
    const grant = gate();

    const placement = resolveSpawnPlacement({
      directory: dir, backend: homedBackend(home, false), space: "space00002",
      packRootId: seedOrch(dir, "packroot06"), cwd: "/work", label: "api", grantNewHome: grant.grantNewHome,
    });

    // The user named a space, so that is where the agents are filed. The home
    // belongs to another plexer and is not this one's to drive.
    expect(placement.space).toBe("space00002");
    expect(placement.workspace).toBeUndefined();
  });
});
