import Link from "next/link";
import { listProducts } from "@/lib/products-repository";

export const dynamic = "force-dynamic";

export default function AdminProductsPage() {
  const products = listProducts(200);

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-4 rounded-xl bg-white p-6 shadow">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Product Data (Local SQL)</h1>
            <p className="text-sm text-slate-600">
              Internal admin view of the local database running on this server.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/admin/activity"
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              API activity
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Price checker
            </Link>
          </nav>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-2 font-semibold">Barcode</th>
                <th className="p-2 font-semibold">SKU</th>
                <th className="p-2 font-semibold">Name</th>
                <th className="p-2 font-semibold">Price</th>
                <th className="p-2 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-slate-100">
                  <td className="p-2">{product.barcode}</td>
                  <td className="p-2">{product.sku}</td>
                  <td className="p-2">{product.name}</td>
                  <td className="p-2">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: product.currency,
                    }).format(product.price)}
                  </td>
                  <td className="p-2">
                    {new Date(product.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
