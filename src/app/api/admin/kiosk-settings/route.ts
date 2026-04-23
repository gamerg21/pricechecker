import { NextResponse } from "next/server";
import { appendApiActivity } from "@/lib/api-activity-repository";
import {
  getKioskIdleResetMs,
  isKioskBalloonsEnabled,
  isKioskScreensaverEnabled,
  setKioskBalloonsEnabled,
  setKioskIdleResetMs,
  setKioskScreensaverEnabled,
} from "@/lib/app-settings-repository";

const ROUTE = "/api/admin/kiosk-settings";

function logUpdate(
  status: number,
  level: "success" | "error" | "info",
  message: string,
  detail?: Record<string, unknown> | null,
) {
  try {
    appendApiActivity({ route: ROUTE, method: "POST", status, level, message, detail });
  } catch {
    // best-effort
  }
}

export async function GET() {
  return NextResponse.json({
    screensaverEnabled: isKioskScreensaverEnabled(),
    idleResetMs: getKioskIdleResetMs(),
    balloonsEnabled: isKioskBalloonsEnabled(),
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    logUpdate(400, "error", "Kiosk settings update failed: invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const screensaverEnabled = typeof body === "object" &&
    body !== null &&
    "screensaverEnabled" in body &&
    typeof body.screensaverEnabled === "boolean"
      ? body.screensaverEnabled
      : null;

  const idleResetMs = typeof body === "object" &&
    body !== null &&
    "idleResetMs" in body &&
    typeof body.idleResetMs === "number"
      ? body.idleResetMs
      : null;

  const balloonsEnabled = typeof body === "object" &&
    body !== null &&
    "balloonsEnabled" in body &&
    typeof body.balloonsEnabled === "boolean"
      ? body.balloonsEnabled
      : null;

  if (
    screensaverEnabled === null ||
    idleResetMs === null ||
    balloonsEnabled === null ||
    !Number.isFinite(idleResetMs) ||
    idleResetMs < 5_000 ||
    idleResetMs > 3_600_000
  ) {
    logUpdate(400, "error", "Kiosk settings update failed: invalid value");
    return NextResponse.json(
      {
        error:
          "screensaverEnabled and balloonsEnabled must be booleans and idleResetMs must be between 5000 and 3600000.",
      },
      { status: 400 },
    );
  }

  setKioskScreensaverEnabled(screensaverEnabled);
  setKioskIdleResetMs(Math.round(idleResetMs));
  setKioskBalloonsEnabled(balloonsEnabled);
  logUpdate(200, "success", "Kiosk screensaver setting updated", {
    screensaverEnabled,
    idleResetMs: Math.round(idleResetMs),
    balloonsEnabled,
  });

  return NextResponse.json({
    success: true,
    screensaverEnabled,
    idleResetMs: Math.round(idleResetMs),
    balloonsEnabled,
  });
}
