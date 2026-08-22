-- ============================================================
-- SACP — Notas por componente (composição de nota do professor)
--
-- Permite que o professor monte a nota do bimestre a partir de
-- componentes livres (ex.: "Prova 1" vale 6, "Trabalho" vale 4).
-- O sistema soma os componentes preenchidos e grava o resultado
-- em notas_boletim, mantendo total compatibilidade com o cálculo
-- de Média Final já existente (src/boletimMath.js).
--
-- Pré-requisito: supabase_contas_multitenancy.sql (usa
-- sacp_coordeno_turma, sacp_my_turma_ids, sacp_aluno_na_minha_turma).
-- ============================================================

-- ======================== 1. Tabelas ========================

CREATE TABLE IF NOT EXISTS public.notas_componentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  disciplina text NOT NULL,
  bimestre smallint NOT NULL CHECK (bimestre BETWEEN 1 AND 4),
  nome text NOT NULL,
  valor_maximo numeric NOT NULL CHECK (valor_maximo > 0),
  ordem integer NOT NULL DEFAULT 0,
  professor_id uuid REFERENCES public.professores(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notas_componentes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.notas_componentes_valores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  componente_id uuid NOT NULL REFERENCES public.notas_componentes(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  valor numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (componente_id, aluno_id)
);

ALTER TABLE public.notas_componentes_valores ENABLE ROW LEVEL SECURITY;

-- ======================== 2. Helper: disciplina do professor logado ========================

CREATE OR REPLACE FUNCTION public.sacp_minha_disciplina()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.disciplina FROM public.professores p WHERE p.user_id = auth.uid() LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.sacp_minha_disciplina() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sacp_minha_disciplina() TO authenticated;

-- ======================== 3. RLS — notas_componentes ========================

DROP POLICY IF EXISTS sacp_notas_componentes_select ON public.notas_componentes;
DROP POLICY IF EXISTS sacp_notas_componentes_insert ON public.notas_componentes;
DROP POLICY IF EXISTS sacp_notas_componentes_update ON public.notas_componentes;
DROP POLICY IF EXISTS sacp_notas_componentes_delete ON public.notas_componentes;

CREATE POLICY sacp_notas_componentes_select ON public.notas_componentes
  FOR SELECT TO authenticated
  USING (
    public.sacp_coordeno_turma(turma_id)
    OR turma_id = ANY (public.sacp_my_turma_ids())
  );

-- Coordenador pode criar componente de qualquer disciplina; professor só na
-- própria disciplina (evita professor de Matemática lançar nota de Português).
CREATE POLICY sacp_notas_componentes_insert ON public.notas_componentes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.sacp_coordeno_turma(turma_id)
    OR (
      turma_id = ANY (public.sacp_my_turma_ids())
      AND disciplina = public.sacp_minha_disciplina()
    )
  );

CREATE POLICY sacp_notas_componentes_update ON public.notas_componentes
  FOR UPDATE TO authenticated
  USING (
    public.sacp_coordeno_turma(turma_id)
    OR (
      turma_id = ANY (public.sacp_my_turma_ids())
      AND disciplina = public.sacp_minha_disciplina()
    )
  )
  WITH CHECK (
    public.sacp_coordeno_turma(turma_id)
    OR (
      turma_id = ANY (public.sacp_my_turma_ids())
      AND disciplina = public.sacp_minha_disciplina()
    )
  );

CREATE POLICY sacp_notas_componentes_delete ON public.notas_componentes
  FOR DELETE TO authenticated
  USING (
    public.sacp_coordeno_turma(turma_id)
    OR (
      turma_id = ANY (public.sacp_my_turma_ids())
      AND disciplina = public.sacp_minha_disciplina()
    )
  );

-- ======================== 4. RLS — notas_componentes_valores ========================

DROP POLICY IF EXISTS sacp_notas_componentes_valores_select ON public.notas_componentes_valores;
DROP POLICY IF EXISTS sacp_notas_componentes_valores_insert ON public.notas_componentes_valores;
DROP POLICY IF EXISTS sacp_notas_componentes_valores_update ON public.notas_componentes_valores;
DROP POLICY IF EXISTS sacp_notas_componentes_valores_delete ON public.notas_componentes_valores;

