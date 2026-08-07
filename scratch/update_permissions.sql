UPDATE public.niveis_acesso
SET telas_permitidas = array_append(telas_permitidas, 'gerenciador-eventos')
WHERE 'inscricoes-hospedagem' = ANY(telas_permitidas)
  AND NOT ('gerenciador-eventos' = ANY(telas_permitidas));
