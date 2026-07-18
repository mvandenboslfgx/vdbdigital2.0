import type { Metadata } from "next";
import { getPortalProfile } from "@/server/repositories/portal";
import { ProfileForm } from "@/components/portal/profile-form";

export const metadata: Metadata = {
  title: "Profiel",
  robots: { index: false },
};

export default async function PortalProfilePage() {
  const { ctx, profile } = await getPortalProfile();

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-h1">Profiel</h1>
      <p className="text-muted text-small">
        Organisatie:{" "}
        {ctx.organization.tradeName || ctx.organization.legalName}
      </p>
      <ProfileForm
        email={profile?.email ?? ctx.user.email}
        fullName={profile?.full_name ?? ""}
      />
    </div>
  );
}
