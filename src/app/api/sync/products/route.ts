import { NextResponse } from "next/server";
import { appendApiActivity } from "@/lib/api-activity-repository";
import { ProductRecord } from "@/lib/mock-products";
import { parseCeligoPayload } from "@/lib/celigo-mapper";
import { normalizeImportBatch } from "@/lib/product-import-normalizer";
import { getProductCount, upsertProducts } from "@/lib/products-repository";

const SYNC_ROUTE = "/api/sync/products";

function logSync(
  status: number,
  level: "success" | "error" | "info",
  message: string,
  detail?: Record<string, unknown> | null,
) {
  try {
    appendApiActivity({
      route: SYNC_ROUTE,
      method: "POST",
      status,
      level,
      message,
      detail,
    });
  } catch {
    // Avoid breaking API responses if the activity table is unavailable.
  }
}

type SyncPayload = {
  products?: ProductRecord[];
  page_of_records?: unknown[];
};

function hasRequiredFields(product: Partial<ProductRecord>) {
  return Boolean(
    product.id &&
      product.barcode &&
      product.sku &&
      product.name &&
      typeof product.price === "number" &&
      product.currency &&
      product.imageUrl != null &&
      product.updatedAt,
  );
}

/** Ensure wholesalePrice defaults to null when not provided via direct API. */
function normalizeProduct(product: ProductRecord): ProductRecord {
  return {
    ...product,
    wholesalePrice: product.wholesalePrice ?? null,
  };
}

function normalizePayload(body: SyncPayload): ProductRecord[] {
  if (body.page_of_records != null) {
    return parseCeligoPayload(body);
  }
  if (Array.isArray(body.products)) {
    return body.products;
  }
  return [];
}

export async function POST(request: Request) {
  const syncKey = process.env.SYNC_API_KEY;
  if (syncKey) {
    const providedKey = request.headers.get("x-sync-key");
    if (providedKey !== syncKey) {
      logSync(401, "error", "Sync rejected: invalid or missing x-sync-key");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: SyncPayload;
  try {
    body = (await request.json()) as SyncPayload;
  } catch {
    logSync(400, "error", "Sync failed: invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const products = normalizePayload(body);
  if (products.length === 0) {
    logSync(
      400,
      "error",
      "Sync rejected: empty payload (no products or page_of_records)",
    );
    return NextResponse.json(
      {
        error:
          "Expected payload: { products: ProductRecord[] } or { page_of_records: Record[] } (Celigo export format)",
      },
      { status: 400 },
    );
  }

  const invalidProducts = products.filter(
    (product) => !hasRequiredFields(product),
  );
  if (invalidProducts.length > 0) {
    logSync(
      400,
      "error",
      "Sync rejected: one or more products missing required fields",
      { invalidCount: invalidProducts.length, batchSize: products.length },
    );
    return NextResponse.json(
      { error: "One or more products are missing required fields" },
      { status: 400 },
    );
  }

  const normalizedProducts = normalizeImportBatch(products.map(normalizeProduct));
  const dedupedWithinBatch = products.length - normalizedProducts.length;

  let count: number;
  try {
    count = upsertProducts(normalizedProducts);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during upsert";
    logSync(500, "error", "Sync failed: database error during upsert", {
      message,
    });
    return NextResponse.json(
      { error: "Failed to persist products" },
      { status: 500 },
    );
  }

  const totalProducts = getProductCount();
  logSync(200, "success", `Upserted ${count} product(s)`, {
    upsertedCount: count,
    totalProducts,
    batchSize: normalizedProducts.length,
    originalBatchSize: products.length,
    dedupedWithinBatch,
  });

  return NextResponse.json(
    {
      success: true,
      upsertedCount: count,
      totalProducts,
      dedupedWithinBatch,
    },
    { status: 200 },
  );
}
