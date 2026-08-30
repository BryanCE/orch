/** Return nullable JSON text for an optional database value. */
export function nullableJsonText(value: unknown): string | null {
  return JSON.stringify(value) ?? null;
}

/** Add a nullable database field only when the row contains a value. */
export function setNonNullField<Target extends object, Key extends keyof Target>(
  record: Target,
  key: Key,
  value: Target[Key] | null,
): void {
  if (value !== null) record[key] = value;
}
