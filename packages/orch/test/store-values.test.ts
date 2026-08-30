import { describe, expect, test } from "bun:test";
import { nullableJsonText, setNonNullField } from "../src/store/row-values.ts";

describe("store row values", () => {
  test("uses null for optional database values without JSON text", () => {
    expect(nullableJsonText(undefined)).toBeNull();
    expect(nullableJsonText({ ok: true })).toBe('{"ok":true}');
  });

  test("sets only non-null fields", () => {
    const record: { present?: string; absent?: string } = {};
    setNonNullField(record, "present", "value");
    setNonNullField(record, "absent", null);
    expect(record).toEqual({ present: "value" });
  });
});
