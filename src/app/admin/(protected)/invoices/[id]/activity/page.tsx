import { redirect } from "next/navigation";

export default async function AdminInvoiceActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/invoices/${id}`);
}
