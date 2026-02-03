-- Inclui 'azul' na constraint de etiqueta_cor da tabela alunos
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor)
-- O app usa 'azul' como padrão (Regular); a constraint atual só permite verde, amarelo, vermelho, roxo.

ALTER TABLE public.alunos
  DROP CONSTRAINT IF EXISTS alunos_etiqueta_cor_check;

ALTER TABLE public.alunos
  ADD CONSTRAINT alunos_etiqueta_cor_check
  CHECK (etiqueta_cor = ANY (ARRAY['azul'::text, 'verde'::text, 'amarelo'::text, 'vermelho'::text, 'roxo'::text]));
