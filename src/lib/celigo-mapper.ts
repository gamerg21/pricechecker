import type { ProductRecord } from "@/lib/mock-products";

/**
 * Celigo/NetSuite export record shape (from Saved Search "Price Checker Item Export").
 * Field names may have spaces; we accept common variants.
 */
export type CeligoRecord = Record<string, unknown>;

const defaultCurrency = "USD" as const;
const defaultUpdatedAt = () => new Date().toISOString();

function getString(record: CeligoRecord, ...keys: string[]): string {
  for (const key of keys) {
    const v = record[key];
    if (v != null && typeof v === "string") return v.trim();
    if (v != null && typeof v === "number") return String(v);
  }
  return "";
}

function getNumber(record: CeligoRecord, ...keys: string[]): number {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string") {
      const n = parseFloat(v.replace(/[^0-9.-]/g, ""));
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

/**
 * Map a single Celigo/NetSuite export record to our ProductRecord.
 * Supports field names from "Price Checker Item Export" Saved Search.
 */
export function celigoRecordToProduct(record: CeligoRecord): ProductRecord | null {
  const id =
    getString(record, "internalId", "internalid", "internal_id", "id") ||
    getString(record, "id");
  const barcode = getString(
    record,
    "UPC Code (Variant)",
    "upcCode",
    "barcode",
    "UPC",
    "upc"
  );
  const name = getString(
    record,
    "Display Name",
    "displayName",
    "name",
    "Item Name (Variant)"
  );
  const sku = getString(
    record,
    "Item Name (Variant)",
    "itemName",
    "sku",
    "Item Name",
    "Display Name"
  ) || name || id;
  const description = getString(
    record,
    "Sales Description",
    "salesDescription",
    "description"
  );
  const price = getNumber(
    record,
    "Price (Variant)",
    "price",
    "basePrice",
    "unitPrice"
  );
  const imageUrl =
    getString(record, "Images", "images", "imageUrl", "image_url", "dataURI", "dataUrl") ||
    "";

  const updatedAt =
    getString(
      record,
      "Last Modified",
      "Last Modified Date",
      "lastModifiedDate",
      "lastModified",
      "modified",
      "updatedAt",
      "updated_at"
    ) || defaultUpdatedAt();

  if (!id || !barcode || !name) {
    return null;
  }

  return {
    id: String(id),
    barcode: String(barcode),
    sku: sku || id,
    name: String(name),
    description: description || name,
    price: Number(price),
    currency: defaultCurrency,
    imageUrl: imageUrl || "",
    updatedAt: updatedAt || defaultUpdatedAt(),
  };
}

/**
 * Parse Celigo export payload: { page_of_records: [ record | { record }, ... ] }.
 * Returns array of ProductRecord; skips records that can't be mapped.
 */
export function parseCeligoPayload(body: unknown): ProductRecord[] {
  if (body == null || typeof body !== "object") return [];
  const payload = body as { page_of_records?: unknown[]; products?: unknown[] };
  const records = payload.page_of_records ?? payload.products;
  if (!Array.isArray(records)) return [];
  const products: ProductRecord[] = [];
  for (const item of records) {
    const container = item && typeof item === "object" ? (item as Record<string, unknown>) : null;
    const rawRecord =
      container && container.record && typeof container.record === "object"
        ? (container.record as CeligoRecord)
        : (container as CeligoRecord | null);
    if (!rawRecord) continue;
    const product = celigoRecordToProduct(rawRecord);
    if (product) products.push(product);
  }
  return products;
}
