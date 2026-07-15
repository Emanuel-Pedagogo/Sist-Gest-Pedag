-- ============================================================
-- SACP — Chat com IA integrado (Claude API)
-- Cria tabelas de auditoria/confirmação e RPCs seguras usadas
-- pela Edge Function `chat-ia` para executar SQL a pedido do chat.
--
-- PRÉ-REQUISITOS (já aplicados em produção em jul/2026):
--   1) supabase_professores_user_id.sql
--   2) supabase_professores_rls_papeis.sql
--      (funções sacp_is_coordenador / sacp_is_professor / sacp_my_turma_ids)
--
-- Modelo de segurança:
--   - Todas as funções abaixo são SECURITY INVOKER (rodam com o
--     papel/JWT de quem chamou) — RLS de cada tabela continua
--     valendo normalmente, igual a uma chamada comum via PostgREST.
--     NUNCA usar SECURITY DEFINER aqui: isso bypassaria RLS.
--   - SELECT livre: qualquer usuário autenticado pode consultar,
--     mas só enxerga o que a RLS já permite (coordenador vê tudo;
--     professor só as próprias turmas/alunos).
--   - INSERT/UPDATE/DELETE: só coordenador pode propor, e a
--     alteração só executa depois de confirmação explícita do
--     usuário (fluxo de 2 passos: propor -> confirmar/cancelar).
--   - Toda consulta (leitura ou escrita) é registrada em
--     chat_ia_execucoes para auditoria (LGPD).
--
-- Execute: supabase db query --linked -f supabase_chat_ia.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1) Tabelas
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.chat_ia_confirmacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  sql text NOT NULL,
  tabela text NOT NULL,
  operacao text NOT NULL CHECK (operacao IN ('insert', 'update', 'delete')),
  descricao text,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'executada', 'cancelada', 'expirada', 'erro')),
  resultado jsonb,
  linhas_afetadas integer,
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  executada_em timestamptz
);

CREATE INDEX IF NOT EXISTS chat_ia_confirmacoes_criado_por_idx
  ON public.chat_ia_confirmacoes (criado_por, status);

ALTER TABLE public.chat_ia_confirmacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_ia_confirmacoes_select ON public.chat_ia_confirmacoes;
DROP POLICY IF EXISTS chat_ia_confirmacoes_insert ON public.chat_ia_confirmacoes;
DROP POLICY IF EXISTS chat_ia_confirmacoes_update ON public.chat_ia_confirmacoes;

CREATE POLICY chat_ia_confirmacoes_select ON public.chat_ia_confirmacoes
  FOR SELECT TO authenticated USING (criado_por = auth.uid());

CREATE POLICY chat_ia_confirmacoes_insert ON public.chat_ia_confirmacoes
  FOR INSERT TO authenticated WITH CHECK (criado_por = auth.uid());

CREATE POLICY chat_ia_confirmacoes_update ON public.chat_ia_confirmacoes
  FOR UPDATE TO authenticated USING (criado_por = auth.uid()) WITH CHECK (criado_por = auth.uid());

-- Log de auditoria — imutável (sem UPDATE/DELETE via API)
CREATE TABLE IF NOT EXISTS public.chat_ia_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('select', 'insert', 'update', 'delete')),
  sql text NOT NULL,
  tabela text,
  linhas integer,
  sucesso boolean NOT NULL DEFAULT true,
  erro text,
  confirmacao_id uuid REFERENCES public.chat_ia_confirmacoes(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_ia_execucoes_usuario_idx
  ON public.chat_ia_execucoes (usuario_id, criado_em DESC);

ALTER TABLE public.chat_ia_execucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_ia_execucoes_select ON public.chat_ia_execucoes;
DROP POLICY IF EXISTS chat_ia_execucoes_insert ON public.chat_ia_execucoes;

CREATE POLICY chat_ia_execucoes_select ON public.chat_ia_execucoes
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.sacp_is_coordenador());

CREATE POLICY chat_ia_execucoes_insert ON public.chat_ia_execucoes
  FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());

