
-- Enum para status de leads
CREATE TYPE public.lead_status AS ENUM ('novo', 'em_contato', 'respondeu', 'descartado', 'convertido');
CREATE TYPE public.campanha_status AS ENUM ('rascunho', 'enviando', 'enviado');

-- Tabela leads
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  empresa TEXT,
  cargo TEXT,
  email TEXT,
  telefone TEXT,
  status public.lead_status NOT NULL DEFAULT 'novo',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela campanhas
CREATE TABLE public.campanhas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  assunto TEXT NOT NULL DEFAULT '',
  corpo TEXT NOT NULL DEFAULT '',
  status public.campanha_status NOT NULL DEFAULT 'rascunho',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela campanha_leads
CREATE TABLE public.campanha_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha_id UUID NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  enviado_em TIMESTAMPTZ
);

-- Tabela configuracoes
CREATE TABLE public.configuracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  sendgrid_key TEXT,
  remetente_nome TEXT,
  remetente_email TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para atualizar atualizado_em em leads
CREATE OR REPLACE FUNCTION public.update_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_set_atualizado_em
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.update_atualizado_em();

CREATE TRIGGER configuracoes_set_atualizado_em
BEFORE UPDATE ON public.configuracoes
FOR EACH ROW EXECUTE FUNCTION public.update_atualizado_em();

-- RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanha_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Leads policies
CREATE POLICY "Users view own leads" ON public.leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own leads" ON public.leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own leads" ON public.leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own leads" ON public.leads FOR DELETE USING (auth.uid() = user_id);

-- Campanhas policies
CREATE POLICY "Users view own campanhas" ON public.campanhas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own campanhas" ON public.campanhas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own campanhas" ON public.campanhas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own campanhas" ON public.campanhas FOR DELETE USING (auth.uid() = user_id);

-- Campanha_leads policies (via campanha ownership)
CREATE POLICY "Users view own campanha_leads" ON public.campanha_leads FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.campanhas c WHERE c.id = campanha_id AND c.user_id = auth.uid())
);
CREATE POLICY "Users insert own campanha_leads" ON public.campanha_leads FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.campanhas c WHERE c.id = campanha_id AND c.user_id = auth.uid())
);
CREATE POLICY "Users update own campanha_leads" ON public.campanha_leads FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.campanhas c WHERE c.id = campanha_id AND c.user_id = auth.uid())
);
CREATE POLICY "Users delete own campanha_leads" ON public.campanha_leads FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.campanhas c WHERE c.id = campanha_id AND c.user_id = auth.uid())
);

-- Configuracoes policies
CREATE POLICY "Users view own config" ON public.configuracoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own config" ON public.configuracoes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own config" ON public.configuracoes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own config" ON public.configuracoes FOR DELETE USING (auth.uid() = user_id);
