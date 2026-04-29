-- 1. Add new status to campanha_status enum
ALTER TYPE public.campanha_status ADD VALUE IF NOT EXISTS 'agendada';

-- 2. Alter existing tables
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS score integer,
  ADD COLUMN IF NOT EXISTS abordagem_sugerida text;

ALTER TABLE public.campanhas
  ADD COLUMN IF NOT EXISTS agendado_para timestamp with time zone;

ALTER TABLE public.campanha_leads
  ADD COLUMN IF NOT EXISTS step_atual integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS proximo_envio timestamp with time zone,
  ADD COLUMN IF NOT EXISTS status_step text NOT NULL DEFAULT 'pendente';

-- 3. email_steps
CREATE TABLE IF NOT EXISTS public.email_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id uuid NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  step_numero integer NOT NULL,
  delay_dias integer NOT NULL DEFAULT 0,
  assunto text NOT NULL DEFAULT '',
  corpo text NOT NULL DEFAULT '',
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.email_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own email_steps" ON public.email_steps FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.campanhas c WHERE c.id = email_steps.campanha_id AND c.user_id = auth.uid()));
CREATE POLICY "Users insert own email_steps" ON public.email_steps FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.campanhas c WHERE c.id = email_steps.campanha_id AND c.user_id = auth.uid()));
CREATE POLICY "Users update own email_steps" ON public.email_steps FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.campanhas c WHERE c.id = email_steps.campanha_id AND c.user_id = auth.uid()));
CREATE POLICY "Users delete own email_steps" ON public.email_steps FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.campanhas c WHERE c.id = email_steps.campanha_id AND c.user_id = auth.uid()));

-- 4. email_eventos
CREATE TABLE IF NOT EXISTS public.email_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_lead_id uuid NOT NULL REFERENCES public.campanha_leads(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  ip text,
  user_agent text
);
ALTER TABLE public.email_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own email_eventos" ON public.email_eventos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.campanha_leads cl
    JOIN public.campanhas c ON c.id = cl.campanha_id
    WHERE cl.id = email_eventos.campanha_lead_id AND c.user_id = auth.uid()
  ));

-- 5. templates
CREATE TABLE IF NOT EXISTS public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  assunto text NOT NULL DEFAULT '',
  corpo text NOT NULL DEFAULT '',
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own templates" ON public.templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own templates" ON public.templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own templates" ON public.templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own templates" ON public.templates FOR DELETE USING (auth.uid() = user_id);

-- 6. respostas
CREATE TABLE IF NOT EXISTS public.respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campanha_id uuid REFERENCES public.campanhas(id) ON DELETE SET NULL,
  corpo_resposta text NOT NULL,
  classificacao_ia text,
  status text NOT NULL DEFAULT 'nova',
  recebido_em timestamp with time zone NOT NULL DEFAULT now(),
  respondido_em timestamp with time zone
);
ALTER TABLE public.respostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own respostas" ON public.respostas FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = respostas.lead_id AND l.user_id = auth.uid()));
CREATE POLICY "Users insert own respostas" ON public.respostas FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = respostas.lead_id AND l.user_id = auth.uid()));
CREATE POLICY "Users update own respostas" ON public.respostas FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = respostas.lead_id AND l.user_id = auth.uid()));
CREATE POLICY "Users delete own respostas" ON public.respostas FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = respostas.lead_id AND l.user_id = auth.uid()));

-- 7. atividades
CREATE TABLE IF NOT EXISTS public.atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own atividades" ON public.atividades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own atividades" ON public.atividades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own atividades" ON public.atividades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own atividades" ON public.atividades FOR DELETE USING (auth.uid() = user_id);

-- 8. notas
CREATE TABLE IF NOT EXISTS public.notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  texto text NOT NULL,
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notas" ON public.notas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notas" ON public.notas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notas" ON public.notas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notas" ON public.notas FOR DELETE USING (auth.uid() = user_id);

-- 9. tags
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#4F8EF7',
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);

-- 10. lead_tags
CREATE TABLE IF NOT EXISTS public.lead_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  UNIQUE (lead_id, tag_id)
);
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own lead_tags" ON public.lead_tags FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_tags.lead_id AND l.user_id = auth.uid()));
CREATE POLICY "Users insert own lead_tags" ON public.lead_tags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_tags.lead_id AND l.user_id = auth.uid()));
CREATE POLICY "Users delete own lead_tags" ON public.lead_tags FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_tags.lead_id AND l.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_atividades_lead ON public.atividades(lead_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notas_lead ON public.notas(lead_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead ON public.lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_steps_campanha ON public.email_steps(campanha_id, step_numero);
CREATE INDEX IF NOT EXISTS idx_respostas_lead ON public.respostas(lead_id, recebido_em DESC);