-- Store validated form locale (en | nl only). Safe to run repeatedly.
ALTER TABLE contact_submissions
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en'
  CHECK (locale IN ('en', 'nl'));

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en'
  CHECK (locale IN ('en', 'nl'));

COMMENT ON COLUMN contact_submissions.locale IS 'Validated UI locale at submission (en|nl)';
COMMENT ON COLUMN quote_requests.locale IS 'Validated UI locale at submission (en|nl)';
