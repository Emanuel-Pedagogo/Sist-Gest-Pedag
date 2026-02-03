-- Tabela notas_boletim: notas e faltas por disciplina e bimestre por aluno
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor)

-- CORREÇÃO: se der erro "coluna falta não existe", execute APENAS a linha abaixo e rode de novo:
-- ALTER TABLE public.notas_boletim ADD COLUMN IF NOT EXISTS falta smallint DEFAULT 0 CHECK (falta IS NULL OR falta >= 0);

-- Cria a tabela (se a tabela alunos já existir no schema public)
CREATE TABLE IF NOT EXISTS public.notas_boletim (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  disciplina text NOT NULL,
  bimestre smallint NOT NULL CHECK (bimestre >= 1 AND bimestre <= 4),
  nota numeric(4,2) CHECK (nota IS NULL OR (nota >= 0 AND nota <= 10)),
  falta smallint DEFAULT 0 CHECK (falta IS NULL OR falta >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (aluno_id, disciplina, bimestre)
);

-- Índice para buscas por aluno (usado no BoletimView)
CREATE INDEX IF NOT EXISTS idx_notas_boletim_aluno_id ON public.notas_boletim(aluno_id);

-- Comentários nas colunas (opcional)
COMMENT ON TABLE public.notas_boletim IS 'Notas e faltas por disciplina e bimestre (boletim escolar)';
COMMENT ON COLUMN public.notas_boletim.nota IS 'Nota do bimestre (0 a 10). NULL = não lançada';
COMMENT ON COLUMN public.notas_boletim.falta IS 'Número de faltas no bimestre';

-- Atualizar updated_at automaticamente (opcional)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notas_boletim_updated_at ON public.notas_boletim;
CREATE TRIGGER notas_boletim_updated_at
  BEFORE UPDATE ON public.notas_boletim
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

-- Habilitar RLS (Row Level Security) se você usar no Supabase
-- ALTER TABLE public.notas_boletim ENABLE ROW LEVEL SECURITY;
-- Depois crie políticas conforme seu auth (ex: permitir select/insert/update/delete para usuários autenticados).
