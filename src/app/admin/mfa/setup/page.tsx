import type { Metadata } from "next";
import { Card, Container } from "@/components/ui/container";
import { MfaSetupForm } from "@/components/admin/mfa-setup-form";

export const metadata: Metadata = {
  title: "Set up MFA",
  robots: { index: false },
};

export default function MfaSetupPage() {
  return (
    <Container className="max-w-md w-full">
      <Card>
        <h1 className="text-h2 mb-2">Set up two-factor authentication</h1>
        <p className="text-small text-muted mb-6">
          MFA is required for all admin roles (OWNER, ADMIN, SUPPORT, CONTENT).
        </p>
        <MfaSetupForm />
      </Card>
    </Container>
  );
}