-- ------------------------------------------------------------
-- 2) Validação central (whitelist de tabelas + bloqueio de DDL,
--    múltiplas instruções, comentários e schemas sensíveis)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._sacp_chat_validar(p_sql text, p_modo text)
RETURNS TABLE(sql_limpo text, tabela text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sql text;
  v_upper text;
  v_tabela text;
  v_kw text;
  v_arr text[];
  v_forbidden text[] := ARRAY[
    'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'GRANT', 'REVOKE', 'COPY', 'VACUUM',
    'REINDEX', 'EXECUTE', 'PREPARE', 'DEALLOCATE', 'DO', 'CALL', 'LISTEN',
    'NOTIFY', 'UNLISTEN', 'SET', 'RESET', 'SHOW', 'BEGIN', 'COMMIT', 'ROLLBACK',
    'SAVEPOINT', 'MERGE', 'LOCK', 'SECURITY', 'FUNCTION', 'PROCEDURE', 'TRIGGER',
    'EXTENSION', 'ROLE', 'PASSWORD', 'POLICY', 'RECURSIVE', 'RETURNING',
    'PG_SLEEP', 'PG_READ_FILE', 'PG_LS_DIR', 'PG_TERMINATE_BACKEND', 'DBLINK',
    'LO_IMPORT', 'LO_EXPORT', 'PERFORM', 'COMMENT'
  ];
  v_forbidden_schemas text[] := ARRAY[
    'AUTH\.', 'STORAGE\.', 'PG_CATALOG\.', 'INFORMATION_SCHEMA\.', 'EXTENSIONS\.',
    'NET\.', 'CRON\.', 'VAULT\.', 'PGSODIUM\.', 'REALTIME\.', 'SUPABASE_FUNCTIONS\.'
  ];
  -- Tabelas de domínio pedagógico expostas ao chat (mesmas usadas pelo app).
  v_whitelist text[] := ARRAY[
    'escolas', 'turmas', 'alunos', 'ocorrencias', 'sondagens', 'notas_boletim',
    'notas', 'frequencia_historico', 'agenda_eventos', 'professores',
    'entregas_docentes', 'registros_coordenacao', 'alunos_turmas_especiais',
    'diario_frequencia_especial', 'diario_classe_frequencia',
    'diario_classe_conteudos', 'relatorio_avaliacao_pre', 'livros_biblioteca',
    'emprestimos_biblioteca'
  ];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  v_sql := regexp_replace(btrim(COALESCE(p_sql, '')), ';\s*$', '');
  IF v_sql = '' THEN
    RAISE EXCEPTION 'Query vazia';
  END IF;
  IF position(';' in v_sql) > 0 THEN
    RAISE EXCEPTION 'Apenas uma instrução SQL por vez (sem ; no meio da query)';
  END IF;
  IF v_sql ~ '--' OR v_sql ~ '/\*' THEN
    RAISE EXCEPTION 'Comentários SQL não são permitidos';
  END IF;

  v_upper := upper(v_sql);

  IF p_modo = 'select' THEN
    IF NOT (v_upper ~ '^\s*(SELECT|WITH)\y') THEN
      RAISE EXCEPTION 'Neste modo só é permitido SELECT (ou WITH ... SELECT)';
    END IF;
    IF v_upper ~ '\yINTO\y' THEN
      RAISE EXCEPTION 'SELECT ... INTO não é permitido';
    END IF;
  ELSIF p_modo = 'write' THEN
    IF NOT (v_upper ~ '^\s*(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\y') THEN
      RAISE EXCEPTION 'Neste modo só é permitido INSERT/UPDATE/DELETE';
    END IF;
    IF NOT public.sacp_is_coordenador() THEN
      RAISE EXCEPTION 'Apenas a coordenação pode propor alterações de dados pelo chat';
    END IF;
  ELSE
    RAISE EXCEPTION 'Modo de validação inválido: %', p_modo;
  END IF;

  FOREACH v_kw IN ARRAY v_forbidden LOOP
    IF v_upper ~ ('\y' || v_kw || '\y') THEN
      RAISE EXCEPTION 'Palavra-chave não permitida no chat: %', v_kw;
    END IF;
  END LOOP;

  FOREACH v_kw IN ARRAY v_forbidden_schemas LOOP
    IF v_upper ~ v_kw THEN
      RAISE EXCEPTION 'Acesso a schema/objeto não permitido pelo chat';
    END IF;
  END LOOP;

  IF p_modo = 'select' THEN
    FOR v_arr IN
      SELECT x FROM regexp_matches(v_sql, '\y(?:FROM|JOIN)\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?', 'gi') AS x
    LOOP
      IF NOT (lower(v_arr[1]) = ANY (v_whitelist)) THEN
        RAISE EXCEPTION 'Tabela não permitida no chat: %', v_arr[1];
      END IF;
    END LOOP;
    v_tabela := NULL;
  ELSE
    IF v_upper ~ '^\s*INSERT\s+INTO' THEN
      v_arr := regexp_matches(v_sql, '^\s*INSERT\s+INTO\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?', 'i');
    ELSIF v_upper ~ '^\s*UPDATE' THEN
      v_arr := regexp_matches(v_sql, '^\s*UPDATE\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?', 'i');
    ELSE
      v_arr := regexp_matches(v_sql, '^\s*DELETE\s+FROM\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?', 'i');
    END IF;
    v_tabela := lower(COALESCE(v_arr[1], ''));
    IF v_tabela = '' OR NOT (v_tabela = ANY (v_whitelist)) THEN
      RAISE EXCEPTION 'Tabela não permitida no chat: %', COALESCE(v_tabela, '?');
    END IF;
    -- Sem WHERE em UPDATE/DELETE é o erro mais perigoso de "apagar tudo" — bloquear.
    IF v_upper ~ '^\s*(UPDATE|DELETE\s+FROM)' AND NOT (v_upper ~ '\yWHERE\y') THEN
      RAISE EXCEPTION 'UPDATE/DELETE sem cláusula WHERE não é permitido pelo chat';
    END IF;
  END IF;

  RETURN QUERY SELECT v_sql, v_tabela;
END;
$$;

REVOKE ALL ON FUNCTION public._sacp_chat_validar(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._sacp_chat_validar(text, text) TO authenticated;

-- ------------------------------------------------------------
-- 3) SELECT imediato (somente leitura, limitado a 200 linhas)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sacp_chat_run_select(p_sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_check record;
  v_result jsonb;
  v_erro text;
BEGIN
  SET LOCAL statement_timeout = '5000ms';
  BEGIN
    SELECT * INTO v_check FROM public._sacp_chat_validar(p_sql, 'select');

    EXECUTE format(
      'SELECT COALESCE(jsonb_agg(to_jsonb(_sacp_q)), ''[]''::jsonb) FROM (SELECT * FROM (%s) AS _sacp_inner LIMIT 200) AS _sacp_q',
      v_check.sql_limpo
    ) INTO v_result;

    INSERT INTO public.chat_ia_execucoes (usuario_id, tipo, sql, tabela, linhas, sucesso)
    VALUES (auth.uid(), 'select', v_check.sql_limpo, NULL, jsonb_array_length(v_result), true);

    RETURN v_result;
  EXCEPTION WHEN OTHERS THEN
    v_erro := SQLERRM;
    INSERT INTO public.chat_ia_execucoes (usuario_id, tipo, sql, sucesso, erro)
    VALUES (auth.uid(), 'select', COALESCE(p_sql, ''), false, v_erro);
    RAISE;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.sacp_chat_run_select(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sacp_chat_run_select(text) TO authenticated;

-- ------------------------------------------------------------
-- 4) Escrita — passo 1: propor (não executa, só registra pendente)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sacp_chat_propor_escrita(p_sql text, p_descricao text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_check record;
  v_operacao text;
  v_id uuid;
  v_expira timestamptz;
BEGIN
  SELECT * INTO v_check FROM public._sacp_chat_validar(p_sql, 'write');

  v_operacao := CASE
    WHEN upper(v_check.sql_limpo) ~ '^\s*INSERT' THEN 'insert'
    WHEN upper(v_check.sql_limpo) ~ '^\s*UPDATE' THEN 'update'
    ELSE 'delete'
  END;

  INSERT INTO public.chat_ia_confirmacoes (criado_por, sql, tabela, operacao, descricao)
  VALUES (auth.uid(), v_check.sql_limpo, v_check.tabela, v_operacao, p_descricao)
  RETURNING id, expira_em INTO v_id, v_expira;

  RETURN jsonb_build_object(
    'confirmacao_id', v_id,
    'tabela', v_check.tabela,
    'operacao', v_operacao,
    'sql', v_check.sql_limpo,
    'descricao', p_descricao,
    'expira_em', v_expira
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sacp_chat_propor_escrita(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sacp_chat_propor_escrita(text, text) TO authenticated;

-- ------------------------------------------------------------
-- 5) Escrita — passo 2a: confirmar (executa de fato)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sacp_chat_confirmar_escrita(p_confirmacao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_conf public.chat_ia_confirmacoes%ROWTYPE;
  v_check record;
  v_result jsonb;
  v_count integer;
  v_erro text;
BEGIN
  SET LOCAL statement_timeout = '5000ms';

  SELECT * INTO v_conf FROM public.chat_ia_confirmacoes
   WHERE id = p_confirmacao_id AND criado_por = auth.uid()
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Confirmação não encontrada';
  END IF;

  IF v_conf.status <> 'pendente' THEN
    RAISE EXCEPTION 'Esta confirmação já está com status: %', v_conf.status;
  END IF;

  IF v_conf.expira_em < now() THEN
    UPDATE public.chat_ia_confirmacoes SET status = 'expirada' WHERE id = v_conf.id;
    RAISE EXCEPTION 'Confirmação expirada — peça a alteração novamente no chat';
  END IF;

  -- Revalida a SQL armazenada (defesa em profundidade contra bypass).
  SELECT * INTO v_check FROM public._sacp_chat_validar(v_conf.sql, 'write');

  BEGIN
    EXECUTE format(
      'WITH _sacp_dml AS (%s RETURNING *) SELECT COALESCE(jsonb_agg(to_jsonb(_sacp_dml)), ''[]''::jsonb) FROM _sacp_dml',
      v_check.sql_limpo
    ) INTO v_result;

    v_count := jsonb_array_length(v_result);

    UPDATE public.chat_ia_confirmacoes
    SET status = 'executada', resultado = v_result, linhas_afetadas = v_count, executada_em = now()
    WHERE id = v_conf.id;

    INSERT INTO public.chat_ia_execucoes (usuario_id, tipo, sql, tabela, linhas, sucesso, confirmacao_id)
    VALUES (auth.uid(), v_conf.operacao, v_check.sql_limpo, v_check.tabela, v_count, true, v_conf.id);

    RETURN jsonb_build_object('linhas_afetadas', v_count, 'resultado', v_result);
  EXCEPTION WHEN OTHERS THEN
    v_erro := SQLERRM;
    UPDATE public.chat_ia_confirmacoes SET status = 'erro' WHERE id = v_conf.id;
    INSERT INTO public.chat_ia_execucoes (usuario_id, tipo, sql, tabela, sucesso, erro, confirmacao_id)
    VALUES (auth.uid(), v_conf.operacao, v_conf.sql, v_conf.tabela, false, v_erro, v_conf.id);
    RAISE;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.sacp_chat_confirmar_escrita(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sacp_chat_confirmar_escrita(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 6) Escrita — passo 2b: cancelar (usuário recusou a confirmação)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sacp_chat_cancelar_escrita(p_confirmacao_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_ia_confirmacoes
  SET status = 'cancelada'
  WHERE id = p_confirmacao_id AND criado_por = auth.uid() AND status = 'pendente';
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.sacp_chat_cancelar_escrita(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sacp_chat_cancelar_escrita(uuid) TO authenticated;

SELECT 'Chat IA: tabelas e RPCs criadas/atualizadas com sucesso.' AS resultado;
