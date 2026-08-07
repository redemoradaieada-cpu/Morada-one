-- ============================================================
-- GESTOR DE TAREFAS — Correção de Relacionamento e RLS
-- Cole este código no Editor SQL do Supabase e clique em RUN
-- ============================================================

-- Corrige as chaves estrangeiras para referenciar a tabela "perfis" em vez de "auth.users"
-- Isso permite que as consultas do React tragam o nome do usuário corretamente!

ALTER TABLE tarefas DROP CONSTRAINT IF EXISTS tarefas_criado_por_fkey;
ALTER TABLE tarefas ADD CONSTRAINT tarefas_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES perfis(id) ON DELETE SET NULL;

ALTER TABLE tarefas_responsaveis DROP CONSTRAINT IF EXISTS tarefas_responsaveis_usuario_id_fkey;
ALTER TABLE tarefas_responsaveis ADD CONSTRAINT tarefas_responsaveis_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES perfis(id) ON DELETE CASCADE;

ALTER TABLE tarefas_comentarios DROP CONSTRAINT IF EXISTS tarefas_comentarios_usuario_id_fkey;
ALTER TABLE tarefas_comentarios ADD CONSTRAINT tarefas_comentarios_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES perfis(id) ON DELETE SET NULL;

ALTER TABLE tarefas_notificacoes DROP CONSTRAINT IF EXISTS tarefas_notificacoes_usuario_id_fkey;
ALTER TABLE tarefas_notificacoes ADD CONSTRAINT tarefas_notificacoes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES perfis(id) ON DELETE CASCADE;

-- Garante que o RLS (Row Level Security) esteja ativado
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_notificacoes ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem (para evitar erros ao rodar o script mais de uma vez)
DROP POLICY IF EXISTS "Acesso total para autenticados em tarefas" ON tarefas;
DROP POLICY IF EXISTS "Acesso total para autenticados em tarefas_responsaveis" ON tarefas_responsaveis;
DROP POLICY IF EXISTS "Acesso total para autenticados em tarefas_comentarios" ON tarefas_comentarios;
DROP POLICY IF EXISTS "Acesso total para autenticados em tarefas_notificacoes" ON tarefas_notificacoes;

-- Cria política que permite a usuários logados (authenticated) visualizar, inserir, atualizar e deletar
CREATE POLICY "Acesso total para autenticados em tarefas" 
ON tarefas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total para autenticados em tarefas_responsaveis" 
ON tarefas_responsaveis FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total para autenticados em tarefas_comentarios" 
ON tarefas_comentarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total para autenticados em tarefas_notificacoes" 
ON tarefas_notificacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
