import type { Metadata } from "next";

/**
 * Defense-in-depth: every route under /admin (login, MFA, protected shell)
 * is private and must never be indexed, regardless of whether a given page
 * also sets its own `robots` metadata. Next.js metadata merging lets a
 * page-level `robots` still win when set explicitly.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
