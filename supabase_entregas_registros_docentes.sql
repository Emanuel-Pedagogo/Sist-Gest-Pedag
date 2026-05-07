-- ============================================================
-- Tabelas: entregas_docentes e registros_coordenacao
-- Alinhadas ao uso em src/App.jsx (perfil do professor)
-- Rode no SQL Editor do Supabase se ainda não existirem.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.entregas_docentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
  escola_id uuid NOT NULL,
  ano_letivo integer NOT NULL,
  tipo_documento text NOT NULL,
  referencia text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pendente',
  prazo date,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT entregas_docentes_status_check CHECK (
    lower(status) IN ('pendente', 'entregue', 'atrasado')
  )
);

CREATE INDEX IF NOT EXISTS idx_entregas_docentes_professor ON public.entregas_docentes(professor_id);
CREATE INDEX IF NOT EXISTS idx_entregas_docentes_escola_ano ON public.entregas_docentes(escola_id, ano_letivo);

CREATE TABLE IF NOT EXISTS public.registros_coordenacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
  escola_id uuid NOT NULL,
  ano_letivo integer NOT NULL,
  data_conversa date NOT NULL,
  assunto text NOT NULL DEFAULT '',
  relato text,
  encaminhamentos text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registros_coord_professor ON public.registros_coordenacao(professor_id);
CREATE INDEX IF NOT EXISTS idx_registros_coord_escola_ano ON public.registros_coordenacao(escola_id, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_registros_coord_data ON public.registros_coordenacao(data_conversa DESC);

SELECT 'Tabelas entregas_docentes e registros_coordenacao verificadas/criadas.' AS resultado;
