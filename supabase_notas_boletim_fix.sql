-- Cole no SQL Editor do Supabase e execute.
-- Corrige o erro: "a coluna falta da relação public.notas_boletim não existe"

ALTER TABLE public.notas_boletim
  ADD COLUMN IF NOT EXISTS falta smallint DEFAULT 0
  CHECK (falta IS NULL OR falta >= 0);
