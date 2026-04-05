import { NextResponse } from "next/server";
import {
  listProductsPage,
  type ProductListCursor,
} from "@/lib/products-repository";

function parseCursor(raw: string | null): ProductListCursor | null {
  if (!raw || raw.trim() === "") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (
      typeof o.updatedAt !== "string" ||
      typeof o.name !== "string" ||
      typeof o.id !== "string"
    ) {
      return null;
    }
    return { updatedAt: o.updatedAt, name: o.name, id: o.id };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") ?? "100");
  const limit = Number.isNaN(limitParam) ? 100 : limitParam;
  const q = searchParams.get("q") ?? undefined;
  const cursor = parseCursor(searchParams.get("cursor"));

  const { products, nextCursor, totalMatched } = listProductsPage({
    limit,
    cursor,
    q,
  });

  return NextResponse.json(
    {
      products,
      nextCursor,
      totalMatched,
      count: products.length,
    },
    { status: 200 },
  );
}
