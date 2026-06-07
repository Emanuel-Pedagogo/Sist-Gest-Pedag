# SACP — Roteiro de validação funcional (piloto)

Execute **na ordem**. Marque cada item só quando **salvar, recarregar a página (F5) e os dados continuarem corretos**.

**App:** `http://localhost:5173/` (ou build de produção, quando for o caso)  
**Pré-requisito:** login funcionando (RLS exige sessão autenticada).

Registre problemas em uma lista simples (tela + o que fez + mensagem de erro).

---

## Bloco A — Acesso e núcleo (≈ 20 min)

### A1 — Login e logout

| Passo | Ação |
|-------|------|
| 1 | Entrar com e-mail/senha (ou Google) |
| 2 | Recarregar a página → continua logado |
| 3 | Navegar Dashboard → Turmas → voltar |
| 4 | Sair → tela de login; recarregar → não entra sozinho |

**Aceite:** sessão persiste e logout limpa acesso.

---

### A2 — Escola e turma

| Passo | Ação |
|-------|------|
| 1 | Menu **Escolas** → conferir escola do piloto (ou **Nova escola**) |
| 2 | Header: selecionar escola ativa e ano letivo |
| 3 | Menu **Turmas** → **Nova turma** (modal) → salvar |
| 4 | F5 → turma listada na escola/ano corretos |

**Aceite:** escola e turma visíveis após reload.

**Dica piloto:** use 1 escola e 1–2 turmas de teste antes de dados reais.

---

### A3 — Importar lista de alunos (PDF)

| Passo | Ação |
|-------|------|
| 1 | **Turmas** → abrir a turma de teste |
| 2 | **Importar lista** (PDF EducaMais) |
| 3 | Revisar preview → confirmar importação |
| 4 | F5 → alunos na lista da turma |

**Aceite:** alunos importados permanecem após reload.

**Arquivo:** lista “Lista de Alunos” exportada do EducaMais.

---

### A4 — Cadastro manual de aluno

| Passo | Ação |
|-------|------|
| 1 | Na turma → **Novo aluno** |
| 2 | Preencher nome, turma, matrícula (opcional) → salvar |
| 3 | Editar o mesmo aluno (ex.: contato do responsável) → salvar |
| 4 | F5 → um único registro, dados atualizados |

**Aceite:** sem duplicar; edição persiste.

---

## Bloco B — Acompanhamento pedagógico (≈ 25 min)

### B1 — Etiquetas

| Passo | Ação |
|-------|------|
| 1 | Menu **Configurações** → aba regras de etiquetas (se existir) → salvar limites |
| 2 | Abrir aluno com notas/sondagens/ocorrências |
| 3 | Conferir cor da etiqueta e **motivo** (tooltip ou texto) |
| 4 | Menu **Configurações** → **Recalcular etiquetas** (se disponível) → F5 |

**Aceite:** cor coerente com regras; motivo compreensível para o coordenador.

---

### B2 — Ocorrência

| Passo | Ação |
|-------|------|
| 1 | Detalhe do aluno → aba **Ocorrências** |
| 2 | Nova ocorrência (tipo, data, descrição) → salvar |
| 3 | F5 → registro no histórico |

**Aceite:** ocorrência listada após reload.

---

### B3 — Sondagem manual

| Passo | Ação |
|-------|------|
| 1 | Aba **Sondagens** → nova sondagem |
| 2 | Data, nível leitura/escrita → salvar |
| 3 | (Opcional) anexar foto ou áudio |
| 4 | F5 → sondagem e gráfico/lista atualizados |

**Aceite:** níveis salvos; anexos abrem (se enviou).

---

### B4 — Sondagem por foto (IA)

| Passo | Ação |
|-------|------|
| 1 | Na turma → **Importar sondagens (IA)** |
| 2 | Foto nítida da ficha → **Extrair com IA** |
| 3 | Revisar vínculo aluno + níveis → **Cadastrar sondagens** |
| 4 | Abrir aluno → aba Sondagens → F5 |

**Aceite:** dados conferidos manualmente e persistidos.

**Erros:** ver [`GEMINI-SETUP.md`](./GEMINI-SETUP.md).

---

## Bloco C — Boletim e agenda (≈ 30 min)

### C1 — Boletim individual

| Passo | Ação |
|-------|------|
| 1 | Aluno → aba **Boletim** |
| 2 | Lançar notas manualmente OU **Importar PDF** (um aluno) |
| 3 | Conferir média e situação (aprovado/recuperação) |
| 4 | F5 → notas e cálculos iguais |

**Aceite:** matemática do boletim sem erro visível.

---

### C2 — Boletim da turma por PDF (IA)

