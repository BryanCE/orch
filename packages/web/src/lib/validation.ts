export function includesValue<T extends string>(values: readonly T[], value: string | null | undefined): value is T {
  return value !== null && value !== undefined && values.some((item) => item === value);
}
