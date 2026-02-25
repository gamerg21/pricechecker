export type ProductRecord = {
  id: string;
  barcode: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  currency: "USD";
  imageUrl: string;
  updatedAt: string;
};

export const mockProducts: ProductRecord[] = [
  {
    id: "1001",
    barcode: "012345678905",
    sku: "WAT-24-12OZ",
    name: "Spring Water 12oz (24 Pack)",
    description: "Purified bottled spring water.",
    price: 5.99,
    currency: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=900&q=80",
    updatedAt: "2026-02-22T23:00:00.000Z",
  },
  {
    id: "1002",
    barcode: "049000042511",
    sku: "SODA-12-12OZ",
    name: "Cola 12oz (12 Pack)",
    description: "Classic cola soft drink.",
    price: 8.49,
    currency: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1581006852262-e4307cf6283a?auto=format&fit=crop&w=900&q=80",
    updatedAt: "2026-02-22T23:00:00.000Z",
  },
  {
    id: "1003",
    barcode: "036000291452",
    sku: "TIS-6-80CT",
    name: "Facial Tissue 6 Pack",
    description: "Soft 2-ply facial tissues.",
    price: 10.99,
    currency: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1595341595379-cf0f0f6d20d9?auto=format&fit=crop&w=900&q=80",
    updatedAt: "2026-02-22T23:00:00.000Z",
  },
];

export const productByBarcode = new Map(
  mockProducts.map((product) => [product.barcode, product]),
);
