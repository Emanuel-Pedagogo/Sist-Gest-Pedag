# SACP - Sistema de Apoio à Coordenação Pedagógica

Aplicação React + Vite para apoiar a coordenação pedagógica no acompanhamento de escolas, turmas, alunos, professores, agenda, sondagens, boletins, ocorrências e relatórios.

O backend usa Supabase (Auth, PostgreSQL, Storage e Edge Functions). Recursos de IA usam Gemini via Edge Functions, mantendo a chave da API fora do frontend.

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

Configure no `.env`:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_publica
```

O código mantém fallback para o projeto Supabase atual, mas o uso de `.env` é recomendado para separar desenvolvimento, piloto e produção.

## Verificações

```bash
npm test
npm run lint
npm run build
```

## Documentação principal

- [`docs/CONTEXTO-PROJETO.md`](./docs/CONTEXTO-PROJETO.md): **contexto completo do projeto** (o que é, arquitetura, domínio, estágio, riscos e convenções) — ler primeiro, inclusive para IAs/contribuidores novos.
- [`docs/VERSAO-PROFESSOR.md`](./docs/VERSAO-PROFESSOR.md): módulo/perfil Professor (ativação SQL + checklist).
- [`docs/PILOTO-CONFIAVEL.md`](./docs/PILOTO-CONFIAVEL.md): plano operacional para validar o sistema em piloto controlado.
- [`docs/SUPABASE-CHECKLIST-PILOTO.md`](./docs/SUPABASE-CHECKLIST-PILOTO.md): checklist Supabase (tabelas, RLS, buckets, Edge Functions).
- [`docs/ROTEIRO-VALIDACAO-PILOTO.md`](./docs/ROTEIRO-VALIDACAO-PILOTO.md): roteiro passo a passo para validar fluxos antes do piloto.
- [`docs/GEMINI-SETUP.md`](./docs/GEMINI-SETUP.md): configuração das Edge Functions com Gemini.
- [`docs/CHECKLIST-USUARIO.md`](./docs/CHECKLIST-USUARIO.md): checklist rápido para testes de usuário e Android.
- [`docs/ANDROID-SETUP.md`](./docs/ANDROID-SETUP.md): preparação do ambiente Android.
- [`docs/PLANO-ANDROID-PLAY-STORE.md`](./docs/PLANO-ANDROID-PLAY-STORE.md): referência para publicação futura na Play Store.

## Foco do piloto

Antes de usar dados reais de alunos, valide:

- tabelas e buckets Supabase;
- políticas de acesso com usuário autenticado;
- Edge Functions e secret `GEMINI_API_KEY`;
- fluxos essenciais de escola, turma, aluno, sondagem, boletim, agenda e relatórios;
- revisão humana de qualquer dado extraído ou gerado por IA.

## Login e cadastro

- **Entrar**: e-mail e senha ou "Entrar com Google".
- **Cadastrar**: nome (opcional), e-mail, senha e confirmação; ou "Cadastrar com Google".
- **Recuperar senha**: envia link de redefinição para o e-mail.

## Habilitar login com Google

1. No [Supabase Dashboard](https://supabase.com/dashboard), abra o projeto.
2. **Authentication** → **Providers** → **Google** → ative e preencha Client ID e Client Secret (obtidos no [Google Cloud Console](https://console.cloud.google.com/apis/credentials)).
3. Em **Authentication** → **URL Configuration**, adicione a URL do seu app em **Redirect URLs** (ex.: `http://localhost:5173/` para dev e a URL de produção).
