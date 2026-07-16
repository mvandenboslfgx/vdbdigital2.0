-- P0.5: harden rate-limit RPC concurrency; deny authenticated client access

DROP POLICY IF EXISTS "Deny authenticated rate_limit_buckets" ON rate_limit_buckets;
CREATE POLICY "Deny authenticated rate_limit_buckets" ON rate_limit_buckets
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_limit INT,
  p_window_seconds INT
)
RETURNS TABLE(allowed BOOLEAN, retry_after_seconds INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_count INT;
  v_reset TIMESTAMPTZ;
BEGIN
  -- Serialize per key across concurrent first-hits (row may not exist yet)
  PERFORM pg_advisory_xact_lock(hashtext(p_key));

  SELECT count, reset_at INTO v_count, v_reset
  FROM rate_limit_buckets
  WHERE key = p_key
  FOR UPDATE;

  IF NOT FOUND OR v_reset <= v_now THEN
    INSERT INTO rate_limit_buckets(key, count, reset_at)
    VALUES (p_key, 1, v_now + make_interval(secs => GREATEST(p_window_seconds, 1)))
    ON CONFLICT (key) DO UPDATE
      SET count = 1,
          reset_at = v_now + make_interval(secs => GREATEST(p_window_seconds, 1));
    allowed := TRUE;
    retry_after_seconds := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE rate_limit_buckets
  SET count = count + 1
  WHERE key = p_key
  RETURNING count INTO v_count;

  IF v_count > p_limit THEN
    allowed := FALSE;
    retry_after_seconds := GREATEST(1, EXTRACT(EPOCH FROM (v_reset - v_now))::INT);
  ELSE
    allowed := TRUE;
    retry_after_seconds := 0;
  END IF;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION check_rate_limit(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INT, INT) TO service_role;

COMMENT ON FUNCTION check_rate_limit(TEXT, INT, INT) IS
  'Atomic app rate limiter for checkout/payment buckets; service_role only.';
