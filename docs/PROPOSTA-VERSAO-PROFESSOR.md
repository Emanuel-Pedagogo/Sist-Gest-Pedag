# SACP — Proposta de Versão para Professor
### Trabalho de Desenvolvimento de Sistemas — Extensão do SACP (Sistema de Apoio à Coordenação Pedagógica)

> Este documento aplica a metodologia típica de uma disciplina de Desenvolvimento de Sistemas (levantamento de requisitos → atores e casos de uso → modelo de dados → protótipo de telas → plano de implementação) para propor um **módulo/perfil de Professor** dentro do SACP já existente, sem reescrever o que já funciona.

---

## 1. Entendimento do sistema atual (ponto de partida)

O SACP é uma SPA **React 19 + Vite**, com backend **Supabase** (Auth + Postgres + Storage + Edge Functions) e empacotamento **Capacitor** para Android. A navegação não usa React Router — é controlada por um estado `currentView` centralizado em `App.jsx` (o "hub" do sistema, com ~5 mil linhas).

Hoje o sistema tem **um único perfil de acesso real**: o **coordenador pedagógico**. O que existe sobre professores é só um objeto de acompanhamento, não um usuário do sistema:

| O que já existe | O que NÃO existe ainda |
|---|---|
| Cadastro de professores (`professores`, vinculado a turmas) | Login do próprio professor no sistema |
| `entregas_docentes` (coordenador registra entregas do professor) | Professor lançar sua própria sondagem/nota/ocorrência |
| `registros_coordenacao` (anotações do coordenador sobre o professor) | Visão do professor sobre "minhas turmas" |
| Etiquetas, sondagens, boletim, ocorrências — tudo lançado pelo coordenador | Área de trabalho própria do professor (dashboard, agenda dele) |

**Conclusão do diagnóstico:** hoje o professor é **objeto de dados**, não **usuário**. A proposta abaixo transforma o professor em um **ator do sistema**, com um recorte de permissões dentro da mesma base (mesmo banco, mesmas tabelas, mesma lógica de etiquetas) — reaproveitando ~90% do que já existe.

---

## 2. Objetivo da versão Professor

Permitir que o **professor regente de turma** acesse, pelo navegador ou pelo app, uma versão reduzida do SACP para:

1. Ver **suas turmas** e os alunos delas (somente leitura de dados gerais).
2. Registrar **sondagens** e **ocorrências** dos seus próprios alunos.
3. Lançar **notas/boletim** da(s) disciplina(s) que leciona.
4. Ver a **etiqueta pedagógica** do aluno e o motivo (sem poder alterar as regras de etiqueta — isso continua exclusivo do coordenador).
5. Ver sua **agenda de compromissos** (eventos da escola relevantes à sua turma).
6. Registrar suas próprias **entregas docentes** (hoje só o coordenador registra *sobre* o professor — a proposta inverte parte disso: o professor also passa a poder declarar o que entregou).

**Fora do escopo desta versão (decisão explícita, para não expandir demais):**
- Professor **não** configura regras de etiquetas (`SettingsView` continua exclusivo do coordenador).
- Professor **não** vê alunos de turmas que não são suas.
- Professor **não** acessa módulo AEE além do que for da própria turma especial vinculada.
- Sem portal de pais/alunos — fora do escopo do SACP como um todo (já documentado em `CONTEXTO-PROJETO.md`).

---

## 3. Atores e casos de uso

### 3.1 Atores

| Ator | Descrição |
|---|---|
| **Coordenador** (já existe) | Acesso total à escola: turmas, todos os professores, configurações, relatórios |
| **Professor** (novo) | Acesso restrito às suas turmas/disciplinas |
| **Sistema (IA Gemini)** | Já existente — extração assistida, sempre com revisão humana |

### 3.2 Casos de uso do Professor (novo)

```
Professor
 ├── UC01 Fazer login (e-mail/senha ou Google)
 ├── UC02 Ver minhas turmas
 ├── UC03 Ver lista de alunos da turma (somente leitura de cadastro)
 ├── UC04 Registrar sondagem do aluno
 ├── UC05 Registrar ocorrência do aluno
 ├── UC06 Lançar/editar notas do boletim (disciplina lecionada)
 ├── UC07 Ver etiqueta pedagógica e motivo do aluno
 ├── UC08 Ver agenda de eventos da escola/turma
 └── UC09 Registrar entrega docente (autodeclaração)
```

