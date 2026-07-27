-- =============================================================================
-- RC2 P0-2: serialize partner payout liability reservations
--
-- Root cause: request_partner_payout computed available liability then inserted
-- without locking the partner row (check-then-insert TOCTOU). Concurrent requests
-- with distinct idempotency keys could overspend available liability.
--
-- Strategy: FOR UPDATE on partner_profiles row, then compute liability + insert
-- in the same transaction. Soft-idempotency on key with unique_violation handler.
-- Outside production exact-17 baseline ending at 20260719170000.
-- =============================================================================

-- Liability reservation semantics (documentation via comment):
-- REQUESTED  → reserves liability (subtracted in partner_available_liability_cents)
-- APPROVED   → reservation released from requests; partner_payouts PENDING/PAID counts
-- REJECTED   → does not reserve
-- CANCELLED  → enum exists; not used by request RPC path (no reservation when not REQUESTED)
-- (No EXPIRED status in current enum.)

CREATE OR REPLACE FUNCTION public.request_partner_payout(
  p_amount_cents bigint,
  p_idempotency_key text,
  p_currency text DEFAULT 'EUR'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner public.partner_profiles%ROWTYPE;
  v_avail bigint;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  IF NOT public.feature_flag_enabled(ARRAY['partner_payouts', 'partner.payouts']) THEN
    RAISE EXCEPTION 'FEATURE_NOT_CONFIGURED: partner payouts are currently disabled';
  END IF;

  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  IF p_currency IS NULL OR char_length(p_currency) <> 3 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED';
  END IF;

  -- Serialize all liability mutations for this partner (row lock preference)
  SELECT * INTO v_partner
  FROM public.partner_profiles
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND
     OR v_partner.status IS DISTINCT FROM 'ACTIVE'
     OR NOT COALESCE(v_partner.payout_eligible, false) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Idempotent replay under the partner lock
  SELECT id INTO v_id
  FROM public.partner_payout_requests
  WHERE idempotency_key = p_idempotency_key;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- Available liability includes REQUESTED reservations (see partner_available_liability_cents)
  v_avail := public.partner_available_liability_cents(v_partner.id);
  IF p_amount_cents > v_avail THEN
    RAISE EXCEPTION 'PARTNER_INSUFFICIENT_LIABILITY';
  END IF;

  BEGIN
    INSERT INTO public.partner_payout_requests (
      partner_id, requested_amount_cents, available_amount_snapshot_cents,
      currency, status, idempotency_key
    ) VALUES (
      v_partner.id, p_amount_cents, v_avail, p_currency, 'REQUESTED', p_idempotency_key
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_id
    FROM public.partner_payout_requests
    WHERE idempotency_key = p_idempotency_key;
    IF v_id IS NULL THEN
      RAISE;
    END IF;
  END;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_partner_payout(bigint,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_partner_payout(bigint,text,text) TO authenticated;

COMMENT ON FUNCTION public.request_partner_payout(bigint,text,text) IS
  'RC2 concurrency: partner_profiles FOR UPDATE serializes liability check+insert; overspend → PARTNER_INSUFFICIENT_LIABILITY';
