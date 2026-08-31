import { z } from "zod";
import { SETTINGS_FILE_SCHEMA } from "./schema.ts";
import { isRecord } from "../util.ts";

/**
 * The settings schema as a walkable tree.
 *
 * One derived view of `SETTINGS_FILE_SCHEMA` that the registry (which asks what type a key
 * holds) and the repair screen (which asks whether a key exists at all, and what value it
 * would accept) both read. Neither re-describes a shape zod already owns.
 */
export interface JsonSchemaNode {
  readonly type?: string;
  readonly enum?: readonly unknown[];
  /** JSON Schema `const`: the single value this node accepts. */
  readonly constant?: unknown;
  readonly properties?: Record<string, unknown>;
  readonly items?: unknown;
  readonly minimum?: number;
  readonly exclusiveMinimum?: number;
  readonly maximum?: number;
}

export function jsonSchemaNode(value: unknown): JsonSchemaNode | null {
  if (!isRecord(value)) return null;
  return {
    type: typeof value.type === "string" ? value.type : undefined,
    enum: Array.isArray(value.enum) ? value.enum : undefined,
    constant: value.const,
    properties: isRecord(value.properties) ? value.properties : undefined,
    items: value.items,
    minimum: typeof value.minimum === "number" ? value.minimum : undefined,
    exclusiveMinimum: typeof value.exclusiveMinimum === "number" ? value.exclusiveMinimum : undefined,
    maximum: typeof value.maximum === "number" ? value.maximum : undefined,
  };
}

const JSON_SCHEMA = z.toJSONSchema(SETTINGS_FILE_SCHEMA);

/** The node at a dotted key, or null when the schema declares no such path. */
export function findSchemaNode(key: string): JsonSchemaNode | null {
  let current: unknown = JSON_SCHEMA;
  for (const segment of key.split(".")) {
    const properties = jsonSchemaNode(current)?.properties;
    if (properties === undefined) return null;
    current = properties[segment];
  }
  return jsonSchemaNode(current);
}

/** The node at a dotted key a caller has already established exists. */
export function schemaNode(key: string): JsonSchemaNode {
  const node = findSchemaNode(key);
  if (node === null) throw new Error(`settings schema has no value for ${key}`);
  return node;
}

/** Every dotted path the schema declares, parents included: the closed set of things a key
 *  in settings.json is allowed to be. */
export function schemaKeyPaths(): readonly string[] {
  const paths: string[] = [];
  const walk = (node: JsonSchemaNode | null, prefix: string): void => {
    for (const [key, child] of Object.entries(node?.properties ?? {})) {
      const path = prefix === "" ? key : `${prefix}.${key}`;
      paths.push(path);
      walk(jsonSchemaNode(child), path);
    }
  };
  walk(jsonSchemaNode(JSON_SCHEMA), "");
  return paths;
}

/** The one value a path accepts, when it accepts exactly one. `schemaVersion` is 1 and
 *  nothing else, so a repair can offer that value instead of offering only deletion. */
export function pinnedSchemaValue(key: string): unknown {
  const node = findSchemaNode(key);
  if (node === null) return undefined;
  if (node.constant !== undefined) return node.constant;
  return node.enum?.length === 1 ? node.enum[0] : undefined;
}
