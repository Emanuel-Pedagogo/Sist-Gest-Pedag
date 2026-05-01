-- ============================================================
-- ARQUIVAR / DESARQUIVAR ESCOLAS (campo + índice)
-- ============================================================
-- Execute no SQL Editor do Supabase.
-- ============================================================

-- Adiciona a coluna de arquivamento (se não existir)
ALTER TABLE public.escolas
ADD COLUMN IF NOT EXISTS arquivada boolean NOT NULL DEFAULT false;

-- Índice para filtros por escola ativa/inativa
CREATE INDEX IF NOT EXISTS idx_escolas_arquivada ON public.escolas(arquivada);

-- Confirma
SELECT 'Campo arquivada adicionado em escolas.' AS resultado;

