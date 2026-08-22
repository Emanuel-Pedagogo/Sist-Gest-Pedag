-- ============================================================
-- SACP — Multi-tenancy por "conta" (isolamento entre escolas)
--
-- Problema resolvido: hoje qualquer usuário autenticado que não é
-- professor vinculado enxerga e edita TODAS as escolas/turmas/alunos
-- do banco inteiro (sacp_is_coordenador() = "qualquer autenticado
-- não-professor"). Isso impede oferecer o app para um professor
-- autônomo sem misturar os dados dele com os de outras escolas.
--
-- Solução: introduz o conceito de "conta" (espaço isolado). Cada
-- escola passa a pertencer a uma conta; turmas/alunos/etc. herdam
-- o isolamento automaticamente via escola_id/turma_id/aluno_id já
-- existentes. Um professor autônomo que se cadastra sozinho vira,
-- na prática, coordenador da própria conta — usando a MESMA
-- interface de coordenador que já existe, só que isolada.
--
-- O papel "professor" vinculado (sacp_my_turma_ids/sacp_my_escola_id)
-- não muda em nada.
--
-- Pré-requisito: supabase_piloto_seguranca.sql e
-- supabase_professores_rls_papeis.sql já aplicados.
-- ============================================================

-- ======================== 1. Tabelas novas ========================

CREATE TABLE IF NOT EXISTS public.contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'autonomo' CHECK (tipo IN ('autonomo', 'institucional')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.contas_coordenadores (
  conta_id uuid NOT NULL REFERENCES public.contas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conta_id, user_id)
);

ALTER TABLE public.contas_coordenadores ENABLE ROW LEVEL SECURITY;

-- ======================== 2. Coluna nova em escolas ========================

ALTER TABLE public.escolas ADD COLUMN IF NOT EXISTS conta_id uuid REFERENCES public.contas(id);

-- ======================== 3. Funções auxiliares (SECURITY DEFINER) ========================

CREATE OR REPLACE FUNCTION public.sacp_minhas_contas_coordenador()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(conta_id), '{}'::uuid[])
  FROM public.contas_coordenadores
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.sacp_coordeno_escola(p_escola_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.escolas e
    WHERE e.id = p_escola_id
      AND e.conta_id = ANY (public.sacp_minhas_contas_coordenador())
  );
$$;

