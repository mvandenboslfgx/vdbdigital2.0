import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { listPortalFiles } from "@/server/repositories/portal";

export const metadata: Metadata = {
  title: "Documenten",
  robots: { index: false },
};

export default async function PortalDocumentsPage() {
  const { files } = await listPortalFiles();

  return (
    <div className="space-y-6">
      <h1 className="text-h1">Documenten</h1>
      {files.length === 0 ? (
        <EmptyState
          title="Geen documenten"
          description="Zichtbare bestanden van jouw organisatie verschijnen hier."
        />
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="rounded-lg border border-border p-4 flex justify-between gap-3 text-small"
            >
              <span className="truncate">{f.file_name}</span>
              <span className="text-muted shrink-0">
                {new Date(f.created_at).toLocaleDateString("nl-NL")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
