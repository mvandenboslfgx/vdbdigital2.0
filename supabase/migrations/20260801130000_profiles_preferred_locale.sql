-- Additive: account preferred_locale (ADR-001).
-- NOT applied to staging/production in this workstream.
-- Nullable: existing accounts fall back via application preference order.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT
    CHECK (
      preferred_locale IS NULL
      OR preferred_locale IN ('en', 'nl')
    );

COMMENT ON COLUMN public.profiles.preferred_locale IS
  'Account UI/email locale preference. Allowlisted: en|nl. NULL = unset (fall back to cookie → URL → Accept-Language → en). Owned by website/account layer; Resend consumes via validated event contract.';

-- Optional index for admin/ops reporting (nullable values omitted from btree usefulness;
-- keep simple for small profile counts).
CREATE INDEX IF NOT EXISTS profiles_preferred_locale_idx
  ON public.profiles (preferred_locale)
  WHERE preferred_locale IS NOT NULL;