CREATE OR REPLACE FUNCTION public.sacp_coordeno_turma(p_turma_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.turmas t
    WHERE t.id = p_turma_id
      AND public.sacp_coordeno_escola(t.escola_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.sacp_coordeno_aluno(p_aluno_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.alunos a
    WHERE a.id = p_aluno_id
      AND public.sacp_coordeno_turma(a.turma_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.sacp_minhas_contas_coordenador() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sacp_coordeno_escola(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sacp_coordeno_turma(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sacp_coordeno_aluno(uuid) TO authenticated;

-- Fecha o acesso de PUBLIC e do papel "anon" (visitante não-logado) a essas
-- funções SECURITY DEFINER. O Supabase concede EXECUTE diretamente a "anon"
-- em toda função nova por padrão (ALTER DEFAULT PRIVILEGES) — revogar só de
-- PUBLIC não é suficiente, precisa revogar de "anon" explicitamente também.
REVOKE EXECUTE ON FUNCTION public.sacp_minhas_contas_coordenador() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sacp_coordeno_escola(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sacp_coordeno_turma(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sacp_coordeno_aluno(uuid) FROM PUBLIC, anon;

-- ======================== 4. RPC de bootstrap (formulário de boas-vindas) ========================

CREATE OR REPLACE FUNCTION public.sacp_criar_conta_autonoma(
  p_nome_escola text,
  p_nome_turma text,
  p_ano_letivo integer DEFAULT EXTRACT(year FROM now())::int
)
RETURNS TABLE(conta_id uuid, escola_id uuid, turma_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conta_id uuid;
  v_escola_id uuid;
  v_turma_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF EXISTS (SELECT 1 FROM public.contas_coordenadores WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Usuário já possui uma conta';
  END IF;

  IF trim(COALESCE(p_nome_escola, '')) = '' THEN
    RAISE EXCEPTION 'Nome da escola é obrigatório';
  END IF;

  IF trim(COALESCE(p_nome_turma, '')) = '' THEN
    RAISE EXCEPTION 'Nome da turma é obrigatório';
  END IF;

  INSERT INTO public.contas (nome, tipo)
  VALUES (p_nome_escola, 'autonomo')
  RETURNING id INTO v_conta_id;

  INSERT INTO public.contas_coordenadores (conta_id, user_id)
  VALUES (v_conta_id, auth.uid());

  INSERT INTO public.escolas (nome, conta_id, tipo_estrutura)
  VALUES (p_nome_escola, v_conta_id, 'Polo')
  RETURNING id INTO v_escola_id;

  INSERT INTO public.turmas (nome, escola_id, ano_letivo, professor_regente)
  VALUES (p_nome_turma, v_escola_id, p_ano_letivo, '')
  RETURNING id INTO v_turma_id;

  RETURN QUERY SELECT v_conta_id, v_escola_id, v_turma_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sacp_criar_conta_autonoma(text, text, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.sacp_criar_conta_autonoma(text, text, integer) FROM PUBLIC, anon;

-- ======================== 5. Backfill dos dados atuais (preserva acesso de hoje) ========================

DO $$
DECLARE
  v_pilot_conta_id uuid;
BEGIN
  -- Só roda se ainda existir alguma escola sem conta (idempotente)
  IF EXISTS (SELECT 1 FROM public.escolas WHERE conta_id IS NULL) THEN
    INSERT INTO public.contas (nome, tipo)
    VALUES ('SACP - Piloto', 'institucional')
    RETURNING id INTO v_pilot_conta_id;

    UPDATE public.escolas
    SET conta_id = v_pilot_conta_id
    WHERE conta_id IS NULL;

    -- Todo login que hoje já age como coordenador (não é professor vinculado)
    -- vira coordenador explícito da conta do piloto — preserva 100% do acesso atual.
    INSERT INTO public.contas_coordenadores (conta_id, user_id)
    SELECT v_pilot_conta_id, u.id
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.professores p WHERE p.user_id = u.id
    )
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Trava a coluna como obrigatória depois do backfill
ALTER TABLE public.escolas ALTER COLUMN conta_id SET NOT NULL;

-- ======================== 6. Políticas RLS — contas / contas_coordenadores ========================

DROP POLICY IF EXISTS sacp_contas_select ON public.contas;
CREATE POLICY sacp_contas_select ON public.contas
  FOR SELECT TO authenticated
  USING (id = ANY (public.sacp_minhas_contas_coordenador()));

DROP POLICY IF EXISTS sacp_contas_coordenadores_select ON public.contas_coordenadores;
CREATE POLICY sacp_contas_coordenadores_select ON public.contas_coordenadores
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Nenhuma policy de INSERT/UPDATE/DELETE direta nessas duas tabelas:
-- a única forma de criar conta é via sacp_criar_conta_autonoma (SECURITY DEFINER).

-- ======================== 7. Reescrita das políticas — escolas ========================

DROP POLICY IF EXISTS sacp_escolas_select ON public.escolas;
DROP POLICY IF EXISTS sacp_escolas_insert_coord ON public.escolas;
DROP POLICY IF EXISTS sacp_escolas_update_coord ON public.escolas;
DROP POLICY IF EXISTS sacp_escolas_delete_coord ON public.escolas;

CREATE POLICY sacp_escolas_select ON public.escolas
  FOR SELECT TO authenticated
  USING (
    conta_id = ANY (public.sacp_minhas_contas_coordenador())
    OR id = public.sacp_my_escola_id()
  );

CREATE POLICY sacp_escolas_insert_coord ON public.escolas
  FOR INSERT TO authenticated
  WITH CHECK (conta_id = ANY (public.sacp_minhas_contas_coordenador()));

CREATE POLICY sacp_escolas_update_coord ON public.escolas
  FOR UPDATE TO authenticated
  USING (conta_id = ANY (public.sacp_minhas_contas_coordenador()))
  WITH CHECK (conta_id = ANY (public.sacp_minhas_contas_coordenador()));

CREATE POLICY sacp_escolas_delete_coord ON public.escolas
  FOR DELETE TO authenticated
  USING (conta_id = ANY (public.sacp_minhas_contas_coordenador()));

-- ======================== 8. Reescrita das políticas — turmas ========================

DROP POLICY IF EXISTS sacp_turmas_select ON public.turmas;
DROP POLICY IF EXISTS sacp_turmas_insert_coord ON public.turmas;
DROP POLICY IF EXISTS sacp_turmas_update_coord ON public.turmas;
DROP POLICY IF EXISTS sacp_turmas_delete_coord ON public.turmas;

CREATE POLICY sacp_turmas_select ON public.turmas
  FOR SELECT TO authenticated
  USING (
    public.sacp_coordeno_escola(escola_id)
    OR id = ANY (public.sacp_my_turma_ids())
  );

CREATE POLICY sacp_turmas_insert_coord ON public.turmas
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_coordeno_escola(escola_id));

CREATE POLICY sacp_turmas_update_coord ON public.turmas
  FOR UPDATE TO authenticated
  USING (public.sacp_coordeno_escola(escola_id))
  WITH CHECK (public.sacp_coordeno_escola(escola_id));

CREATE POLICY sacp_turmas_delete_coord ON public.turmas
  FOR DELETE TO authenticated
  USING (public.sacp_coordeno_escola(escola_id));

-- ======================== 9. Reescrita das políticas — alunos ========================

DROP POLICY IF EXISTS sacp_alunos_select ON public.alunos;
DROP POLICY IF EXISTS sacp_alunos_insert_coord ON public.alunos;
DROP POLICY IF EXISTS sacp_alunos_update_coord ON public.alunos;
DROP POLICY IF EXISTS sacp_alunos_delete_coord ON public.alunos;

CREATE POLICY sacp_alunos_select ON public.alunos
  FOR SELECT TO authenticated
  USING (
    public.sacp_coordeno_turma(turma_id)
    OR turma_id = ANY (public.sacp_my_turma_ids())
  );

CREATE POLICY sacp_alunos_insert_coord ON public.alunos
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_coordeno_turma(turma_id));

CREATE POLICY sacp_alunos_update_coord ON public.alunos
  FOR UPDATE TO authenticated
  USING (public.sacp_coordeno_turma(turma_id))
  WITH CHECK (public.sacp_coordeno_turma(turma_id));

CREATE POLICY sacp_alunos_delete_coord ON public.alunos
  FOR DELETE TO authenticated
  USING (public.sacp_coordeno_turma(turma_id));

-- ======================== 10. Reescrita das políticas — sondagens ========================

DROP POLICY IF EXISTS sacp_sondagens_select ON public.sondagens;
DROP POLICY IF EXISTS sacp_sondagens_insert ON public.sondagens;
DROP POLICY IF EXISTS sacp_sondagens_update ON public.sondagens;
DROP POLICY IF EXISTS sacp_sondagens_delete ON public.sondagens;

CREATE POLICY sacp_sondagens_select ON public.sondagens
  FOR SELECT TO authenticated
  USING (
    public.sacp_coordeno_aluno(aluno_id)
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_sondagens_insert ON public.sondagens
  FOR INSERT TO authenticated
  WITH CHECK (
    public.sacp_coordeno_aluno(aluno_id)
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_sondagens_update ON public.sondagens
  FOR UPDATE TO authenticated
  USING (
    public.sacp_coordeno_aluno(aluno_id)
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  )
  WITH CHECK (
    public.sacp_coordeno_aluno(aluno_id)
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_sondagens_delete ON public.sondagens
  FOR DELETE TO authenticated
  USING (
    public.sacp_coordeno_aluno(aluno_id)
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

-- ======================== 11. Reescrita das políticas — ocorrencias ========================

DROP POLICY IF EXISTS sacp_ocorrencias_select ON public.ocorrencias;
DROP POLICY IF EXISTS sacp_ocorrencias_insert ON public.ocorrencias;
DROP POLICY IF EXISTS sacp_ocorrencias_update ON public.ocorrencias;
DROP POLICY IF EXISTS sacp_ocorrencias_delete ON public.ocorrencias;

CREATE POLICY sacp_ocorrencias_select ON public.ocorrencias
  FOR SELECT TO authenticated
  USING (
    public.sacp_coordeno_aluno(aluno_id)
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_ocorrencias_insert ON public.ocorrencias
  FOR INSERT TO authenticated
  WITH CHECK (
    public.sacp_coordeno_aluno(aluno_id)
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_ocorrencias_update ON public.ocorrencias
  FOR UPDATE TO authenticated
  USING (
    public.sacp_coordeno_aluno(aluno_id)
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  )
  WITH CHECK (
    public.sacp_coordeno_aluno(aluno_id)
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_ocorrencias_delete ON public.ocorrencias
  FOR DELETE TO authenticated
  USING (
    public.sacp_coordeno_aluno(aluno_id)
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

-- ======================== 12. Reescrita das políticas — notas_boletim ========================

DROP POLICY IF EXISTS sacp_notas_boletim_select ON public.notas_boletim;
DROP POLICY IF EXISTS sacp_notas_boletim_insert ON public.notas_boletim;
DROP POLICY IF EXISTS sacp_notas_boletim_update ON public.notas_boletim;
DROP POLICY IF EXISTS sacp_notas_boletim_delete ON public.notas_boletim;

CREATE POLICY sacp_notas_boletim_select ON public.notas_boletim
  FOR SELECT TO authenticated
  USING (
    public.sacp_coordeno_aluno(aluno_id)
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_notas_boletim_insert ON public.notas_boletim
  FOR INSERT TO authenticated
  WITH CHECK (
    public.sacp_coordeno_aluno(aluno_id)
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_notas_boletim_update ON public.notas_boletim
  FOR UPDATE TO authenticated
  USING (
    public.sacp_coordeno_aluno(aluno_id)
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  )
  WITH CHECK (
    public.sacp_coordeno_aluno(aluno_id)
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

CREATE POLICY sacp_notas_boletim_delete ON public.notas_boletim
  FOR DELETE TO authenticated
  USING (
    public.sacp_coordeno_aluno(aluno_id)
    OR public.sacp_aluno_na_minha_turma(aluno_id)
  );

-- ======================== 13. Reescrita das políticas — agenda_eventos ========================

DROP POLICY IF EXISTS sacp_agenda_select ON public.agenda_eventos;
DROP POLICY IF EXISTS sacp_agenda_insert_coord ON public.agenda_eventos;
DROP POLICY IF EXISTS sacp_agenda_update_coord ON public.agenda_eventos;
DROP POLICY IF EXISTS sacp_agenda_delete_coord ON public.agenda_eventos;

CREATE POLICY sacp_agenda_select ON public.agenda_eventos
  FOR SELECT TO authenticated
  USING (
    public.sacp_coordeno_escola(escola_id)
    OR escola_id = public.sacp_my_escola_id()
  );

CREATE POLICY sacp_agenda_insert_coord ON public.agenda_eventos
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_coordeno_escola(escola_id));

CREATE POLICY sacp_agenda_update_coord ON public.agenda_eventos
  FOR UPDATE TO authenticated
  USING (public.sacp_coordeno_escola(escola_id))
  WITH CHECK (public.sacp_coordeno_escola(escola_id));

CREATE POLICY sacp_agenda_delete_coord ON public.agenda_eventos
  FOR DELETE TO authenticated
  USING (public.sacp_coordeno_escola(escola_id));

-- ======================== 14. Reescrita das políticas — professores ========================

DROP POLICY IF EXISTS sacp_professores_select ON public.professores;
DROP POLICY IF EXISTS sacp_professores_insert_coord ON public.professores;
DROP POLICY IF EXISTS sacp_professores_update ON public.professores;
DROP POLICY IF EXISTS sacp_professores_delete_coord ON public.professores;

CREATE POLICY sacp_professores_select ON public.professores
  FOR SELECT TO authenticated
  USING (
    public.sacp_coordeno_escola(escola_id)
    OR user_id = auth.uid()
    OR (
      user_id IS NULL
      AND auth_email IS NOT NULL
      AND lower(auth_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    )
  );

CREATE POLICY sacp_professores_insert_coord ON public.professores
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_coordeno_escola(escola_id));

CREATE POLICY sacp_professores_update ON public.professores
  FOR UPDATE TO authenticated
  USING (
    public.sacp_coordeno_escola(escola_id)
    OR user_id = auth.uid()
    OR (
      user_id IS NULL
      AND auth_email IS NOT NULL
      AND lower(auth_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    )
  )
  WITH CHECK (
    public.sacp_coordeno_escola(escola_id)
    OR user_id = auth.uid()
  );

CREATE POLICY sacp_professores_delete_coord ON public.professores
  FOR DELETE TO authenticated
  USING (public.sacp_coordeno_escola(escola_id));

-- ======================== 15. Reescrita das políticas — entregas_docentes ========================

DROP POLICY IF EXISTS sacp_entregas_select ON public.entregas_docentes;
DROP POLICY IF EXISTS sacp_entregas_insert ON public.entregas_docentes;
DROP POLICY IF EXISTS sacp_entregas_update ON public.entregas_docentes;
DROP POLICY IF EXISTS sacp_entregas_delete ON public.entregas_docentes;

CREATE POLICY sacp_entregas_select ON public.entregas_docentes
  FOR SELECT TO authenticated
  USING (
    public.sacp_coordeno_escola(escola_id)
    OR professor_id = public.sacp_my_professor_id()
  );

CREATE POLICY sacp_entregas_insert ON public.entregas_docentes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.sacp_coordeno_escola(escola_id)
    OR professor_id = public.sacp_my_professor_id()
  );

CREATE POLICY sacp_entregas_update ON public.entregas_docentes
  FOR UPDATE TO authenticated
  USING (
    public.sacp_coordeno_escola(escola_id)
    OR professor_id = public.sacp_my_professor_id()
  )
  WITH CHECK (
    public.sacp_coordeno_escola(escola_id)
    OR professor_id = public.sacp_my_professor_id()
  );

CREATE POLICY sacp_entregas_delete ON public.entregas_docentes
  FOR DELETE TO authenticated
  USING (
    public.sacp_coordeno_escola(escola_id)
    OR professor_id = public.sacp_my_professor_id()
  );

-- ======================== 16. Reescrita das políticas — registros_coordenacao ========================

DROP POLICY IF EXISTS sacp_registros_select ON public.registros_coordenacao;
DROP POLICY IF EXISTS sacp_registros_insert_coord ON public.registros_coordenacao;
DROP POLICY IF EXISTS sacp_registros_update_coord ON public.registros_coordenacao;
DROP POLICY IF EXISTS sacp_registros_delete_coord ON public.registros_coordenacao;

CREATE POLICY sacp_registros_select ON public.registros_coordenacao
  FOR SELECT TO authenticated
  USING (
    public.sacp_coordeno_escola(escola_id)
    OR professor_id = public.sacp_my_professor_id()
  );

CREATE POLICY sacp_registros_insert_coord ON public.registros_coordenacao
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_coordeno_escola(escola_id));

CREATE POLICY sacp_registros_update_coord ON public.registros_coordenacao
  FOR UPDATE TO authenticated
  USING (public.sacp_coordeno_escola(escola_id))
  WITH CHECK (public.sacp_coordeno_escola(escola_id));

CREATE POLICY sacp_registros_delete_coord ON public.registros_coordenacao
  FOR DELETE TO authenticated
  USING (public.sacp_coordeno_escola(escola_id));

SELECT 'Multi-tenancy por conta aplicado. Confira as contagens antes de considerar concluído.' AS resultado;
