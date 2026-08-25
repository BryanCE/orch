import { truncate } from "./util.ts";

export function renderTable(headers: string[], rows: string[][], caps: number[]): string {
  const widths = headers.map((header, index) => Math.min(
    Math.max(header.length, ...rows.map((row) => (row[index] ?? "").length)),
    caps[index] ?? Infinity,
  ));
  const format = (cells: string[]) => cells
    .map((cell, index) => truncate(cell, widths[index]!).padEnd(widths[index]!))
    .join("  ")
    .replace(/\s+$/, "");
  // ASCII rule, not U+2500: a Windows console decoding orch's UTF-8 as cp1252
  // turns every box-drawing byte into "âââ", and `orch check > file` bakes it in.
  return [format(headers), widths.map((width) => "-".repeat(width)).join("  ").replace(/\s+$/, ""), ...rows.map(format)].join("\n");
}
