import { redirect } from "next/navigation";

/** NL alias → existing deliverables tab */
export default async function PortalProjectOpleveringenRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/portal/projecten/${id}/deliverables`);
}
