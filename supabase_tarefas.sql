-- ============================================================
-- GESTOR DE TAREFAS — SQL para colar no Editor SQL do Supabase
-- ============================================================

-- 1. Tabela principal de tarefas
CREATE TABLE IF NOT EXISTS tarefas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          text NOT NULL,
  descricao       text,
  prioridade      text NOT NULL DEFAULT 'media'
                    CHECK (prioridade IN ('baixa','media','alta','urgente')),
  status          text NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente','em_progresso','em_revisao','concluida','cancelada')),
  criado_por      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  data_inicio     date,
  data_vencimento date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. Responsáveis por tarefa (muitos para muitos)
CREATE TABLE IF NOT EXISTS tarefas_responsaveis (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id   uuid NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  usuario_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (tarefa_id, usuario_id)
);

-- 3. Comentários / observações em tarefas
CREATE TABLE IF NOT EXISTS tarefas_comentarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id   uuid NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  usuario_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  texto       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 4. Notificações por usuário
CREATE TABLE IF NOT EXISTS tarefas_notificacoes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tarefa_id   uuid REFERENCES tarefas(id) ON DELETE CASCADE,
  tipo        text NOT NULL
                CHECK (tipo IN ('nova_tarefa','status_alterado','comentario','prazo_proximo')),
  mensagem    text NOT NULL,
  lida        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tarefas_status       ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsaveis ON tarefas_responsaveis(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON tarefas_notificacoes(usuario_id, lida);
CREATE INDEX IF NOT EXISTS idx_comentarios_tarefa   ON tarefas_comentarios(tarefa_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tarefas_updated_at
  BEFORE UPDATE ON tarefas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- IMPORTANTE: Habilite Realtime nas tabelas abaixo no painel
-- Supabase → Table Editor → cada tabela → Enable Realtime
-- Ou via SQL:
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE tarefas_notificacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE tarefas;
