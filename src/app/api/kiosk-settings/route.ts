import { NextResponse } from "next/server";
import {
  getKioskIdleResetMs,
  getKioskScreensaverImageUploadedAt,
  isKioskBalloonsEnabled,
  isKioskScreensaverEnabled,
} from "@/lib/app-settings-repository";

export async function GET() {
  return NextResponse.json({
    screensaverEnabled: isKioskScreensaverEnabled(),
    idleResetMs: getKioskIdleResetMs(),
    balloonsEnabled: isKioskBalloonsEnabled(),
    screensaverImageVersion: getKioskScreensaverImageUploadedAt(),
  });
}
