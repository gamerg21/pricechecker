import { NextResponse } from "next/server";
import { appendApiActivity } from "@/lib/api-activity-repository";
import { parseCsv, rowToRecord } from "@/lib/csv-parser";
import { celigoRecordToProduct } from "@/lib/celigo-mapper";
import { normalizeImportBatch } from "@/lib/product-import-normalizer";
import { getProductCount, upsertProducts } from "@/lib/products-repository";

const ROUTE = "/api/admin/upload-csv";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function logUpload(
  status: number,
  level: "success" | "error" | "info",
  message: string,
  detail?: Record<string, unknown> | null,
) {
  try {
    appendApiActivity({ route: ROUTE, method: "POST", status, level, message, detail });
  } catch {
    // best-effort
  }
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    logUpload(400, "error", "CSV upload failed: could not parse form data");
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    logUpload(400, "error", "CSV upload failed: no file provided");
    return NextResponse.json({ error: "No CSV file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    logUpload(400, "error", "CSV upload rejected: file too large", {
      fileName: file.name,
      fileSize: file.size,
    });
    return NextResponse.json(
      { error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` },
      { status: 400 },
    );
  }

  let raw: string;
  try {
    raw = await file.text();
  } catch {
    logUpload(400, "error", "CSV upload failed: could not read file contents");
    return NextResponse.json({ error: "Could not read file" }, { status: 400 });
  }

  let table: string[][];
  try {
    table = parseCsv(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : "CSV parse error";
    logUpload(400, "error", `CSV upload failed: ${message}`, { fileName: file.name });
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (table.length < 2) {
    logUpload(400, "error", "CSV upload rejected: no data rows", { fileName: file.name });
    return NextResponse.json(
      { error: "CSV must have a header row and at least one data row" },
      { status: 400 },
    );
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
    logUpload(400, "error", "CSV upload rejected: no valid rows after mapping", {
      fileName: file.name,
      skippedRows: skipped,
    });
    return NextResponse.json(
      { error: "No valid product rows found after mapping" },
      { status: 400 },
    );
  }

  const normalizedProducts = normalizeImportBatch(products);
  const dedupedWithinBatch = products.length - normalizedProducts.length;

  let count: number;
  try {
    count = upsertProducts(normalizedProducts);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    logUpload(500, "error", "CSV upload failed: database error during upsert", {
      fileName: file.name,
      message,
      batchSize: normalizedProducts.length,
    });
    return NextResponse.json({ error: "Failed to persist products" }, { status: 500 });
  }

  const totalProducts = getProductCount();
  logUpload(200, "success", `Imported ${count} product(s) from CSV upload`, {
    fileName: file.name,
    upsertedCount: count,
    skippedRows: skipped,
    dedupedWithinBatch,
    totalProducts,
    batchSize: normalizedProducts.length,
    originalBatchSize: products.length,
  });

  return NextResponse.json({
    success: true,
    fileName: file.name,
    upsertedCount: count,
    skippedRows: skipped,
    dedupedWithinBatch,
    totalProducts,
  });
}
