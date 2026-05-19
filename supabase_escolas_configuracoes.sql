ALTER TABLE escolas ADD COLUMN IF NOT EXISTS configuracoes JSONB DEFAULT '{}'::jsonb;
