import type { DefaultSession } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      sharedIdentityId: string;
      workspaceId: string;
      role: string;
      force_password_change: boolean;
      pro_model_access: boolean;
      pro_model_requested: boolean;
      credential_version: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    sharedIdentityId?: string;
    workspaceId?: string;
    role?: string;
    force_password_change?: boolean;
    pro_model_access?: boolean;
    pro_model_requested?: boolean;
    credential_version?: string;
  }
}

declare module "next-auth" {
  interface User {
    sharedIdentityId: string;
    role: string;
    force_password_change: boolean;
    pro_model_access: boolean;
    pro_model_requested: boolean;
    credential_version: string;
  }
}
