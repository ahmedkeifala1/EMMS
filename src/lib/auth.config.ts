import type { NextAuthConfig } from "next-auth";

// Inline enum — keeps this file free of any Prisma/Node.js imports (edge-safe)
type UserRole = "staff" | "head" | "admin" | "governor";

// Edge-compatible config — no Node.js imports (no bcrypt, no prisma)
export const authConfig: NextAuthConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;

      if (path.startsWith("/api/auth")) return true;

      if (path.startsWith("/api/") && !isLoggedIn) return false;

      if (!isLoggedIn && path !== "/login") return false;

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.departmentId = (user as { departmentId: string }).departmentId;
        token.departmentCode = (user as { departmentCode: string }).departmentCode;
        token.staffId = (user as { staffId: string }).staffId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.departmentId = token.departmentId as string;
        session.user.departmentCode = token.departmentCode as string;
        session.user.staffId = token.staffId as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt", maxAge: 30 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};
