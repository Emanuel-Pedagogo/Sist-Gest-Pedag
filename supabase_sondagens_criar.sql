-- ============================================================
-- CRIAR TABELA sondagens (rode tudo de uma vez no SQL Editor)
-- ============================================================
-- Supabase: Table Editor > SQL Editor > New query > cole este arquivo > Run
-- Depois dê refresh na lista de tabelas (ícone de atualizar) se não aparecer.
-- ============================================================

-- Remove a tabela se já existir (CUIDADO: apaga dados). Use só se quiser recomeçar.
-- DROP TABLE IF EXISTS public.sondagens;

-- Cria a tabela
CREATE TABLE IF NOT EXISTS public.sondagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL,
  data date NOT NULL,
  nivel_escrita text NOT NULL,
  nivel_leitura text NOT NULL,
  foto_escrita_url text,
  audio_leitura_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Opcional: vincular à tabela alunos (descomente se a tabela alunos existir)
-- ALTER TABLE public.sondagens
--   ADD CONSTRAINT fk_sondagens_aluno
--   FOREIGN KEY (aluno_id) REFERENCES public.alunos(id) ON DELETE CASCADE;

-- Índice para buscas por aluno
CREATE INDEX IF NOT EXISTS idx_sondagens_aluno_id ON public.sondagens(aluno_id);

-- Índice para ordenar por data
CREATE INDEX IF NOT EXISTS idx_sondagens_data ON public.sondagens(data DESC);

-- Confirma que a tabela foi criada (deve retornar 1 linha)
SELECT 'Tabela sondagens criada com sucesso.' AS resultado;

-- ============================================================
-- BUCKET PARA ANEXOS (foto da escrita e áudio da leitura)
-- No Supabase: Storage > New bucket > nome: sondagens-anexos
-- Marque "Public bucket" se quiser abrir foto/áudio direto pelo link.
-- ============================================================
