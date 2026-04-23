"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { logoutAction } from "../actions";

type KioskSettingsResponse = {
  screensaverEnabled: boolean;
  idleResetMs: number;
  balloonsEnabled: boolean;
};

export function SettingsClient() {
  const [screensaverEnabled, setScreensaverEnabled] = useState(true);
  const [balloonsEnabled, setBalloonsEnabled] = useState(true);
  const [idleResetSeconds, setIdleResetSeconds] = useState("120");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoPreviewSrc, setLogoPreviewSrc] = useState("/kiosk-screensaver.png");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogoUpload = useCallback(
    async (file: File) => {
      setLogoUploading(true);
      setLogoError(null);
      setLogoSuccess(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/admin/upload-logo", {
          method: "POST",
          body: formData,
        });

        const body = await res.json();
        if (!res.ok) {
          throw new Error(body.error ?? `Upload failed (${res.status})`);
        }

        setLogoPreviewSrc(`${body.assetPath}?t=${body.uploadedAt}`);
        setLogoSuccess(`Uploaded ${body.fileName}.`);
      } catch (uploadError) {
        setLogoError(
          uploadError instanceof Error
            ? uploadError.message
            : "Failed to upload image.",
        );
      } finally {
        setLogoUploading(false);
        if (logoInputRef.current) {
          logoInputRef.current.value = "";
        }
      }
    },
    [],
  );

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/kiosk-settings", { method: "GET" });
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }

      const body = (await res.json()) as KioskSettingsResponse;
      setScreensaverEnabled(body.screensaverEnabled);
      setBalloonsEnabled(body.balloonsEnabled);
      setIdleResetSeconds(String(Math.round(body.idleResetMs / 1000)));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load settings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = useCallback(async () => {
    const parsedSeconds = Number.parseInt(idleResetSeconds, 10);
    if (!Number.isFinite(parsedSeconds) || parsedSeconds < 5 || parsedSeconds > 3600) {
      setError("Idle reset timer must be between 5 and 3600 seconds.");
      setSuccess(null);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/kiosk-settings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          screensaverEnabled,
          idleResetMs: parsedSeconds * 1000,
          balloonsEnabled,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      setScreensaverEnabled(body.screensaverEnabled as boolean);
      setBalloonsEnabled(body.balloonsEnabled as boolean);
      setIdleResetSeconds(String(Math.round((body.idleResetMs as number) / 1000)));
      setSuccess("Settings saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save settings.",
      );
    } finally {
      setSaving(false);
    }
  }, [idleResetSeconds, screensaverEnabled, balloonsEnabled]);

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-4 rounded-xl bg-white p-6 shadow">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-slate-600">
              Configure kiosk behavior for the main price-check route.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/admin"
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Admin home
            </Link>
            <Link
              href="/admin/products"
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Products
            </Link>
            <Link
              href="/admin/upload"
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              CSV import
            </Link>
            <Link
              href="/admin/activity"
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              API activity
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

        <section className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold">Root Screensaver</h2>
            <p className="text-sm text-slate-600">
              Control whether the branded screensaver appears on
              {" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-xs">/</code>
              {" "}
              and how long the kiosk stays on the lookup UI before returning.
            </p>
          </div>

          <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div>
              <span className="block text-sm font-semibold text-slate-900">
                Screensaver enabled
              </span>
              <span className="block text-xs text-slate-500">
                When off, the root route opens directly to the lookup UI.
              </span>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 accent-slate-900"
              checked={screensaverEnabled}
              onChange={(event) => setScreensaverEnabled(event.target.checked)}
              disabled={loading || saving}
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div>
              <span className="block text-sm font-semibold text-slate-900">
                Animated balloons
              </span>
              <span className="block text-xs text-slate-500">
                Floating colored balloons in the screensaver background. Turn
                off for a plain look.
              </span>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 accent-slate-900"
              checked={balloonsEnabled}
              onChange={(event) => setBalloonsEnabled(event.target.checked)}
              disabled={loading || saving}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-900">
              Idle reset timer
            </span>
            <input
              type="number"
              min={5}
              max={3600}
              step={5}
              value={idleResetSeconds}
              onChange={(event) => setIdleResetSeconds(event.target.value)}
              disabled={loading || saving}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Enter seconds. Example: `120` returns to the screensaver after 2
              minutes.
            </span>
          </label>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={loading || saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Loading..." : saving ? "Saving..." : "Save settings"}
            </button>
            <button
              type="button"
              onClick={() => void loadSettings()}
              disabled={loading || saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reload
            </button>
          </div>
        </section>

        <section className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold">Screensaver Logo</h2>
            <p className="text-sm text-slate-600">
              Upload a custom image shown on the kiosk screensaver. PNG, JPG,
              WEBP, or SVG up to 5 MB.
            </p>
          </div>

          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoPreviewSrc}
              alt="Current screensaver logo"
              className="max-h-40 w-auto object-contain"
              onError={() => setLogoPreviewSrc("/logo.svg")}
            />
          </div>

          <div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={logoUploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleLogoUpload(file);
              }}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {logoError ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {logoError}
            </p>
          ) : null}

          {logoSuccess ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {logoSuccess}
            </p>
          ) : null}

          {logoUploading ? (
            <p className="text-sm text-slate-500">Uploading...</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
