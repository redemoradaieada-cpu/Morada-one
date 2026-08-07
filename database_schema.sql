-- ============================================================
-- SCRIPT DE BANCO DE DADOS COMPLETO (POSTGRESQL / SUPABASE)
-- ============================================================

-- Nota: Este script assume a existência do schema 'auth' e da tabela 'auth.users'.
-- Se você estiver usando o Supabase Local via Docker (Recomendado), o schema auth já existirá.
-- Se estiver usando um PostgreSQL limpo, crie uma tabela de simulação do auth.users primeiro.

-- ============================================================
-- TABELAS DO MÓDULO PÚBLICO (public)
-- ============================================================

-- 1. Cidades
CREATE TABLE IF NOT EXISTS public.cidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    uf VARCHAR(2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Níveis de Acesso
CREATE TABLE IF NOT EXISTS public.niveis_acesso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    telas_permitidas TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Perfis de Usuários
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(100) NOT NULL,
    nome_completo VARCHAR(100) NOT NULL,
    nivel_acesso_id UUID REFERENCES public.niveis_acesso(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Grupos de Produtos
CREATE TABLE IF NOT EXISTS public.grupos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Produtos
CREATE TABLE IF NOT EXISTS public.produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    codigo_barras VARCHAR(100),
    preco NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    cor VARCHAR(50),
    tamanho VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
    grupo_id INTEGER REFERENCES public.grupos(id) ON DELETE SET NULL,
    quantidade INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Histórico de Acerto de Caixas
CREATE TABLE IF NOT EXISTS public.acertos_caixa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setor VARCHAR(50) NOT NULL,
    valor_dinheiro NUMERIC(10,2) DEFAULT 0.00,
    valor_pix NUMERIC(10,2) DEFAULT 0.00,
    valor_credito NUMERIC(10,2) DEFAULT 0.00,
    valor_debito NUMERIC(10,2) DEFAULT 0.00,
    total_transferido NUMERIC(10,2) DEFAULT 0.00,
    responsavel_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Vendas
CREATE TABLE IF NOT EXISTS public.vendas (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL DEFAULT 'venda',
    valor_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    doador VARCHAR(100),
    beneficiario VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'finalizada',
    forma_pagamento TEXT,
    cliente_nome_praca VARCHAR(255),
    senha_pedido_praca VARCHAR(50),
    status_cozinha VARCHAR(20) DEFAULT 'pendente',
    acerto_id UUID REFERENCES public.acertos_caixa(id) ON DELETE SET NULL
);

-- 8. Itens de Venda
CREATE TABLE IF NOT EXISTS public.itens_venda (
    id SERIAL PRIMARY KEY,
    venda_id INTEGER REFERENCES public.vendas(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES public.produtos(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    quantidade INTEGER NOT NULL
);

-- 9. Reservas de Produtos
CREATE TABLE IF NOT EXISTS public.reservas (
    id SERIAL PRIMARY KEY,
    cliente_nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    telefone VARCHAR(20),
    produto_id INTEGER REFERENCES public.produtos(id) ON DELETE CASCADE,
    comprovante_url TEXT,
    status_pagamento VARCHAR(20) DEFAULT 'Pendente',
    status_entrega VARCHAR(20) DEFAULT 'Pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assinatura_url TEXT,
    quantidade INTEGER NOT NULL DEFAULT 1,
    venda_id INTEGER REFERENCES public.vendas(id) ON DELETE SET NULL
);

-- 10. Tipos de Inscrição
CREATE TABLE IF NOT EXISTS public.tipos_inscricao (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    limite_vagas INTEGER,
    valor NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    data_validade DATE,
    inclui_hospedagem BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Quartos / Alojamentos
CREATE TABLE IF NOT EXISTS public.quartos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- 'Masculino', 'Feminino', 'Misto'
    capacidade INTEGER NOT NULL,
    lider_inscrito_id UUID, -- Chave estrangeira será configurada após criar inscricoes_hospedagem
    ala_andar VARCHAR(100),
    status VARCHAR(20) DEFAULT 'disponivel',
    categoria VARCHAR(50) DEFAULT 'Alojamento',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Inscrições / Hospedagem
CREATE TABLE IF NOT EXISTS public.inscricoes_hospedagem (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    data_nascimento DATE,
    telefone VARCHAR(20),
    email VARCHAR(100),
    nome_pastor VARCHAR(100),
    regional VARCHAR(50),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    forma_pagamento VARCHAR(50),
    condicao_pagamento VARCHAR(20) DEFAULT 'a_vista',
    qtd_parcelas INTEGER DEFAULT 1,
    tipo_inscricao_id INTEGER REFERENCES public.tipos_inscricao(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_checkin TIMESTAMP WITH TIME ZONE,
    sexo VARCHAR(20),
    quarto_id INTEGER REFERENCES public.quartos(id) ON DELETE SET NULL,
    cidade_codigo VARCHAR(20),
    acerto_id UUID REFERENCES public.acertos_caixa(id) ON DELETE SET NULL
);

-- Adicionar a referência circular na tabela de quartos
ALTER TABLE public.quartos 
    ADD CONSTRAINT quartos_lider_inscrito_id_fkey 
    FOREIGN KEY (lider_inscrito_id) REFERENCES public.inscricoes_hospedagem(id) ON DELETE SET NULL;

-- 12.5 Pré-Inscrições (Site Público)
CREATE TABLE IF NOT EXISTS public.pre_inscricoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    data_nascimento DATE,
    telefone VARCHAR(20),
    email VARCHAR(100),
    nome_pastor VARCHAR(100),
    regional VARCHAR(50),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    tipo_inscricao_id INTEGER REFERENCES public.tipos_inscricao(id) ON DELETE SET NULL,
    sexo VARCHAR(20),
    cidade_codigo VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Lançamentos Financeiros (Fluxo de Caixa)
CREATE TABLE IF NOT EXISTS public.lancamentos_financeiros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    categoria VARCHAR(50) NOT NULL,
    descricao TEXT,
    valor NUMERIC(10,2) NOT NULL,
    data_lancamento DATE NOT NULL,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Tarefas
CREATE TABLE IF NOT EXISTS public.tarefas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta','urgente')),
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_progresso','em_revisao','concluida','cancelada')),
    criado_por UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    data_inicio DATE,
    data_vencimento DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Responsáveis por Tarefa
CREATE TABLE IF NOT EXISTS public.tarefas_responsaveis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarefa_id UUID REFERENCES public.tarefas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE,
    UNIQUE (tarefa_id, usuario_id)
);

-- 16. Comentários de Tarefa
CREATE TABLE IF NOT EXISTS public.tarefas_comentarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarefa_id UUID REFERENCES public.tarefas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    texto TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Notificações de Tarefa
CREATE TABLE IF NOT EXISTS public.tarefas_notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE,
    tarefa_id UUID REFERENCES public.tarefas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('nova_tarefa','status_alterado','comentario','prazo_proximo')),
    mensagem TEXT NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. Sessões de Chamada
CREATE TABLE IF NOT EXISTS public.sessoes_chamada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'ativa'
);

-- 19. Chamadas Realizadas
CREATE TABLE IF NOT EXISTS public.chamadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id UUID REFERENCES public.sessoes_chamada(id) ON DELETE CASCADE,
    quarto_id INTEGER REFERENCES public.quartos(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    iniciada_em TIMESTAMP WITH TIME ZONE,
    concluida_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. Itens de Chamada (Presença / Ausência)
CREATE TABLE IF NOT EXISTS public.chamada_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chamada_id UUID REFERENCES public.chamadas(id) ON DELETE CASCADE,
    inscricao_id UUID REFERENCES public.inscricoes_hospedagem(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    observacao TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sincronizado_nuvem BOOLEAN DEFAULT FALSE,
    sincronizado_local BOOLEAN DEFAULT FALSE
);

-- 21. Parcelas de Inscrições (Contas a Receber)
CREATE TABLE IF NOT EXISTS public.inscricao_parcelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo SERIAL,
    inscricao_id UUID REFERENCES public.inscricoes_hospedagem(id) ON DELETE CASCADE,
    descricao VARCHAR(150) NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    data_vencimento DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago')),
    data_pagamento TIMESTAMP WITH TIME ZONE,
    acerto_id UUID REFERENCES public.acertos_caixa(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sincronizado_nuvem BOOLEAN DEFAULT FALSE,
    sincronizado_local BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- ÍNDICES DE PERFORMANCE E TRIGGERS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tarefas_status       ON public.tarefas(status);
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
ALTER TABLE public.pre_inscricoes ENABLE ROW LEVEL SECURITY;
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

-- ============================================================
-- COLUNAS PADRÃO (Adicionadas dinamicamente)
-- ============================================================
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
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS sincronizado_nuvem BOOLEAN DEFAULT false', t);
    END LOOP;
END $$;

-- ============================================================
-- GRANTS DE PERMISSÃO (obrigatório para Supabase local/cloud)
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- ============================================================
-- ARQUITETURA MULTI-EVENTO
-- ============================================================

-- 1. Criação da tabela de Eventos
CREATE TABLE IF NOT EXISTS public.eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela associativa entre Perfis (usuários) e Eventos
CREATE TABLE IF NOT EXISTS public.perfil_eventos (
    perfil_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE,
    evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (perfil_id, evento_id)
);

-- 3. Adicionar evento_id em todas as tabelas de negócio do sistema
ALTER TABLE public.grupos ADD COLUMN evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE;
ALTER TABLE public.produtos ADD COLUMN evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE;
ALTER TABLE public.acertos_caixa ADD COLUMN evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE;
ALTER TABLE public.vendas ADD COLUMN evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE;
ALTER TABLE public.reservas ADD COLUMN evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE;
ALTER TABLE public.tipos_inscricao ADD COLUMN evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE;
ALTER TABLE public.quartos ADD COLUMN evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE;
ALTER TABLE public.inscricoes_hospedagem ADD COLUMN evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE;
ALTER TABLE public.pre_inscricoes ADD COLUMN evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE;
ALTER TABLE public.lancamentos_financeiros ADD COLUMN evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE;
ALTER TABLE public.tarefas ADD COLUMN evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE;
ALTER TABLE public.sessoes_chamada ADD COLUMN evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE;
ALTER TABLE public.chamadas ADD COLUMN evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE;
ALTER TABLE public.inscricao_parcelas ADD COLUMN evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE;