CREATE POLICY sacp_notas_componentes_valores_select ON public.notas_componentes_valores
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notas_componentes nc
      WHERE nc.id = componente_id
        AND (
          public.sacp_coordeno_turma(nc.turma_id)
          OR nc.turma_id = ANY (public.sacp_my_turma_ids())
        )
    )
  );

CREATE POLICY sacp_notas_componentes_valores_insert ON public.notas_componentes_valores
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notas_componentes nc
      WHERE nc.id = componente_id
        AND (
          public.sacp_coordeno_turma(nc.turma_id)
          OR (
            nc.turma_id = ANY (public.sacp_my_turma_ids())
            AND nc.disciplina = public.sacp_minha_disciplina()
          )
        )
    )
  );

CREATE POLICY sacp_notas_componentes_valores_update ON public.notas_componentes_valores
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notas_componentes nc
      WHERE nc.id = componente_id
        AND (
          public.sacp_coordeno_turma(nc.turma_id)
          OR (
            nc.turma_id = ANY (public.sacp_my_turma_ids())
            AND nc.disciplina = public.sacp_minha_disciplina()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notas_componentes nc
      WHERE nc.id = componente_id
        AND (
          public.sacp_coordeno_turma(nc.turma_id)
          OR (
            nc.turma_id = ANY (public.sacp_my_turma_ids())
            AND nc.disciplina = public.sacp_minha_disciplina()
          )
        )
    )
  );

CREATE POLICY sacp_notas_componentes_valores_delete ON public.notas_componentes_valores
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notas_componentes nc
      WHERE nc.id = componente_id
        AND (
          public.sacp_coordeno_turma(nc.turma_id)
          OR (
            nc.turma_id = ANY (public.sacp_my_turma_ids())
            AND nc.disciplina = public.sacp_minha_disciplina()
          )
        )
    )
  );

-- ======================== 5. Trigger: recalcula notas_boletim automaticamente ========================

CREATE OR REPLACE FUNCTION public.sacp_recalcular_nota_boletim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_componente record;
  v_aluno_id uuid;
  v_soma numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO v_componente FROM public.notas_componentes WHERE id = OLD.componente_id;
    v_aluno_id := OLD.aluno_id;
  ELSE
    SELECT * INTO v_componente FROM public.notas_componentes WHERE id = NEW.componente_id;
    v_aluno_id := NEW.aluno_id;
  END IF;

  IF v_componente IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(ncv.valor), 0)
  INTO v_soma
  FROM public.notas_componentes_valores ncv
  JOIN public.notas_componentes nc ON nc.id = ncv.componente_id
  WHERE ncv.aluno_id = v_aluno_id
    AND nc.turma_id = v_componente.turma_id
    AND nc.disciplina = v_componente.disciplina
    AND nc.bimestre = v_componente.bimestre;

  INSERT INTO public.notas_boletim (aluno_id, disciplina, bimestre, nota)
  VALUES (v_aluno_id, v_componente.disciplina, v_componente.bimestre, v_soma)
  ON CONFLICT (aluno_id, disciplina, bimestre)
  DO UPDATE SET nota = EXCLUDED.nota;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalcular_nota_boletim ON public.notas_componentes_valores;
CREATE TRIGGER trg_recalcular_nota_boletim
  AFTER INSERT OR UPDATE OR DELETE ON public.notas_componentes_valores
  FOR EACH ROW
  EXECUTE FUNCTION public.sacp_recalcular_nota_boletim();

-- Fecha o acesso implícito de PUBLIC/anon à função do gatilho (Supabase
-- concede EXECUTE a anon por padrão em toda função nova).
REVOKE EXECUTE ON FUNCTION public.sacp_recalcular_nota_boletim() FROM PUBLIC, anon;

SELECT 'Notas por componente aplicadas.' AS resultado;
