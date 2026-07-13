export function truncate(value: string, length: number): string {
  const text = String(value ?? "");
  return text.length <= length ? text : text.slice(0, Math.max(0, length - 1)) + "…";
}

export function renderTable(headers: string[], rows: string[][], caps: number[]): string {
  const widths = headers.map((header, index) => Math.min(
    Math.max(header.length, ...rows.map((row) => (row[index] || "").length)),
    caps[index] ?? Infinity,
  ));
  const format = (cells: string[]) => cells
    .map((cell, index) => truncate(cell, widths[index]).padEnd(widths[index]))
    .join("  ")
    .replace(/\s+$/, "");
  return [format(headers), widths.map((width) => "─".repeat(width)).join("  ").replace(/\s+$/, ""), ...rows.map(format)].join("\n");
}
