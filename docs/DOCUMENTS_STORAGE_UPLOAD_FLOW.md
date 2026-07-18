# Upload Flow

1. Auth + permission
2. Validate org/project server-side
3. Validate file (size, MIME, magic bytes, filename)
4. Insert `portal_files` with `status=UPLOADING`
5. Upload bytes to private bucket (service role)
6. On success → `AVAILABLE`; on failure → `REJECTED` + remove storage object
7. Audit + optional project_activity + notification

Customer uploads force `visibility=CUSTOMER_UPLOAD`.
