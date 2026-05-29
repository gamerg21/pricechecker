import db, { usDateToEpoch } from "@/lib/db";
import { ProductRecord } from "@/lib/mock-products";

type ProductRow = {
  id: string;
  barcode: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  wholesale_price: number | null;
  currency: string;
  image_url: string;
  updated_at: string;
  updated_at_ts: number | null;
};

function rowToProduct(row: ProductRow): ProductRecord {
  return {
    id: row.id,
    barcode: row.barcode,
    sku: row.sku,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    wholesalePrice: row.wholesale_price != null ? Number(row.wholesale_price) : null,
    currency: "USD",
    imageUrl: row.image_url,
    updatedAt: row.updated_at,
  };
}

const insertStmt = db.prepare(`
  INSERT INTO products (id, barcode, sku, name, description, price, wholesale_price, currency, image_url, updated_at, updated_at_ts)
  VALUES (@id, @barcode, @sku, @name, @description, @price, @wholesalePrice, @currency, @imageUrl, @updatedAt, @updatedAtTs);
`);

const updateByIdStmt = db.prepare(`
  UPDATE products
  SET barcode = @barcode,
      sku = @sku,
      name = @name,
      description = @description,
      price = @price,
      wholesale_price = @wholesalePrice,
      currency = @currency,
      image_url = @imageUrl,
      updated_at = @updatedAt,
      updated_at_ts = @updatedAtTs
  WHERE id = @id;
`);

const updateByBarcodeStmt = db.prepare(`
  UPDATE products
  SET id = @id,
      sku = @sku,
      name = @name,
      description = @description,
      price = @price,
      wholesale_price = @wholesalePrice,
      currency = @currency,
      image_url = @imageUrl,
      updated_at = @updatedAt,
      updated_at_ts = @updatedAtTs
  WHERE barcode = @barcode;
`);

const deleteByIdStmt = db.prepare("DELETE FROM products WHERE id = ?");
const deleteByBarcodeStmt = db.prepare("DELETE FROM products WHERE barcode = ?");

const countStmt = db.prepare("SELECT COUNT(*) AS total FROM products");
const findByBarcodeStmt = db.prepare(
  "SELECT * FROM products WHERE barcode = ? LIMIT 1",
);
const findByIdStmt = db.prepare(
  "SELECT * FROM products WHERE id = ? LIMIT 1",
);
const listRecentStmt = db.prepare(
  "SELECT * FROM products ORDER BY updated_at DESC, name ASC, id ASC LIMIT ?",
);

const countSearchStmt = db.prepare(`
  SELECT COUNT(*) AS total FROM products
  WHERE barcode LIKE @pat ESCAPE '\\'
     OR sku LIKE @pat ESCAPE '\\'
     OR name LIKE @pat ESCAPE '\\'
`);

export type ProductSortKey =
  | "barcode"
  | "sku"
  | "name"
  | "price"
  | "wholesale"
  | "updatedAt";

export type SortDirection = "asc" | "desc";

/** Whitelist mapping API sort keys -> physical columns (prevents SQL injection). */
const SORT_COLUMNS: Record<ProductSortKey, string> = {
  barcode: "barcode",
  sku: "sku",
  name: "name",
  price: "price",
  wholesale: "wholesale_price",
  // updated_at is a US-format string; sort on the parsed epoch column instead.
  updatedAt: "updated_at_ts",
};

/** Text columns sort case-insensitively (a-z feels natural regardless of case). */
const TEXT_SORT_KEYS = new Set<ProductSortKey>(["barcode", "sku", "name"]);

/** Nullable columns push NULLs to the bottom regardless of direction. */
const NULLABLE_SORT_KEYS = new Set<ProductSortKey>(["wholesale", "updatedAt"]);

export function isProductSortKey(v: string): v is ProductSortKey {
  return Object.prototype.hasOwnProperty.call(SORT_COLUMNS, v);
}

/**
 * Build a safe ORDER BY clause for the given sort key + direction.
 * Column identifiers come from the SORT_COLUMNS whitelist, never user input.
 * - text columns use COLLATE NOCASE
 * - wholesale_price (nullable) always sorts NULLs last
 * - id ASC is appended as a stable tiebreaker for deterministic paging
 */
