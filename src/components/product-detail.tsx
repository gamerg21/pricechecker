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
            ? "grid grid-cols-1 sm:grid-cols-[minmax(12rem,18rem)_1fr]"
            : "grid grid-cols-1"
        }
      >
        {showImage ? (
          <div className="relative min-h-56 bg-slate-200 sm:min-h-full">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, 40vw"
              className="object-cover"
              priority
              unoptimized={
                !product.imageUrl.startsWith("https://images.unsplash.com")
              }
            />
          </div>
        ) : null}
        <div className="space-y-3 p-4 sm:p-5">
          <h2 className="text-2xl font-bold sm:text-3xl">{product.name}</h2>
          <p className="text-base text-slate-600 sm:text-lg">{product.description}</p>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div>
              <span className="block text-sm font-semibold uppercase tracking-wide text-indigo-400">
                Retail
              </span>
              <span className="text-4xl font-extrabold text-indigo-700 sm:text-5xl">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: product.currency,
                }).format(product.price)}
              </span>
            </div>
            {product.wholesalePrice != null ? (
              <div>
                <span className="block text-sm font-semibold uppercase tracking-wide text-gray-400">
                  Wholesale
                </span>
                <span className="text-4xl font-extrabold text-gray-700 sm:text-5xl">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: product.currency,
                  }).format(product.wholesalePrice)}
                </span>
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-1 text-base text-slate-600 sm:text-lg">
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
