-- ============================================================
-- Vínculos aluno ↔ turma especial (cadastro único do aluno)
-- Rode no SQL Editor do Supabase.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.alunos_turmas_especiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (aluno_id, turma_id)
);

CREATE INDEX IF NOT EXISTS idx_alunos_turmas_especiais_turma
  ON public.alunos_turmas_especiais(turma_id);

CREATE INDEX IF NOT EXISTS idx_alunos_turmas_especiais_aluno
  ON public.alunos_turmas_especiais(aluno_id);

ALTER TABLE public.alunos_turmas_especiais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alunos_turmas_especiais select anon" ON public.alunos_turmas_especiais;
DROP POLICY IF EXISTS "alunos_turmas_especiais insert anon" ON public.alunos_turmas_especiais;
DROP POLICY IF EXISTS "alunos_turmas_especiais delete anon" ON public.alunos_turmas_especiais;

CREATE POLICY "alunos_turmas_especiais select anon"
  ON public.alunos_turmas_especiais FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "alunos_turmas_especiais insert anon"
  ON public.alunos_turmas_especiais FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "alunos_turmas_especiais delete anon"
  ON public.alunos_turmas_especiais FOR DELETE TO anon, authenticated USING (true);

SELECT 'Tabela alunos_turmas_especiais criada.' AS resultado;
