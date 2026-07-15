import { useCallback, useEffect, useMemo, useState } from "react";

/** Reads sessionStorage after mount to keep SSR and hydration safe. */
export function useSessionStorageState(
  key: string,
  fallback: string
): [string, (value: string) => void] {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    const stored = sessionStorage.getItem(key);
    if (stored !== null) setValue(stored);
  }, [key]);

  const updateValue = useCallback(
    (value: string) => {
      setValue(value);
      sessionStorage.setItem(key, value);
    },
    [key]
  );

  return [value, updateValue];
}

/** JSON variant of useSessionStorageState for structured values. Pass a stable (module-level) fallback. */
export function useSessionStorageJsonState<T>(
  key: string,
  fallback: T
): [T, (value: T) => void] {
  const [raw, setRaw] = useSessionStorageState(key, JSON.stringify(fallback));
  const value = useMemo(() => {
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`Discarding unparseable sessionStorage value for ${key}`, err);
      return fallback;
    }
  }, [raw, key, fallback]);
  const updateValue = useCallback(
    (next: T) => setRaw(JSON.stringify(next)),
    [setRaw]
  );
  return [value, updateValue];
}
