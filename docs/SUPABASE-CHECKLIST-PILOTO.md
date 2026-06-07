# SACP — Checklist Supabase (piloto confiável)

Auditoria do projeto **SACP** (`bzajsqxtaypgkejbmtxi`), gerada a partir do repositório e consultas via Supabase CLI.

Use este documento **antes** de inserir dados reais de alunos no piloto.

---

## Resumo executivo (estado atual)

| Área | Status | Observação |
|------|--------|------------|
| Tabelas principais | OK | 15 tabelas usadas pelo app existem; dados reais (387 alunos, 3363 notas_boletim) |
| Scripts incrementais (colunas) | OK | `configuracoes`, `arquivada`, `turma_especial`, RS1/RS2, agenda SEMED, etc. |
| Buckets Storage | OK | `sondagens-anexos`, `documentos-aee`, `agenda-arquivos` |
| Edge Functions | OK | `extract-sondagens`, `extract-boletins-pdf`, `generate-resumo-aluno` (ACTIVE) |
| Secret `GEMINI_API_KEY` | OK | Configurado no projeto |
| **RLS tabelas núcleo** | **CRÍTICO** | `escolas`, `turmas`, `alunos`, `ocorrencias`, `sondagens`, `agenda_eventos` etc. estão **sem RLS** — qualquer pessoa com a chave `anon` do app pode ler/gravar |
| **Policy notas_boletim** | **CRÍTICO** | Policy `"Acesso Total Notas"` para role `public` (= anon + autenticado) |
| **Storage anon** | **ALTO** | Todos os buckets têm policies `INSERT/SELECT/DELETE` para `anon` |
| **Professores / turmas especiais** | **MÉDIO** | `professores` e `diario_frequencia_especial` ainda permitem `anon` |
| Cadastro aberto | Pendente (Dashboard) | Restringir convites no Auth durante o piloto |

---

## 1. Verificação automática (rode agora)

No terminal, na pasta do projeto (com Supabase CLI logado e projeto vinculado):

```powershell
cd C:\dev\Sist-Gest-Pedag
supabase db query --linked -f supabase_verificacao_piloto.sql
```

Ou cole o mesmo arquivo no **SQL Editor** do Dashboard.

---

## 2. Ordem dos scripts SQL (só o que falta)

Se a verificação acima marcar **FALTANDO**, execute **apenas** os arquivos indicados, na ordem abaixo.  
Se tudo estiver **OK**, pule para a seção 3 (segurança).

| # | Arquivo | Quando rodar |
|---|---------|--------------|
| 1 | `supabase_escolas_configuracoes.sql` | Coluna `escolas.configuracoes` ausente |
| 2 | `supabase_escolas_arquivar.sql` | Coluna `escolas.arquivada` ausente |
| 3 | `supabase_turmas_turma_especial.sql` | Coluna `turmas.turma_especial` ausente |
| 4 | `supabase_alunos_etiqueta_fix.sql` | Erro ao salvar etiqueta `azul` |
| 5 | `supabase_alunos_turmas_especiais.sql` | Tabela `alunos_turmas_especiais` ausente |
| 6 | `supabase_sondagens_criar.sql` | Tabela `sondagens` ausente |
| 7 | `supabase_sondagens_fix.sql` | Colunas foto/áudio ausentes |
| 8 | `supabase_notas_boletim_criar.sql` ou `supabase_notas_boletim.sql` | Tabela `notas_boletim` ausente |
| 9 | `supabase_notas_boletim_fix.sql` | Coluna `falta` ausente |
| 10 | `supabase_notas_boletim_rs1_rs2.sql` | Colunas RS1/RS2 ausentes |
| 11 | `supabase_professores_criar.sql` | Tabela `professores` ausente |
| 12 | `supabase_entregas_registros_docentes.sql` | Tabelas de entregas/registros ausentes |
| 13 | `supabase_agenda_recorrencia.sql` | Coluna `serie_id` ausente |
| 14 | `supabase_agenda_anotacoes.sql` | Coluna `anotacoes` ausente |
| 15 | `supabase_agenda_semed_import.sql` | Colunas SEMED (`origem`, `tipo_marco`, `import_batch_id`) ausentes |
| 16 | `supabase_diario_frequencia_especial.sql` | Tabela diário turma especial ausente |
| 17 | `supabase_relatorio_pre_escola.sql` | Tabela pré-escola ausente |
| 18 | `supabase_storage_sondagens_policies.sql` | Bucket `sondagens-anexos` sem policies |
| 19 | `supabase_storage_documentos_aee_policies.sql` | Bucket `documentos-aee` sem policies |
| 20 | `supabase_storage_agenda_arquivos_policies.sql` | Bucket `agenda-arquivos` sem policies |

