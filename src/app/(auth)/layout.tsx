import type { Metadata } from "next";
import { Card, Container } from "@/components/ui/container";
import { BrandLink } from "@/components/brand/BrandLink";
import { LanguageSwitcherBoundary } from "@/i18n/language-switcher-boundary";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Container className="max-w-md w-full">
        <div className="flex justify-end mb-3">
          <LanguageSwitcherBoundary compact />
        </div>
        <Card>
          <div className="flex justify-center mb-6">
            <BrandLink variant="light" priority logoClassName="h-12 w-auto" />
          </div>
          {children}
        </Card>
      </Container>
    </div>
  );
}
