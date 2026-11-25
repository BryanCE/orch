import { isLane, type Lane } from "../../src/types/queue.ts";

/** A lane for a fixture, parsed as the CLI parses one. */
export function lane(name: string): Lane {
  if (!isLane(name)) throw new Error(`fixture lane ${JSON.stringify(name)} is not a lane name`);
  return name;
}
