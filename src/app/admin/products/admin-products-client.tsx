"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { logoutAction } from "../actions";
import type { ProductRecord } from "@/lib/mock-products";
import type { ProductListCursor } from "@/lib/products-repository";

const PAGE_SIZE = 100;
const DEBOUNCE_MS = 350;

type ApiResponse = {
  products: ProductRecord[];
  nextCursor: ProductListCursor | null;
  totalMatched: number;
};

export function AdminProductsClient() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<ProductListCursor | null>(null);
  const [totalMatched, setTotalMatched] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const fetchPage = useCallback(
    async (opts: { cursor: ProductListCursor | null; append: boolean }) => {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
      if (opts.cursor) params.set("cursor", JSON.stringify(opts.cursor));

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      const data = (await res.json()) as ApiResponse;
      if (opts.append) {
        setProducts((prev) => [...prev, ...data.products]);
      } else {
        setProducts(data.products);
      }
      setNextCursor(data.nextCursor);
      setTotalMatched(data.totalMatched);
    },
    [debouncedQuery],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProducts([]);
    setNextCursor(null);
    setTotalMatched(null);
    fetchPage({ cursor: null, append: false })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load products");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, fetchPage]);

  const summary = useMemo(() => {
    if (totalMatched === null) return null;
    const loaded = products.length;
    if (loaded === 0) {
      return debouncedQuery.trim()
        ? `No matches (catalog has ${totalMatched.toLocaleString()} items)`
        : `No products (catalog reports ${totalMatched.toLocaleString()} items)`;
    }
    if (loaded >= totalMatched) {
      return `Showing all ${loaded.toLocaleString()} ${loaded === 1 ? "item" : "items"}`;
    }
    return `Showing ${loaded.toLocaleString()} of ${totalMatched.toLocaleString()}`;
  }, [products.length, totalMatched, debouncedQuery]);

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      await fetchPage({ cursor: nextCursor, append: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-4 rounded-xl bg-white p-6 shadow">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Product Data (Local SQL)</h1>
            <p className="text-sm text-slate-600">
              Internal admin view of the local database running on this server.
              Search by barcode, SKU, or name. Load more to page through large
              catalogs.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/admin/activity"
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              API activity
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Price checker
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </nav>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="block w-full sm:max-w-md">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Barcode, SKU, or product name…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {summary ? (
            <p className="text-sm text-slate-600 sm:text-right">{summary}</p>
          ) : null}
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-2 font-semibold">Barcode</th>
                <th className="p-2 font-semibold">SKU</th>
                <th className="p-2 font-semibold">Name</th>
                <th className="p-2 font-semibold">Price</th>
                <th className="p-2 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : null}
              {!loading && products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No products match this search.
                  </td>
                </tr>
              ) : null}
              {products.map((product) => (
                <tr key={product.id} className="border-b border-slate-100">
                  <td className="p-2">{product.barcode}</td>
                  <td className="p-2">{product.sku}</td>
                  <td className="p-2">{product.name}</td>
                  <td className="p-2">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: product.currency,
                    }).format(product.price)}
                  </td>
                  <td className="p-2">
                    {new Date(product.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {nextCursor ? (
          <div className="flex justify-center border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => void handleLoadMore()}
              disabled={loadingMore}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
