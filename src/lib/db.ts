import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";

const dataDir = path.join(process.cwd(), "data");
const dbPath = process.env.SQLITE_PATH || path.join(dataDir, "price-checker.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    barcode TEXT NOT NULL UNIQUE,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    wholesale_price REAL,
    currency TEXT NOT NULL,
    image_url TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_at_ts INTEGER
  );
`);

// Migration: add wholesale_price to existing databases
try {
  db.exec(`ALTER TABLE products ADD COLUMN wholesale_price REAL`);
} catch {
  // Column already exists — safe to ignore
}

// Migration: add a sortable epoch-ms column for updated_at.
// updated_at is stored as a US-format string (e.g. "9/9/2025 3:53 pm"),
// which sorts incorrectly as text. updated_at_ts holds the parsed epoch
// so date sorting is chronologically correct.
try {
  db.exec(`ALTER TABLE products ADD COLUMN updated_at_ts INTEGER`);
} catch {
  // Column already exists — safe to ignore
}

/**
 * Parse a US-format datetime string (e.g. "9/9/2025 3:53 pm") to epoch ms.
 * Returns null if unparseable. Used for the sortable updated_at_ts column.
 */
export function usDateToEpoch(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

// One-time backfill of updated_at_ts for rows imported before this column existed.
// Cheap no-op once populated (the COUNT short-circuits).
{
  const pending = (
    db
      .prepare(`SELECT COUNT(*) AS c FROM products WHERE updated_at_ts IS NULL`)
      .get() as { c: number }
  ).c;
  if (pending > 0) {
    const rows = db
      .prepare(`SELECT id, updated_at FROM products WHERE updated_at_ts IS NULL`)
      .all() as { id: string; updated_at: string }[];
    const upd = db.prepare(
      `UPDATE products SET updated_at_ts = @ts WHERE id = @id`,
    );
    const tx = db.transaction((items: typeof rows) => {
      for (const r of items) {
        upd.run({ id: r.id, ts: usDateToEpoch(r.updated_at) });
      }
    });
    tx(rows);
  }
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_products_barcode
  ON products(barcode);
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_products_updated_ts
  ON products(updated_at_ts DESC, id ASC);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS api_activity (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    route TEXT NOT NULL,
    method TEXT NOT NULL,
    status INTEGER NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    detail_json TEXT
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_api_activity_created_at
  ON api_activity(created_at DESC);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

export default db;
