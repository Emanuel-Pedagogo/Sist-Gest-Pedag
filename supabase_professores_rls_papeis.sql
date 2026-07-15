-- ============================================================
-- SACP — RLS por papel (coordenador vs professor)
-- Pré-requisitos:
--   1) supabase_professores_user_id.sql
--   2) Preferível: supabase_piloto_seguranca.sql já aplicado
--      (authenticated-only; sem anon).
--
-- Modelo:
--   - Coordenador = usuário autenticado SEM registro em professores.user_id
--   - Professor   = usuário com professores.user_id = auth.uid()
-- ============================================================

-- Helpers (SECURITY DEFINER para evitar recursão em policies)
CREATE OR REPLACE FUNCTION public.sacp_is_professor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.professores p WHERE p.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.sacp_is_coordenador()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND NOT public.sacp_is_professor();
$$;

CREATE OR REPLACE FUNCTION public.sacp_my_turma_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.turmas_ids FROM public.professores p WHERE p.user_id = auth.uid() LIMIT 1),
    '{}'::uuid[]
  );
$$;

CREATE OR REPLACE FUNCTION public.sacp_my_escola_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.escola_id FROM public.professores p WHERE p.user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.sacp_my_professor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id FROM public.professores p WHERE p.user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.sacp_aluno_na_minha_turma(p_aluno_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.alunos a
    WHERE a.id = p_aluno_id
      AND a.turma_id = ANY (public.sacp_my_turma_ids())
  );
$$;

GRANT EXECUTE ON FUNCTION public.sacp_is_professor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sacp_is_coordenador() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sacp_my_turma_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sacp_my_escola_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sacp_my_professor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sacp_aluno_na_minha_turma(uuid) TO authenticated;

-- ------------------------------------------------------------
-- Helper interno: remove policies genéricas do piloto e aplica novas
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._sacp_drop_auth_crud(p_table text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS sacp_auth_select ON public.%I', p_table);
  EXECUTE format('DROP POLICY IF EXISTS sacp_auth_insert ON public.%I', p_table);
  EXECUTE format('DROP POLICY IF EXISTS sacp_auth_update ON public.%I', p_table);
  EXECUTE format('DROP POLICY IF EXISTS sacp_auth_delete ON public.%I', p_table);
END;
$$;

-- ======================== escolas ========================
ALTER TABLE public.escolas ENABLE ROW LEVEL SECURITY;
SELECT public._sacp_drop_auth_crud('escolas');
DROP POLICY IF EXISTS sacp_escolas_select ON public.escolas;
DROP POLICY IF EXISTS sacp_escolas_write_coord ON public.escolas;
DROP POLICY IF EXISTS sacp_escolas_insert_coord ON public.escolas;
DROP POLICY IF EXISTS sacp_escolas_update_coord ON public.escolas;
DROP POLICY IF EXISTS sacp_escolas_delete_coord ON public.escolas;

CREATE POLICY sacp_escolas_select ON public.escolas
  FOR SELECT TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR id = public.sacp_my_escola_id()
  );

CREATE POLICY sacp_escolas_insert_coord ON public.escolas
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_is_coordenador());

CREATE POLICY sacp_escolas_update_coord ON public.escolas
  FOR UPDATE TO authenticated
  USING (public.sacp_is_coordenador())
  WITH CHECK (public.sacp_is_coordenador());

CREATE POLICY sacp_escolas_delete_coord ON public.escolas
  FOR DELETE TO authenticated
  USING (public.sacp_is_coordenador());

-- ======================== turmas ========================
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
SELECT public._sacp_drop_auth_crud('turmas');
DROP POLICY IF EXISTS sacp_turmas_select ON public.turmas;
DROP POLICY IF EXISTS sacp_turmas_insert_coord ON public.turmas;
DROP POLICY IF EXISTS sacp_turmas_update_coord ON public.turmas;
DROP POLICY IF EXISTS sacp_turmas_delete_coord ON public.turmas;

CREATE POLICY sacp_turmas_select ON public.turmas
  FOR SELECT TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR id = ANY (public.sacp_my_turma_ids())
  );

CREATE POLICY sacp_turmas_insert_coord ON public.turmas
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_is_coordenador());

CREATE POLICY sacp_turmas_update_coord ON public.turmas
  FOR UPDATE TO authenticated
  USING (public.sacp_is_coordenador())
  WITH CHECK (public.sacp_is_coordenador());

CREATE POLICY sacp_turmas_delete_coord ON public.turmas
  FOR DELETE TO authenticated
  USING (public.sacp_is_coordenador());

