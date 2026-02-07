-- ============================================================
-- ADICIONAR COLUNAS foto_escrita_url e audio_leitura_url
-- (se a tabela sondagens já existir sem essas colunas)
-- ============================================================
-- Supabase: SQL Editor > New query > cole este arquivo > Run
-- ============================================================

ALTER TABLE public.sondagens
  ADD COLUMN IF NOT EXISTS foto_escrita_url text,
  ADD COLUMN IF NOT EXISTS audio_leitura_url text;

SELECT 'Colunas foto_escrita_url e audio_leitura_url adicionadas.' AS resultado;
