import db from "@/lib/db";

const SCREENSAVER_ENABLED_KEY = "kioskScreensaverEnabled";
const KIOSK_IDLE_RESET_MS_KEY = "kioskIdleResetMs";
const KIOSK_BALLOONS_ENABLED_KEY = "kioskBalloonsEnabled";
const KIOSK_SCREENSAVER_IMAGE_UPLOADED_AT_KEY = "kioskScreensaverImageUploadedAt";
const DEFAULT_KIOSK_IDLE_RESET_MS = 120_000;

type SettingRow = {
  value: string;
};

const getSettingStmt = db.prepare(
  `SELECT value FROM app_settings WHERE key = ?`,
);

const upsertSettingStmt = db.prepare(`
  INSERT INTO app_settings (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);

export function isKioskScreensaverEnabled(): boolean {
  const row = getSettingStmt.get(SCREENSAVER_ENABLED_KEY) as SettingRow | undefined;
  if (!row) {
    return true;
  }

  return row.value === "true";
}

export function setKioskScreensaverEnabled(enabled: boolean): void {
  upsertSettingStmt.run(SCREENSAVER_ENABLED_KEY, enabled ? "true" : "false");
}

export function getKioskIdleResetMs(): number {
  const row = getSettingStmt.get(KIOSK_IDLE_RESET_MS_KEY) as SettingRow | undefined;
  if (!row) {
    return DEFAULT_KIOSK_IDLE_RESET_MS;
  }

  const parsed = Number.parseInt(row.value, 10);
  if (!Number.isFinite(parsed) || parsed < 5_000) {
    return DEFAULT_KIOSK_IDLE_RESET_MS;
  }

  return parsed;
}

export function setKioskIdleResetMs(idleResetMs: number): void {
  upsertSettingStmt.run(KIOSK_IDLE_RESET_MS_KEY, String(idleResetMs));
}

export function isKioskBalloonsEnabled(): boolean {
  const row = getSettingStmt.get(KIOSK_BALLOONS_ENABLED_KEY) as SettingRow | undefined;
  if (!row) {
    return true;
  }

  return row.value === "true";
}

export function setKioskBalloonsEnabled(enabled: boolean): void {
  upsertSettingStmt.run(KIOSK_BALLOONS_ENABLED_KEY, enabled ? "true" : "false");
}

export function getKioskScreensaverImageUploadedAt(): number {
  const row = getSettingStmt.get(KIOSK_SCREENSAVER_IMAGE_UPLOADED_AT_KEY) as
    | SettingRow
    | undefined;
  if (!row) {
    return 0;
  }

  const parsed = Number.parseInt(row.value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function setKioskScreensaverImageUploadedAt(uploadedAt: number): void {
  upsertSettingStmt.run(
    KIOSK_SCREENSAVER_IMAGE_UPLOADED_AT_KEY,
    String(uploadedAt),
  );
}