**UC04 — Registrar sondagem do aluno** (exemplo detalhado, no formato de caso de uso de disciplina)

| Campo | Descrição |
|---|---|
| Ator principal | Professor |
| Pré-condição | Professor autenticado e vinculado à turma do aluno |
| Fluxo principal | 1. Professor abre a turma → aluno → aba Sondagens. 2. Clica "Nova sondagem". 3. Preenche data, nível de leitura/escrita. 4. Salva. |
| Fluxo alternativo | Professor anexa foto da ficha e usa "Extrair com IA" (reaproveita Edge Function `extract-sondagens` já existente) — extrai, mas exige revisão antes de salvar. |
| Pós-condição | Sondagem salva; etiqueta do aluno recalculada automaticamente pela regra já existente em `studentColorEvaluator.js` |
| Regra de negócio herdada | Etiqueta é apoio à decisão, nunca "rótulo automático definitivo" — texto de aviso já usado no coordenador se mantém |

---

## 4. Modelo de dados — o que muda

A base de dados **já suporta** a maior parte disso (tabela `professores`, `turmas.professores_ids` ou vínculo similar). As mudanças mínimas necessárias:

### 4.1 Nova coluna / vínculo de autenticação

```sql
-- Vincular o registro de professor a um usuário Auth do Supabase
alter table professores
  add column if not exists user_id uuid references auth.users(id);

create index if not exists idx_professores_user_id on professores(user_id);
```

### 4.2 Regras de acesso (RLS) — ponto crítico

Hoje (conforme `SUPABASE-CHECKLIST-PILOTO.md`) várias tabelas núcleo estão **sem RLS adequado** — isso precisa ser resolvido **antes** de abrir acesso a um novo tipo de usuário, e não depois. Para o professor, a política precisa ser mais restritiva que a do coordenador:

| Tabela | Policy do coordenador (já existe/planejada) | Policy nova do professor |
|---|---|---|
| `alunos` | `authenticated` da escola | `authenticated` **e** aluno pertence a turma vinculada ao `professores.user_id` |
| `sondagens` | idem | idem (insert/select restrito às turmas do professor) |
| `ocorrencias` | idem | idem |
| `notas_boletim` | idem | idem, e só disciplina(s) do professor |
| `escolas.configuracoes` | leitura/escrita coordenador | **somente leitura** (sem escrita) |
| `entregas_docentes` | leitura/escrita coordenador | professor pode **inserir a própria** entrega; não edita registros de outros |

> Essa é a parte que mais se conecta com uma disciplina de Desenvolvimento de Sistemas: aqui entra literalmente o conceito de **perfil de acesso / autorização por papel (RBAC)**, que pode virar o capítulo de "Segurança" do trabalho.

### 4.3 Diagrama de relacionamento (recorte)

```
auth.users ──1:1── professores ──*:*── turmas ──1:*── alunos
                        │                              │
                        └── entregas_docentes           ├── sondagens
                                                          ├── ocorrencias
                                                          └── notas_boletim
```

---

## 5. Telas propostas (reaproveitando padrões já existentes)

Seguindo os padrões já documentados em `AUDITORIA-FRONT-END-UI.md` (`.input-group`, `.btn-primary/secondary`, `ModalShell`, `segmented-control`), a versão Professor não cria um design novo — **reaproveita os componentes existentes**, só com menos itens de menu:

| Tela | Origem (reaproveita) | Adaptação |
|---|---|---|
| Login | tela de login atual | Sem alteração |
| Dashboard do Professor | `DashboardView.jsx` | Versão reduzida: só turmas próprias, sem métricas de toda a escola |
| Minhas Turmas | `ClassesView.jsx` | Filtra por `professores.user_id = auth.uid()` |
| Alunos da turma | `StudentsView.jsx` | Mesma tela, escopo restrito |
| Detalhe do aluno | `StudentDetailView.jsx` | Mesmas abas (resumo, boletim, ocorrências, sondagem); **sem** aba AEE se não for professor da turma especial |
| Agenda | `AgendaView.jsx` | Somente leitura + filtro pela turma |
| Minhas entregas | Novo, mas reaproveita `ModalShell` + `.input-group` | Formulário simples: data, descrição, anexo opcional |

