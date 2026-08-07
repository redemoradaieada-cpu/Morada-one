-- Habilitar RLS (se não estiver) e dar permissão de Leitura para todos
ALTER TABLE "public"."tipos_inscricao" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON "public"."tipos_inscricao"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

-- Permissões de Inserir, Atualizar e Deletar
CREATE POLICY "Enable insert for authenticated users only" ON "public"."tipos_inscricao"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON "public"."tipos_inscricao"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only" ON "public"."tipos_inscricao"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (true);