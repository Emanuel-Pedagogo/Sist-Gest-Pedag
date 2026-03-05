-- Adiciona colunas de Recuperação Semestral (RS1 e RS2) na tabela notas_boletim
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor)

ALTER TABLE public.notas_boletim
  ADD COLUMN IF NOT EXISTS rs1 numeric(4,2) CHECK (rs1 IS NULL OR (rs1 >= 0 AND rs1 <= 10));

ALTER TABLE public.notas_boletim
  ADD COLUMN IF NOT EXISTS rs2 numeric(4,2) CHECK (rs2 IS NULL OR (rs2 >= 0 AND rs2 <= 10));

COMMENT ON COLUMN public.notas_boletim.rs1 IS 'Recuperação Semestral 1 (após 2º bimestre)';
COMMENT ON COLUMN public.notas_boletim.rs2 IS 'Recuperação Semestral 2 (após 4º bimestre)';
