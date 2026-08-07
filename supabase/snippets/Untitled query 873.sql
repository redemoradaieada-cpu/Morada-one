-- =========================================================================
-- EXECUTE ESTE SCRIPT NO SEU BANCO DE DADOS LOCAL (Ex: DBeaver, pgAdmin)
-- =========================================================================

-- Cria a função ajustar_sequencias que reajusta o valor de auto-incremento
-- de todas as tabelas para evitar erros de ID duplicado após sincronizar da nuvem.

CREATE OR REPLACE FUNCTION public.ajustar_sequencias()
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT t.relname AS table_name,
               c.relname AS seq_name,
               a.attname AS column_name
        FROM pg_class t
        JOIN pg_attribute a ON a.attrelid = t.oid
        JOIN pg_depend d ON d.refobjid = t.oid AND d.refobjsubid = a.attnum
        JOIN pg_class c ON c.oid = d.objid
        WHERE t.relkind = 'r' AND c.relkind = 'S'
          AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) LOOP
        EXECUTE format('SELECT setval(''%I'', COALESCE((SELECT MAX(%I) FROM %I), 1))', r.seq_name, r.column_name, r.table_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;