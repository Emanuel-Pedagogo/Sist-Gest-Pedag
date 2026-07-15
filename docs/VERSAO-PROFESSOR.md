# Versão Professor — guia de ativação

Implementação baseada em [`PROPOSTA-VERSAO-PROFESSOR.md`](./PROPOSTA-VERSAO-PROFESSOR.md).

## O que já está no código

- Resolução de papel após login (`src/utils/userRole.js`): se existir registro em `professores` com `user_id` ou `auth_email`, o usuário entra como **professor**.
- Menu, bottom nav e telas restritas ao escopo do professor.
- Guard contínuo de views (bloqueia `?view=settings` e localStorage fora do escopo).
- Cadastro de aluno/turma/escola/configurações **e** importações (lista/sondagem/boletim) ocultos para professor.
- Agenda em **somente leitura** para professor.
- Dashboard com métricas só das turmas vinculadas.
- Área **Minhas entregas** (`currentView=entregas`); item ativo na bottom nav.
- Modal de professor (coordenador) com campo **E-mail de acesso**.
- Recálculo de etiqueta via RPC `sacp_atualizar_etiqueta_aluno` (fallback UPDATE se RPC ausente).

## Scripts SQL (obrigatório no Supabase)

Execute **nesta ordem** no SQL Editor (ou CLI `--linked`):

1. Preferível: `supabase_piloto_seguranca.sql` (authenticated-only)
2. `supabase_professores_user_id.sql` — colunas `user_id` e `auth_email`
3. `supabase_professores_rls_papeis.sql` — RLS por papel
4. `supabase_professores_etiqueta_rpc.sql` — RPC para professor persistir `etiqueta_cor`

Sem o passo 2, o vínculo por e-mail/user_id **não funciona**.  
Sem o passo 3, o isolamento no banco **não está garantido** (só o filtro da UI).  
Sem o passo 4, o professor pode lançar sondagem/nota/ocorrência, mas a **etiqueta pode não persistir** (RLS bloqueia UPDATE em `alunos`).

## Como testar (checklist rápido)

1. Como **coordenador**, cadastre/edite um professor, selecione as turmas e informe o **mesmo e-mail** da conta Auth do professor.
2. Crie a conta do professor (cadastro/Google) com esse e-mail, se ainda não existir.
3. Faça login como professor → deve ver “Área do Professor”, só as turmas vinculadas; totais do dashboard batem com essas turmas.
4. Abra um aluno → registre sondagem/ocorrência/nota; confira no login do coordenador; confira que a etiqueta recalculou.
5. Em “Minhas entregas”, registre uma entrega e confira no perfil do professor (coordenador).
6. Tente abrir `?view=settings` logado como professor → deve ser bloqueado e voltar ao início (toast).
7. Confirme que botões de importar lista/sondagem/boletim **não aparecem** para o professor.
8. (Com RLS) Login com outro professor → não vê turmas/alunos alheios.

## Critérios de aceite (da proposta)

- [ ] Professor só vê turmas vinculadas
- [ ] Não vê alunos de outras turmas (UI + idealmente RLS)
- [ ] Consegue lançar sondagem/ocorrência/nota visíveis ao coordenador
- [ ] Etiqueta recalcula com a regra existente (RPC aplicada)
- [ ] Coordenador sem regressão
- [ ] RLS: anon negado; professor de outra turma não cruza dados
