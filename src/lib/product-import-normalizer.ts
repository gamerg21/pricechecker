import type { ProductRecord } from "@/lib/mock-products";

function isPlaceholderBarcode(barcode: string): boolean {
  const normalized = barcode.trim().toUpperCase();
  return normalized.length === 0 || normalized === "0" || normalized === "NO UPC";
}

function toComparableDate(value: string): number {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
}

function scoreProduct(product: ProductRecord): number {
  let score = 0;
  if (product.wholesalePrice != null) score += 20;
  if (!isPlaceholderBarcode(product.barcode)) score += 10;
  if (product.imageUrl.trim().length > 0) score += 2;
  if (product.description.trim().length > 0 && product.description.trim() !== product.name.trim()) score += 1;
  return score;
}

function preferIncoming(current: ProductRecord, incoming: ProductRecord): boolean {
  const currentDate = toComparableDate(current.updatedAt);
  const incomingDate = toComparableDate(incoming.updatedAt);
  if (incomingDate !== currentDate) return incomingDate > currentDate;

  const currentScore = scoreProduct(current);
  const incomingScore = scoreProduct(incoming);
  if (incomingScore !== currentScore) return incomingScore > currentScore;

  return incoming.id >= current.id;
}

export function normalizeImportBatch(products: ProductRecord[]): ProductRecord[] {
  const byId = new Map<string, ProductRecord>();
  const byBarcode = new Map<string, ProductRecord>();

  for (const product of products) {
    let candidate = product;

    const existingById = byId.get(candidate.id);
    if (existingById) {
      if (preferIncoming(existingById, candidate)) {
        if (!isPlaceholderBarcode(existingById.barcode) && byBarcode.get(existingById.barcode)?.id === existingById.id) {
          byBarcode.delete(existingById.barcode);
        }
        byId.set(candidate.id, candidate);
      } else {
        candidate = existingById;
      }
    } else {
      byId.set(candidate.id, candidate);
    }

    if (isPlaceholderBarcode(candidate.barcode)) {
      continue;
    }

    const existingByBarcode = byBarcode.get(candidate.barcode);
    if (existingByBarcode) {
      if (preferIncoming(existingByBarcode, candidate)) {
        if (byId.get(existingByBarcode.id)?.barcode === candidate.barcode) {
          byId.delete(existingByBarcode.id);
        }
        byBarcode.set(candidate.barcode, candidate);
        byId.set(candidate.id, candidate);
      } else if (byId.get(candidate.id)?.barcode === candidate.barcode) {
        byId.delete(candidate.id);
      }
    } else {
      byBarcode.set(candidate.barcode, candidate);
    }
  }

  return Array.from(byId.values());
}
