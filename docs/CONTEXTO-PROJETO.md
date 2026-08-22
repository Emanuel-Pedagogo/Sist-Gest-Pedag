# SACP — Contexto completo do projeto (para desenvolvedores e IAs)

> **Objetivo deste documento:** permitir que qualquer pessoa ou IA compreenda o que é o sistema, como foi construído, em que estágio está, quais riscos existem e onde pode evoluir — **sem precisar redescobrir o repositório do zero**.
>
> **Última atualização:** julho/2026 (commit aproximado `d073707` em `main`).
>
> **Idioma da UI e da comunicação com o usuário humano do projeto:** português (Brasil).

---

## 1. Resumo em uma frase

O **SACP (Sistema de Apoio à Coordenação Pedagógica)** é uma aplicação web/Android para **coordenadores pedagógicos** acompanharem escolas, turmas, alunos, professores, etiquetas de prioridade, sondagens, boletins, ocorrências, agenda e relatórios — com backend **Supabase** e apoio de **IA (Gemini)** em importações, sempre com revisão humana.

---

## 2. Identidade do produto

| Item | Valor |
|------|--------|
| Nome curto | SACP |
| Nome completo | Sistema de Apoio à Coordenação Pedagógica |
| Pacote Android | `br.com.sacp.coordenacao` |
| App name (Capacitor) | `SACP` |
| Público-alvo | Coordenação pedagógica da rede municipal (contexto SEMED / Santarém–PA) |
| Não é | ERP escolar completo, LMS, portal de alunos/pais, ou sistema financeiro |

### Problemas que resolve

1. Visão unificada **escola → turmas → alunos → professores**.
2. Priorização do acompanhamento via **etiquetas pedagógicas coloridas** (Adequado / Avançado / Atenção / Risco / AEE).
3. Registro contínuo de **sondagens** (leitura/escrita), **notas/boletim**, **ocorrências**, **frequência**.
4. **Agenda escolar** com importação do calendário SEMED (Santarém 2026).
5. Turmas especiais / **AEE** (documentos, diário de frequência especial).
6. Acompanhamento de **entregas docentes** e **registros de coordenação**.
7. **Relatórios/listas** exportáveis e **gráficos**.
8. Importação assistida por IA (foto de sondagem, PDF de boletim) + resumo pedagógico do aluno.
9. Uso em **navegador** e **app Android** (Capacitor).

### Contexto pedagógico importante

- As etiquetas são **apoio à decisão**, não “rótulo definitivo” do aluno.
- Qualquer dado extraído por IA deve ser **conferido por humano** antes de gravar.
- Há dados sensíveis de menores (LGPD): não tratar o piloto como ambiente aberto.

---

## 3. Stack tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19 + Vite 7 (SPA) |
| Estilo | CSS global (`src/App.css`, `src/index.css`), class-based; Tailwind foi removido do `package.json` (nunca esteve ligado ao build) |
| Backend | Supabase (Auth, PostgreSQL, Storage, Edge Functions) |
| IA | Google Gemini via Edge Functions (secret `GEMINI_API_KEY` no Supabase) |
| Mobile | Capacitor 7 (`android/`) |
| Exportação | jsPDF, docx, file-saver |
| PDF parse | pdfjs-dist |
| Gráficos | recharts |
| Testes | Vitest |
| Lint | ESLint 9 |

### Scripts npm principais

```bash
npm run dev              # Vite local
npm test                 # Vitest
npm run build            # Build web → dist/
npm run build:android    # build + cap sync android
npm run release:android  # script PowerShell de AAB assinado
npx eslint src           # lint útil do código-fonte (preferir isto)
```

> **Atenção:** `npm run lint` (`eslint .`) falha com ruído de artefatos em `android/`, `assets/` e bundles. Validação correta do front: `npx eslint src`.

---

## 4. Arquitetura (como o sistema está organizado)

```
┌──────────────────────────────────────────────┐
│  Web (Vite)  ou  Android WebView (Capacitor) │
│                React SPA                     │
│  App.jsx (hub) → views / modais / utils      │
└─────────────────────┬────────────────────────┘
                      │ HTTPS (supabase-js)
┌─────────────────────▼────────────────────────┐
│                  Supabase                    │
│  Auth · Postgres · Storage · Edge Functions  │
│         (Gemini só nas Edge Functions)       │
└──────────────────────────────────────────────┘
```

