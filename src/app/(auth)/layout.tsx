import type { Metadata } from "next";
import { Card, Container } from "@/components/ui/container";
import { Logo } from "@/components/navigation/logo";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Container className="max-w-md w-full">
        <Card>
          <div className="flex justify-center mb-6">
            <Logo height={48} linked className="rounded-lg" />
          </div>
          {children}
        </Card>
      </Container>
    </div>
  );
}
