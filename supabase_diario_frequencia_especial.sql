-- Diário de frequência exclusivo de turmas especiais (participação voluntária).
-- NÃO atualiza alunos.frequencia nem frequencia_historico — apenas acompanhamento da turma especial.
CREATE TABLE IF NOT EXISTS public.diario_frequencia_especial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  data date NOT NULL,
  status text NOT NULL CHECK (status IN ('P', 'F')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (turma_id, aluno_id, data)
);

CREATE INDEX IF NOT EXISTS idx_diario_freq_esp_turma_data
  ON public.diario_frequencia_especial(turma_id, data);

ALTER TABLE public.diario_frequencia_especial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diario_freq_esp select" ON public.diario_frequencia_especial;
DROP POLICY IF EXISTS "diario_freq_esp insert" ON public.diario_frequencia_especial;
DROP POLICY IF EXISTS "diario_freq_esp update" ON public.diario_frequencia_especial;
DROP POLICY IF EXISTS "diario_freq_esp delete" ON public.diario_frequencia_especial;

CREATE POLICY "diario_freq_esp select"
  ON public.diario_frequencia_especial FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "diario_freq_esp insert"
  ON public.diario_frequencia_especial FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "diario_freq_esp update"
  ON public.diario_frequencia_especial FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "diario_freq_esp delete"
  ON public.diario_frequencia_especial FOR DELETE TO anon, authenticated USING (true);

SELECT 'Tabela diario_frequencia_especial criada.' AS resultado;
