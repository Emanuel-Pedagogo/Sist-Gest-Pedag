-- ============================================================
-- SACP — RPC para atualizar etiqueta do aluno (papel professor)
-- Pré-requisitos:
--   1) supabase_professores_user_id.sql
--   2) supabase_professores_rls_papeis.sql
--      (funções sacp_is_coordenador / sacp_aluno_na_minha_turma)
--
-- Motivo: RLS de alunos permite UPDATE só ao coordenador.
-- Professor precisa persistir etiqueta_cor após lançar
-- sondagem/ocorrência/nota sem poder editar o restante do cadastro.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sacp_atualizar_etiqueta_aluno(
  p_aluno_id uuid,
  p_etiqueta_cor text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cor text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF p_aluno_id IS NULL THEN
    RAISE EXCEPTION 'aluno_id obrigatório';
  END IF;

  v_cor := lower(trim(COALESCE(p_etiqueta_cor, '')));
  IF v_cor NOT IN ('verde', 'amarelo', 'vermelho', 'azul', 'roxo') THEN
    RAISE EXCEPTION 'etiqueta_cor inválida: %', p_etiqueta_cor;
  END IF;

  IF NOT (
    public.sacp_is_coordenador()
    OR public.sacp_aluno_na_minha_turma(p_aluno_id)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para atualizar etiqueta deste aluno';
  END IF;

  UPDATE public.alunos
  SET etiqueta_cor = v_cor
  WHERE id = p_aluno_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.sacp_atualizar_etiqueta_aluno(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sacp_atualizar_etiqueta_aluno(uuid, text) TO authenticated;

SELECT 'RPC sacp_atualizar_etiqueta_aluno pronta.' AS resultado;