-- ======================== alunos ========================
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
SELECT public._sacp_drop_auth_crud('alunos');
DROP POLICY IF EXISTS sacp_alunos_select ON public.alunos;
DROP POLICY IF EXISTS sacp_alunos_insert_coord ON public.alunos;
DROP POLICY IF EXISTS sacp_alunos_update_coord ON public.alunos;
DROP POLICY IF EXISTS sacp_alunos_delete_coord ON public.alunos;

CREATE POLICY sacp_alunos_select ON public.alunos
  FOR SELECT TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR turma_id = ANY (public.sacp_my_turma_ids())
  );

-- Cadastro de aluno: só coordenador (professor = leitura do cadastro)
CREATE POLICY sacp_alunos_insert_coord ON public.alunos
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_is_coordenador());

CREATE POLICY sacp_alunos_update_coord ON public.alunos
  FOR UPDATE TO authenticated
  USING (public.sacp_is_coordenador())
  WITH CHECK (public.sacp_is_coordenador());

CREATE POLICY sacp_alunos_delete_coord ON public.alunos
  FOR DELETE TO authenticated
  USING (public.sacp_is_coordenador());

-- ======================== sondagens ========================
ALTER TABLE public.sondagens ENABLE ROW LEVEL SECURITY;
SELECT public._sacp_drop_auth_crud('sondagens');
DROP POLICY IF EXISTS sacp_sondagens_select ON public.sondagens;
DROP POLICY IF EXISTS sacp_sondagens_insert ON public.sondagens;
DROP POLICY IF EXISTS sacp_sondagens_update ON public.sondagens;
DROP POLICY IF EXISTS sacp_sondagens_delete ON public.sondagens;

CREATE POLICY sacp_sondagens_select ON public.sondagens
  FOR SELECT TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_sondagens_insert ON public.sondagens
  FOR INSERT TO authenticated
  WITH CHECK (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_sondagens_update ON public.sondagens
  FOR UPDATE TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  )
  WITH CHECK (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_sondagens_delete ON public.sondagens
  FOR DELETE TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

-- ======================== ocorrencias ========================
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
SELECT public._sacp_drop_auth_crud('ocorrencias');
DROP POLICY IF EXISTS sacp_ocorrencias_select ON public.ocorrencias;
DROP POLICY IF EXISTS sacp_ocorrencias_insert ON public.ocorrencias;
DROP POLICY IF EXISTS sacp_ocorrencias_update ON public.ocorrencias;
DROP POLICY IF EXISTS sacp_ocorrencias_delete ON public.ocorrencias;

CREATE POLICY sacp_ocorrencias_select ON public.ocorrencias
  FOR SELECT TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_ocorrencias_insert ON public.ocorrencias
  FOR INSERT TO authenticated
  WITH CHECK (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_ocorrencias_update ON public.ocorrencias
  FOR UPDATE TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  )
  WITH CHECK (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_ocorrencias_delete ON public.ocorrencias
  FOR DELETE TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

-- ======================== notas_boletim ========================
ALTER TABLE public.notas_boletim ENABLE ROW LEVEL SECURITY;
SELECT public._sacp_drop_auth_crud('notas_boletim');
DROP POLICY IF EXISTS sacp_notas_boletim_select ON public.notas_boletim;
DROP POLICY IF EXISTS sacp_notas_boletim_insert ON public.notas_boletim;
DROP POLICY IF EXISTS sacp_notas_boletim_update ON public.notas_boletim;
DROP POLICY IF EXISTS sacp_notas_boletim_delete ON public.notas_boletim;

CREATE POLICY sacp_notas_boletim_select ON public.notas_boletim
  FOR SELECT TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_notas_boletim_insert ON public.notas_boletim
  FOR INSERT TO authenticated
  WITH CHECK (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_notas_boletim_update ON public.notas_boletim
  FOR UPDATE TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  )
  WITH CHECK (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_notas_boletim_delete ON public.notas_boletim
  FOR DELETE TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

-- ======================== agenda_eventos (professor: só leitura) ========================
ALTER TABLE public.agenda_eventos ENABLE ROW LEVEL SECURITY;
SELECT public._sacp_drop_auth_crud('agenda_eventos');
DROP POLICY IF EXISTS sacp_agenda_select ON public.agenda_eventos;
DROP POLICY IF EXISTS sacp_agenda_insert_coord ON public.agenda_eventos;
DROP POLICY IF EXISTS sacp_agenda_update_coord ON public.agenda_eventos;
DROP POLICY IF EXISTS sacp_agenda_delete_coord ON public.agenda_eventos;

CREATE POLICY sacp_agenda_select ON public.agenda_eventos
  FOR SELECT TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR escola_id = public.sacp_my_escola_id()
  );

CREATE POLICY sacp_agenda_insert_coord ON public.agenda_eventos
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_is_coordenador());

CREATE POLICY sacp_agenda_update_coord ON public.agenda_eventos
  FOR UPDATE TO authenticated
  USING (public.sacp_is_coordenador())
  WITH CHECK (public.sacp_is_coordenador());

CREATE POLICY sacp_agenda_delete_coord ON public.agenda_eventos
  FOR DELETE TO authenticated
  USING (public.sacp_is_coordenador());

-- ======================== professores ========================
ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "professores SELECT authenticated" ON public.professores;
DROP POLICY IF EXISTS "professores INSERT authenticated" ON public.professores;
DROP POLICY IF EXISTS "professores UPDATE authenticated" ON public.professores;
DROP POLICY IF EXISTS "professores DELETE authenticated" ON public.professores;
DROP POLICY IF EXISTS sacp_professores_select ON public.professores;
DROP POLICY IF EXISTS sacp_professores_insert_coord ON public.professores;
DROP POLICY IF EXISTS sacp_professores_update ON public.professores;
DROP POLICY IF EXISTS sacp_professores_delete_coord ON public.professores;

CREATE POLICY sacp_professores_select ON public.professores
  FOR SELECT TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR user_id = auth.uid()
    OR (
      user_id IS NULL
      AND auth_email IS NOT NULL
      AND lower(auth_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    )
  );

CREATE POLICY sacp_professores_insert_coord ON public.professores
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_is_coordenador());

