# Integração Gemini (IA) — Configuração e testes

Este guia cobre as funcionalidades implementadas com **Gemini 2.5 Flash** via **Supabase Edge Functions**.

## Funcionalidades

| Fase | Recurso | Onde testar |
|------|---------|-------------|
| 1 | Importar sondagens por **foto da ficha** | Turmas → abrir turma → **Importar sondagens (IA)** |
| 2 | Importar **boletins da turma** por PDF (EducaMais) | Turmas → abrir turma → **Importar boletins (IA)** |
| 3 | **Resumo pedagógico** do aluno | Aluno → aba **Resumo** → **Gerar resumo** |

---

## Passo 1 — Chave da API Gemini

1. Acesse [Google AI Studio](https://aistudio.google.com/api-keys).
2. Faça login com sua conta Google.
3. Clique em **Create API key**.
4. Copie a chave (começa com `AIza...`).

> A assinatura **Gemini Plus** no app não substitui a API; a chave do AI Studio é gratuita no tier inicial, com limites diários.

---

## Passo 2 — Supabase CLI (se ainda não tiver)

1. Instale o CLI: [Supabase CLI](https://supabase.com/docs/guides/cli).
2. No terminal, na pasta do projeto:

```bash
cd "c:\Users\emanu\Projetos de Software\Sistema de Gestão Pedagógica\Sist-Gest-Pedag"
supabase login
supabase link --project-ref bzajsqxtaypgkejbmtxi
```

(O `project-ref` é o ID do seu projeto — o mesmo da URL do Supabase Dashboard.)

---

## Passo 3 — Configurar o secret e fazer deploy das funções

```bash
supabase secrets set GEMINI_API_KEY=sua_chave_aqui

supabase functions deploy extract-sondagens
supabase functions deploy extract-boletins-pdf
supabase functions deploy generate-resumo-aluno
```

Aguarde mensagem de sucesso para cada função.

### Verificar no Dashboard (alternativa ao CLI)

1. Supabase → **Project Settings** → **Edge Functions** → **Secrets**
2. Adicione: `GEMINI_API_KEY` = sua chave
3. Faça deploy das funções pelo CLI (o Dashboard não substitui o deploy do código local)

---

## Passo 4 — Rodar o frontend

```bash
npm install
npm run dev
```

Abra o endereço que o Vite mostrar (geralmente `http://localhost:5173`).

---

## Teste A — Importar sondagens por foto

### Pré-requisitos

- Turma com **alunos já cadastrados** (nomes parecidos com a ficha).
- Foto nítida da ficha (JPG/PNG), boa luz, sem reflexo forte.

### Passos

1. Login no sistema.
2. Menu **Turmas** → clique na turma.
3. Clique **Importar sondagens (IA)** (botão roxo).
4. Selecione a imagem → **Extrair com IA**.
5. Aguarde (10–40 s conforme a foto).
6. Na tabela de revisão:
   - Confira **Aluno na turma** (vincule manualmente se a IA errou).
   - Ajuste **data**, **leitura** e **escrita** se necessário.
7. Clique **Cadastrar sondagens**.
8. Abra um aluno → aba **Sondagens** → confira gráfico/lista.

### Resultado esperado

- Mensagem: `X sondagem(ns) cadastrada(s)`.
- Registros visíveis na aba Sondagens de cada aluno.

### Erros comuns

| Mensagem | Solução |
|----------|---------|
| Não foi possível contactar a função… | Deploy das Edge Functions + secret `GEMINI_API_KEY` |
| GEMINI_API_KEY não configurada | `supabase secrets set GEMINI_API_KEY=...` |
| Gemini API: 429 | Limite free tier; aguarde ou ative billing no AI Studio |
| Aluno não encontrado na turma | Vincule no select ou cadastre o aluno antes |

---

## Teste B — Importar boletins da turma (PDF)

### Pré-requisitos

- Turma com **alunos já cadastrados** (nomes/matrículas compatíveis com o PDF).
- PDF do EducaMais com **todos os boletins da turma** (ex.: arquivo exportado “Todos.pdf”).
- Edge Function `extract-boletins-pdf` em deploy.

### Passos

1. **Turmas** → clique na turma.
2. Clique **Importar boletins (IA)** (botão vermelho, ao lado de sondagens).
3. Selecione o PDF → **Extrair com IA**.
4. Aguarde (pode levar 30–90 s em PDFs com várias páginas).
5. Na revisão, vincule alunos não reconhecidos e confira disciplinas/faltas.
6. **Salvar notas na turma**.
7. Abra um aluno → aba **Boletim** → confira notas, RS1/RS2 e faltas do bimestre.

### O que a IA extrai

- Colunas **NT** (1º a 4º bimestre) por disciplina
- **RS1** e **RS2** (recuperação semestral)
- **Faltas do bimestre** (primeiros quatro números da tabela Faltas)
- Ignora FA por disciplina, MD e TF

### Erros comuns

| Mensagem | Solução |
|----------|---------|
| Nenhum aluno encontrado no PDF | Confira se é boletim EducaMais completo da turma |
| Aluno não vinculado | Selecione no dropdown ou cadastre antes |
| Timeout / 413 | PDF muito grande; tente exportar só a turma ou aguarde e repita |

---

## Teste C — Resumo pedagógico (IA)

### Pré-requisitos

- Aluno com algum dado (boletim, sondagem ou ocorrência ajuda, mas não é obrigatório).

### Passos

1. **Turmas** → turma → clique no aluno.
2. Aba **Resumo** (padrão).
3. No bloco roxo **Resumo pedagógico (IA)** → **Gerar resumo**.
4. Aguarde alguns segundos.
5. Leia o texto; use **Atualizar resumo** se mudou dados do aluno.

### Resultado esperado

- Parágrafos em português sobre situação geral, atenção e encaminhamento.
- Sem inventar nomes de disciplinas que não existem no boletim (pode falhar às vezes — revise sempre).

---

## Custos (referência)

- **Free tier** da API: suficiente para testes e uso moderado.
- Cada foto de ficha ≈ 1 chamada com imagem (poucos centavos de dólar no tier pago).
- Cada resumo ≈ 1 chamada só texto (muito barato).

Preços: [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing).

---

## Segurança

- A chave **nunca** vai para o código React publicado.
- Só as Edge Functions no Supabase chamam o Gemini.
- Revise sempre os dados antes de salvar (especialmente sondagens).

---

## Próximas fases (ainda não implementadas)

- Rascunho de ocorrência com IA
- Assistente de configuração de etiquetas

> Importação **individual** de boletim (um aluno) continua disponível na aba Boletim do aluno (PDF via regex, sem IA).

Para pedir implementação, use o modo Agent no Cursor.
