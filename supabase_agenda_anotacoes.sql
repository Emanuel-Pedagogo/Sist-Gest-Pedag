-- Anotações do dia do evento (separadas da observação do cadastro)
-- Execute no SQL Editor do Supabase

ALTER TABLE agenda_eventos
  ADD COLUMN IF NOT EXISTS anotacoes text;

COMMENT ON COLUMN agenda_eventos.descricao IS 'Observação / lembrete definido no cadastro do evento (planejamento)';
COMMENT ON COLUMN agenda_eventos.anotacoes IS 'Anotações registradas no dia, durante o evento';

SELECT 'Coluna anotacoes adicionada em agenda_eventos.' AS resultado;
