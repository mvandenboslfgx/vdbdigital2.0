-- =============================================================================
-- Partner leads and sales (BCP-STAGING-005..006)
-- Explicit partner_leads — NOT marketing public.leads
-- Outside production apply baseline ending at 20260719170000.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.partner_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE RESTRICT,
  partner_code_id UUID REFERENCES public.partner_codes(id) ON DELETE SET NULL,
  status public.partner_lead_status NOT NULL DEFAULT 'NEW',
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  company_name TEXT,
  message TEXT,
  dedupe_key TEXT NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  converted_sale_id UUID,
  rejected_reason TEXT,
  attribution_locked_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT partner_leads_dedupe_unique UNIQUE (partner_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_partner_leads_partner ON public.partner_leads(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_leads_status ON public.partner_leads(status);

CREATE TABLE IF NOT EXISTS public.partner_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE RESTRICT,
  partner_lead_id UUID REFERENCES public.partner_leads(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  payment_id TEXT REFERENCES public.payments(id) ON DELETE SET NULL,
  status public.partner_sale_status NOT NULL DEFAULT 'PENDING',
  gross_amount_cents BIGINT NOT NULL CHECK (gross_amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (char_length(currency) = 3),
  idempotency_key TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT partner_sales_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_partner_sales_partner ON public.partner_sales(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_sales_lead ON public.partner_sales(partner_lead_id);

-- Back-fill FK from leads.converted_sale_id after sales exist
ALTER TABLE public.partner_leads
  DROP CONSTRAINT IF EXISTS partner_leads_converted_sale_fkey;
ALTER TABLE public.partner_leads
  ADD CONSTRAINT partner_leads_converted_sale_fkey
  FOREIGN KEY (converted_sale_id) REFERENCES public.partner_sales(id) ON DELETE SET NULL;

ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_sales ENABLE ROW LEVEL SECURITY;
