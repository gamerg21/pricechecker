"use client";

import { usePathname } from "next/navigation";

export function AppVersionFooter({ version }: { version: string }) {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center">
      <p className="text-[10px] tracking-[0.2em] text-slate-500/80">
        Version {version}
      </p>
    </footer>
  );
}
