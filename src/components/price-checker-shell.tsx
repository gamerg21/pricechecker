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

export function PriceCheckerShell({
  initialBarcode = "",
  showCameraControls = true,
  idleResetMs,
  onIdleReset,
  onLookupComplete,
}: {
  initialBarcode?: string;
  showCameraControls?: boolean;
  idleResetMs?: number;
  onIdleReset?: () => void;
  onLookupComplete?: () => void;
}) {
  const [barcode, setBarcode] = useState(initialBarcode);
  const [state, setState] = useState<LookupState>(initialLookupState);
  const [cameraActive, setCameraActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const cooldownRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  const updatedAtLabel = state.product?.updatedAt
    ? new Date(state.product.updatedAt).toLocaleString()
    : null;

  const clearBarcodeInput = useCallback(() => {
    setBarcode("");
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }, []);

  const scheduleIdleReset = useCallback(() => {
    if (!idleResetMs || !onIdleReset) {
      return;
    }

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) {
        return;
      }

      setBarcode("");
      setState(initialLookupState);
      setCameraActive(false);
      onIdleReset();
    }, idleResetMs);
  }, [idleResetMs, onIdleReset]);

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
        scheduleIdleReset();
        onLookupComplete?.();
        return;
      }

      const body = (await response.json()) as { product: ProductRecord };
      if (requestId !== requestIdRef.current || !mountedRef.current) return;
      setState({ loading: false, error: null, product: body.product });
      scheduleIdleReset();
      onLookupComplete?.();
    } catch {
      if (requestId !== requestIdRef.current || !mountedRef.current) return;
      setState({
        loading: false,
        error: "Lookup failed. Check local server connectivity.",
        product: null,
      });
      scheduleIdleReset();
      onLookupComplete?.();
    } finally {
      inputRef.current?.focus();
    }
  }, [onLookupComplete, scheduleIdleReset]);

  const submitBarcode = useCallback(
    (rawBarcode: string) => {
      const normalized = rawBarcode.trim();
      if (!normalized) {
        return;
      }

      clearBarcodeInput();
      void runLookup(normalized);
    },
    [clearBarcodeInput, runLookup],
  );

  useEffect(() => {
    if (!initialBarcode.trim()) {
      return;
    }

    setBarcode("");
    void runLookup(initialBarcode);
  }, [initialBarcode, runLookup]);

  const handleCameraScan = useCallback(
    (decodedText: string) => {
      if (cooldownRef.current) return;
      cooldownRef.current = true;
      setTimeout(() => {
        cooldownRef.current = false;
      }, 1500);

      setCameraActive(false);
      submitBarcode(decodedText);
    },
    [submitBarcode],
  );

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submitBarcode(barcode);
  }

  function handleBarcodeChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    setBarcode(nextValue);
    if (!nextValue.trim()) {
      setState(initialLookupState);
    }
  }

  return (
    <div className="min-h-svh bg-slate-100 p-4 font-sans text-slate-900 sm:p-5">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 rounded-[1.75rem] bg-white p-5 shadow-md sm:p-7">
        <header className="space-y-2">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.svg"
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 sm:h-16 sm:w-16"
              priority
            />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Price Checker
            </h1>
          </div>
        </header>

        <form className="space-y-3" onSubmit={(event) => event.preventDefault()}>
          <label className="text-base font-semibold sm:text-lg" htmlFor="barcode">
            Barcode
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              ref={inputRef}
              id="barcode"
              name="barcode"
              autoFocus
              autoComplete="off"
              className="w-full rounded-xl border border-slate-300 px-4 py-4 text-xl outline-none ring-indigo-500 focus:ring-2 sm:px-5 sm:py-5 sm:text-2xl"
              value={barcode}
              onChange={handleBarcodeChange}
              onKeyDown={handleInputKeyDown}
              placeholder="Scan or type barcode here"
              inputMode="none"
            />
            <button
              className="flex min-w-32 items-center justify-center rounded-xl bg-indigo-600 px-5 py-4 text-lg font-semibold text-white hover:bg-indigo-700 sm:min-w-36 sm:px-6 sm:py-5 sm:text-xl"
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                submitBarcode(barcode);
              }}
            >
              {state.loading ? "Checking..." : "Look Up"}
            </button>
          </div>
          {showCameraControls ? (
            <div className="flex flex-col flex-wrap items-stretch gap-3 sm:flex-row sm:items-center">
              <button
                className={`flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-base font-semibold transition sm:w-auto sm:justify-start sm:px-6 sm:py-4 sm:text-lg ${
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
            </div>
          ) : null}
        </form>

        <BarcodeCameraScanner
          active={showCameraControls && cameraActive}
          onScan={handleCameraScan}
        />

        {state.error ? (
          <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-base text-rose-700 sm:text-lg">{state.error}</p>
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
      className={`h-5 w-5 ${active ? "text-indigo-600" : "text-slate-500"}`}
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
