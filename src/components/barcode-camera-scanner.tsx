"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const SCANNER_REGION_ID = "barcode-camera-region";

export function BarcodeCameraScanner({
  active,
  onScan,
  onError,
}: {
  active: boolean;
  onScan: (decodedText: string) => void;
  onError?: (message: string) => void;
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const runningRef = useRef(false);
  const onScanRef = useRef(onScan);
  const [permissionDenied, setPermissionDenied] = useState(false);

  onScanRef.current = onScan;

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && runningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // already stopped
      }
      runningRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!active) {
      void stopScanner();
      setPermissionDenied(false);
      return;
    }

    let cancelled = false;

    async function startScanner() {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(SCANNER_REGION_ID);
      }

      if (runningRef.current) return;

      try {
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 120 } },
          (decodedText) => {
            if (!cancelled) {
              onScanRef.current(decodedText);
            }
          },
          () => {},
        );
        if (cancelled) {
          await scannerRef.current.stop();
          return;
        }
        runningRef.current = true;
        setPermissionDenied(false);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Camera access failed";
        if (/permission|not allowed|denied/i.test(msg)) {
          setPermissionDenied(true);
        }
        onError?.(msg);
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [active, stopScanner, onError]);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  if (!active) return null;

  return (
    <div className="space-y-2">
      <div
        id={SCANNER_REGION_ID}
        className="mx-auto overflow-hidden rounded-lg border border-slate-300 bg-black"
        style={{ maxWidth: 400 }}
      />
      {permissionDenied && (
        <p className="text-center text-sm text-rose-600">
          Camera permission denied. Check your browser settings and try again.
        </p>
      )}
    </div>
  );
}
