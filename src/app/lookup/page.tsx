"use client";

import Image from "next/image";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ProductDetail,
  initialLookupState,
  type LookupState,
  type ProductRecord,
} from "@/components/product-detail";
import { BarcodeCameraScanner } from "@/components/barcode-camera-scanner";

export default function LookupPage() {
  const [barcode, setBarcode] = useState("");
  const [state, setState] = useState<LookupState>(initialLookupState);
  const [cameraActive, setCameraActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const cooldownRef = useRef(false);

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
      setState({ loading: false, error: null, product: body.product });
    } catch {
      if (requestId !== requestIdRef.current || !mountedRef.current) return;
      setState({
        loading: false,
        error: "Lookup failed. Check local server connectivity.",
        product: null,
      });
    }
  }, []);

  const handleCameraScan = useCallback(
    (decodedText: string) => {
      if (cooldownRef.current) return;
      cooldownRef.current = true;
      setTimeout(() => {
        cooldownRef.current = false;
      }, 1500);

      setBarcode(decodedText);
      setCameraActive(false);
      void runLookup(decodedText);
    },
    [runLookup],
  );

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const normalized = barcode.trim();
    if (!normalized) return;
    setBarcode("");
    void runLookup(normalized);
  }

  function handleBarcodeChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    setBarcode(nextValue);
    if (!nextValue.trim()) {
      setState(initialLookupState);
    }
  }

  return (
    <div className="min-h-svh bg-slate-100 p-3 font-sans text-slate-900">
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
            <h1 className="text-2xl font-bold tracking-tight">
              Price Checker
            </h1>
          </div>
          <p className="text-sm text-slate-600">
            Scan a barcode with the camera, a hardware scanner, or type one in
            manually.
          </p>
        </header>

        <form
          className="space-y-2"
          onSubmit={(event) => event.preventDefault()}
        >
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
            <button
              className="flex min-w-24 items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                const normalized = barcode.trim();
                if (!normalized) return;
                setBarcode("");
                void runLookup(normalized);
              }}
            >
              {state.loading ? "Checking..." : "Look Up"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                cameraActive
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
              type="button"
              onClick={() => setCameraActive((prev) => !prev)}
            >
              <CameraIcon active={cameraActive} />
              {cameraActive ? "Stop Camera" : "Scan with Camera"}
            </button>
            <span className="self-center text-xs text-slate-500">
              Scan a barcode or type one in and press Look Up.
            </span>
          </div>
        </form>

        <BarcodeCameraScanner
          active={cameraActive}
          onScan={handleCameraScan}
        />

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

function CameraIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-4 w-4 ${active ? "text-indigo-600" : "text-slate-500"}`}
    >
      <path d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Z" />
      <path
        fillRule="evenodd"
        d="M10 15.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-1.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        clipRule="evenodd"
        fill={active ? "#4f46e5" : "white"}
      />
    </svg>
  );
}
