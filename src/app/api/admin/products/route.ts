import { NextResponse } from "next/server";
import {
  isProductSortKey,
  listProductsPage,
  type ProductSortKey,
  type SortDirection,
} from "@/lib/products-repository";

function parseSort(raw: string | null): ProductSortKey {
  if (raw && isProductSortKey(raw)) return raw;
  return "updatedAt";
}

function parseDir(raw: string | null): SortDirection {
  return raw === "asc" ? "asc" : "desc";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") ?? "100");
  const limit = Number.isNaN(limitParam) ? 100 : limitParam;
  const offsetParam = Number(searchParams.get("offset") ?? "0");
  const offset = Number.isNaN(offsetParam) ? 0 : offsetParam;
  const q = searchParams.get("q") ?? undefined;
  const sortKey = parseSort(searchParams.get("sort"));
  const sortDir = parseDir(searchParams.get("dir"));

  const { products, totalMatched, hasMore } = listProductsPage({
    limit,
    offset,
    q,
    sortKey,
    sortDir,
  });

  return NextResponse.json(
    {
      products,
      totalMatched,
      hasMore,
      count: products.length,
    },
    { status: 200 },
  );
}
