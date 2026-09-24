import { z } from "zod";

export interface CliCacheEntry {
  readonly at: number;
  readonly value: unknown;
}

export type CliCacheLookup =
  | { readonly kind: "miss"; readonly key: string }
  | { readonly kind: "hit"; readonly key: string; readonly value: unknown };

export function findFreshCacheEntry(
  cache: ReadonlyMap<string, CliCacheEntry>,
  args: readonly string[],
  ttlMs: number,
): CliCacheLookup {
  const key = args.join(" ");
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < ttlMs) return { kind: "hit", key, value: cached.value };
  return { kind: "miss", key };
}

export function buildCommandFailure(command: string, args: readonly string[], detail: string): string {
  return `${command} ${args.join(" ")} failed: ${detail}`;
}

export function parseCliJson<S extends z.ZodType>(
  value: unknown,
  schema: S,
  command: string,
  createError: (message: string) => Error,
): z.output<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message).join(", ");
    throw createError(`${command} answered an unexpected shape: ${issues}`);
  }
  return parsed.data;
}
