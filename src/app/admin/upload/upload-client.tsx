"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { logoutAction } from "../actions";

type UploadResult = {
  success: boolean;
  fileName: string;
  upsertedCount: number;
  skippedRows: number;
  dedupedWithinBatch: number;
  totalProducts: number;
};

type UploadState =
  | { status: "idle" }
  | { status: "dragging" }
  | { status: "uploading"; fileName: string }
  | { status: "success"; result: UploadResult }
  | { status: "error"; message: string };

export function UploadClient() {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setState({ status: "error", message: "Please select a .csv file." });
      return;
    }

    setState({ status: "uploading", fileName: file.name });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload-csv", {
        method: "POST",
        body: formData,
      });

      const body = await res.json();

      if (!res.ok) {
        setState({
          status: "error",
          message: body.error ?? `Upload failed (${res.status})`,
        });
        return;
      }

      setState({ status: "success", result: body as UploadResult });
    } catch {
      setState({
        status: "error",
        message: "Upload failed. Check server connectivity.",
      });
    }
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setState({ status: "idle" });
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setState({ status: "dragging" });
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setState({ status: "idle" });
  }

  function reset() {
    setState({ status: "idle" });
  }

  const isUploading = state.status === "uploading";

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-4 rounded-xl bg-white p-6 shadow">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">CSV Import</h1>
            <p className="text-sm text-slate-600">
              Upload a NetSuite/Celigo CSV export to update the product database.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/admin/products"
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Products
            </Link>
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

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
            state.status === "dragging"
              ? "border-indigo-400 bg-indigo-50"
              : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
          } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
        >
          <svg
            className="mb-3 h-10 w-10 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 16V4m0 0L8 8m4-4l4 4M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4"
            />
          </svg>
          {isUploading ? (
            <p className="text-sm font-semibold text-slate-600">
              Uploading {state.fileName}...
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-700">
                Drop a CSV file here, or click to browse
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Accepts NetSuite/Celigo export format (max 10 MB)
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Result */}
        {state.status === "success" ? (
          <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold text-emerald-800">Import complete</h2>
              <button
                onClick={reset}
                className="rounded-lg border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                Upload another
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  File
                </span>
                <span className="break-all text-sm text-emerald-900">
                  {state.result.fileName}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Imported
                  </span>
                  <span className="text-xl font-bold text-emerald-900">
                    {state.result.upsertedCount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Skipped
                  </span>
                  <span className="text-xl font-bold text-emerald-900">
                    {state.result.skippedRows.toLocaleString()}
                  </span>
                </div>
                {state.result.dedupedWithinBatch > 0 ? (
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wide text-emerald-600">
                      Deduped
                    </span>
                    <span className="text-xl font-bold text-emerald-900">
                      {state.result.dedupedWithinBatch.toLocaleString()}
                    </span>
                  </div>
                ) : null}
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Total in DB
                  </span>
                  <span className="text-xl font-bold text-emerald-900">
                    {state.result.totalProducts.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="flex items-start justify-between rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm text-rose-700">{state.message}</p>
            <button
              onClick={reset}
              className="ml-4 shrink-0 rounded-lg border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              Try again
            </button>
          </div>
        ) : null}

        {/* Help text */}
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          <h3 className="mb-1 font-semibold text-slate-700">Expected CSV columns</h3>
          <p>
            internalid, Display Name, Sales Description, Item Name (Variant),
            Price (Variant), Wholesale Price, UPC Code (Variant), Images, Last Modified
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Other columns (10% Off, Alternate Price 2/3, Base Price, Quantity, Formula)
            are accepted but currently ignored. Rows missing internalid, UPC Code, or
            Display Name will be skipped.
          </p>
        </div>
      </div>
    </main>
  );
}
