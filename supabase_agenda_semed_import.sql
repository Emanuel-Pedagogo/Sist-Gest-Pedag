-- Campos para distinguir marcos SEMED do planejamento do usuário
-- Execute no SQL Editor do Supabase

ALTER TABLE agenda_eventos
  ADD COLUMN IF NOT EXISTS origem text DEFAULT 'usuario';

ALTER TABLE agenda_eventos
  ADD COLUMN IF NOT EXISTS tipo_marco text;

ALTER TABLE agenda_eventos
  ADD COLUMN IF NOT EXISTS import_batch_id uuid;

COMMENT ON COLUMN agenda_eventos.origem IS 'usuario | sem_ed';
COMMENT ON COLUMN agenda_eventos.tipo_marco IS 'feriado, recesso, marco_letivo, avaliacao, recomposicao, referencia';

CREATE INDEX IF NOT EXISTS idx_agenda_eventos_origem ON agenda_eventos (origem);
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_import_batch ON agenda_eventos (import_batch_id);

SELECT 'Colunas de importação SEMED adicionadas.' AS resultado;
