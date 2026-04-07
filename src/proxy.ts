import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Next.js 16+ uses proxy.ts instead of middleware.ts
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
