-- Coluna explícita para turmas especiais (Libras, AEE, etc.)
ALTER TABLE public.turmas
  ADD COLUMN IF NOT EXISTS turma_especial boolean NOT NULL DEFAULT false;

SELECT 'Coluna turmas.turma_especial adicionada.' AS resultado;
