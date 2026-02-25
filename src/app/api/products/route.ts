import { NextResponse } from "next/server";
import { findProductByBarcode, getProductCount } from "@/lib/products-repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get("barcode")?.trim();

  if (!barcode) {
    return NextResponse.json(
      { error: "Missing required query param: barcode" },
      { status: 400 },
    );
  }

  const product = findProductByBarcode(barcode);

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
