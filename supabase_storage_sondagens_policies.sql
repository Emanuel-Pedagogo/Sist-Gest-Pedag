-- ============================================================
-- POLÍTICAS DE STORAGE PARA O BUCKET sondagens-anexos
-- ============================================================
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor > New query)
-- Isso libera upload (INSERT), substituição (UPDATE/upsert), leitura (SELECT) e exclusão (DELETE) de foto, áudio e arquivos (PDF/Word).
-- ============================================================

-- Remover políticas antigas com o mesmo nome (se existirem)
DROP POLICY IF EXISTS "sondagens-anexos INSERT anon" ON storage.objects;
DROP POLICY IF EXISTS "sondagens-anexos SELECT anon" ON storage.objects;
DROP POLICY IF EXISTS "sondagens-anexos UPDATE anon" ON storage.objects;
DROP POLICY IF EXISTS "sondagens-anexos DELETE anon" ON storage.objects;
DROP POLICY IF EXISTS "sondagens-anexos INSERT authenticated" ON storage.objects;
DROP POLICY IF EXISTS "sondagens-anexos SELECT authenticated" ON storage.objects;
DROP POLICY IF EXISTS "sondagens-anexos UPDATE authenticated" ON storage.objects;
DROP POLICY IF EXISTS "sondagens-anexos DELETE authenticated" ON storage.objects;

-- INSERT: permitir upload para o bucket sondagens-anexos (anon = sem login)
CREATE POLICY "sondagens-anexos INSERT anon"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'sondagens-anexos');

-- UPDATE: permitir substituir arquivo (upsert) ao editar sondagem
CREATE POLICY "sondagens-anexos UPDATE anon"
ON storage.objects
FOR UPDATE
TO anon
USING (bucket_id = 'sondagens-anexos')
WITH CHECK (bucket_id = 'sondagens-anexos');

-- SELECT: permitir leitura (ver/abrir foto, áudio e arquivos) para o bucket sondagens-anexos
CREATE POLICY "sondagens-anexos SELECT anon"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'sondagens-anexos');

-- DELETE: permitir exclusão de anexos no bucket sondagens-anexos
CREATE POLICY "sondagens-anexos DELETE anon"
ON storage.objects
FOR DELETE
TO anon
USING (bucket_id = 'sondagens-anexos');

-- INSERT: permitir upload para usuários autenticados (se o app usar login)
CREATE POLICY "sondagens-anexos INSERT authenticated"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sondagens-anexos');

-- UPDATE: permitir substituir arquivo (upsert) para usuários autenticados
CREATE POLICY "sondagens-anexos UPDATE authenticated"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'sondagens-anexos')
WITH CHECK (bucket_id = 'sondagens-anexos');

-- SELECT: permitir leitura para usuários autenticados
CREATE POLICY "sondagens-anexos SELECT authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'sondagens-anexos');

-- DELETE: permitir exclusão para usuários autenticados
CREATE POLICY "sondagens-anexos DELETE authenticated"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'sondagens-anexos');

-- Confirma
SELECT 'Políticas do bucket sondagens-anexos criadas (INSERT, UPDATE, SELECT, DELETE).' AS resultado;
