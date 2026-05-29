-- Colunas para eventos recorrentes na agenda
-- Execute no SQL Editor do Supabase

ALTER TABLE agenda_eventos
  ADD COLUMN IF NOT EXISTS serie_id uuid;

COMMENT ON COLUMN agenda_eventos.serie_id IS 'Agrupa instâncias de um mesmo evento recorrente';

CREATE INDEX IF NOT EXISTS idx_agenda_eventos_serie_id ON agenda_eventos (serie_id);

SELECT 'Coluna serie_id adicionada em agenda_eventos.' AS resultado;
