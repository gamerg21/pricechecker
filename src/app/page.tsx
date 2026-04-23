"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PriceCheckerShell } from "@/components/price-checker-shell";

const DEFAULT_SCREENSAVER_IMAGE = "/kiosk-screensaver.png";
const FALLBACK_SCREENSAVER_IMAGE = "/logo.svg";

export default function Home() {
  const [screensaverEnabled, setScreensaverEnabled] = useState(true);
  const [balloonsEnabled, setBalloonsEnabled] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [idleResetMs, setIdleResetMs] = useState(120_000);
  const [pendingBarcode, setPendingBarcode] = useState("");
  const [screensaverImageSrc, setScreensaverImageSrc] = useState(
    DEFAULT_SCREENSAVER_IMAGE,
  );
  const [screensaverImageVersion, setScreensaverImageVersion] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const balloons = [
    { left: "6%", color: "#f87171", delay: "0s", duration: "14s", size: 56 },
    { left: "18%", color: "#fbbf24", delay: "3s", duration: "18s", size: 44 },
    { left: "30%", color: "#34d399", delay: "6s", duration: "16s", size: 64 },
    { left: "44%", color: "#60a5fa", delay: "1.5s", duration: "20s", size: 50 },
    { left: "58%", color: "#a78bfa", delay: "4.5s", duration: "15s", size: 58 },
    { left: "72%", color: "#f472b6", delay: "2s", duration: "19s", size: 48 },
    { left: "84%", color: "#22d3ee", delay: "7s", duration: "17s", size: 54 },
    { left: "92%", color: "#fb923c", delay: "5s", duration: "21s", size: 46 },
  ];

  useEffect(() => {
    if (screensaverEnabled) {
      inputRef.current?.focus();
    }
  }, [screensaverEnabled]);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response = await fetch("/api/kiosk-settings", { method: "GET" });
        if (!response.ok) {
          throw new Error("Failed to load kiosk settings");
        }

        const body = (await response.json()) as {
          screensaverEnabled: boolean;
          idleResetMs: number;
          balloonsEnabled: boolean;
          screensaverImageVersion?: number;
        };

        if (cancelled) return;
        setScreensaverEnabled(body.screensaverEnabled);
        setIdleResetMs(body.idleResetMs);
        setBalloonsEnabled(body.balloonsEnabled);
        setScreensaverImageVersion(body.screensaverImageVersion ?? 0);
      } catch {
        if (cancelled) return;
        setScreensaverEnabled(true);
        setIdleResetMs(120_000);
      } finally {
        if (!cancelled) {
          setSettingsLoaded(true);
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!settingsLoaded) {
    return null;
  }

  if (!screensaverEnabled) {
    return (
      <PriceCheckerShell
        initialBarcode={pendingBarcode}
        showCameraControls={false}
        idleResetMs={idleResetMs}
        onLookupComplete={() => setPendingBarcode("")}
        onIdleReset={() => {
          setPendingBarcode("");
          setScreensaverEnabled(true);
        }}
      />
    );
  }

  return (
    <div
      className="min-h-svh bg-white px-4 py-6 font-sans text-slate-900 sm:px-6 sm:py-8"
      data-kiosk
      onPointerDown={() => inputRef.current?.focus()}
    >
      {balloonsEnabled ? (
        <div aria-hidden="true" className="kiosk-balloons">
          {balloons.map((b, i) => (
          <span
            key={i}
            className="kiosk-balloon"
            style={{
              left: b.left,
              width: b.size,
              height: b.size * 1.3,
              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.7), ${b.color} 55%, ${b.color})`,
              animationDelay: b.delay,
              animationDuration: b.duration,
            }}
          />
          ))}
        </div>
      ) : null}
      <main className="flex min-h-[calc(100svh-3rem)] w-full flex-col justify-center sm:min-h-[calc(100svh-4rem)]">
        <input
          ref={inputRef}
          id="barcode"
          name="barcode"
          autoFocus
          autoComplete="off"
          className="pointer-events-none absolute h-px w-px opacity-0"
          value={pendingBarcode}
          onChange={(event) => {
            setPendingBarcode(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (!pendingBarcode.trim()) return;
            setScreensaverEnabled(false);
          }}
          placeholder="Scan or type barcode here"
          inputMode="none"
        />

        <section className="flex min-h-full w-full items-center justify-center bg-white">
          <div className="flex w-full flex-col items-center gap-8 px-4 py-8 text-center sm:gap-10 sm:px-8 sm:py-10">
            <div className="flex min-h-[28svh] w-full items-center justify-center px-2 py-4 sm:min-h-[34svh]">
              <Image
                src={
                  screensaverImageVersion > 0 &&
                  screensaverImageSrc === DEFAULT_SCREENSAVER_IMAGE
                    ? `${screensaverImageSrc}?v=${screensaverImageVersion}`
                    : screensaverImageSrc
                }
                alt="Business logo"
                width={520}
                height={260}
                className="h-auto max-h-[28svh] w-auto max-w-[92vw] object-contain sm:max-h-[34svh] sm:max-w-[80vw]"
                priority
                unoptimized
                onError={() => {
                  if (screensaverImageSrc !== FALLBACK_SCREENSAVER_IMAGE) {
                    setScreensaverImageSrc(FALLBACK_SCREENSAVER_IMAGE);
                  }
                }}
              />
            </div>

            <div className="space-y-3 sm:space-y-4">
              <h1
                className="font-semibold tracking-tight text-slate-900"
                style={{ fontSize: "clamp(2.5rem, 8vw, 5.5rem)", lineHeight: 1 }}
              >
                Scan item below for price
              </h1>
              <div className="flex justify-center pt-2 text-slate-400">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="kiosk-arrow h-12 w-12 sm:h-16 sm:w-16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 4v13"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                  <path
                    d="m6 12 6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
