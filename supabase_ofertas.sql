-- ============================================================
-- MÓDULO FINANCEIRO — SQL para colar no Editor SQL do Supabase
-- ============================================================

-- 1. Criação da tabela de ofertas
CREATE TABLE IF NOT EXISTS ofertas_culto (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_culto      date NOT NULL,
  periodo         text NOT NULL CHECK (periodo IN ('Manhã', 'Tarde', 'Noite')),
  valor_total     numeric(10,2) NOT NULL DEFAULT 0.00,
  observacao      text,
  criado_por      uuid REFERENCES perfis(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. Índices para otimizar pesquisas
CREATE INDEX IF NOT EXISTS idx_ofertas_data ON ofertas_culto(data_culto);
CREATE INDEX IF NOT EXISTS idx_ofertas_periodo ON ofertas_culto(periodo);

-- 3. Trigger para updated_at automático
CREATE TRIGGER ofertas_culto_updated_at
  BEFORE UPDATE ON ofertas_culto
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Habilitar segurança em nível de linha (RLS)
ALTER TABLE ofertas_culto ENABLE ROW LEVEL SECURITY;

-- 5. Criar política permitindo acesso aos usuários autenticados
DROP POLICY IF EXISTS "Acesso total para autenticados em ofertas_culto" ON ofertas_culto;
CREATE POLICY "Acesso total para autenticados em ofertas_culto" 
ON ofertas_culto FOR ALL TO authenticated USING (true) WITH CHECK (true);
