import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { findUserByUsername } from "@/lib/users-repository";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = findUserByUsername(String(credentials.username));
        if (!user) return null;

        const valid = await bcrypt.compare(
          String(credentials.password),
          user.password_hash,
        );
        if (!valid) return null;

        return { id: user.id, name: user.username };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
});
