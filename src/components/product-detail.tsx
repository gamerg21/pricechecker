"use client";

import Image from "next/image";

export type ProductRecord = {
  id: string;
  barcode: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  wholesalePrice: number | null;
  currency: string;
  imageUrl: string;
  updatedAt: string;
};

export type LookupState = {
  loading: boolean;
  error: string | null;
  product: ProductRecord | null;
};

export const initialLookupState: LookupState = {
  loading: false,
  error: null,
  product: null,
};

function hasProductImage(url: string): boolean {
  return url.trim().length > 0;
}

export function ProductDetail({
  product,
  updatedAtLabel,
}: {
  product: ProductRecord;
  updatedAtLabel: string | null;
}) {
  const showImage = hasProductImage(product.imageUrl);
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200">
      <div
        className={
          showImage
            ? "grid grid-cols-[minmax(8.5rem,14rem)_1fr]"
            : "grid grid-cols-1"
        }
      >
        {showImage ? (
          <div className="relative min-h-40 bg-slate-200">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="40vw"
              className="object-cover"
              priority
              unoptimized={
                !product.imageUrl.startsWith("https://images.unsplash.com")
              }
            />
          </div>
        ) : null}
        <div className="space-y-1.5 p-3">
          <h2 className="text-xl font-bold">{product.name}</h2>
          <p className="text-sm text-slate-600">{product.description}</p>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wide text-indigo-400">
                Retail
              </span>
              <span className="text-3xl font-extrabold text-indigo-700">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: product.currency,
                }).format(product.price)}
              </span>
            </div>
            {product.wholesalePrice != null ? (
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Wholesale
                </span>
                <span className="text-3xl font-extrabold text-gray-700">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: product.currency,
                  }).format(product.wholesalePrice)}
                </span>
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-1 text-sm text-slate-600">
            <p>
              <strong>SKU:</strong> {product.sku}
            </p>
            <p>
              <strong>Barcode:</strong> {product.barcode}
            </p>
            {updatedAtLabel ? (
              <p>
                <strong>Last Sync:</strong> {updatedAtLabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
