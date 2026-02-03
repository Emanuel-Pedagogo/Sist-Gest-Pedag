-- ============================================================
-- CRIAR TABELA notas_boletim (rode tudo de uma vez no SQL Editor)
-- ============================================================
-- Supabase: Table Editor > SQL Editor > New query > cole este arquivo > Run
-- Depois dê refresh na lista de tabelas (ícone de atualizar) se não aparecer.
-- ============================================================

-- Remove a tabela se já existir (CUIDADO: apaga dados). Use só se quiser recomeçar.
-- DROP TABLE IF EXISTS public.notas_boletim;

-- Cria a tabela (sem FK para alunos, para não falhar se alunos não existir)
CREATE TABLE IF NOT EXISTS public.notas_boletim (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL,
  disciplina text NOT NULL,
  bimestre smallint NOT NULL CHECK (bimestre >= 1 AND bimestre <= 4),
  nota numeric(4,2) CHECK (nota IS NULL OR (nota >= 0 AND nota <= 10)),
  falta smallint DEFAULT 0 CHECK (falta IS NULL OR falta >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (aluno_id, disciplina, bimestre)
);

-- Opcional: vincular à tabela alunos (descomente se a tabela alunos existir)
-- ALTER TABLE public.notas_boletim
--   ADD CONSTRAINT fk_notas_boletim_aluno
--   FOREIGN KEY (aluno_id) REFERENCES public.alunos(id) ON DELETE CASCADE;

-- Índice para buscas por aluno
CREATE INDEX IF NOT EXISTS idx_notas_boletim_aluno_id ON public.notas_boletim(aluno_id);

-- Confirma que a tabela foi criada (deve retornar 1 linha)
SELECT 'Tabela notas_boletim criada com sucesso.' AS resultado;