### Papéis dos diretórios

| Path | Papel |
|------|--------|
| `src/App.jsx` | **Hub monolítico** (~5k linhas): estado global, Auth, fetch CRUD Supabase, navegação, handlers, montagem de views/modais |
| `src/views/` | Telas por domínio (UI); muita lógica ainda sobe para `App.jsx` |
| `src/components/` | Peças reutilizáveis (modais, charts, feedback, nav, glossário) |
| `src/utils/` | Domínio puro (etiquetas, agenda, export, avaliação de cor, etc.) |
| `src/services/geminiApi.js` | `supabase.functions.invoke(...)` para as 3 Edge Functions |
| `src/agendaSemed/` | Bridge/toolbar/hook da importação de calendário SEMED |
| `src/supabaseClient.js` | Cliente Supabase singleton |
| `supabase/functions/` | Edge Functions Deno |
| `supabase_*.sql` (raiz) | Scripts SQL incrementais **manuais** (ainda **não** há `supabase/migrations/`) |
| `docs/` | Planos de piloto, Android, auditoria UI, Gemini, checklists |
| `android/` | Projeto nativo Capacitor |
| `scripts/` | Ex.: build de release Android |

### Navegação (sem React Router)

- Estado: `currentView` + `setCurrentView` / função `navigate(viewId)` em `App.jsx`.
- Persistência: `localStorage` key `sacp_currentView`.
- URL: query `?view=...` (e ids de seleção quando aplicável).
- Views usuais: `dashboard`, `schools`, `classes`, `students`, `student-detail`, `teachers`, `teacher-detail`, `emprestimos` (biblioteca), `reports`, `graficos`, `agenda`, `agenda-event-detail`, `profile`, `settings`.
- Mobile: `MobileBottomNav` — Início · Turmas · Alunos · Agenda · Mais (abre drawer/menu).

**Não adicionar React Router sem decisão explícita do produto.** Novas telas estendem o mapa `currentView` e a navegação em `App.jsx`.

### Autenticação

- Sessão: `supabase.auth.onAuthStateChange`.
- E-mail/senha: `signInWithPassword`, `signUp`, `resetPasswordForEmail`.
- Google: OAuth web; no Android usa fluxo nativo (`src/utils/nativeAuth.js`) + deep link `br.com.sacp.coordenacao://login-callback` (`src/utils/authRedirect.js`).
- Boot: `FeedbackProvider` em `main.jsx`; init nativo UI/auth quando em Capacitor.

### Cliente Supabase — divergência importante

- `.env.example` documenta `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- **`src/supabaseClient.js` ainda usa URL/anon key hardcoded** do projeto `bzajsqxtaypgkejbmtxi`.
- README recomenda `.env`, mas o client **ainda não lê** as variáveis — dívida técnica aberta.
- Nunca colocar **service role** no frontend. Nunca commitar secrets Gemini / keystores.

---

## 5. Modelo de domínio

### Relacionamentos principais

```
escolas 1──* turmas 1──* alunos
   │              └── turma_especial *──* alunos (alunos_turmas_especiais)
   ├── configuracoes (JSONB: regras de etiqueta por escola)
   └── arquivada

alunos 1──* ocorrencias
       1──* sondagens (+ Storage: sondagens-anexos)
       1──* notas_boletim
       └── AEE (etiqueta roxo + docs: documentos-aee)

turmas especiais → diario_frequencia_especial
pré-escola → relatorio_avaliacao_pre (quando aplicável)

professores (* turmas_ids)
   ├── entregas_docentes
   └── registros_coordenacao

agenda_eventos (escola/ano; recorrência serie_id; anotacoes;
                campos SEMED: origem, tipo_marco, import_batch_id;
                anexos: agenda-arquivos)
