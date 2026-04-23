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
    updated_at TEXT NOT NULL
  );
`);

// Migration: add wholesale_price to existing databases
try {
  db.exec(`ALTER TABLE products ADD COLUMN wholesale_price REAL`);
} catch {
  // Column already exists — safe to ignore
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_products_barcode
  ON products(barcode);
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_products_list_order
  ON products(updated_at DESC, name ASC, id ASC);
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
