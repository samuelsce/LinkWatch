import NextAuth, { AuthError } from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getDatabase } from "./server/db";

export function isGitHubConfigured() {
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: PrismaAdapter(getDatabase()),
  secret: process.env.AUTH_SECRET,
  trustHost: process.env.NODE_ENV !== "production" || process.env.AUTH_TRUST_HOST === "true",
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  providers: isGitHubConfigured() ? [GitHub({
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
  })] : [],
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  logger: {
    error(error) { console.error(JSON.stringify({ event: "auth_error", type: error instanceof AuthError ? error.type : "AuthFailure" })); },
    warn(code) { console.warn(JSON.stringify({ event: "auth_warning", code })); },
    debug() {},
  },
}));
