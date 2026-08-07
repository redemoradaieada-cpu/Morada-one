-- Migração: Arquitetura Multi-Evento

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

-- 4. Criar um evento inicial por padrão
INSERT INTO public.eventos (nome, status) VALUES ('Acampamento Inicial', 'ativo');

-- Notificar o PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
