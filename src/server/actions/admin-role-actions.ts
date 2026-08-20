"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/database/server";
import { verifyOrigin } from "@/lib/security/origin";
import { writeAuditLog } from "@/lib/security/audit-log";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { AuthError } from "@/server/auth/errors";
import {
  canAssignRole,
  canRemoveOwner,
} from "@/lib/auth/permissions";
import {
  BOOTSTRAP_OWNER_EMAIL,
  isBootstrapOwnerEmail,
  normalizeEmail,
} from "@/lib/auth/bootstrap-owner";
import type { AdminRole } from "@/types";

export type AdminRoleActionState = {
  error?: string;
  success?: boolean;
};

const assignSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum(["ADMIN", "SUPPORT", "CONTENT"]),
});

const revokeSchema = z.object({
  userId: z.string().uuid(),
});

function deny(msg = "Verzoek geweigerd."): AdminRoleActionState {
  return { error: msg };
}

/**
 * OWNER (AAL2) assigns ADMIN/SUPPORT/CONTENT to an existing auth user by email.
 * Never creates OWNER. Never auto-promotes by email match alone for non-bootstrap.
 */
export async function assignStaffRoleAction(
  _prev: AdminRoleActionState,
  formData: FormData,
): Promise<AdminRoleActionState> {
  try {
    if (!(await verifyOrigin())) return deny();
    const ctx = await requireAdmin();
    await requirePermission(ctx, "roles.manage");

    if (ctx.role !== "OWNER") {
      return deny("Alleen OWNER mag staff-rollen toekennen.");
    }

    const parsed = assignSchema.safeParse({
      email: formData.get("email"),
      role: formData.get("role"),
    });
    if (!parsed.success) return deny("Ongeldige invoer.");

    const email = normalizeEmail(parsed.data.email);
    const targetRole = parsed.data.role as AdminRole;

    if (!canAssignRole(ctx.role, targetRole)) {
      return deny("Deze rol mag niet toegekend worden.");
    }
    if (targetRole === "OWNER") {
      return deny("OWNER kan niet via dit portaal toegekend worden.");
    }

    const supabase = createServiceRoleClient();
    if (!supabase) return deny("Serverconfiguratie ontbreekt.");

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, is_active")
      .ilike("email", email)
      .maybeSingle();

    if (!profile?.id) {
      return deny("Geen gebruiker gevonden met dit e-mailadres. Maak eerst een Auth-account aan.");
    }
    if (profile.is_active === false) {
      return deny("Account is geblokkeerd.");
    }
    if (profile.id === ctx.user.id) {
      return deny("Je kunt je eigen rol niet via deze actie wijzigen.");
    }

    const { data: existing } = await supabase
      .from("admin_roles")
      .select("role")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (existing?.role === "OWNER") {
      return deny("OWNER-accounts kunnen niet worden gedegradeerd via deze actie.");
    }
    if (isBootstrapOwnerEmail(profile.email)) {
      return deny(`Bootstrap-owner (${BOOTSTRAP_OWNER_EMAIL}) is beschermd.`);
    }

    const { error } = await supabase.from("admin_roles").upsert(
      {
        user_id: profile.id,
        role: targetRole,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) return deny("Rol kon niet worden opgeslagen.");

    await writeAuditLog({
      userId: ctx.user.id,
      action: "admin.role.assign",
      metadata: {
        targetUserId: profile.id,
        targetEmail: email,
        role: targetRole,
        previousRole: existing?.role ?? null,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/roles");
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) return deny();
    return deny();
  }
}

/**
 * OWNER (AAL2) revokes a staff role. Bootstrap owner and other OWNER rows are protected.
 */
export async function revokeStaffRoleAction(
  _prev: AdminRoleActionState,
  formData: FormData,
): Promise<AdminRoleActionState> {
  try {
    if (!(await verifyOrigin())) return deny();
    const ctx = await requireAdmin();
    await requirePermission(ctx, "roles.manage");

    if (ctx.role !== "OWNER") {
      return deny("Alleen OWNER mag staff-rollen intrekken.");
    }

    const parsed = revokeSchema.safeParse({ userId: formData.get("userId") });
    if (!parsed.success) return deny("Ongeldige invoer.");

    const targetId = parsed.data.userId;
    if (targetId === ctx.user.id) {
      return deny("Je kunt je eigen OWNER-rol niet intrekken.");
    }

    const supabase = createServiceRoleClient();
    if (!supabase) return deny("Serverconfiguratie ontbreekt.");

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("id", targetId)
      .maybeSingle();

    if (!profile) return deny("Gebruiker niet gevonden.");
    if (isBootstrapOwnerEmail(profile.email)) {
      return deny(`Bootstrap-owner (${BOOTSTRAP_OWNER_EMAIL}) mag niet worden ingetrokken.`);
    }

    const { data: existing } = await supabase
      .from("admin_roles")
      .select("role")
      .eq("user_id", targetId)
      .maybeSingle();

    if (!existing) return deny("Geen staff-rol aanwezig.");
    if (existing.role === "OWNER") {
      if (!canRemoveOwner(ctx.role)) return deny();
      return deny("OWNER-rol intrekken vereist een aparte gecontroleerde flow.");
    }

    const { error } = await supabase.from("admin_roles").delete().eq("user_id", targetId);
    if (error) return deny("Rol kon niet worden ingetrokken.");

    await writeAuditLog({
      userId: ctx.user.id,
      action: "admin.role.revoke",
      metadata: {
        targetUserId: targetId,
        previousRole: existing.role,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/roles");
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) return deny();
    return deny();
  }
}
