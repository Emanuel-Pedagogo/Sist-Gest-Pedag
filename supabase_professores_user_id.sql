-- ============================================================
-- SACP — Vincular professor ao Auth (versão professor)
-- Rode no SQL Editor do Supabase (ou: supabase db query --linked -f ...)
-- Pré-requisito: tabela public.professores existente.
-- ============================================================

ALTER TABLE public.professores
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.professores
  ADD COLUMN IF NOT EXISTS auth_email text;

-- Um usuário Auth só pode estar vinculado a um registro de professor
CREATE UNIQUE INDEX IF NOT EXISTS idx_professores_user_id_unique
  ON public.professores(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_professores_auth_email
  ON public.professores(lower(auth_email))
  WHERE auth_email IS NOT NULL;

COMMENT ON COLUMN public.professores.user_id IS
  'Usuário Auth do Supabase vinculado a este professor (papel professor no app).';
COMMENT ON COLUMN public.professores.auth_email IS
  'E-mail de login do professor. No primeiro login, o app associa user_id automaticamente.';

SELECT 'Colunas professores.user_id e professores.auth_email prontas.' AS resultado;
