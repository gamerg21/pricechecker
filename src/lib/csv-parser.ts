/**
 * Shared CSV parser — used by both the CLI import script and the admin upload API.
 * Handles quoted fields, embedded newlines, and escaped double-quotes.
 */

export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  function pushField() {
    row.push(field);
    field = "";
  }

  function pushRow() {
    pushField();
    const nonEmpty = row.some((cell) => cell.length > 0);
    if (nonEmpty || rows.length === 0) {
      rows.push(row);
    }
    row = [];
  }

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\r") {
      if (content[i + 1] === "\n") {
        i++;
      }
      pushRow();
    } else if (c === "\n") {
      pushRow();
    } else {
      field += c;
    }
  }

  if (inQuotes) {
    throw new Error("CSV has an unclosed double-quote");
  }
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows;
}

export function rowToRecord(
  headers: string[],
  values: string[],
): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (let i = 0; i < headers.length; i++) {
    const key = headers[i] ?? `__col_${i}`;
    const value = values[i] ?? "";
    if (key in record) {
      const existing = record[key];
      const merged =
        typeof existing === "string" && existing.trim() === ""
          ? value
          : existing;
      record[key] = merged;
    } else {
      record[key] = value;
    }
  }
  return record;
}
