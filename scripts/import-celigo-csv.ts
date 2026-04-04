/**
 * Import a NetSuite/Celigo-style CSV (Price Checker Item Export) into SQLite.
 * Usage: npx tsx scripts/import-celigo-csv.ts [path/to/export.csv]
 */
import fs from "node:fs";
import path from "node:path";

import {
  celigoRecordToProduct,
  type CeligoRecord,
} from "../src/lib/celigo-mapper";
import { getProductCount, upsertProducts } from "../src/lib/products-repository";

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
const raw = fs.readFileSync(csvPath, "utf8");
const table = parseCsv(raw);
if (table.length < 2) {
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
  console.error("No valid product rows after mapping.");
  process.exit(1);
}

const n = upsertProducts(products);
console.log(
  `Imported ${n} product(s) from ${path.relative(process.cwd(), csvPath)} (skipped ${skipped} row(s)). Total in DB: ${getProductCount()}.`,
);
