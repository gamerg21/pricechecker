/**
 * Import a NetSuite/Celigo-style CSV (Price Checker Item Export) into SQLite.
 * Usage: npx tsx scripts/import-celigo-csv.ts [path/to/export.csv]
 */
import fs from "node:fs";
import path from "node:path";

import { appendApiActivity } from "../src/lib/api-activity-repository";
import {
  celigoRecordToProduct,
  type CeligoRecord,
} from "../src/lib/celigo-mapper";
import { normalizeImportBatch } from "../src/lib/product-import-normalizer";
import { getProductCount, upsertProducts } from "../src/lib/products-repository";

const IMPORT_ROUTE = "/cli/import-celigo-csv";

function logImport(
  status: number,
  level: "success" | "error" | "info",
  message: string,
  detail?: Record<string, unknown> | null,
) {
  try {
    appendApiActivity({
      route: IMPORT_ROUTE,
      method: "CLI",
      status,
      level,
      message,
      detail,
    });
  } catch {
    // Activity log is best-effort; import should still complete or exit clearly.
  }
}

function parseCsv(content: string): string[][] {
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

function rowToRecord(headers: string[], values: string[]): CeligoRecord {
  const record: CeligoRecord = {};
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

const defaultCsv = path.join(
  process.cwd(),
  "data/samples/PriceCheckerItemExportToyWorldIncResults134-small.csv",
);

const csvPath = path.resolve(process.argv[2] ?? defaultCsv);
const csvRelative = path.relative(process.cwd(), csvPath);

try {
  const raw = fs.readFileSync(csvPath, "utf8");
  const table = parseCsv(raw);
  if (table.length < 2) {
    logImport(400, "error", "CSV import rejected: missing data rows", {
      csvPath: csvRelative,
    });
    console.error("CSV must include a header row and at least one data row.");
    process.exit(1);
  }

  const headers = table[0].map((h) => h.trim());
  const products = [];
  let skipped = 0;

  for (let r = 1; r < table.length; r++) {
    const record = rowToRecord(headers, table[r]);
    const product = celigoRecordToProduct(record);
    if (product) {
      products.push(product);
    } else {
      skipped++;
    }
  }

  if (products.length === 0) {
    logImport(400, "error", "CSV import rejected: no valid rows after mapping", {
      csvPath: csvRelative,
      skippedRows: skipped,
    });
    console.error("No valid product rows after mapping.");
    process.exit(1);
  }

  const normalizedProducts = normalizeImportBatch(products);
  const dedupedWithinBatch = products.length - normalizedProducts.length;

  let n: number;
  try {
    n = upsertProducts(normalizedProducts);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logImport(500, "error", "CSV import failed: database error during upsert", {
      csvPath: csvRelative,
      message,
      batchSize: normalizedProducts.length,
      dedupedWithinBatch,
    });
    console.error(message);
    process.exit(1);
  }

  const totalProducts = getProductCount();
  logImport(200, "success", `Imported ${n} product(s) from CSV`, {
    csvPath: csvRelative,
    upsertedCount: n,
    skippedRows: skipped,
    dedupedWithinBatch,
    totalProducts,
    batchSize: normalizedProducts.length,
    originalBatchSize: products.length,
  });

  console.log(
    `Imported ${n} product(s) from ${csvRelative} (skipped ${skipped} row(s), deduped ${dedupedWithinBatch} conflicting row(s)). Total in DB: ${totalProducts}.`,
  );
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  logImport(500, "error", `CSV import failed: ${message}`, {
    csvPath: csvRelative,
  });
  console.error(message);
  process.exit(1);
}