function buildOrderBy(sortKey: ProductSortKey, sortDir: SortDirection): string {
  const col = SORT_COLUMNS[sortKey];
  const dir = sortDir === "asc" ? "ASC" : "DESC";
  const collate = TEXT_SORT_KEYS.has(sortKey) ? " COLLATE NOCASE" : "";
  const nullsLast = NULLABLE_SORT_KEYS.has(sortKey)
    ? `(${col} IS NULL) ASC, `
    : "";
  return `ORDER BY ${nullsLast}${col}${collate} ${dir}, id ASC`;
}

function escapeLikePattern(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function normalizeSearchQuery(q: string): string | null {
  const t = q.trim();
  return t.length > 0 ? t : null;
}

export function findProductByBarcode(barcode: string): ProductRecord | null {
  const row = findByBarcodeStmt.get(barcode) as ProductRow | undefined;
  return row ? rowToProduct(row) : null;
}

export function upsertProducts(products: ProductRecord[]) {
  const transaction = db.transaction((records: ProductRecord[]) => {
    for (const product of records) {
      // Augment with the sortable epoch derived from the US-format updatedAt.
      const row = { ...product, updatedAtTs: usDateToEpoch(product.updatedAt) };
      const existingById = findByIdStmt.get(product.id) as ProductRow | undefined;
      const existingByBarcode = findByBarcodeStmt.get(product.barcode) as ProductRow | undefined;

      if (existingById && existingByBarcode && existingById.id !== existingByBarcode.id) {
        // Compare parsed timestamps, not raw US-format strings (which sort wrong).
        // Missing timestamps are treated as oldest so any real date wins.
        const incomingTs = row.updatedAtTs ?? -Infinity;
        const existingTs = existingById.updated_at_ts ?? -Infinity;
        const preferIncomingId = incomingTs >= existingTs;
        if (preferIncomingId) {
          deleteByBarcodeStmt.run(product.barcode);
          updateByIdStmt.run(row);
        } else {
          deleteByIdStmt.run(product.id);
          updateByBarcodeStmt.run(row);
        }
        continue;
      }

      if (existingById) {
        updateByIdStmt.run(row);
        continue;
      }

      if (existingByBarcode) {
        updateByBarcodeStmt.run(row);
        continue;
      }

      insertStmt.run(row);
    }
  });
  transaction(products);
  return products.length;
}

export function getProductCount() {
  return (countStmt.get() as { total: number }).total;
}

const PAGE_LIMIT_MAX = 250;

export function listProductsPage(options: {
  limit: number;
  offset?: number;
  q?: string | null;
  sortKey?: ProductSortKey;
  sortDir?: SortDirection;
}): {
  products: ProductRecord[];
  totalMatched: number;
  hasMore: boolean;
} {
  const safeLimit = Math.max(1, Math.min(Math.floor(options.limit), PAGE_LIMIT_MAX));
  const safeOffset = Math.max(0, Math.floor(options.offset ?? 0));
  const search = normalizeSearchQuery(options.q ?? "");
  const sortKey = options.sortKey ?? "updatedAt";
  const sortDir = options.sortDir ?? "desc";
  const orderBy = buildOrderBy(sortKey, sortDir);

  const totalMatched = search
    ? (countSearchStmt.get({ pat: `%${escapeLikePattern(search)}%` }) as {
        total: number;
      }).total
    : getProductCount();

  // Column identifiers in orderBy come from a whitelist; limit/offset/pat are bound.
  const whereClause = search
    ? `WHERE barcode LIKE @pat ESCAPE '\\'
         OR sku LIKE @pat ESCAPE '\\'
         OR name LIKE @pat ESCAPE '\\'`
    : "";
  const sql = `SELECT * FROM products ${whereClause} ${orderBy} LIMIT @limit OFFSET @offset`;
  const params: Record<string, unknown> = {
    limit: safeLimit,
    offset: safeOffset,
  };
  if (search) params.pat = `%${escapeLikePattern(search)}%`;

  const rows = db.prepare(sql).all(params) as ProductRow[];
  const products = rows.map(rowToProduct);
  const hasMore = safeOffset + products.length < totalMatched;

  return { products, totalMatched, hasMore };
}

export function listProducts(limit = 100): ProductRecord[] {
  const safeLimit = Math.max(1, Math.min(limit, 500));
  return (listRecentStmt.all(safeLimit) as ProductRow[]).map(rowToProduct);
}
