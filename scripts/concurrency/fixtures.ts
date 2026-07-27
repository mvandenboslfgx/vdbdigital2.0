/**
 * Synthetic concurrency fixtures — fictional local data only.
 */
import { psql } from "./db";

export const IDS = {
  staffA: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1",
  staffB: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2",
  partnerAUser: "ffffffff-ffff-ffff-ffff-fffffffffff1",
  partnerBUser: "ffffffff-ffff-ffff-ffff-fffffffffff2",
  customer: "ffffffff-ffff-ffff-ffff-fffffffffff3",
} as const;

export type FixtureContext = {
  partnerAId: string;
  partnerBId: string;
};

export function resetConcurrencyFixtures(): FixtureContext {
  psql(`
DO $$
DECLARE
  staff_a uuid := '${IDS.staffA}';
  staff_b uuid := '${IDS.staffB}';
  partner_a uuid := '${IDS.partnerAUser}';
  partner_b uuid := '${IDS.partnerBUser}';
  customer_id uuid := '${IDS.customer}';
BEGIN
  ALTER TABLE public.partner_ledger_entries DISABLE TRIGGER USER;
  ALTER TABLE public.partner_ledger_transactions DISABLE TRIGGER USER;

  DELETE FROM public.partner_ledger_entries WHERE transaction_id IN (
    SELECT id FROM public.partner_ledger_transactions
    WHERE idempotency_key LIKE 'conc:%'
       OR actor_user_id IN (staff_a, staff_b, partner_a, partner_b, customer_id)
  );
  DELETE FROM public.partner_ledger_transactions
  WHERE idempotency_key LIKE 'conc:%'
     OR actor_user_id IN (staff_a, staff_b, partner_a, partner_b, customer_id);

  ALTER TABLE public.partner_ledger_entries ENABLE TRIGGER USER;
  ALTER TABLE public.partner_ledger_transactions ENABLE TRIGGER USER;

  DELETE FROM public.partner_adjustments WHERE partner_id IN (
    SELECT id FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b)
  ) OR idempotency_key LIKE 'conc:%';
  DELETE FROM public.partner_cash_receipts
  WHERE actor_user_id IN (staff_a, staff_b) OR idempotency_key LIKE 'conc:%';
  DELETE FROM public.partner_payouts WHERE partner_id IN (
    SELECT id FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b)
  );
  DELETE FROM public.partner_payout_requests
  WHERE partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b))
     OR idempotency_key LIKE 'conc:%';
  DELETE FROM public.partner_commissions WHERE partner_id IN (
    SELECT id FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b)
  ) OR idempotency_key LIKE 'conc:%';
  UPDATE public.partner_leads SET converted_sale_id = NULL WHERE partner_id IN (
    SELECT id FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b)
  );
  DELETE FROM public.partner_sales
  WHERE partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b))
     OR idempotency_key LIKE 'conc:%';
  DELETE FROM public.partner_leads WHERE partner_id IN (
    SELECT id FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b)
  ) OR dedupe_key LIKE 'conc-%';
  DELETE FROM public.partner_codes WHERE partner_id IN (
    SELECT id FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b)
  );
  DELETE FROM public.partner_applications WHERE user_id IN (partner_a, partner_b);
  DELETE FROM public.partner_profiles WHERE user_id IN (partner_a, partner_b);
  DELETE FROM public.admin_roles WHERE user_id IN (staff_a, staff_b);
  DELETE FROM public.profiles WHERE id IN (staff_a, staff_b, partner_a, partner_b, customer_id);
  DELETE FROM auth.users WHERE id IN (staff_a, staff_b, partner_a, partner_b, customer_id);

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (staff_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'staff.a.conc@example.invalid', crypt('x', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),
    (staff_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'staff.b.conc@example.invalid', crypt('x', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),
    (partner_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'partner.a.conc@example.invalid', crypt('x', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),
    (partner_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'partner.b.conc@example.invalid', crypt('x', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()),
    (customer_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer.conc@example.invalid', crypt('x', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW());

  INSERT INTO public.profiles (id, email, full_name, is_active) VALUES
    (staff_a, 'staff.a.conc@example.invalid', 'Staff A Conc', TRUE),
    (staff_b, 'staff.b.conc@example.invalid', 'Staff B Conc', TRUE),
    (partner_a, 'partner.a.conc@example.invalid', 'Partner A Conc', TRUE),
    (partner_b, 'partner.b.conc@example.invalid', 'Partner B Conc', TRUE),
    (customer_id, 'customer.conc@example.invalid', 'Customer Conc', TRUE)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, is_active = TRUE;

  INSERT INTO public.admin_roles (user_id, role) VALUES
    (staff_a, 'ADMIN'),
    (staff_b, 'ADMIN')
  ON CONFLICT (user_id) DO NOTHING;
END $$;
`);

  // Ensure payouts feature locally enabled for concurrency (restored by caller)
  psql(`UPDATE public.feature_flags SET enabled = true WHERE key = 'partner_payouts';`);

  const appA = psql(`
SELECT public.submit_partner_application('Partner A Conc BV','Partner A Conc','partner.a.conc@example.invalid',NULL,NULL,NULL)
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.partnerAUser}',true)) s;
`);
  const partnerAId = psql(`
SELECT public.review_partner_application('${appA}'::uuid, true, NULL, 'CONCPA')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.staffA}',true)) s;
`);

  const appB = psql(`
SELECT public.submit_partner_application('Partner B Conc BV','Partner B Conc','partner.b.conc@example.invalid')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.partnerBUser}',true)) s;
`);
  const partnerBId = psql(`
SELECT public.review_partner_application('${appB}'::uuid, true, NULL, 'CONCPB')
FROM (SELECT set_config('request.jwt.claim.sub','${IDS.staffA}',true)) s;
`);

  return { partnerAId, partnerBId };
}

