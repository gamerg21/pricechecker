import { NextResponse } from "next/server";
import { listProducts } from "@/lib/products-repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") ?? "100");
  const limit = Number.isNaN(limitParam) ? 100 : limitParam;
  const products = listProducts(limit);

  return NextResponse.json(
    {
      products,
      count: products.length,
    },
    { status: 200 },
  );
}
