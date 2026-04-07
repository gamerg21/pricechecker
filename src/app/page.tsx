"use client";

import Image from "next/image";
import {
  ChangeEvent,
  useCallback,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type ProductRecord = {
  id: string;
  barcode: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  updatedAt: string;
};

type LookupState = {
  loading: boolean;
  error: string | null;
  product: ProductRecord | null;
};

const initialState: LookupState = {
  loading: false,
  error: null,
  product: null,
};

function hasProductImage(url: string): boolean {
  return url.trim().length > 0;
}

function ProductDetail({
  product,
  updatedAtLabel,
}: {
  product: ProductRecord;
  updatedAtLabel: string | null;
}) {
  const showImage = hasProductImage(product.imageUrl);
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200">
      <div
        className={
          showImage
            ? "grid grid-cols-[minmax(8.5rem,14rem)_1fr]"
            : "grid grid-cols-1"
        }
      >
        {showImage ? (
          <div className="relative min-h-40 bg-slate-200">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="40vw"
              className="object-cover"
              priority
              unoptimized={
                !product.imageUrl.startsWith("https://images.unsplash.com")
              }
            />
          </div>
        ) : null}
        <div className="space-y-1.5 p-3">
          <h2 className="text-xl font-bold">{product.name}</h2>
          <p className="text-sm text-slate-600">{product.description}</p>
          <p className="text-3xl font-extrabold text-indigo-700">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: product.currency,
            }).format(product.price)}
          </p>
          <div className="grid grid-cols-1 gap-1 text-sm text-slate-600">
            <p>
              <strong>SKU:</strong> {product.sku}
            </p>
            <p>
              <strong>Barcode:</strong> {product.barcode}
            </p>
            {updatedAtLabel ? (
              <p>
                <strong>Last Sync:</strong> {updatedAtLabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [barcode, setBarcode] = useState("");
  const [state, setState] = useState<LookupState>(initialState);
  const [lastSearchedBarcode, setLastSearchedBarcode] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updatedAtLabel = state.product?.updatedAt
    ? new Date(state.product.updatedAt).toLocaleString()
    : null;

  const runLookup = useCallback(async (rawBarcode: string) => {
    const normalizedBarcode = rawBarcode.trim();
    if (!normalizedBarcode) {
      if (mountedRef.current) {
        setState({ loading: false, error: null, product: null });
      }
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    if (mountedRef.current) {
      setLastSearchedBarcode(normalizedBarcode);
      setState((prev) => ({ ...prev, loading: true, error: null }));
    }

    try {
      const response = await fetch(
        `/api/products?barcode=${encodeURIComponent(normalizedBarcode)}`,
        { method: "GET" },
      );

      if (!response.ok) {
        if (requestId !== requestIdRef.current || !mountedRef.current) return;
        const body = (await response.json()) as { error?: string };
        setState({
          loading: false,
          error: body.error ?? "Unable to find product.",
          product: null,
        });
        return;
      }

      const body = (await response.json()) as { product: ProductRecord };
      if (requestId !== requestIdRef.current || !mountedRef.current) return;
      setState({
        loading: false,
        error: null,
        product: body.product,
      });
    } catch {
      if (requestId !== requestIdRef.current || !mountedRef.current) return;
      setState({
        loading: false,
        error: "Lookup failed. Check local server connectivity.",
        product: null,
      });
    }
  }, []);

  useEffect(() => {
    const normalized = barcode.trim();
    if (!normalized) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (normalized !== lastSearchedBarcode) {
        setBarcode("");
        setLastSearchedBarcode(normalized);
        void runLookup(normalized);
      }
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [barcode, lastSearchedBarcode, runLookup]);

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    const normalized = barcode.trim();
    if (!normalized) {
      return;
    }
    setBarcode("");
    setLastSearchedBarcode(normalized);
    void runLookup(normalized);
  }

  function handleBarcodeChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    setBarcode(nextValue);

    if (!nextValue.trim()) {
      setLastSearchedBarcode("");
      setState(initialState);
      return;
    }

    // Always clear previous result while new scan input is arriving.
    setState({ loading: false, error: null, product: null });
  }

  function clearAndRefocus() {
    setBarcode("");
    setLastSearchedBarcode("");
    setState(initialState);
    inputRef.current?.focus();
  }

  return (
    <div
      className="min-h-svh bg-slate-100 p-3 font-sans text-slate-900"
      data-kiosk
    >
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-xl bg-white p-4 shadow-md">
        <header className="space-y-1">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0"
              priority
            />
            <h1 className="text-2xl font-bold tracking-tight">Price Checker</h1>
          </div>
          <p className="text-sm text-slate-600">
            Scan product barcode to view item details and price.
          </p>
        </header>

        <form className="space-y-2" onSubmit={(event) => event.preventDefault()}>
          <label className="text-sm font-semibold" htmlFor="barcode">
            Barcode
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id="barcode"
              name="barcode"
              autoFocus
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none ring-indigo-500 focus:ring-2"
              value={barcode}
              onChange={handleBarcodeChange}
              onKeyDown={handleInputKeyDown}
              placeholder="Scan or type barcode here"
            />
            <div className="flex min-w-24 items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
              {state.loading ? "Checking..." : "Auto"}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              type="button"
              onClick={clearAndRefocus}
            >
              Clear
            </button>
            <span className="self-center text-xs text-slate-500">
              Scan a barcode or type one in and press Enter.
            </span>
          </div>
        </form>

        {state.error ? (
          <section className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="text-rose-700">{state.error}</p>
          </section>
        ) : null}

        {state.product ? (
          <ProductDetail
            product={state.product}
            updatedAtLabel={updatedAtLabel}
          />
        ) : null}
      </main>
    </div>
  );
}
