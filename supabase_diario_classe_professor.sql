-- ============================================================
-- SACP — Diário de classe para professor
-- Pré-requisitos:
--   1) supabase_professores_user_id.sql
--   2) supabase_professores_rls_papeis.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.diario_classe_frequencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  professor_id uuid REFERENCES public.professores(id) ON DELETE SET NULL,
  data date NOT NULL,
  status text NOT NULL CHECK (status IN ('P', 'F')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (turma_id, aluno_id, data)
);

CREATE INDEX IF NOT EXISTS idx_diario_classe_freq_turma_data
  ON public.diario_classe_frequencia(turma_id, data);

CREATE TABLE IF NOT EXISTS public.diario_classe_conteudos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  professor_id uuid REFERENCES public.professores(id) ON DELETE SET NULL,
  data date NOT NULL,
  disciplina text NOT NULL,
  conteudo_aplicado text NOT NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (turma_id, data, disciplina)
);

CREATE INDEX IF NOT EXISTS idx_diario_classe_conteudos_turma_data
  ON public.diario_classe_conteudos(turma_id, data);

-- Necessário para upsert mensal da frequência oficial pelo diário.
-- Mantém somente um registro por aluno/mês/ano caso já existam duplicados.
DELETE FROM public.frequencia_historico a
USING public.frequencia_historico b
WHERE a.ctid < b.ctid
  AND a.aluno_id = b.aluno_id
  AND a.mes_referencia = b.mes_referencia
  AND a.ano = b.ano;

CREATE UNIQUE INDEX IF NOT EXISTS idx_frequencia_historico_aluno_mes_ano_unique
  ON public.frequencia_historico(aluno_id, mes_referencia, ano);

-- ------------------------- RLS diário -------------------------
ALTER TABLE public.diario_classe_frequencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diario_classe_conteudos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sacp_diario_freq_select ON public.diario_classe_frequencia;
DROP POLICY IF EXISTS sacp_diario_freq_insert ON public.diario_classe_frequencia;
DROP POLICY IF EXISTS sacp_diario_freq_update ON public.diario_classe_frequencia;
DROP POLICY IF EXISTS sacp_diario_freq_delete ON public.diario_classe_frequencia;

CREATE POLICY sacp_diario_freq_select ON public.diario_classe_frequencia
  FOR SELECT TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR turma_id = ANY (public.sacp_my_turma_ids())
  );

CREATE POLICY sacp_diario_freq_insert ON public.diario_classe_frequencia
  FOR INSERT TO authenticated
  WITH CHECK (
    public.sacp_is_coordenador()
    OR (
      turma_id = ANY (public.sacp_my_turma_ids())
      AND professor_id = public.sacp_my_professor_id()
      AND public.sacp_aluno_na_minha_turma(aluno_id)
    )
  );

CREATE POLICY sacp_diario_freq_update ON public.diario_classe_frequencia
  FOR UPDATE TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR turma_id = ANY (public.sacp_my_turma_ids())
  )
  WITH CHECK (
    public.sacp_is_coordenador()
    OR (
      turma_id = ANY (public.sacp_my_turma_ids())
      AND professor_id = public.sacp_my_professor_id()
      AND public.sacp_aluno_na_minha_turma(aluno_id)
    )
  );

CREATE POLICY sacp_diario_freq_delete ON public.diario_classe_frequencia
  FOR DELETE TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR turma_id = ANY (public.sacp_my_turma_ids())
  );

DROP POLICY IF EXISTS sacp_diario_conteudos_select ON public.diario_classe_conteudos;
DROP POLICY IF EXISTS sacp_diario_conteudos_insert ON public.diario_classe_conteudos;
DROP POLICY IF EXISTS sacp_diario_conteudos_update ON public.diario_classe_conteudos;
DROP POLICY IF EXISTS sacp_diario_conteudos_delete ON public.diario_classe_conteudos;

CREATE POLICY sacp_diario_conteudos_select ON public.diario_classe_conteudos
  FOR SELECT TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR turma_id = ANY (public.sacp_my_turma_ids())
  );

CREATE POLICY sacp_diario_conteudos_insert ON public.diario_classe_conteudos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.sacp_is_coordenador()
    OR (
      turma_id = ANY (public.sacp_my_turma_ids())
      AND professor_id = public.sacp_my_professor_id()
    )
  );

CREATE POLICY sacp_diario_conteudos_update ON public.diario_classe_conteudos
  FOR UPDATE TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR turma_id = ANY (public.sacp_my_turma_ids())
  )
  WITH CHECK (
    public.sacp_is_coordenador()
    OR (
      turma_id = ANY (public.sacp_my_turma_ids())
      AND professor_id = public.sacp_my_professor_id()
    )
  );

CREATE POLICY sacp_diario_conteudos_delete ON public.diario_classe_conteudos
  FOR DELETE TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR turma_id = ANY (public.sacp_my_turma_ids())
  );

-- ------------------- RLS frequência oficial -------------------
ALTER TABLE public.frequencia_historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sacp_auth_select ON public.frequencia_historico;
DROP POLICY IF EXISTS sacp_auth_insert ON public.frequencia_historico;
DROP POLICY IF EXISTS sacp_auth_update ON public.frequencia_historico;
DROP POLICY IF EXISTS sacp_auth_delete ON public.frequencia_historico;
DROP POLICY IF EXISTS sacp_frequencia_select ON public.frequencia_historico;
DROP POLICY IF EXISTS sacp_frequencia_insert ON public.frequencia_historico;
DROP POLICY IF EXISTS sacp_frequencia_update ON public.frequencia_historico;
DROP POLICY IF EXISTS sacp_frequencia_delete ON public.frequencia_historico;

CREATE POLICY sacp_frequencia_select ON public.frequencia_historico
  FOR SELECT TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_frequencia_insert ON public.frequencia_historico
  FOR INSERT TO authenticated
  WITH CHECK (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_frequencia_update ON public.frequencia_historico
  FOR UPDATE TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  )
  WITH CHECK (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_frequencia_delete ON public.frequencia_historico
  FOR DELETE TO authenticated
  USING (public.sacp_is_coordenador());

SELECT 'Diário de classe do professor pronto.' AS resultado;
