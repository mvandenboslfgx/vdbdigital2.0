import "server-only";
import type { AdminRole } from "@/types";
import type { Permission } from "@/lib/auth/permissions";

export type AuthenticatedUser = {
  id: string;
  email: string;
};

export type AdminContext = {
  user: AuthenticatedUser;
  role: AdminRole;
  aal: "aal1" | "aal2";
  permissions: readonly Permission[];
};
