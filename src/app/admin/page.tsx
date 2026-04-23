import Link from "next/link";
import { logoutAction } from "./actions";

const adminLinks = [
  {
    href: "/admin/products",
    title: "Products",
    description: "Browse and search the local product catalog.",
  },
  {
    href: "/admin/upload",
    title: "CSV Import",
    description: "Upload product CSV files into the local product catalog.",
  },
  {
    href: "/admin/settings",
    title: "Settings",
    description: "Manage kiosk branding and behavior for the main route.",
  },
  {
    href: "/admin/activity",
    title: "API Activity",
    description: "Review sync jobs, upload history, and admin API events.",
  },
];

export default function AdminHomePage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6 rounded-xl bg-white p-6 shadow">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin</h1>
            <p className="text-sm text-slate-600">
              Central admin hub for catalog management, kiosk configuration, and
              activity review.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Price checker
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </nav>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white"
            >
              <h2 className="text-lg font-bold text-slate-900">{link.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{link.description}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
