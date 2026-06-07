-- ============================================================
-- SACP — Endurecimento de segurança para piloto confiável
-- Exige usuário autenticado (role authenticated) em tabelas
-- pedagógicas e remove acesso anon do Storage.
--
-- PRÉ-REQUISITO: backup do banco + login funcionando no app.
-- Execute: supabase db query --linked -f supabase_piloto_seguranca.sql
-- ============================================================

-- Helper: policies CRUD para authenticated (piloto single-tenant)
CREATE OR REPLACE FUNCTION public._sacp_apply_auth_crud_policies(p_table text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table);

  EXECUTE format('DROP POLICY IF EXISTS sacp_auth_select ON public.%I', p_table);
  EXECUTE format('DROP POLICY IF EXISTS sacp_auth_insert ON public.%I', p_table);
  EXECUTE format('DROP POLICY IF EXISTS sacp_auth_update ON public.%I', p_table);
  EXECUTE format('DROP POLICY IF EXISTS sacp_auth_delete ON public.%I', p_table);

  EXECUTE format(
    'CREATE POLICY sacp_auth_select ON public.%I FOR SELECT TO authenticated USING (true)',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY sacp_auth_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (true)',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY sacp_auth_update ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY sacp_auth_delete ON public.%I FOR DELETE TO authenticated USING (true)',
    p_table
  );
END;
$$;

-- Tabelas núcleo (hoje sem RLS ou abertas)
SELECT public._sacp_apply_auth_crud_policies('escolas');
SELECT public._sacp_apply_auth_crud_policies('turmas');
SELECT public._sacp_apply_auth_crud_policies('alunos');
SELECT public._sacp_apply_auth_crud_policies('ocorrencias');
SELECT public._sacp_apply_auth_crud_policies('sondagens');
SELECT public._sacp_apply_auth_crud_policies('agenda_eventos');
SELECT public._sacp_apply_auth_crud_policies('notas');
SELECT public._sacp_apply_auth_crud_policies('frequencia_historico');
SELECT public._sacp_apply_auth_crud_policies('relatorio_avaliacao_pre');

-- notas_boletim: remover acesso público total
DROP POLICY IF EXISTS "Acesso Total Notas" ON public.notas_boletim;
SELECT public._sacp_apply_auth_crud_policies('notas_boletim');

-- professores: remover anon (manter policies authenticated existentes ou padronizar)
DROP POLICY IF EXISTS "professores SELECT anon" ON public.professores;
DROP POLICY IF EXISTS "professores INSERT anon" ON public.professores;
DROP POLICY IF EXISTS "professores UPDATE anon" ON public.professores;
DROP POLICY IF EXISTS "professores DELETE anon" ON public.professores;

-- Turmas especiais / diário: remover anon
DROP POLICY IF EXISTS "alunos_turmas_especiais select anon" ON public.alunos_turmas_especiais;
DROP POLICY IF EXISTS "alunos_turmas_especiais insert anon" ON public.alunos_turmas_especiais;
DROP POLICY IF EXISTS "alunos_turmas_especiais delete anon" ON public.alunos_turmas_especiais;

DROP POLICY IF EXISTS "diario_freq_esp select" ON public.diario_frequencia_especial;
DROP POLICY IF EXISTS "diario_freq_esp insert" ON public.diario_frequencia_especial;
DROP POLICY IF EXISTS "diario_freq_esp update" ON public.diario_frequencia_especial;
DROP POLICY IF EXISTS "diario_freq_esp delete" ON public.diario_frequencia_especial;

SELECT public._sacp_apply_auth_crud_policies('alunos_turmas_especiais');
SELECT public._sacp_apply_auth_crud_policies('diario_frequencia_especial');

-- entregas / registros: já authenticated; garantir sem anon
-- (nenhuma policy anon hoje)

-- ============================================================
-- Storage: remover policies anon nos buckets do app
-- ============================================================
DROP POLICY IF EXISTS "sondagens-anexos INSERT anon" ON storage.objects;
DROP POLICY IF EXISTS "sondagens-anexos UPDATE anon" ON storage.objects;
DROP POLICY IF EXISTS "sondagens-anexos SELECT anon" ON storage.objects;
DROP POLICY IF EXISTS "sondagens-anexos DELETE anon" ON storage.objects;

DROP POLICY IF EXISTS "documentos-aee INSERT anon" ON storage.objects;
DROP POLICY IF EXISTS "documentos-aee SELECT anon" ON storage.objects;
DROP POLICY IF EXISTS "documentos-aee DELETE anon" ON storage.objects;

DROP POLICY IF EXISTS "agenda-arquivos INSERT anon" ON storage.objects;
DROP POLICY IF EXISTS "agenda-arquivos SELECT anon" ON storage.objects;
DROP POLICY IF EXISTS "agenda-arquivos DELETE anon" ON storage.objects;

-- Limpar função auxiliar (opcional manter para futuras tabelas)
DROP FUNCTION IF EXISTS public._sacp_apply_auth_crud_policies(text);

SELECT 'Endurecimento piloto aplicado. Teste o app LOGADO (escolas, alunos, sondagem, storage).' AS resultado;
