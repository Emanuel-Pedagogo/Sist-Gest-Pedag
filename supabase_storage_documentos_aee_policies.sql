-- ============================================================
-- POLÍTICAS DE STORAGE PARA O BUCKET documentos-aee
-- ============================================================
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor > New query)
-- Isso libera upload (INSERT), leitura (SELECT) e exclusão (DELETE) de documentos AEE.
-- ============================================================

-- Remover políticas antigas com o mesmo nome (se existirem)
DROP POLICY IF EXISTS "documentos-aee INSERT anon" ON storage.objects;
DROP POLICY IF EXISTS "documentos-aee SELECT anon" ON storage.objects;
DROP POLICY IF EXISTS "documentos-aee DELETE anon" ON storage.objects;
DROP POLICY IF EXISTS "documentos-aee INSERT authenticated" ON storage.objects;
DROP POLICY IF EXISTS "documentos-aee SELECT authenticated" ON storage.objects;
DROP POLICY IF EXISTS "documentos-aee DELETE authenticated" ON storage.objects;

-- INSERT: permitir upload para o bucket documentos-aee (anon = sem login)
CREATE POLICY "documentos-aee INSERT anon"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'documentos-aee');

-- SELECT: permitir leitura (listar e baixar documentos) para o bucket documentos-aee
CREATE POLICY "documentos-aee SELECT anon"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'documentos-aee');

-- DELETE: permitir exclusão de documentos no bucket documentos-aee
CREATE POLICY "documentos-aee DELETE anon"
ON storage.objects
FOR DELETE
TO anon
USING (bucket_id = 'documentos-aee');

-- INSERT: permitir upload para usuários autenticados (se o app usar login)
CREATE POLICY "documentos-aee INSERT authenticated"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos-aee');

-- SELECT: permitir leitura para usuários autenticados
CREATE POLICY "documentos-aee SELECT authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documentos-aee');

-- DELETE: permitir exclusão para usuários autenticados
CREATE POLICY "documentos-aee DELETE authenticated"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documentos-aee');

-- Confirma
SELECT 'Políticas do bucket documentos-aee criadas.' AS resultado;
