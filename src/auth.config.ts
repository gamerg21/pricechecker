import type { NextAuthConfig } from "next-auth";

// Edge-safe config — no Node.js APIs, no DB imports.
// Used by middleware to validate sessions without touching SQLite.
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdminApiRoute = nextUrl.pathname.startsWith("/api/admin");
      const isLoginPage = nextUrl.pathname === "/admin/login";

      // API routes: return 401 instead of redirecting to login
      if (isAdminApiRoute) {
        if (!isLoggedIn) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        return true;
      }

      // Login page: bounce logged-in users to /admin/products
      if (isLoginPage) {
        return isLoggedIn
          ? Response.redirect(new URL("/admin/products", nextUrl))
          : true;
      }

      // All other /admin/* routes: require login
      return isLoggedIn;
    },
  },
  providers: [], // populated in auth.ts with DB-dependent Credentials provider
};
