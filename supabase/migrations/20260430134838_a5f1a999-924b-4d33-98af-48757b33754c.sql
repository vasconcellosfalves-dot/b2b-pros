ALTER TABLE public.respostas REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.respostas;