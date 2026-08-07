-- =========================================================================
-- SCRIPT DE MIGRAÇÃO PARA MÓDULO HÍBRIDO (AUTO-INSCRIÇÃO E SEGURANÇA)
-- COPIE E EXECUTE ESTE SCRIPT NO EDITOR SQL DO SUPABASE (LOCAL E NUVEM)
-- =========================================================================

-- 1. Criar a tabela de Pré-Inscrições (Self-Service)
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

-- Habilitar RLS na tabela de Pré-Inscrições
ALTER TABLE public.pre_inscricoes ENABLE ROW LEVEL SECURITY;

-- Regra na Nuvem: Permitir que usuários anônimos preencham o formulário
DROP POLICY IF EXISTS "Anon insert pre_inscricoes" ON public.pre_inscricoes;
CREATE POLICY "Anon insert pre_inscricoes" ON public.pre_inscricoes 
    FOR INSERT TO anon WITH CHECK (true);

-- Regra Geral: Permitir acesso completo a usuários logados (como o sincronizador)
DROP POLICY IF EXISTS "Auth total pre_inscricoes" ON public.pre_inscricoes;
CREATE POLICY "Auth total pre_inscricoes" ON public.pre_inscricoes 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 2. Adicionar colunas de controle de sincronização em lote
DO $$
DECLARE
    t TEXT;
    tabelas TEXT[] := ARRAY[
        'grupos', 'produtos', 'vendas', 'itens_venda', 'reservas', 
        'tipos_inscricao', 'quartos', 'inscricoes_hospedagem', 
        'lancamentos_financeiros', 'acertos_caixa', 'perfis', 
        'niveis_acesso', 'sessoes_chamada', 'chamadas'
    ];
BEGIN
    FOREACH t IN ARRAY tabelas
    LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS sincronizado_nuvem BOOLEAN DEFAULT FALSE;', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS sincronizado_local BOOLEAN DEFAULT FALSE;', t);
    END LOOP;
END $$;


-- 3. Criar função RPC para reajustar sequências de IDs no banco local
-- (Execute este comando no SQL Editor do banco LOCAL)
CREATE OR REPLACE FUNCTION public.ajustar_sequencias()
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND column_default LIKE 'nextval%'
    LOOP
        EXECUTE format('SELECT setval(pg_get_serial_sequence(%L, %L), COALESCE(MAX(%I), 1)) FROM %I', 
            r.table_name, r.column_name, r.column_name, r.table_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
