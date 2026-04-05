import { NextResponse } from "next/server";
import { appendApiActivity } from "@/lib/api-activity-repository";
import { findProductByBarcode, getProductCount } from "@/lib/products-repository";

const PRODUCTS_ROUTE = "/api/products";

function logProductApi(
  status: number,
  level: "success" | "error" | "info",
  message: string,
  detail?: Record<string, unknown> | null,
) {
  try {
    appendApiActivity({
      route: PRODUCTS_ROUTE,
      method: "GET",
      status,
      level,
      message,
      detail,
    });
  } catch {
    // Avoid breaking API responses if the activity table is unavailable.
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get("barcode")?.trim();

  if (!barcode) {
    logProductApi(
      400,
      "error",
      "Lookup failed: missing barcode query parameter",
    );
    return NextResponse.json(
      { error: "Missing required query param: barcode" },
      { status: 400 },
    );
  }

  let product;
  try {
    product = findProductByBarcode(barcode);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during lookup";
    logProductApi(500, "error", "Lookup failed: database error", {
      message,
      barcode,
    });
    return NextResponse.json(
      { error: "Lookup failed" },
      { status: 500 },
    );
  }

  if (!product) {
    return NextResponse.json(
      { error: "Product not found", barcode },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      product,
      source: "local-cache",
      productCount: getProductCount(),
    },
    { status: 200 },
  );
}
