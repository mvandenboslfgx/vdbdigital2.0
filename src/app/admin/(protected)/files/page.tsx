import { redirect } from "next/navigation";

/** Legacy alias — canonical route is /admin/documents */
export default function AdminFilesRedirectPage() {
  redirect("/admin/documents");
}
