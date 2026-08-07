CREATE INDEX IF NOT EXISTS idx_tarefas_responsaveis ON public.tarefas_responsaveis(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON public.tarefas_notificacoes(usuario_id, lida);
CREATE INDEX IF NOT EXISTS idx_comentarios_tarefa   ON public.tarefas_comentarios(tarefa_id);
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_tarefas_updated_at
  BEFORE UPDATE ON public.tarefas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- ============================================================
-- RLS (ROW LEVEL SECURITY) E POLÍTICAS BÁSICAS
-- ============================================================
ALTER TABLE public.cidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niveis_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acertos_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_inscricao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quartos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscricoes_hospedagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas_responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas_notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_chamada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamada_itens ENABLE ROW LEVEL SECURITY;
-- Políticas de Acesso Simplificadas (Acesso total para usuários autenticados)
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Acesso total autenticados" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Acesso total autenticados" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;