| Passo | Ação |
|-------|------|
| 1 | Turma → **Importar boletins (IA)** |
| 2 | PDF “Todos” EducaMais da turma |
| 3 | Vincular alunos não reconhecidos → **Salvar notas na turma** |
| 4 | Abrir 2–3 alunos → aba Boletim → F5 |

**Aceite:** notas, RS1/RS2 e faltas por aluno.

---

### C3 — Agenda

| Passo | Ação |
|-------|------|
| 1 | Menu **Agenda** → **Novo evento** |
| 2 | Editar evento; (opcional) anexo |
| 3 | Importar calendário SEMED (toolbar) — usar PDF [`2026_CALENDARIO-ESCOLAR- SEMED.pdf`](../docs/) se for o ano |
| 4 | Filtrar marcos SEMED vs eventos seus; exportar se usar exportação |
| 5 | F5 → eventos e filtros corretos |

**Aceite:** CRUD de agenda + import SEMED estável.

---

## Bloco D — Professores, relatórios, turma especial (≈ 25 min)

### D1 — Professores

| Passo | Ação |
|-------|------|
| 1 | Menu **Professores** → novo professor + turmas |
| 2 | Abrir professor → nova **entrega docente** |
| 3 | Novo **registro de coordenação** |
| 4 | F5 → tudo no perfil do professor |

**Aceite:** três tipos de registro persistem.

---

### D2 — Relatórios

| Passo | Ação |
|-------|------|
| 1 | Menu **Relatórios** |
| 2 | Escolher escola/ano/turma → gerar **PDF** e **Word** |
| 3 | Abrir arquivos → texto legível, sem layout quebrado |

**Aceite:** arquivos gerados e utilizáveis.

---

### D3 — Turma especial + diário

| Passo | Ação |
|-------|------|
| 1 | **Nova turma** → marcar **Turma especial** |
| 2 | Vincular alunos de outras turmas |
| 3 | Abrir diário de frequência especial → registrar presença |
| 4 | F5 → vínculos e diário mantidos |

**Aceite:** fluxo AEE/Libras/etc. sem perda de dados.

---

## Bloco E — IA resumo e mobile (≈ 15 min)

### E1 — Resumo pedagógico (IA)

| Passo | Ação |
|-------|------|
| 1 | Aluno → aba **Resumo** → **Gerar resumo** |
| 2 | Ler texto → **Atualizar resumo** após mudar dado do aluno |

**Aceite:** texto em português; revisar antes de usar em reunião.

---

### E2 — Mobile (navegador)

| Passo | Ação |
|-------|------|
| 1 | F12 → modo responsivo (390px) |
| 2 | Menu ☰, Dashboard, Agenda, Turmas, modal de evento |
| 3 | Repetir um upload (sondagem ou PDF) se possível |

**Aceite:** usável no celular; ver [`CHECKLIST-USUARIO.md`](./CHECKLIST-USUARIO.md).

---

## O que ignorar no piloto

- **Biblioteca / Empréstimos** — sem persistência confiável; não bloqueia o piloto.
- Cadastro público aberto — restringir no Dashboard Auth.

---

## Registro de resultado

Copie e preencha ao final de cada sessão:

```
Data: ___________
Testador: Emanuel

A1 Login     [ ] OK  [ ] Falhou — nota: ___
A2 Escola    [ ] OK  [ ] Falhou — nota: ___
A3 Import PDF[ ] OK  [ ] Falhou — nota: ___
A4 Aluno     [ ] OK  [ ] Falhou — nota: ___
B1 Etiquetas [ ] OK  [ ] Falhou — nota: ___
B2 Ocorrência[ ] OK  [ ] Falhou — nota: ___
B3 Sondagem  [ ] OK  [ ] Falhou — nota: ___
B4 Sond. IA  [ ] OK  [ ] Falhou — nota: ___
C1 Boletim   [ ] OK  [ ] Falhou — nota: ___
C2 Bol. IA   [ ] OK  [ ] Falhou — nota: ___
C3 Agenda    [ ] OK  [ ] Falhou — nota: ___
D1 Profess.  [ ] OK  [ ] Falhou — nota: ___
D2 Relatórios[ ] OK  [ ] Falhou — nota: ___
D3 Turma esp.[ ] OK  [ ] Falhou — nota: ___
E1 Resumo IA [ ] OK  [ ] Falhou — nota: ___
E2 Mobile    [ ] OK  [ ] Falhou — nota: ___
```

---

## Próximo passo após validação

- Se **todos OK:** piloto pronto para 1 escola / 1 coordenador com dados reais (com LGPD e cadastro restrito).
- Se **falhas:** informe o código do bloco (ex.: `C2`) e a mensagem de erro — corrigimos antes de ampliar o piloto.
