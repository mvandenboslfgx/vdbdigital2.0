import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Container } from "@/components/ui/container";
import { MfaVerifyForm } from "@/components/admin/mfa-verify-form";
import { getMfaStatus } from "@/server/auth/mfa-status";

export const metadata: Metadata = {
  title: "Verify MFA",
  robots: { index: false },
};

export default async function MfaVerifyPage() {
  const mfa = await getMfaStatus();
  if (!mfa?.hasVerifiedFactor) {
    redirect("/admin/mfa/setup");
  }

  return (
    <Container className="max-w-md w-full">
      <Card>
        <h1 className="text-h2 mb-2">Two-factor authentication</h1>
        <MfaVerifyForm />
      </Card>
    </Container>
  );
}
