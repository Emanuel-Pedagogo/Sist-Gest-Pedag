-- ============================================================
-- SACP — Verificação rápida do banco (piloto confiável)
-- Cole no SQL Editor do Supabase e execute de uma vez.
-- ============================================================

-- 1) Tabelas esperadas pelo app
SELECT
  t.table_name,
  CASE WHEN c.relname IS NOT NULL THEN 'OK' ELSE 'FALTANDO' END AS status
FROM (
  VALUES
    ('escolas'),
    ('turmas'),
    ('alunos'),
    ('ocorrencias'),
    ('notas'),
    ('frequencia_historico'),
    ('agenda_eventos'),
    ('sondagens'),
    ('notas_boletim'),
    ('professores'),
    ('entregas_docentes'),
    ('registros_coordenacao'),
    ('alunos_turmas_especiais'),
    ('diario_frequencia_especial'),
    ('relatorio_avaliacao_pre')
) AS t(table_name)
LEFT JOIN pg_class c ON c.relname = t.table_name AND c.relnamespace = 'public'::regnamespace
ORDER BY status DESC, table_name;

-- 2) Colunas críticas (ALTER scripts incrementais)
SELECT
  item,
  CASE WHEN ok THEN 'OK' ELSE 'FALTANDO' END AS status
FROM (
  SELECT 'escolas.configuracoes' AS item,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'escolas' AND column_name = 'configuracoes'
    ) AS ok
  UNION ALL
  SELECT 'escolas.arquivada',
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'escolas' AND column_name = 'arquivada'
    )
  UNION ALL
  SELECT 'turmas.turma_especial',
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'turmas' AND column_name = 'turma_especial'
    )
  UNION ALL
  SELECT 'notas_boletim.falta',
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notas_boletim' AND column_name = 'falta'
    )
  UNION ALL
  SELECT 'notas_boletim.rs1',
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notas_boletim' AND column_name = 'rs1'
    )
  UNION ALL
  SELECT 'notas_boletim.rs2',
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notas_boletim' AND column_name = 'rs2'
    )
  UNION ALL
  SELECT 'sondagens.foto_escrita_url',
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sondagens' AND column_name = 'foto_escrita_url'
    )
  UNION ALL
  SELECT 'sondagens.audio_leitura_url',
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sondagens' AND column_name = 'audio_leitura_url'
    )
  UNION ALL
  SELECT 'agenda_eventos.origem',
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'agenda_eventos' AND column_name = 'origem'
    )
  UNION ALL
  SELECT 'agenda_eventos.serie_id',
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'agenda_eventos' AND column_name = 'serie_id'
    )
  UNION ALL
  SELECT 'agenda_eventos.anotacoes',
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'agenda_eventos' AND column_name = 'anotacoes'
    )
) AS checks
ORDER BY status DESC, item;

-- 3) RLS habilitado e policies com role anon (risco no piloto)
SELECT
  c.relname AS tabela,
  c.relrowsecurity AS rls_ativo,
  COUNT(p.policyname) FILTER (WHERE 'anon' = ANY (p.roles)) AS policies_anon,
  COUNT(p.policyname) FILTER (WHERE 'authenticated' = ANY (p.roles)) AS policies_authenticated,
  COUNT(p.policyname) AS total_policies
FROM pg_class c
LEFT JOIN pg_policies p ON p.tablename = c.relname AND p.schemaname = 'public'
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relkind = 'r'
  AND c.relname IN (
    'escolas', 'turmas', 'alunos', 'ocorrencias', 'notas', 'frequencia_historico',
    'agenda_eventos', 'sondagens', 'notas_boletim', 'professores',
    'entregas_docentes', 'registros_coordenacao', 'alunos_turmas_especiais',
    'diario_frequencia_especial', 'relatorio_avaliacao_pre'
  )
GROUP BY c.relname, c.relrowsecurity
ORDER BY policies_anon DESC NULLS LAST, tabela;

-- 4) Storage: policies anon nos buckets do app
SELECT
  policyname,
  cmd,
  roles::text AS roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname ILIKE ANY (ARRAY[
    '%sondagens-anexos%',
    '%documentos-aee%',
    '%agenda-arquivos%'
  ])
ORDER BY policyname;

-- 5) Buckets (via storage.buckets)
SELECT id, name, public, created_at
FROM storage.buckets
WHERE name IN ('sondagens-anexos', 'documentos-aee', 'agenda-arquivos')
ORDER BY name;
