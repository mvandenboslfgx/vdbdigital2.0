# Document Versioning

- New version = new storage object + new `portal_files` row
- `parent_document_id` points at root
- `version_number` increments
- Previous rows get `is_current=false`
- Customer sees only customer-visible AVAILABLE versions
- Deliverable approval remains tied to a specific deliverable metadata state; a new file version does not auto-approve
