-- ============================================================
-- CRIAR TABELA professores (rode tudo de uma vez no SQL Editor)
-- ============================================================
-- Supabase: Table Editor > SQL Editor > New query > cole este arquivo > Run
-- Depois dê refresh na lista de tabelas (ícone de atualizar) se não aparecer.
-- ============================================================

-- Remove a tabela se já existir (CUIDADO: apaga dados). Use só se quiser recomeçar.
-- DROP TABLE IF EXISTS public.professores;

-- Cria a tabela
CREATE TABLE IF NOT EXISTS public.professores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL,
  ano_letivo integer NOT NULL,
  nome text NOT NULL,
  disciplina text NOT NULL,
  -- IDs das turmas que o professor leciona (da tabela public.turmas)
  turmas_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Opcional: vincular à tabela escolas (descomente se a tabela escolas existir)
-- ALTER TABLE public.professores
--   ADD CONSTRAINT fk_professores_escola
--   FOREIGN KEY (escola_id) REFERENCES public.escolas(id) ON DELETE CASCADE;

-- Índices
CREATE INDEX IF NOT EXISTS idx_professores_escola_ano ON public.professores(escola_id, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_professores_nome ON public.professores(nome);
CREATE INDEX IF NOT EXISTS idx_professores_disciplina ON public.professores(disciplina);
-- Para filtrar por turmas (ex.: WHERE turmas_ids @> ARRAY['...']::uuid[])
CREATE INDEX IF NOT EXISTS idx_professores_turmas_ids_gin ON public.professores USING GIN (turmas_ids);

-- ============================================================
-- (Opcional) RLS / Policies
-- ============================================================
-- Se seu app usa login, o recomendado é habilitar RLS e criar policies.
-- Se você quiser deixar aberto (sem RLS), NÃO execute as linhas abaixo.
--
-- ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "professores SELECT anon" ON public.professores;
-- DROP POLICY IF EXISTS "professores INSERT anon" ON public.professores;
-- DROP POLICY IF EXISTS "professores UPDATE anon" ON public.professores;
-- DROP POLICY IF EXISTS "professores DELETE anon" ON public.professores;
--
-- DROP POLICY IF EXISTS "professores SELECT authenticated" ON public.professores;
-- DROP POLICY IF EXISTS "professores INSERT authenticated" ON public.professores;
-- DROP POLICY IF EXISTS "professores UPDATE authenticated" ON public.professores;
-- DROP POLICY IF EXISTS "professores DELETE authenticated" ON public.professores;
--
-- CREATE POLICY "professores SELECT anon"
-- ON public.professores
-- FOR SELECT
-- TO anon
-- USING (true);
--
-- CREATE POLICY "professores INSERT anon"
-- ON public.professores
-- FOR INSERT
-- TO anon
-- WITH CHECK (true);
--
-- CREATE POLICY "professores UPDATE anon"
-- ON public.professores
-- FOR UPDATE
-- TO anon
-- USING (true)
-- WITH CHECK (true);
--
-- CREATE POLICY "professores DELETE anon"
-- ON public.professores
-- FOR DELETE
-- TO anon
-- USING (true);
--
-- CREATE POLICY "professores SELECT authenticated"
-- ON public.professores
-- FOR SELECT
-- TO authenticated
-- USING (true);
--
-- CREATE POLICY "professores INSERT authenticated"
-- ON public.professores
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (true);
--
-- CREATE POLICY "professores UPDATE authenticated"
-- ON public.professores
-- FOR UPDATE
-- TO authenticated
-- USING (true)
-- WITH CHECK (true);
--
-- CREATE POLICY "professores DELETE authenticated"
-- ON public.professores
-- FOR DELETE
-- TO authenticated
-- USING (true);

-- Confirma que a tabela foi criada (deve retornar 1 linha)
SELECT 'Tabela professores criada com sucesso.' AS resultado;

