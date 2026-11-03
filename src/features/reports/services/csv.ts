export function serializeCsv(rows: readonly (readonly unknown[])[]) {
  return rows.map((row) => row.map(serializeCsvCell).join(",")).join("\r\n");
}

function serializeCsvCell(value: unknown) {
  const rawValue =
    value instanceof Date ? value.toISOString() : String(value ?? "");
  const safeValue = /^[=+\-@\t\r]/.test(rawValue) ? `'${rawValue}` : rawValue;

  return `"${safeValue.replaceAll('"', '""')}"`;
}
