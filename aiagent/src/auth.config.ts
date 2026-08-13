import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  // In production, forwarded host headers are trusted only when the
  // deployment explicitly confirms that its reverse proxy overwrites them.
  trustHost:
    process.env.NODE_ENV !== "production" ||
    process.env.AUTH_TRUST_HOST === "true",
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.force_password_change = user.force_password_change;
        token.pro_model_access = user.pro_model_access;
        token.pro_model_requested = user.pro_model_requested;
        token.credential_version = user.credential_version;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.force_password_change =
          token.force_password_change as boolean;
        session.user.pro_model_access = token.pro_model_access as boolean;
        session.user.pro_model_requested = token.pro_model_requested as boolean;
        session.user.credential_version = token.credential_version as string;
      }
      return session;
    },
    authorized({ auth }) {
      return Boolean(auth?.user?.email);
    },
  },
  providers: [], // Add providers with an empty array for now
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Host-aiagent.session-token"
          : "aiagent.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
} satisfies NextAuthConfig;
