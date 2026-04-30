-- Parte 1: campos em configuracoes
ALTER TABLE public.configuracoes
  ADD COLUMN IF NOT EXISTS empresa_descricao text,
  ADD COLUMN IF NOT EXISTS cliente_ideal_padrao text,
  ADD COLUMN IF NOT EXISTS dores_resolvidas text,
  ADD COLUMN IF NOT EXISTS tom_voz_padrao text DEFAULT 'profissional_direto',
  ADD COLUMN IF NOT EXISTS idioma_padrao text DEFAULT 'pt-BR';

-- Parte 2: campos em campanhas
ALTER TABLE public.campanhas
  ADD COLUMN IF NOT EXISTS briefing_persona text,
  ADD COLUMN IF NOT EXISTS briefing_dor text,
  ADD COLUMN IF NOT EXISTS briefing_cta text,
  ADD COLUMN IF NOT EXISTS tom_voz text,
  ADD COLUMN IF NOT EXISTS idioma text DEFAULT 'pt-BR';

-- Parte 3: nova tabela templates_campanha (templates de sequência completa)
CREATE TABLE IF NOT EXISTS public.templates_campanha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  briefing_persona text,
  briefing_dor text,
  briefing_cta text,
  tom_voz text,
  idioma text DEFAULT 'pt-BR',
  email_1_assunto text DEFAULT '',
  email_1_corpo text DEFAULT '',
  email_1_delay integer DEFAULT 0,
  email_2_assunto text DEFAULT '',
  email_2_corpo text DEFAULT '',
  email_2_delay integer DEFAULT 3,
  email_3_assunto text DEFAULT '',
  email_3_corpo text DEFAULT '',
  email_3_delay integer DEFAULT 7,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.templates_campanha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own templates_campanha"
  ON public.templates_campanha FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own templates_campanha"
  ON public.templates_campanha FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own templates_campanha"
  ON public.templates_campanha FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own templates_campanha"
  ON public.templates_campanha FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_templates_campanha_atualizado_em
  BEFORE UPDATE ON public.templates_campanha
  FOR EACH ROW
  EXECUTE FUNCTION public.update_atualizado_em();