export function restorePayoutFlag(): void {
  psql(`UPDATE public.feature_flags SET enabled = false WHERE key = 'partner_payouts';`);
}

export function createLead(opts: {
  partnerUserId: string;
  name: string;
  email: string;
  dedupe: string;
  code?: string;
}): string {
  const codeArg = opts.code ? `'${opts.code}'` : "NULL";
  return psql(`
SELECT public.create_partner_lead('${opts.name}','${opts.email}','${opts.dedupe}','Co',NULL,'conc',${codeArg})
FROM (SELECT set_config('request.jwt.claim.sub','${opts.partnerUserId}',true)) s;
`);
}

export function assertLedgerBalanced(): void {
  const unbalanced = psql(`
SELECT COUNT(*)::text FROM (
  SELECT t.id
  FROM public.partner_ledger_transactions t
  JOIN public.partner_ledger_entries e ON e.transaction_id = t.id
  WHERE t.idempotency_key LIKE 'conc:%'
  GROUP BY t.id
  HAVING SUM(e.debit_cents) <> SUM(e.credit_cents)
) x;
`);
  if (unbalanced !== "0") {
    throw new Error(`INVARIANT ledger unbalanced groups=${unbalanced}`);
  }
}

export function assertLedgerImmutableDenied(): void {
  const upd = (() => {
    try {
      psql(`
UPDATE public.partner_ledger_entries
SET debit_cents = debit_cents
WHERE id IN (
  SELECT e.id FROM public.partner_ledger_entries e
  JOIN public.partner_ledger_transactions t ON t.id = e.transaction_id
  WHERE t.idempotency_key LIKE 'conc:%'
  LIMIT 1
);
`);
      return "ALLOWED";
    } catch (e) {
      return String(e);
    }
  })();
  if (!/partner_ledger_immutable|ERROR/.test(upd) && upd === "ALLOWED") {
    throw new Error("INVARIANT ledger UPDATE was allowed");
  }

  const del = (() => {
    try {
      psql(`
DELETE FROM public.partner_ledger_entries
WHERE id IN (
  SELECT e.id FROM public.partner_ledger_entries e
  JOIN public.partner_ledger_transactions t ON t.id = e.transaction_id
  WHERE t.idempotency_key LIKE 'conc:%'
  LIMIT 1
);
`);
      return "ALLOWED";
    } catch (e) {
      return String(e);
    }
  })();
  if (del === "ALLOWED") {
    throw new Error("INVARIANT ledger DELETE was allowed");
  }
}
