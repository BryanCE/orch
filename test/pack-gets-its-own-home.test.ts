import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearHome, homeHandle, openHome, ORCH_HOME_LABEL } from "../src/store/home-rows.ts";
import { openStore } from "../src/store/connection.ts";
import { insertAgent, ensureHarness } from "../src/store/agent-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedSpace } from "./helpers/space.ts";
import type { CreateHomeRequest, CreatedHome, HomeSubject, PlexerHome, SpaceHomeRole } from "../src/types/backend.ts";

/**
 * TASKS/02-scope.md E8, E9, E10.
 *
 * E8 — an orch spawning into a plexer it is not itself inside MUST get its own
 * new plexer home, and that home is never unmarked: its agents have to read as
 * orch's, not as random panes beside the human's own.
 *
 * E9 — holding orch's structure is something an ENVIRONMENT provides. The role
 * creates / renames / closes a home for a space or a pack, and the coordinate it
 * hands back lands in `space_plexers` / `pack_plexers`.
 *
 * E10 — there is no new noun. The thing grouped is already a space or a pack;
 * what the plexer groups by is a coordinate orch STORES and never says. Printing
 * one is exactly how `wF` came to be shown as a name a human chose.
 */

const dirs: string[] = [];

afterEach(() => { while (dirs.length) removeTempDir(dirs.pop()!); });

/** A home role that records every request, so a test can assert what orch ASKED
 *  for rather than what a plexer happened to answer. */
class RecordingHomeRole implements SpaceHomeRole<string> {
  readonly created: { subject: HomeSubject; request: CreateHomeRequest }[] = [];
  readonly renamed: { coordinate: string; label: string }[] = [];
  readonly closed: string[] = [];
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

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-pack-home-"));
  dirs.push(dir);
  openStore(dir);
  return dir;
}

/** A pack is identified by the agent at its root (`pack_plexers.pack_id`
 *  references `agents.id`), so a pack fixture is that one agent row. */
function seedOrch(dir: string, id: string): string {
  ensureHarness(dir, "pi", "pi", 1);
  insertAgent(dir, { id, harnessId: "pi", cwd: "/work", name: id, createdAt: 1 });
  return id;
}

describe("a pack gets its own marked plexer home (E8, E9, E10)", () => {
  test("the coordinate is STORED against the pack and is never orch's own id", () => {
    const dir = fixture();
    const orch = seedOrch(dir, "packroot01");
    const role = new RecordingHomeRole();

    const coordinate = openHome({
      directory: dir, subject: { kind: "pack", id: orch }, plexerId: "herdr",
      home: role, cwd: "/work", label: "api",
    });

    // E9: the coordinate the plexer handed back landed in `pack_plexers`.
    expect(coordinate).toBe("w1");
    expect(homeHandle(dir, { kind: "pack", id: orch }, "herdr")).toBe("w1");
    // E10: it is a plexer's coordinate, not an orch noun. The pack is still
    // named by the agent at its root - the coordinate names nothing of orch's.
    expect(coordinate).not.toBe(orch);
  });

  test("the home orch opens is MARKED as orch's, never a bare directory name", () => {
    const dir = fixture();
    const orch = seedOrch(dir, "packroot02");
    const role = new RecordingHomeRole();

    openHome({
      directory: dir, subject: { kind: "pack", id: orch }, plexerId: "herdr",
      home: role, cwd: "/home/bryan/work", label: "api",
    });

    // E8: "allowable, but never unmarked". A home labelled `work` - the basename
    // of the cwd - is indistinguishable from the human's own, which is the whole
    // failure this row names.
    const label = role.created[0]?.request.label ?? "";
    expect(label).toContain(ORCH_HOME_LABEL);
    expect(label).toContain("api");
    expect(label).not.toBe("work");
  });

  test("a space's home and a pack's home use the SAME role and different tables", () => {
    const dir = fixture();
    const orch = seedOrch(dir, "packroot03");
    seedSpace(dir, "space00001");
    const role = new RecordingHomeRole();

    const packCoordinate = openHome({
      directory: dir, subject: { kind: "pack", id: orch }, plexerId: "herdr",
      home: role, cwd: "/work", label: "api",
    });
    const spaceCoordinate = openHome({
      directory: dir, subject: { kind: "space", id: "space00001" }, plexerId: "herdr",
      home: role, cwd: "/work", label: "research",
    });

    // E11/E10: one role, one create/rename/close, two subjects - no third code
    // path and no noun minted for the plexer's own grouping.
    expect(role.created.map((call) => call.subject.kind)).toEqual(["pack", "space"]);
    expect(homeHandle(dir, { kind: "pack", id: orch }, "herdr")).toBe(packCoordinate);
    expect(homeHandle(dir, { kind: "space", id: "space00001" }, "herdr")).toBe(spaceCoordinate);
    expect(packCoordinate).not.toBe(spaceCoordinate);
  });

  test("an environment that holds nothing answers with an absence, and stores none", () => {
    const dir = fixture();
    const orch = seedOrch(dir, "packroot04");

    // E13/E14: `home === null` IS the capability. There is no probe and no
    // unsupported-operation throw - the absence is the answer.
    const coordinate = openHome({
      directory: dir, subject: { kind: "pack", id: orch }, plexerId: "headless",
      home: null, cwd: "/work", label: "api",
    });

    expect(coordinate).toBeNull();
    expect(homeHandle(dir, { kind: "pack", id: orch }, "headless")).toBeNull();
  });

  test("a home recorded in another plexer is not this one's to drive", () => {
    const dir = fixture();
    const orch = seedOrch(dir, "packroot05");
    openHome({
      directory: dir, subject: { kind: "pack", id: orch }, plexerId: "herdr",
      home: new RecordingHomeRole(), cwd: "/work", label: "api",
    });

    expect(homeHandle(dir, { kind: "pack", id: orch }, "tmux")).toBeNull();
  });

  test("closing a pack's home clears the row, so the next open is a fresh one", () => {
    const dir = fixture();
    const orch = seedOrch(dir, "packroot06");
    const role = new RecordingHomeRole();
    const subject: HomeSubject = { kind: "pack", id: orch };
    openHome({ directory: dir, subject, plexerId: "herdr", home: role, cwd: "/work", label: "api" });

    clearHome(dir, subject);

    // `one_pack_home` is a partial unique index on (pack_id) where until IS NULL:
    // leaving the old row open would refuse the reopen outright.
    expect(homeHandle(dir, subject, "herdr")).toBeNull();
    const reopened = openHome({ directory: dir, subject, plexerId: "herdr", home: role, cwd: "/work", label: "api" });
    expect(reopened).toBe("w2");
    expect(homeHandle(dir, subject, "herdr")).toBe("w2");
  });
});
