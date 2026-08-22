-- ============================================================
-- SACP — Fecha o isolamento por conta nas tabelas que ficaram de fora
--
-- A migração supabase_contas_multitenancy.sql isolou escolas, turmas,
-- alunos, sondagens, ocorrencias, notas_boletim, agenda_eventos,
-- professores, entregas_docentes e registros_coordenacao — mas nove
-- tabelas continuaram com a regra antiga:
--
--   a) USING (true)  -> qualquer usuário logado lê/escreve tudo:
--      alunos_turmas_especiais, diario_frequencia_especial,
--      relatorio_avaliacao_pre, notas, emprestimos_biblioteca
--   b) sacp_is_coordenador() -> que significa "qualquer autenticado que
--      NÃO é professor vinculado", ou seja: todo professor autônomo:
--      diario_classe_frequencia, diario_classe_conteudos,
--      frequencia_historico, chat_ia_execucoes (SELECT)
--
-- Consequência real: um professor autônomo recém-cadastrado enxergava
-- os registros de presença e vínculos de alunos das escolas do piloto.
--
-- Esta migração aplica o mesmo padrão da anterior, reutilizando os
-- helpers já existentes: sacp_coordeno_turma / sacp_coordeno_aluno
-- (coordenador da conta dona) e sacp_my_turma_ids /
-- sacp_aluno_na_minha_turma (professor vinculado).
--
-- FORA DE PROPÓSITO: livros_biblioteca continua compartilhada — é
-- catálogo de título/autor/código, sem nenhum dado pessoal de aluno.
--
-- NOTA sobre diario_classe_*: as políticas antigas de INSERT/UPDATE
-- exigiam também professor_id = sacp_my_professor_id(). Isso quebrava o
-- lançamento sempre que o app não mandava o professor_id (bug real
-- encontrado em teste) sem agregar segurança — o escopo por turma já
-- impede escrever na turma de outra pessoa. A exigência foi removida;
-- professor_id continua gravado, mas só para atribuição/histórico.
--
-- Pré-requisito: supabase_contas_multitenancy.sql aplicado.
-- ============================================================

-- ======================== 1. Escopo por turma_id ========================

-- ---------- alunos_turmas_especiais ----------
ALTER TABLE public.alunos_turmas_especiais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sacp_auth_select ON public.alunos_turmas_especiais;
DROP POLICY IF EXISTS sacp_auth_insert ON public.alunos_turmas_especiais;
DROP POLICY IF EXISTS sacp_auth_update ON public.alunos_turmas_especiais;
DROP POLICY IF EXISTS sacp_auth_delete ON public.alunos_turmas_especiais;
DROP POLICY IF EXISTS sacp_ate_select ON public.alunos_turmas_especiais;
DROP POLICY IF EXISTS sacp_ate_insert ON public.alunos_turmas_especiais;
DROP POLICY IF EXISTS sacp_ate_update ON public.alunos_turmas_especiais;
DROP POLICY IF EXISTS sacp_ate_delete ON public.alunos_turmas_especiais;

CREATE POLICY sacp_ate_select ON public.alunos_turmas_especiais
  FOR SELECT TO authenticated
  USING (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()));

CREATE POLICY sacp_ate_insert ON public.alunos_turmas_especiais
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()));

CREATE POLICY sacp_ate_update ON public.alunos_turmas_especiais
  FOR UPDATE TO authenticated
  USING (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()))
  WITH CHECK (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()));

CREATE POLICY sacp_ate_delete ON public.alunos_turmas_especiais
  FOR DELETE TO authenticated
  USING (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()));

-- ---------- diario_frequencia_especial ----------
ALTER TABLE public.diario_frequencia_especial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sacp_auth_select ON public.diario_frequencia_especial;
DROP POLICY IF EXISTS sacp_auth_insert ON public.diario_frequencia_especial;
DROP POLICY IF EXISTS sacp_auth_update ON public.diario_frequencia_especial;
DROP POLICY IF EXISTS sacp_auth_delete ON public.diario_frequencia_especial;
DROP POLICY IF EXISTS sacp_dfe_select ON public.diario_frequencia_especial;
DROP POLICY IF EXISTS sacp_dfe_insert ON public.diario_frequencia_especial;
DROP POLICY IF EXISTS sacp_dfe_update ON public.diario_frequencia_especial;
DROP POLICY IF EXISTS sacp_dfe_delete ON public.diario_frequencia_especial;

CREATE POLICY sacp_dfe_select ON public.diario_frequencia_especial
  FOR SELECT TO authenticated
  USING (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()));

CREATE POLICY sacp_dfe_insert ON public.diario_frequencia_especial
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()));

CREATE POLICY sacp_dfe_update ON public.diario_frequencia_especial
  FOR UPDATE TO authenticated
  USING (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()))
  WITH CHECK (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()));

CREATE POLICY sacp_dfe_delete ON public.diario_frequencia_especial
  FOR DELETE TO authenticated
  USING (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()));