**Buckets (criar manualmente no Dashboard se não existirem):**

- `sondagens-anexos` — público hoje (links diretos); no piloto endurecido, preferir privado + signed URL depois
- `documentos-aee` — **privado** (correto)
- `agenda-arquivos` — público hoje

---

## 3. Segurança para o piloto (ação obrigatória)

### 3.1 Endurecer RLS e Storage

O script `supabase_piloto_seguranca.sql`:

- habilita RLS nas tabelas pedagógicas que hoje estão abertas;
- cria policies só para `authenticated` (usuário logado);
- remove policies `anon` de Storage e de tabelas auxiliares;
- remove a policy `"Acesso Total Notas"` e substitui por acesso só autenticado.

**Pré-requisito:** login e-mail/senha (ou Google) funcionando para todos os usuários do piloto.

**Como aplicar:**

```powershell
# 1) Faça backup (Dashboard > Database > Backups ou export manual)
# 2) Execute:
supabase db query --linked -f supabase_piloto_seguranca.sql
```

**Teste imediato após aplicar:** login → listar escolas/turmas/alunos → salvar uma ocorrência → upload em sondagem → importar PDF agenda (se usar).

Se algo falhar com erro `permission denied` ou `42501`, confirme que o usuário está logado (sessão ativa no app).

### 3.2 Auth (Dashboard — você)

Em [Supabase → Authentication](https://supabase.com/dashboard/project/bzajsqxtaypgkejbmtxi/auth/providers):

| Item | Recomendação piloto |
|------|---------------------|
| **Sign ups** | Desativar cadastro público ou exigir convite/e-mail na lista |
| **Redirect URLs** | `http://localhost:5173/`, URL de produção, `br.com.sacp.coordenacao://login-callback` |
| **E-mail confirmations** | Ativar se quiser evitar contas descartáveis |

### 3.3 Edge Functions

| Função | Deploy | Secret |
|--------|--------|--------|
| `extract-sondagens` | OK | `GEMINI_API_KEY` |
| `extract-boletins-pdf` | OK | idem |
| `generate-resumo-aluno` | OK | idem |

Re-deploy após alterar código:

```powershell
supabase secrets set GEMINI_API_KEY=sua_chave
supabase functions deploy extract-sondagens
supabase functions deploy extract-boletins-pdf
supabase functions deploy generate-resumo-aluno
```

**Nota:** `verify_jwt = false` nas functions (ver `supabase/config.toml`) — qualquer cliente pode chamar a URL se souber o endpoint. Para piloto interno é aceitável; depois ativar JWT e passar `Authorization` no frontend.

---

## 4. Tabelas esperadas pelo app

| Tabela | Uso |
|--------|-----|
| `escolas` | Multi-escola, configurações, arquivamento |
| `turmas` | Turmas regulares e especiais |
| `alunos` | Cadastro, etiquetas, AEE |
| `ocorrencias` | Histórico disciplinar/pedagógico |
| `sondagens` | Leitura/escrita, anexos |
| `notas_boletim` | Boletim e importação IA |
| `notas` / `frequencia_historico` | Legado (pouco uso; 0 linhas hoje) |
| `agenda_eventos` | Agenda + SEMED |
| `professores` | Módulo professores |
| `entregas_docentes` / `registros_coordenacao` | Acompanhamento docente |
| `alunos_turmas_especiais` | Turmas Libras/AEE |
| `diario_frequencia_especial` | Diário turma especial |
| `relatorio_avaliacao_pre` | Pré I / Pré II |
| `livros_biblioteca` / `emprestimos_biblioteca` | Biblioteca (fora do piloto; sem dados) |

---

## 5. Checklist manual (marque no Dashboard)

- [ ] Backup recente do banco
- [ ] `supabase_verificacao_piloto.sql` executado — colunas OK
- [ ] `supabase_piloto_seguranca.sql` executado — RLS endurecido
- [ ] Teste logado: CRUD escola, turma, aluno
- [ ] Teste logado: ocorrência + sondagem + boletim
- [ ] Teste IA: foto sondagem, PDF boletim turma, resumo aluno
- [ ] Cadastro público desativado ou controlado
- [ ] Política de privacidade (LGPD) definida antes de usuários externos
- [ ] Canal para reportar problemas (e-mail/WhatsApp do piloto)

---

## 6. Próximo passo sugerido

Depois deste checklist: seguir o **roteiro funcional** em [`PILOTO-CONFIAVEL.md`](./PILOTO-CONFIAVEL.md) §6 (login → escola → turma → alunos → …).

Para aplicar o endurecimento de segurança com apoio, diga **“aplicar segurança”** e validamos juntos os testes pós-script.
