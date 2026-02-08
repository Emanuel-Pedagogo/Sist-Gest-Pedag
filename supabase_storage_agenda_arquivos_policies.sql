-- ============================================================
-- POLÍTICAS DE STORAGE PARA O BUCKET agenda-arquivos
-- ============================================================
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor > New query)
-- Isso libera upload (INSERT), leitura (SELECT) e exclusão (DELETE) de anexos de eventos.
--
-- Se o bucket ainda não existir: Storage > New bucket > nome: agenda-arquivos (público ou privado, conforme seu uso).
-- ============================================================

-- Remover políticas antigas com o mesmo nome (se existirem)
DROP POLICY IF EXISTS "agenda-arquivos INSERT anon" ON storage.objects;
DROP POLICY IF EXISTS "agenda-arquivos SELECT anon" ON storage.objects;
DROP POLICY IF EXISTS "agenda-arquivos DELETE anon" ON storage.objects;
DROP POLICY IF EXISTS "agenda-arquivos INSERT authenticated" ON storage.objects;
DROP POLICY IF EXISTS "agenda-arquivos SELECT authenticated" ON storage.objects;
DROP POLICY IF EXISTS "agenda-arquivos DELETE authenticated" ON storage.objects;

-- INSERT: permitir upload para o bucket agenda-arquivos (anon = sem login)
CREATE POLICY "agenda-arquivos INSERT anon"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'agenda-arquivos');

-- SELECT: permitir leitura (listar e baixar anexos) para o bucket agenda-arquivos
CREATE POLICY "agenda-arquivos SELECT anon"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'agenda-arquivos');

-- DELETE: permitir exclusão de anexos no bucket agenda-arquivos
CREATE POLICY "agenda-arquivos DELETE anon"
ON storage.objects
FOR DELETE
TO anon
USING (bucket_id = 'agenda-arquivos');

-- INSERT: permitir upload para usuários autenticados (se o app usar login)
CREATE POLICY "agenda-arquivos INSERT authenticated"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agenda-arquivos');

-- SELECT: permitir leitura para usuários autenticados
CREATE POLICY "agenda-arquivos SELECT authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'agenda-arquivos');

-- DELETE: permitir exclusão para usuários autenticados
CREATE POLICY "agenda-arquivos DELETE authenticated"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'agenda-arquivos');

-- Confirma
SELECT 'Políticas do bucket agenda-arquivos criadas.' AS resultado;
