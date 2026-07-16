import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Container } from "@/components/ui/container";
import { Logo } from "@/components/navigation/logo";
import { LoginForm } from "@/components/admin/login-form";
import { getOptionalAuthenticatedUser } from "@/server/auth/require-session";
import { getAal2RedirectPath } from "@/server/auth/require-aal2";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false },
};

export default async function AdminLoginPage() {
  const user = await getOptionalAuthenticatedUser();
  if (user) {
    const mfaRedirect = await getAal2RedirectPath();
    redirect(mfaRedirect ?? "/admin");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Container className="max-w-md w-full">
        <Card>
          <div className="flex justify-center mb-6">
            <Logo height={48} linked={false} className="rounded-lg" />
          </div>
          <h1 className="text-h2 mb-4 text-center">Admin login</h1>
          <p className="text-muted text-small mb-6 text-center">
            Admin access requires Supabase Auth and MFA.
          </p>
          <LoginForm />
        </Card>
      </Container>
    </div>
  );
}