-- ---------- diario_classe_frequencia ----------
DROP POLICY IF EXISTS sacp_diario_freq_select ON public.diario_classe_frequencia;
DROP POLICY IF EXISTS sacp_diario_freq_insert ON public.diario_classe_frequencia;
DROP POLICY IF EXISTS sacp_diario_freq_update ON public.diario_classe_frequencia;
DROP POLICY IF EXISTS sacp_diario_freq_delete ON public.diario_classe_frequencia;

CREATE POLICY sacp_diario_freq_select ON public.diario_classe_frequencia
  FOR SELECT TO authenticated
  USING (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()));

CREATE POLICY sacp_diario_freq_insert ON public.diario_classe_frequencia
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()));

CREATE POLICY sacp_diario_freq_update ON public.diario_classe_frequencia
  FOR UPDATE TO authenticated
  USING (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()))
  WITH CHECK (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()));

CREATE POLICY sacp_diario_freq_delete ON public.diario_classe_frequencia
  FOR DELETE TO authenticated
  USING (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()));

-- ---------- diario_classe_conteudos ----------
DROP POLICY IF EXISTS sacp_diario_conteudos_select ON public.diario_classe_conteudos;
DROP POLICY IF EXISTS sacp_diario_conteudos_insert ON public.diario_classe_conteudos;
DROP POLICY IF EXISTS sacp_diario_conteudos_update ON public.diario_classe_conteudos;
DROP POLICY IF EXISTS sacp_diario_conteudos_delete ON public.diario_classe_conteudos;

CREATE POLICY sacp_diario_conteudos_select ON public.diario_classe_conteudos
  FOR SELECT TO authenticated
  USING (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()));

CREATE POLICY sacp_diario_conteudos_insert ON public.diario_classe_conteudos
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()));

CREATE POLICY sacp_diario_conteudos_update ON public.diario_classe_conteudos
  FOR UPDATE TO authenticated
  USING (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()))
  WITH CHECK (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()));

CREATE POLICY sacp_diario_conteudos_delete ON public.diario_classe_conteudos
  FOR DELETE TO authenticated
  USING (public.sacp_coordeno_turma(turma_id) OR turma_id = ANY (public.sacp_my_turma_ids()));

-- ======================== 2. Escopo por aluno_id ========================

-- ---------- frequencia_historico ----------
DROP POLICY IF EXISTS sacp_frequencia_select ON public.frequencia_historico;
DROP POLICY IF EXISTS sacp_frequencia_insert ON public.frequencia_historico;
DROP POLICY IF EXISTS sacp_frequencia_update ON public.frequencia_historico;
DROP POLICY IF EXISTS sacp_frequencia_delete ON public.frequencia_historico;

CREATE POLICY sacp_frequencia_select ON public.frequencia_historico
  FOR SELECT TO authenticated
  USING (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id));

CREATE POLICY sacp_frequencia_insert ON public.frequencia_historico
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id));

CREATE POLICY sacp_frequencia_update ON public.frequencia_historico
  FOR UPDATE TO authenticated
  USING (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id))
  WITH CHECK (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id));

CREATE POLICY sacp_frequencia_delete ON public.frequencia_historico
  FOR DELETE TO authenticated
  USING (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id));

-- ---------- relatorio_avaliacao_pre ----------
ALTER TABLE public.relatorio_avaliacao_pre ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sacp_auth_select ON public.relatorio_avaliacao_pre;
DROP POLICY IF EXISTS sacp_auth_insert ON public.relatorio_avaliacao_pre;
DROP POLICY IF EXISTS sacp_auth_update ON public.relatorio_avaliacao_pre;
DROP POLICY IF EXISTS sacp_auth_delete ON public.relatorio_avaliacao_pre;
DROP POLICY IF EXISTS sacp_rap_select ON public.relatorio_avaliacao_pre;
DROP POLICY IF EXISTS sacp_rap_insert ON public.relatorio_avaliacao_pre;
DROP POLICY IF EXISTS sacp_rap_update ON public.relatorio_avaliacao_pre;
DROP POLICY IF EXISTS sacp_rap_delete ON public.relatorio_avaliacao_pre;

CREATE POLICY sacp_rap_select ON public.relatorio_avaliacao_pre
  FOR SELECT TO authenticated
  USING (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id));

CREATE POLICY sacp_rap_insert ON public.relatorio_avaliacao_pre
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id));

CREATE POLICY sacp_rap_update ON public.relatorio_avaliacao_pre
  FOR UPDATE TO authenticated
  USING (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id))
  WITH CHECK (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id));

CREATE POLICY sacp_rap_delete ON public.relatorio_avaliacao_pre
  FOR DELETE TO authenticated
  USING (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id));

-- ---------- notas (legado, hoje sem uso) ----------
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sacp_auth_select ON public.notas;
DROP POLICY IF EXISTS sacp_auth_insert ON public.notas;
DROP POLICY IF EXISTS sacp_auth_update ON public.notas;
DROP POLICY IF EXISTS sacp_auth_delete ON public.notas;
DROP POLICY IF EXISTS sacp_notas_legado_select ON public.notas;
DROP POLICY IF EXISTS sacp_notas_legado_insert ON public.notas;
DROP POLICY IF EXISTS sacp_notas_legado_update ON public.notas;
DROP POLICY IF EXISTS sacp_notas_legado_delete ON public.notas;

