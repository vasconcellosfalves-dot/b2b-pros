-- Add new columns to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS setor text,
  ADD COLUMN IF NOT EXISTS senioridade text,
  ADD COLUMN IF NOT EXISTS fonte text,
  ADD COLUMN IF NOT EXISTS apollo_id text,
  ADD COLUMN IF NOT EXISTS email_status text,
  ADD COLUMN IF NOT EXISTS ultima_atividade timestamp with time zone;

-- Backfill fonte for existing rows
UPDATE public.leads SET fonte = 'manual' WHERE fonte IS NULL;

-- Backfill email_status
UPDATE public.leads SET email_status = CASE
  WHEN email IS NULL OR email = '' THEN 'sem_email'
  WHEN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN 'valido'
  ELSE 'invalido'
END WHERE email_status IS NULL;

-- Trigger to keep email_status in sync
CREATE OR REPLACE FUNCTION public.set_lead_email_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.email_status := CASE
    WHEN NEW.email IS NULL OR NEW.email = '' THEN 'sem_email'
    WHEN NEW.email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN 'valido'
    ELSE 'invalido'
  END;
  IF NEW.fonte IS NULL THEN
    NEW.fonte := 'manual';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_lead_email_status ON public.leads;
CREATE TRIGGER trg_set_lead_email_status
BEFORE INSERT OR UPDATE OF email, fonte ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_lead_email_status();

-- Unique index on (user_id, lower(email)) to prevent duplicates per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_user_email_unique
  ON public.leads (user_id, lower(email))
  WHERE email IS NOT NULL AND email <> '';

-- Index for apollo dedup
CREATE INDEX IF NOT EXISTS idx_leads_user_apollo_id
  ON public.leads (user_id, apollo_id)
  WHERE apollo_id IS NOT NULL;

-- Helpful indexes for filters/sorting
CREATE INDEX IF NOT EXISTS idx_leads_user_status ON public.leads (user_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_user_fonte ON public.leads (user_id, fonte);
CREATE INDEX IF NOT EXISTS idx_leads_user_ultima_atividade ON public.leads (user_id, ultima_atividade DESC);