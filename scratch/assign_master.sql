DO $$
DECLARE
    v_master_id UUID;
    v_perfil_id UUID;
    v_evento_id UUID;
    v_email VARCHAR := 'marcusueg@gmail.com';
BEGIN
    -- Obter o ID do nivel master
    SELECT id INTO v_master_id FROM public.niveis_acesso WHERE nome ILIKE 'master' LIMIT 1;
    
    -- Obter o evento ativo (ou o primeiro)
    SELECT id INTO v_evento_id FROM public.eventos WHERE status = 'ativo' LIMIT 1;
    
    -- Tenta encontrar o usuário na auth.users
    SELECT id INTO v_perfil_id FROM auth.users WHERE email = v_email LIMIT 1;
    
    -- Se o usuario nao existe em auth.users, cria
    IF v_perfil_id IS NULL THEN
        v_perfil_id := gen_random_uuid();
        
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, 
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            v_perfil_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email, crypt('123456', gen_salt('bf')),
            now(), '{"provider":"email","providers":["email"]}', '{"name":"Marcus"}', now(), now()
        );
        
        INSERT INTO auth.identities (
            id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_perfil_id, v_perfil_id::text, 
            jsonb_build_object('sub', v_perfil_id, 'email', v_email, 'email_verified', true), 
            'email', now(), now(), now()
        );
    END IF;

    -- Garantir existencia no public.perfis
    IF NOT EXISTS (SELECT 1 FROM public.perfis WHERE id = v_perfil_id) THEN
        INSERT INTO public.perfis (id, email, nome_completo, nivel_acesso_id)
        VALUES (v_perfil_id, v_email, 'Marcus', v_master_id);
    ELSE
        UPDATE public.perfis SET nivel_acesso_id = v_master_id WHERE id = v_perfil_id;
    END IF;
    
    -- Inserir no perfil_eventos
    IF v_evento_id IS NOT NULL THEN
        INSERT INTO public.perfil_eventos (perfil_id, evento_id) 
        VALUES (v_perfil_id, v_evento_id)
        ON CONFLICT DO NOTHING;
    END IF;
END
$$;
