# Consumer verification — vdb-backend-contract@0.2.0-rc.1

1. Confirm `schemaVersion` equals `2026.07.22.partner-rc1`.
2. Compare `database.types.ts` SHA256 to `checksums.json`.
3. Confirm RPC names in `rpcs.json` exist on the target environment.
4. Confirm Storage bucket list equals six private buckets in `storage-buckets.json`.
5. Do not invent parallel partner tables or client-authoritative commission math.
6. Fail-closed hide marketing assets and reviews until BCP-009/011 land.
