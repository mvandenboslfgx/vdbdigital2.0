import { redirect } from "next/navigation";

export default async function PortalProjectIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/portal/projecten/${id}/overview`);
}
