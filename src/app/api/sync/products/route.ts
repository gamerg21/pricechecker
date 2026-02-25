import { NextResponse } from "next/server";
import { ProductRecord } from "@/lib/mock-products";
import { getProductCount, upsertProducts } from "@/lib/products-repository";

type SyncPayload = {
  products: ProductRecord[];
};

function hasRequiredFields(product: Partial<ProductRecord>) {
  return Boolean(
    product.id &&
      product.barcode &&
      product.sku &&
      product.name &&
      typeof product.price === "number" &&
      product.currency &&
      product.imageUrl &&
      product.updatedAt,
  );
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

  if (!Array.isArray(body.products)) {
    return NextResponse.json(
      { error: "Expected payload: { products: ProductRecord[] }" },
      { status: 400 },
    );
  }

  const invalidProducts = body.products.filter(
    (product) => !hasRequiredFields(product),
  );
  if (invalidProducts.length > 0) {
    return NextResponse.json(
      { error: "One or more products are missing required fields" },
      { status: 400 },
    );
  }

  const count = upsertProducts(body.products);
  return NextResponse.json(
    {
      success: true,
      upsertedCount: count,
      totalProducts: getProductCount(),
    },
    { status: 200 },
  );
}
