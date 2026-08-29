import { mintAgentId } from "../backends/identity.ts";
import type { PlexerHome, SpaceHomeRole } from "../backends/backend.ts";
import { resolveBackend } from "../backends/registry.ts";
import { loadConfig } from "../config.ts";
import { orchDir } from "../presence/store.ts";
import { openStore } from "../store/connection.ts";
import { ensurePlexer } from "../store/agent-rows.ts";
import { die, splitOptionFlags } from "./target.ts";
import { isRecord } from "../util.ts";

interface SpaceRecord {
  readonly id: string;
  readonly name: string;
}

interface SpaceHomeRecord {
  readonly spaceId: string;
  readonly coordinate: string;
}

function readSpaceRows(directory: string): SpaceRecord[] {
  const rows = openStore(directory).query("SELECT id, name FROM spaces ORDER BY name, id").all();
  return rows.flatMap((value): SpaceRecord[] => {
    if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") return [];
    return [{ id: value.id, name: value.name }];
  });
}

function readHome(directory: string, spaceId: string): SpaceHomeRecord | null {
  const row = openStore(directory).query("SELECT space_id, handle FROM space_plexers WHERE space_id = ? AND until IS NULL").get(spaceId);
  if (!isRecord(row) || typeof row.space_id !== "string" || typeof row.handle !== "string") return null;
  return { spaceId: row.space_id, coordinate: row.handle };
}

function findSpace(directory: string, target: string): SpaceRecord {
  const matches = readSpaceRows(directory).filter((space) => space.id === target || space.name === target);
  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1) die(`Ambiguous space "${target}".`);
  die(`No space named or identified "${target}".`);
}

function boundary(json: boolean): void {
  const answer = { outcome: "answer" as const, reason: "no-environment-role" as const, text: "this environment does not provide space home" };
  if (json) process.stdout.write(JSON.stringify(answer) + "\n");
  else process.stdout.write(answer.text + "\n");
}

interface SelectedSpaceHome {
  readonly role: SpaceHomeRole;
  readonly directory: string;
  readonly plexerId: string;
}

function selectedSpaceHome(): SelectedSpaceHome | null {
  const directory = orchDir();
  const config = loadConfig(directory);
  const backend = resolveBackend({ configured: config.defaults.backend ?? null });
  const role = backend.spaceHome;
  if (role === null || role === undefined) return null;
  return { role, directory, plexerId: backend.id };
}

function parseArgs(args: string[]): { json: boolean; positional: string[] } {
  const { enabled, positional } = splitOptionFlags(args, ["--json"]);
  return { json: enabled.has("--json"), positional };
}

function listSpaces(role: SpaceHomeRole, directory: string, json: boolean): void {
  const homes = role.list();
  const homeCoordinates = new Set(homes.map((home: PlexerHome) => home.coordinate));
  const spaces = readSpaceRows(directory).map((space) => ({ ...space, home: homeCoordinates.has(readHome(directory, space.id)?.coordinate ?? "") }));
  if (json) process.stdout.write(JSON.stringify(spaces, null, 2) + "\n");
  else if (!spaces.length) process.stdout.write("No spaces.\n");
  else for (const space of spaces) process.stdout.write(`${space.name}\n`);
}

function createSpace(role: SpaceHomeRole, directory: string, plexerId: string, name: string, json: boolean): void {
  if (!name) die("usage: orch space new <name> [--json]");
  const id = mintAgentId();
  const created = role.create({ kind: "space", id }, { cwd: process.cwd(), label: name });
  ensurePlexer(directory, plexerId, plexerId);
  const now = Date.now();
  const db = openStore(directory);
  db.query("INSERT INTO spaces (id, name, created_at) VALUES (?, ?, ?)").run(id, name, now);
  db.query("INSERT INTO space_plexers (space_id, since, until, plexer_id, handle) VALUES (?, ?, NULL, ?, ?)").run(id, now, plexerId, created.coordinate);
  if (json) process.stdout.write(JSON.stringify({ space: { id, name }, created: true }) + "\n");
  else process.stdout.write(`Created space "${name}".\n`);
}

function renameSpace(role: SpaceHomeRole, directory: string, target: string | undefined, name: string | undefined, json: boolean): void {
  if (!target || !name) die("usage: orch space rename <space> <name> [--json]");
  const space = findSpace(directory, target);
  const home = readHome(directory, space.id);
  if (!home) die(`Space "${space.name}" has no home in this environment.`);
  role.rename(home.coordinate, name);
  openStore(directory).query("UPDATE spaces SET name = ? WHERE id = ?").run(name, space.id);
  if (json) process.stdout.write(JSON.stringify({ space: { id: space.id, name }, renamed: true }) + "\n");
  else process.stdout.write(`Renamed space "${space.name}" to "${name}".\n`);
}

function closeSpace(role: SpaceHomeRole, directory: string, target: string | undefined, json: boolean): void {
  if (!target) die("usage: orch space close <space> [--json]");
  const space = findSpace(directory, target);
  const occupied = openStore(directory).query("SELECT 1 FROM agent_spaces WHERE space_id = ? AND until IS NULL LIMIT 1").get(space.id);
  if (occupied !== null) die(`Space "${space.name}" is not empty.`);
  const home = readHome(directory, space.id);
  if (home) role.close(home.coordinate);
  const db = openStore(directory);
  db.query("DELETE FROM space_plexers WHERE space_id = ?").run(space.id);
  db.query("DELETE FROM spaces WHERE id = ?").run(space.id);
  if (json) process.stdout.write(JSON.stringify({ space: { id: space.id, name: space.name }, closed: true }) + "\n");
  else process.stdout.write(`Closed space "${space.name}".\n`);
}

function focusSpace(role: SpaceHomeRole, directory: string, target: string | undefined, json: boolean): void {
  if (!target) die("usage: orch space focus <space> [--json]");
  const space = findSpace(directory, target);
  const home = readHome(directory, space.id);
  if (!home) die(`Space "${space.name}" has no home in this environment.`);
  role.focus(home.coordinate);
  if (json) process.stdout.write(JSON.stringify({ space: { id: space.id, name: space.name }, focused: true }) + "\n");
  else process.stdout.write(`Focused space "${space.name}".\n`);
}

export function cmdSpace(args: string[]): void {
  const { json, positional } = parseArgs(args);
  const selected = selectedSpaceHome();
  if (selected === null) {
    boundary(json);
    return;
  }
  const { role, directory, plexerId } = selected;
  const sub = positional[0] ?? "list";
  if (sub === "list") listSpaces(role, directory, json);
  else if (sub === "new") createSpace(role, directory, plexerId, positional[1] ?? "", json);
  else if (sub === "rename") renameSpace(role, directory, positional[1], positional[2], json);
  else if (sub === "close") closeSpace(role, directory, positional[1], json);
  else if (sub === "focus") focusSpace(role, directory, positional[1], json);
  else die("usage: orch space list|new <name>|rename <space> <name>|close <space>|focus <space> [--json]");
}
