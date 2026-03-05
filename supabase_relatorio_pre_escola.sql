-- Tabela para registro de avaliação e acompanhamento (Pré I e Pré II)
-- Um relatório por bimestre por aluno. Execute no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS public.relatorio_avaliacao_pre (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  bimestre smallint NOT NULL CHECK (bimestre >= 1 AND bimestre <= 4),
  relatorio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (aluno_id, bimestre)
);

CREATE INDEX IF NOT EXISTS idx_relatorio_avaliacao_pre_aluno_id ON public.relatorio_avaliacao_pre(aluno_id);

COMMENT ON TABLE public.relatorio_avaliacao_pre IS 'Registro de avaliação e acompanhamento por bimestre para Pré I e Pré II';

-- Trigger updated_at (opcional, se já tiver a função)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS relatorio_avaliacao_pre_updated_at ON public.relatorio_avaliacao_pre;
CREATE TRIGGER relatorio_avaliacao_pre_updated_at
  BEFORE UPDATE ON public.relatorio_avaliacao_pre
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();
