import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Use the edge-safe config only — no DB imports in this file.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
