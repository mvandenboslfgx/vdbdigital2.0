# Documents Storage Operator Guide

1. Apply migration locally; verify PASS
2. Upload via `/admin/documents/new` (default INTERNAL)
3. Set visibility when ready to share
4. Customers use `/portal/documenten`
5. Production: separate deployment gate; configure scanner before claiming CLEAN
6. Orphans: query `status=UPLOADING` older than N hours; remove storage + mark REJECTED carefully

Physical delete: OWNER `documents.delete_physical` only (archive-first by default).
