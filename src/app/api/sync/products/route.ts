import { NextResponse } from "next/server";
import { ProductRecord } from "@/lib/mock-products";
import { parseCeligoPayload } from "@/lib/celigo-mapper";
import { getProductCount, upsertProducts } from "@/lib/products-repository";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: SyncPayload;
  try {
    body = (await request.json()) as SyncPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const products = normalizePayload(body);
  if (products.length === 0) {
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
    return NextResponse.json(
      { error: "One or more products are missing required fields" },
      { status: 400 },
    );
  }

  const count = upsertProducts(products);
  return NextResponse.json(
    {
      success: true,
      upsertedCount: count,
      totalProducts: getProductCount(),
    },
    { status: 200 },
  );
}
