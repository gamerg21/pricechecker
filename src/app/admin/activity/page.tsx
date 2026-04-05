import Link from "next/link";
import { listRecentApiActivity } from "@/lib/api-activity-repository";

export const dynamic = "force-dynamic";

function levelStyles(level: string) {
  switch (level) {
    case "success":
      return "bg-emerald-100 text-emerald-800";
    case "error":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function statusStyles(status: number) {
  if (status >= 500) return "text-rose-700 font-semibold";
  if (status >= 400) return "text-amber-700 font-semibold";
  return "text-slate-700";
}

export default function AdminActivityPage() {
  const entries = listRecentApiActivity(200);

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-4 rounded-xl bg-white p-6 shadow">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">API activity</h1>
            <p className="text-sm text-slate-600">
              Recent HTTP API calls and CLI CSV imports (
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">
                import-celigo-csv
              </code>
              ). Successful barcode lookups are not logged to keep this list
              readable.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/admin/products"
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Products
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Price checker
            </Link>
          </nav>
        </header>

        {entries.length === 0 ? (
          <p className="text-sm text-slate-600">
            No activity yet. Run{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">
              npm run import:csv
            </code>
            , or POST to{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">
              /api/sync/products
            </code>
            — successful and failed runs will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-2 font-semibold">Time (UTC)</th>
                  <th className="p-2 font-semibold">Route</th>
                  <th className="p-2 font-semibold">Method</th>
                  <th className="p-2 font-semibold">Status</th>
                  <th className="p-2 font-semibold">Level</th>
                  <th className="p-2 font-semibold">Message</th>
                  <th className="p-2 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 align-top">
                    <td className="whitespace-nowrap p-2 font-mono text-xs text-slate-600">
                      {row.createdAt}
                    </td>
                    <td className="p-2 font-mono text-xs">{row.route}</td>
                    <td className="p-2">{row.method}</td>
                    <td className={`p-2 font-mono text-xs ${statusStyles(row.status)}`}>
                      {row.status}
                    </td>
                    <td className="p-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${levelStyles(row.level)}`}
                      >
                        {row.level}
                      </span>
                    </td>
                    <td className="max-w-xs p-2 text-slate-800">{row.message}</td>
                    <td className="max-w-md p-2">
                      {row.detail ? (
                        <pre className="max-h-40 overflow-auto rounded-md bg-slate-50 p-2 font-mono text-xs text-slate-700">
                          {JSON.stringify(row.detail, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