### 5.1 Navegação mobile

Reaproveitar o `MobileBottomNav.jsx` já existente, trocando os atalhos para o contexto do professor:

```
Coordenador: Início · Turmas · Alunos · Agenda · Mais
Professor:   Início · Minhas Turmas · Agenda · Mais
```

---

## 6. Arquitetura — o que muda e o que não muda

**Não muda:**
- Stack (React + Vite + Supabase + Capacitor).
- Sistema de etiquetas e sua fonte única (`src/utils/etiquetas.js`).
- Fluxo de IA (extract → revisão humana → insert).
- Ausência de React Router (mantém o padrão `currentView`).

**Muda:**
- `currentView` passa a considerar o **papel do usuário logado** (coordenador vs. professor) para decidir quais views/menu aparecem — um `roleGuard` simples, sem framework novo.
- Um novo hook, por exemplo `useUserRole()`, que lê `professores.user_id` (ou uma tabela `usuarios_papeis` mais genérica, se o curso quiser generalizar para futuros papéis).

```js
// Exemplo conceitual — não é código de produção, é ilustração para o trabalho
function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState(null);

  useEffect(() => {
    // 1) é professor? 2) senão, é coordenador (papel default hoje)
  }, [user]);

  return role; // 'coordenador' | 'professor'
}
```

---

## 7. Plano de implementação em fases (formato de cronograma de disciplina)

| Fase | Entregável | Relação com o curso |
|---|---|---|
| **1 — Levantamento e modelagem** | Este documento + diagrama ER atualizado + casos de uso detalhados | Análise de requisitos |
| **2 — Banco de dados** | Migration `professores.user_id` + policies RLS por papel | Modelagem de dados / segurança |
| **3 — Autenticação e papéis** | Hook `useUserRole`, tela de login sem alteração, roteamento condicional em `App.jsx` | Arquitetura / controle de acesso |
| **4 — Telas do professor** | Dashboard, Minhas Turmas, Alunos, Detalhe do aluno (reaproveitados) | Interface / reuso de componentes |
| **5 — Minhas entregas (novo)** | CRUD simples com `ModalShell` | Implementação de CRUD |
| **6 — Testes** | Roteiro manual (nos moldes de `ROTEIRO-VALIDACAO-PILOTO.md`), casos de teste por papel | Verificação e validação |
| **7 — Apresentação** | Demo com 1 coordenador + 1 professor de teste, mostrando isolamento de dados entre turmas | Entrega final |

---

## 8. Critérios de aceite (para a banca/avaliação)

- [ ] Professor consegue logar e só vê as turmas em que está vinculado.
- [ ] Professor **não** consegue ver alunos de turma que não é sua (testar via URL/console, não só pela UI).
- [ ] Professor consegue lançar sondagem/ocorrência/nota e o coordenador vê o mesmo dado.
- [ ] Etiqueta do aluno recalcula automaticamente com o novo dado, usando a regra já existente.
- [ ] Coordenador continua com acesso total, sem regressão.
- [ ] RLS testada com usuário deslogado (deve negar tudo) e com professor de outra turma (deve negar acesso cruzado).

---

## 9. Observações finais

- Esta proposta **não** substitui `entregas_docentes`/`registros_coordenacao` — ela complementa, dando ao professor uma via de mão dupla (hoje só o coordenador registra sobre o professor).
- Antes de implementar login de professor, é **pré-requisito** resolver o item P0 já apontado em `SUPABASE-CHECKLIST-PILOTO.md`: RLS crítica nas tabelas núcleo. Abrir um segundo tipo de usuário sobre um banco sem RLS adequada amplia o risco, não é aditivo neutro.
- Recomenda-se tratar isso como **fase 2 do piloto** (depois de validar o fluxo do coordenador), não em paralelo.