```

### Sistema de etiquetas (núcleo pedagógico)

**Fonte única de labels/cores/ícones/glossário:** `src/utils/etiquetas.js`

| Cor | Label UI | Sentido |
|-----|----------|---------|
| `azul` | Adequado | Dentro do esperado |
| `verde` | Avançado | Acima / avanço consistente |
| `amarelo` | Atenção | Dificuldades a acompanhar |
| `vermelho` | Risco | Prioridade da coordenação |
| `roxo` | AEE | Atendimento educacional especializado |

**Avaliação automática:** `src/utils/studentColorEvaluator.js`

- Funções: `evaluateStudentEtiqueta` / `evaluateStudentColor`, `getMotivoOrigemEtiqueta`, helpers de pré/1º ano.
- Prioridade de cores: **roxo → vermelho → amarelo → verde → azul** (default azul).
- Critérios por cor vêm de `escolas.configuracoes` (editados em `SettingsView`): faixas de notas, níveis de sondagem, tipos de ocorrência.
- Pré I/II e 1º ano: `ignorarNotasNaEtiqueta` — considera sondagem + ocorrência (não notas).
- Motivo legível enriquecido por `src/utils/alunosEtiquetaMotivo.js`.
- UI: `EtiquetaIcon`, `EtiquetaGlossario` / `EtiquetaGlossarioButton`.

**Regra de contribuição:** não reinventar labels/cores; importar de `etiquetas.js`.

---

## 6. Mapa de features (telas e fluxos)

### Views (`src/views/`)

| View | Arquivo | Função |
|------|---------|--------|
| Painel | `DashboardView.jsx` | Resumo, checklist onboarding, atalho etiquetas, strip de agenda |
| Escolas | `SchoolsView.jsx` | CRUD / arquivar escolas |
| Turmas | `ClassesView.jsx` | Lista; drill-down; embeds dashboard da turma, imports, diário especial |
| Alunos | `StudentsView.jsx` | Lista com filtros (incl. etiqueta + glossário) |
| Detalhe aluno | `StudentDetailView.jsx` | Abas: resumo, boletim, ocorrências, sondagem, evidências, AEE |
| Professores | `TeachersView.jsx` / `TeacherDetailView.jsx` | Lista e detalhe (entregas/registros) |
| Agenda | `AgendaView.jsx` / `AgendaEventDetailView.jsx` | Eventos, recorrência, exportação, SEMED |
| Relatórios | `ReportsView.jsx` | Listas filtráveis → PDF/Word |
| Gráficos | `ChartsView.jsx` (+ `utils/chartsData.js`) | Etiquetas, sondagem, ocorrências, notas, etc. |
| Biblioteca | `LibraryView.jsx` (`currentView=emprestimos`) | **Experimental: só em memória** — fora do escopo do piloto |
| Configurações | `SettingsView.jsx` | Regras de etiquetas por escola |
| Perfil | inline em `App.jsx` | Conta |

### Modais (`src/components/modals/`)

`SchoolModal`, `ClassModal`, `StudentModal`, `TeacherModal`, `OccurrenceModal`, `SondagemModal`, `NoteModal`, `FrequencyModal`, `EventModal`, `ExportAgendaModal`, `EntregaModal`, `RegistroCoordModal`.

**Shell obrigatório para modais novos:** `src/components/ModalShell.jsx` (mobile, safe-area, teclado).

### Importações importantes

| Fluxo | Arquivos | Notas |
|-------|----------|-------|
| Lista de alunos (PDF) | `ImportarListaAlunos.jsx`, `listaAlunosPdf.js` | Parser estilo EducaMais |
| Sondagem (foto + IA) | `ImportarSondagemFoto.jsx` | Edge `extract-sondagens` |
| Boletim turma (PDF + IA) | `ImportarBoletimTurma.jsx` | Edge `extract-boletins-pdf` |
| Boletim individual | `ImportarBoletim.jsx` / `BoletimView.jsx` | Mais local; math em `boletimMath.js` |
| Calendário SEMED | `agendaSemed/`, `SemedCalendarImportWizard`, `semEdCalendarImport.js`, dados `semEdCalendar2026Santarem.js` | Rede urbana/rural Santarém |

---

## 7. Inteligência artificial (Gemini)

| Edge Function | Path | Chamada front (`geminiApi.js`) | UI |
|---------------|------|--------------------------------|----|
| `extract-sondagens` | `supabase/functions/extract-sondagens/` | `extractSondagensFromImage` | `ImportarSondagemFoto` |
| `extract-boletins-pdf` | `supabase/functions/extract-boletins-pdf/` | `extractBoletinsFromPdf` | `ImportarBoletimTurma` |
| `generate-resumo-aluno` | `supabase/functions/generate-resumo-aluno/` | `generateResumoPedagogico` | `StudentResumoTab` |

Shared: `supabase/functions/_shared/gemini.ts`, `cors.ts`. Setup: `docs/GEMINI-SETUP.md`.

**Contrato de produto:** extract → **tabela de revisão humana** → só então gravar no banco. Não “salvar silencioso” output de IA.

**Risco conhecido:** checklist marca `verify_jwt = false` em functions (endpoint chamável sem JWT até endurecer) — ver `docs/SUPABASE-CHECKLIST-PILOTO.md`.

### Chat IA (Claude — separado do Gemini)

Edge Function `chat-ia` (`verify_jwt = true`) usa a **Claude API** (secret
`ANTHROPIC_API_KEY`, ainda não configurado — ver `docs/CHAT-IA-SETUP.md`) para
um chat de dados só para coordenação: consultas SQL somente leitura executam
na hora; INSERT/UPDATE/DELETE ficam pendentes até confirmação explícita na
tela (`ChatIAView.jsx`). Nunca usa service role — respeita a RLS de cada
tabela via o JWT do usuário. Tabelas de apoio: `chat_ia_confirmacoes`,
`chat_ia_execucoes` (log de auditoria), criadas por `supabase_chat_ia.sql`.

---

## 8. UX / feedback recente (fases 1–2 de usabilidade)

Após auditorias de jornada e UX (jun/2026), implementou-se:

| Entrega | Path / símbolo | Status |
|---------|----------------|--------|
| Toasts / confirmações | `FeedbackProvider`, `utils/appFeedback.js` (`toast`, `confirmAction`) | Feito (substitui `alert`/`confirm`) |
| Vocabulário etiquetas | `etiquetas.js` + labels Adequado/Atenção/etc. | Feito |
| Padronização UI | `App.css`, `docs/AUDITORIA-FRONT-END-UI.md` | Feito (primeira rodada) |
| Bottom nav mobile | `MobileBottomNav.jsx` | Feito |
| Glossário etiquetas | `EtiquetaGlossario.jsx` | Feito |
| Checklist onboarding | `OnboardingChecklist.jsx`, `utils/onboarding.js` | Feito |

Convenções UI:

- Campos: `.input-group`
- Botões: `.btn-primary`, `.btn-secondary`, `.btn-icon`
- Abas: `.student-tabs` + `.tab`
- Modos curtos: `.segmented-control`
- Feedback novo: **sempre** `toast` / `confirmAction` — não reintroduzir `alert()`

---

## 9. Banco de dados e Storage

### Estado operacional (piloto)

Ver detalhes vivos em `docs/SUPABASE-CHECKLIST-PILOTO.md`. Resumo:

- Tabelas principais existem; ambiente de refs já teve dados reais de teste.
- Buckets: `sondagens-anexos`, `documentos-aee` (privado), `agenda-arquivos`.
- **RLS das tabelas núcleo estava CRÍTICO** (sem RLS / policies permissivas) no momento da auditoria — script de endurecimento: `supabase_piloto_seguranca.sql` (aplicar e **revalidar** no Dashboard; não assumir automático).
- Schema evolui por arquivos `supabase_*.sql` na raiz — **não há pasta `supabase/migrations/` versionada**.

### Ordem típica de scripts faltantes

Documentada no checklist (escolas → turmas especiais → sondagens → boletim → professores → agenda → frequência especial → pré-escola → storage policies).

### Verificação

```powershell
supabase db query --linked -f supabase_verificacao_piloto.sql
```

---

## 10. Android / Play Store

| Item | Situação |
|------|----------|
| Capacitação do projeto | Feito (`capacitor.config.json`, plugins App/Browser/Camera/Filesystem/Keyboard/Share/StatusBar) |
| Build debug / sync | Scripts `build:android`, docs `ANDROID-SETUP.md` |
| Release AAB / assinatura | Script `release:android` + docs (`PLANO-ANDROID-PLAY-STORE.md`, commit de assinatura) |
| Publicação na Play Store | **Não concluída** — documento é plano futuro (conta, assets, política de privacidade, LGPD) |

Modelo comercial sugerido no plano: app gratuito na loja + assinatura via site (evitar taxa da Google Play Billing).

---

## 11. Testes automatizados existentes

Vitest (`npm test`), cobertura pontual em utils:

- `boletimMath.test.js`
- `listaAlunosPdf.test.js`
- `agendaCalendarText.test.js`
- `agendaRecorrencia.test.js`
- `semEdCalendarImport.test.js`
- `sondagemImport.test.js`
- `sondagemConsolidado.test.js`
- `chartsData.test.js`

Não há suíte E2E. Validação de fluxos críticos é **manual** (`docs/ROTEIRO-VALIDACAO-PILOTO.md`, `docs/CHECKLIST-USUARIO.md`).

---

## 12. Estágio atual do projeto (jul/2026)

### Pronto / em uso de desenvolvimento

1. Core pedagógico completo na UI (escolas, turmas, alunos, professores, etiquetas, sondagens, boletim, ocorrências, agenda, gráficos, relatórios).
2. Integração Gemini para 3 fluxos.
3. Empacotamento Android via Capacitor + preparação de release.
4. Documentação de piloto confiável e checklists Supabase/LGPD.
5. UX Phase 1–2: feedback visual, glossário, bottom nav, onboarding.
6. Calendário SEMED Santarém 2026.

### Em preparação / parcial

1. **Piloto controlado** com dados reais: depende de endurecer RLS, restringir cadastro, buckets e revisão humana de IA (`docs/PILOTO-CONFIAVEL.md`).
2. `supabaseClient` ler `.env` de fato.
3. Confirmar no Dashboard que `supabase_piloto_seguranca.sql` foi aplicado e retestado.

### Explicitamente não feito

1. Publicação Google Play Store.
2. Migrações Supabase versionadas (`supabase/migrations`).
3. Persistência da biblioteca.
4. Refatoração profunda do monólito `App.jsx` (docs pedem **estabilizar primeiro**, extrair depois).
5. Code splitting sistemático (chunks grandes no build).
6. Harden JWT das Edge Functions + signed URLs em todos os buckets sensíveis.

### Escopo recomendado do primeiro piloto

- 1 escola, poucas turmas, 1 coordenador.
- Sem biblioteca.
- Sem cadastro aberto.
- IA sempre com conferência humana.
- Validar fluxos: login → escola/turma → alunos → etiquetas → sondagem → ocorrência → boletim → agenda → relatório (conforme roteiro).

---

## 13. História recente (commits âncora)

Ordem cronológica aproximada (mais recentes primeiro):

| Commit | Tema |
|--------|------|
| `d073707` | Bottom nav, glossário etiquetas, checklist onboarding |
| `3fd2f12` | Toasts/confirmações + vocabulário etiquetas |
| `cb5f173` | Padronização UI + gráficos de sondagem |
| `9fa24b7` | Assinatura release Android + script AAB |
| `0b63119` | Importação sondagens IA + prep release 1.0.1 |
| `c6d99d7` | Prep piloto confiável |
| (anteriores) | Agenda SEMED, Gemini, extração de views, boletins PDF, login |

---

## 14. Dívida técnica e riscos (priorizados)

| Prioridade | Item | Por quê |
|------------|------|---------|
| P0 | RLS / policies / Storage anon | Dados de menores + chave anon no client |
| P0 | Restringir Auth (convite) no piloto | Cadastro aberto amplia superfície |
| P1 | Cliente Supabase via `.env` (sem depender só do hardcoded) | Separar dev/piloto/prod |
| P1 | JWT nas Edge Functions | Extrair/gerar sem auth aumenta abuso |
| P2 | SQL → migrações versionadas | Ambientes divergem |
| P2 | Monólito `App.jsx` | Regressões; dificulta trabalho paralelo |
| P2 | Code splitting | Performance mobile |
| P3 | Biblioteca sem banco | Expectativa falsa de persistência |
| P3 | Inline styles residual | Inconsistência UI |

---

## 15. Onde outras IAs **podem** sugerir melhorias com segurança

Sugestões **bem-vindas** (alto valor / alinhadas ao estágio):

1. Endurecimento de segurança Supabase e verificação pós-script.
2. Ligar `supabaseClient` às variáveis `VITE_*`.
3. Extrair hooks/services de `App.jsx` **sem** mudar comportamento (fatiar por domínio: alunos, agenda, sondagens).
4. Reduzir estilos inline restantes; ampliar testes Vitest em utils críticos.
5. UX mobile pontual (toque 44px, formulários longos, acessibilidade).
6. Fluxos de importação IA mais claros (estado de revisão, diff, desfazer).
7. Dashboard / relatórios com linguagem mais pedagogicamente clara (sem mudar regras).
8. Preparação Play Store (assets, política de privacidade) quando o produto pedir.

Evitar / pedir confirmação antes:

- Reescrever em Flutter/Kotlin “do zero”.
- Adicionar React Router sem necessidade clara.
- “Rebrand” visual genérico (roxo/gradiente AI) — respeitar design system existente.
- Expandir biblioteca/LMS/portal família no meio do piloto.
- Automações pedagógicas sem revisão humana.
- Commitar secrets, `.env`, keystores, ou forçar push destrutivo.

---

## 16. Convenções para contribuidores e IAs

1. **Falar e escrever UI em português (BR).**
2. **Etiquetas:** só via `src/utils/etiquetas.js`.
3. **Modais novos:** `ModalShell` + classes `.btn-*` / `.input-group`.
4. **Feedback:** `toast` / `confirmAction` de `appFeedback`.
5. **Navegação:** estender `currentView` em `App.jsx`.
6. **IA:** extract → revisão → insert.
7. **SQL novo:** arquivo `supabase_*.sql` + atualizar `docs/SUPABASE-CHECKLIST-PILOTO.md` até existirem migrations.
8. **Commits:** só quando o usuário pedir; mensagem curta em PT, estilo dos commits recentes.
9. **Não mencionar** secrets reais; anon key hardcoded já está no repo — migração para env é melhoria, não republicar service role.
10. Preferir mudanças pequenas e focadas; não refatorar monólito “de passagem”.

---

## 17. Índice de documentação relacionada

| Documento | Conteúdo |
|-----------|----------|
| `README.md` | Setup rápido, login Google, links |
| `docs/PILOTO-CONFIAVEL.md` | Plano operacional do piloto |
| `docs/SUPABASE-CHECKLIST-PILOTO.md` | Tabelas, RLS, buckets, functions |
| `docs/ROTEIRO-VALIDACAO-PILOTO.md` | Passo a passo de validação |
| `docs/GEMINI-SETUP.md` | Edge Functions + secret |
| `docs/CHAT-IA-SETUP.md` | Chat com IA (Claude) — secret, segurança, testes |
| `docs/AUDITORIA-FRONT-END-UI.md` | Decisões e padronização UI |
| `docs/ANDROID-SETUP.md` | Ambiente Android |
| `docs/PLANO-ANDROID-PLAY-STORE.md` | Roadmap publicação loja |
| `docs/CHECKLIST-USUARIO.md` | Testes manuais rápidos |
| **Este arquivo** | Contexto global para IAs e novos contribuidores |

---

## 18. Paths âncora (começar sempre por aqui)

```
src/App.jsx
src/main.jsx
src/supabaseClient.js
src/services/geminiApi.js
src/utils/etiquetas.js
src/utils/studentColorEvaluator.js
src/utils/appFeedback.js
src/components/ModalShell.jsx
src/components/MobileBottomNav.jsx
src/components/feedback/FeedbackProvider.jsx
src/views/
src/agendaSemed/
supabase/functions/
docs/PILOTO-CONFIAVEL.md
docs/SUPABASE-CHECKLIST-PILOTO.md
supabase_*.sql
capacitor.config.json
package.json
```

---

## 19. Prompt curto para bootstrap de outra IA

Copiar/colar no início de uma sessão:

> Você está no repositório SACP (Sistema de Apoio à Coordenação Pedagógica): React+Vite+Supabase+Capacitor para coordenação pedagógica (SEMED/Santarém). Leia `docs/CONTEXTO-PROJETO.md` e o doc específico da área antes de mudar código. Hub em `src/App.jsx` (sem React Router). Etiquetas em `src/utils/etiquetas.js`. Feedback via `appFeedback`. IA Gemini só via Edge Functions com revisão humana. Prioridade atual: piloto seguro (RLS/LGPD) e estabilidade — não reescrever o monólito sem pedido. UI e respostas em português.

---

*Fim. Atualize este arquivo após marcos: RLS aplicado, client via `.env`, migrations, publicação Play Store, ou mudança grande de domínio.*
