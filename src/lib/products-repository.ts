import db from "@/lib/db";
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
  INSERT INTO products (id, barcode, sku, name, description, price, wholesale_price, currency, image_url, updated_at)
  VALUES (@id, @barcode, @sku, @name, @description, @price, @wholesalePrice, @currency, @imageUrl, @updatedAt);
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
      updated_at = @updatedAt
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
      updated_at = @updatedAt
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

const listPageFirstStmt = db.prepare(`
  SELECT * FROM products
  ORDER BY updated_at DESC, name ASC, id ASC
  LIMIT @limit
`);

const listPageAfterStmt = db.prepare(`
  SELECT * FROM products
  WHERE updated_at < @cursorUpdatedAt
     OR (updated_at = @cursorUpdatedAt AND name > @cursorName)
     OR (updated_at = @cursorUpdatedAt AND name = @cursorName AND id > @cursorId)
  ORDER BY updated_at DESC, name ASC, id ASC
  LIMIT @limit
`);

const listSearchFirstStmt = db.prepare(`
  SELECT * FROM products
  WHERE barcode LIKE @pat ESCAPE '\\'
     OR sku LIKE @pat ESCAPE '\\'
     OR name LIKE @pat ESCAPE '\\'
  ORDER BY updated_at DESC, name ASC, id ASC
  LIMIT @limit
`);

const listSearchAfterStmt = db.prepare(`
  SELECT * FROM products
  WHERE (barcode LIKE @pat ESCAPE '\\'
     OR sku LIKE @pat ESCAPE '\\'
     OR name LIKE @pat ESCAPE '\\')
    AND (
      updated_at < @cursorUpdatedAt
      OR (updated_at = @cursorUpdatedAt AND name > @cursorName)
      OR (updated_at = @cursorUpdatedAt AND name = @cursorName AND id > @cursorId)
    )
  ORDER BY updated_at DESC, name ASC, id ASC
  LIMIT @limit
`);

export type ProductListCursor = {
  updatedAt: string;
  name: string;
  id: string;
};

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
      const existingById = findByIdStmt.get(product.id) as ProductRow | undefined;
      const existingByBarcode = findByBarcodeStmt.get(product.barcode) as ProductRow | undefined;

      if (existingById && existingByBarcode && existingById.id !== existingByBarcode.id) {
        const preferIncomingId = product.updatedAt >= existingById.updated_at;
        if (preferIncomingId) {
          deleteByBarcodeStmt.run(product.barcode);
          updateByIdStmt.run(product);
        } else {
          deleteByIdStmt.run(product.id);
          updateByBarcodeStmt.run(product);
        }
        continue;
      }

      if (existingById) {
        updateByIdStmt.run(product);
        continue;
      }

      if (existingByBarcode) {
        updateByBarcodeStmt.run(product);
        continue;
      }

      insertStmt.run(product);
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
  cursor?: ProductListCursor | null;
  q?: string | null;
}): {
  products: ProductRecord[];
  nextCursor: ProductListCursor | null;
  totalMatched: number;
} {
  const safeLimit = Math.max(1, Math.min(Math.floor(options.limit), PAGE_LIMIT_MAX));
  const search = normalizeSearchQuery(options.q ?? "");
  const cursor = options.cursor ?? null;

  const totalMatched = search
    ? (countSearchStmt.get({ pat: `%${escapeLikePattern(search)}%` }) as {
        total: number;
      }).total
    : getProductCount();

  const fetchLimit = safeLimit + 1;
  const rows = (() => {
    if (search) {
      const pat = `%${escapeLikePattern(search)}%`;
      if (cursor) {
        return listSearchAfterStmt.all({
          pat,
          cursorUpdatedAt: cursor.updatedAt,
          cursorName: cursor.name,
          cursorId: cursor.id,
          limit: fetchLimit,
        }) as ProductRow[];
      }
      return listSearchFirstStmt.all({ pat, limit: fetchLimit }) as ProductRow[];
    }
    if (cursor) {
      return listPageAfterStmt.all({
        cursorUpdatedAt: cursor.updatedAt,
        cursorName: cursor.name,
        cursorId: cursor.id,
        limit: fetchLimit,
      }) as ProductRow[];
    }
    return listPageFirstStmt.all({ limit: fetchLimit }) as ProductRow[];
  })();

  const hasMore = rows.length > safeLimit;
  const pageRows = hasMore ? rows.slice(0, safeLimit) : rows;
  const products = pageRows.map(rowToProduct);
  const last = pageRows[pageRows.length - 1];
  const nextCursor: ProductListCursor | null =
    hasMore && last
      ? {
          updatedAt: last.updated_at,
          name: last.name,
          id: last.id,
        }
      : null;

  return { products, nextCursor, totalMatched };
}

export function listProducts(limit = 100): ProductRecord[] {
  const safeLimit = Math.max(1, Math.min(limit, 500));
  return (listRecentStmt.all(safeLimit) as ProductRow[]).map(rowToProduct);
}
