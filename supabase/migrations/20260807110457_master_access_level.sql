DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.niveis_acesso WHERE nome ILIKE 'master') THEN
        INSERT INTO public.niveis_acesso (nome, telas_permitidas)
        VALUES (
            'Master',
            ARRAY[
                'estoque', 'cadastro', 'cadastro-quartos', 'inscricoes', 'grupos', 
                'cadastro-cidades', 'pdv', 'reservas', 'checkin', 'painel-cozinha', 
                'painel-cliente', 'inscricoes-hospedagem', 'gerenciador-hospedagem', 
                'chamadas', 'usuarios', 'niveis', 'tarefas-ver', 'tarefas-criar', 
                'controle-ofertas', 'relatorio-financeiro', 'contas-receber'
            ]
        );
    ELSE
        UPDATE public.niveis_acesso 
        SET telas_permitidas = ARRAY[
            'estoque', 'cadastro', 'cadastro-quartos', 'inscricoes', 'grupos', 
            'cadastro-cidades', 'pdv', 'reservas', 'checkin', 'painel-cozinha', 
            'painel-cliente', 'inscricoes-hospedagem', 'gerenciador-hospedagem', 
            'chamadas', 'usuarios', 'niveis', 'tarefas-ver', 'tarefas-criar', 
            'controle-ofertas', 'relatorio-financeiro', 'contas-receber'
        ]
        WHERE nome ILIKE 'master';
    END IF;
END
$$;