-- Coordenador edita qualquer; professor assume vínculo (claim) ou edita o próprio registro
CREATE POLICY sacp_professores_update ON public.professores
  FOR UPDATE TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR user_id = auth.uid()
    OR (
      user_id IS NULL
      AND auth_email IS NOT NULL
      AND lower(auth_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    )
  )
  WITH CHECK (
    public.sacp_is_coordenador()
    OR user_id = auth.uid()
  );

CREATE POLICY sacp_professores_delete_coord ON public.professores
  FOR DELETE TO authenticated
  USING (public.sacp_is_coordenador());

-- ======================== entregas_docentes ========================
ALTER TABLE public.entregas_docentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sacp_entregas_select ON public.entregas_docentes;
DROP POLICY IF EXISTS sacp_entregas_insert ON public.entregas_docentes;
DROP POLICY IF EXISTS sacp_entregas_update ON public.entregas_docentes;
DROP POLICY IF EXISTS sacp_entregas_delete ON public.entregas_docentes;

CREATE POLICY sacp_entregas_select ON public.entregas_docentes
  FOR SELECT TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR professor_id = public.sacp_my_professor_id()
  );

CREATE POLICY sacp_entregas_insert ON public.entregas_docentes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.sacp_is_coordenador()
    OR professor_id = public.sacp_my_professor_id()
  );

CREATE POLICY sacp_entregas_update ON public.entregas_docentes
  FOR UPDATE TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR professor_id = public.sacp_my_professor_id()
  )
  WITH CHECK (
    public.sacp_is_coordenador()
    OR professor_id = public.sacp_my_professor_id()
  );

CREATE POLICY sacp_entregas_delete ON public.entregas_docentes
  FOR DELETE TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR professor_id = public.sacp_my_professor_id()
  );

-- ======================== registros_coordenacao (professor: só leitura) ========================
ALTER TABLE public.registros_coordenacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sacp_registros_select ON public.registros_coordenacao;
DROP POLICY IF EXISTS sacp_registros_write_coord ON public.registros_coordenacao;
DROP POLICY IF EXISTS sacp_registros_insert_coord ON public.registros_coordenacao;
DROP POLICY IF EXISTS sacp_registros_update_coord ON public.registros_coordenacao;
DROP POLICY IF EXISTS sacp_registros_delete_coord ON public.registros_coordenacao;

CREATE POLICY sacp_registros_select ON public.registros_coordenacao
  FOR SELECT TO authenticated
  USING (
    public.sacp_is_coordenador()
    OR professor_id = public.sacp_my_professor_id()
  );

CREATE POLICY sacp_registros_insert_coord ON public.registros_coordenacao
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_is_coordenador());

CREATE POLICY sacp_registros_update_coord ON public.registros_coordenacao
  FOR UPDATE TO authenticated
  USING (public.sacp_is_coordenador())
  WITH CHECK (public.sacp_is_coordenador());

CREATE POLICY sacp_registros_delete_coord ON public.registros_coordenacao
  FOR DELETE TO authenticated
  USING (public.sacp_is_coordenador());

DROP FUNCTION IF EXISTS public._sacp_drop_auth_crud(text);

SELECT 'RLS por papéis (coordenador/professor) aplicado. Teste com 1 coordenador e 1 professor vinculados.' AS resultado;