CREATE POLICY sacp_notas_legado_select ON public.notas
  FOR SELECT TO authenticated
  USING (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id));

CREATE POLICY sacp_notas_legado_insert ON public.notas
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id));

CREATE POLICY sacp_notas_legado_update ON public.notas
  FOR UPDATE TO authenticated
  USING (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id))
  WITH CHECK (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id));

CREATE POLICY sacp_notas_legado_delete ON public.notas
  FOR DELETE TO authenticated
  USING (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id));

-- ---------- emprestimos_biblioteca ----------
-- Guarda aluno_nome/turma_nome desnormalizados (dado pessoal). Hoje a
-- tabela está vazia e nenhum código do app escreve nela; o escopo exige
-- aluno_id vinculado — empréstimo sem aluno cadastrado não é suportado.
ALTER TABLE public.emprestimos_biblioteca ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS emprestimos_select_authenticated ON public.emprestimos_biblioteca;
DROP POLICY IF EXISTS emprestimos_insert_authenticated ON public.emprestimos_biblioteca;
DROP POLICY IF EXISTS emprestimos_update_authenticated ON public.emprestimos_biblioteca;
DROP POLICY IF EXISTS emprestimos_delete_authenticated ON public.emprestimos_biblioteca;
DROP POLICY IF EXISTS sacp_emprestimos_select ON public.emprestimos_biblioteca;
DROP POLICY IF EXISTS sacp_emprestimos_insert ON public.emprestimos_biblioteca;
DROP POLICY IF EXISTS sacp_emprestimos_update ON public.emprestimos_biblioteca;
DROP POLICY IF EXISTS sacp_emprestimos_delete ON public.emprestimos_biblioteca;

CREATE POLICY sacp_emprestimos_select ON public.emprestimos_biblioteca
  FOR SELECT TO authenticated
  USING (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id));

CREATE POLICY sacp_emprestimos_insert ON public.emprestimos_biblioteca
  FOR INSERT TO authenticated
  WITH CHECK (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id));

CREATE POLICY sacp_emprestimos_update ON public.emprestimos_biblioteca
  FOR UPDATE TO authenticated
  USING (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id))
  WITH CHECK (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id));

CREATE POLICY sacp_emprestimos_delete ON public.emprestimos_biblioteca
  FOR DELETE TO authenticated
  USING (public.sacp_coordeno_aluno(aluno_id) OR public.sacp_aluno_na_minha_turma(aluno_id));

-- ======================== 3. Log de auditoria do Chat IA ========================
-- O log guarda o SQL executado, que pode conter nomes/dados de aluno.
-- Cada usuário passa a ver somente as próprias execuções.
DROP POLICY IF EXISTS chat_ia_execucoes_select ON public.chat_ia_execucoes;
CREATE POLICY chat_ia_execucoes_select ON public.chat_ia_execucoes
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid());

-- ======================== 4. Correção: agenda_eventos ========================
-- A migração contas_multitenancy passou a exigir sacp_coordeno_escola(escola_id),
-- mas o app nunca preencheu escola_id ao criar um evento — o que quebrou a
-- criação de eventos para TODOS os usuários. O escopo agora aceita escola_id
-- OU turma_id (o que estiver preenchido); o app também passou a enviar
-- escola_id (ver basePayload em handleSaveEvent, src/App.jsx).
DROP POLICY IF EXISTS sacp_agenda_select ON public.agenda_eventos;
DROP POLICY IF EXISTS sacp_agenda_insert_coord ON public.agenda_eventos;
DROP POLICY IF EXISTS sacp_agenda_update_coord ON public.agenda_eventos;
DROP POLICY IF EXISTS sacp_agenda_delete_coord ON public.agenda_eventos;

CREATE POLICY sacp_agenda_select ON public.agenda_eventos
  FOR SELECT TO authenticated
  USING (
    public.sacp_coordeno_escola(escola_id)
    OR public.sacp_coordeno_turma(turma_id)
    OR escola_id = public.sacp_my_escola_id()
    OR turma_id = ANY (public.sacp_my_turma_ids())
  );

CREATE POLICY sacp_agenda_insert_coord ON public.agenda_eventos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.sacp_coordeno_escola(escola_id)
    OR public.sacp_coordeno_turma(turma_id)
  );

CREATE POLICY sacp_agenda_update_coord ON public.agenda_eventos
  FOR UPDATE TO authenticated
  USING (
    public.sacp_coordeno_escola(escola_id)
    OR public.sacp_coordeno_turma(turma_id)
  )
  WITH CHECK (
    public.sacp_coordeno_escola(escola_id)
    OR public.sacp_coordeno_turma(turma_id)
  );

CREATE POLICY sacp_agenda_delete_coord ON public.agenda_eventos
  FOR DELETE TO authenticated
  USING (
    public.sacp_coordeno_escola(escola_id)
    OR public.sacp_coordeno_turma(turma_id)
  );

SELECT 'Isolamento por conta aplicado nas tabelas restantes.' AS resultado;
