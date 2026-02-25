import db from "@/lib/db";
import { mockProducts, ProductRecord } from "@/lib/mock-products";

type ProductRow = {
  id: string;
  barcode: string;
  sku: string;
  name: string;
  description: string;
  price: number;
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
    currency: "USD",
    imageUrl: row.image_url,
    updatedAt: row.updated_at,
  };
}

const upsertStmt = db.prepare(`
  INSERT INTO products (id, barcode, sku, name, description, price, currency, image_url, updated_at)
  VALUES (@id, @barcode, @sku, @name, @description, @price, @currency, @imageUrl, @updatedAt)
  ON CONFLICT(id) DO UPDATE SET
    barcode = excluded.barcode,
    sku = excluded.sku,
    name = excluded.name,
    description = excluded.description,
    price = excluded.price,
    currency = excluded.currency,
    image_url = excluded.image_url,
    updated_at = excluded.updated_at;
`);

const countStmt = db.prepare("SELECT COUNT(*) AS total FROM products");
const findByBarcodeStmt = db.prepare(
  "SELECT * FROM products WHERE barcode = ? LIMIT 1",
);
const listRecentStmt = db.prepare(
  "SELECT * FROM products ORDER BY updated_at DESC, name ASC LIMIT ?",
);

const seedIfEmpty = db.transaction(() => {
  const countRow = countStmt.get() as { total: number } | undefined;
  if ((countRow?.total ?? 0) > 0) {
    return;
  }
  for (const product of mockProducts) {
    upsertStmt.run(product);
  }
});

seedIfEmpty();

export function findProductByBarcode(barcode: string): ProductRecord | null {
  const row = findByBarcodeStmt.get(barcode) as ProductRow | undefined;
  return row ? rowToProduct(row) : null;
}

export function upsertProducts(products: ProductRecord[]) {
  const transaction = db.transaction((records: ProductRecord[]) => {
    for (const product of records) {
      upsertStmt.run(product);
    }
  });
  transaction(products);
  return products.length;
}

export function getProductCount() {
  return (countStmt.get() as { total: number }).total;
}

export function listProducts(limit = 100): ProductRecord[] {
  const safeLimit = Math.max(1, Math.min(limit, 500));
  return (listRecentStmt.all(safeLimit) as ProductRow[]).map(rowToProduct);
}
