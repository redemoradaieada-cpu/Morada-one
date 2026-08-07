ALTER TABLE public.niveis_acesso ADD COLUMN IF NOT EXISTS acesso_global_eventos BOOLEAN DEFAULT FALSE;
