import type { Metadata } from "next";
import { Card } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Manage content",
  robots: { index: false },
};

export default function AdminContentPage() {
  return (
    <div>
      <h1 className="text-h1 mb-8">Content</h1>
      <Card>
        <p className="text-muted">
          Manage page content, SEO settings and site configuration.
        </p>
      </Card>
    </div>
  );
}
