import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOptionalAuthenticatedUser } from "@/server/auth/require-session";
import { resolvePostLoginPath } from "@/server/auth/resolve-home";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false },
};

/** Behoudt /admin/login; stuurt door naar centrale authflow. */
export default async function AdminLoginPage() {
  const user = await getOptionalAuthenticatedUser();
  if (user) {
    redirect(await resolvePostLoginPath(user.id, "/admin"));
  }
  redirect("/inloggen?next=/admin");
}
