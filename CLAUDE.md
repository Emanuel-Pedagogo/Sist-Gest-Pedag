# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Read `docs/CONTEXTO-PROJETO.md` first.** It is the authoritative, actively-maintained project context doc (domain model, feature map, conventions, known technical debt, what NOT to do). This file only adds the commands and architecture orientation Claude Code specifically needs to start working — it does not duplicate that document.

## Commands

```bash
npm install               # setup
npm run dev                # Vite dev server (localhost:5173)
npm test                   # run all Vitest tests
npx vitest run <path>      # run a single test file, e.g. npx vitest run src/boletimMath.test.js
npx vitest run -t "<name>" # run tests matching a name
npx eslint src              # lint the actual source (see gotcha below)
npm run build               # production build -> dist/
npm run build:android       # web build + Capacitor sync to android/
```

**Do not run `npm run lint` (`eslint .`)** — it lints `android/`, `assets/`, and build artifacts and fails on noise unrelated to the source. Always use `npx eslint src` instead.

There is no E2E suite; Vitest covers isolated `src/utils/*` logic only (see `docs/CONTEXTO-PROJETO.md` §11 for the full list). Manual validation flows are documented in `docs/ROTEIRO-VALIDACAO-PILOTO.md` and `docs/CHECKLIST-USUARIO.md`.

## Architecture orientation

This is a React 19 + Vite SPA over Supabase (Auth/Postgres/Storage/Edge Functions), also packaged for Android via Capacitor. Full domain model and feature map live in `docs/CONTEXTO-PROJETO.md` — the points below are the structural things that aren't obvious from reading any single file.

- **`src/App.jsx` is a monolithic hub (~5.5k lines)**: global state, Supabase CRUD calls, auth, and navigation all live here, with `src/views/*` mostly rendering UI and calling back up into handlers passed down from `App.jsx`. There is deliberately no service/repository layer — screens call `supabase.from(...)` directly. Don't refactor this apart casually; `docs/CONTEXTO-PROJETO.md` explicitly asks to stabilize before extracting.
- **No React Router.** Navigation is a `currentView` string in `App.jsx` state (`navigate(viewId)`), persisted to `localStorage` and mirrored in the `?view=` query param. Adding a screen means extending the `currentView` map in `App.jsx`, not adding a route.
- **Two independent AI integrations, both server-side only, never sharing a code path:**
  - Gemini (`supabase/functions/extract-sondagens`, `extract-boletins-pdf`, `generate-resumo-aluno`) — structured extraction from photos/PDFs, always into a human-review table before any DB write, never silent-save.
  - Claude (`supabase/functions/chat-ia`) — a read/write data chat for coordenação only. Every SELECT and every proposed INSERT/UPDATE/DELETE is scoped server-side to the escola currently selected in the top-of-screen selector (`activeSchoolId` in `App.jsx`, passed down to `ChatIAView.jsx`) — both via system-prompt instructions to Claude *and* a hard regex check in the Edge Function that rejects any query touching an escola-scoped table without the literal escola id in the SQL text. Writes never execute directly; they create a row in `chat_ia_confirmacoes` that the user must confirm in the UI before `sacp_chat_confirmar_escrita` runs it. Never uses the service role key — every RPC runs `SECURITY INVOKER` under the caller's JWT, so Postgres RLS is the real backstop, not the Edge Function.
- **Schema changes are raw SQL files, not migrations.** There is no `supabase/migrations/`; each change is a new `supabase_*.sql` file at the repo root, applied manually (Supabase MCP `apply_migration` or the dashboard) and cross-referenced in `docs/SUPABASE-CHECKLIST-PILOTO.md`. Keep following this pattern until the project moves to versioned migrations (tracked as tech debt in `docs/CONTEXTO-PROJETO.md` §14).
- **`src/supabaseClient.js` has a hardcoded URL/anon key**, not read from `.env` despite `.env.example` documenting `VITE_SUPABASE_*` — known, tracked debt, not a bug to silently "fix" without flagging it.
- **The color-coded etiqueta system is the pedagogical core of the app** and has one source of truth: `src/utils/etiquetas.js` for labels/colors/icons, `src/utils/studentColorEvaluator.js` for the priority logic (roxo > vermelho > amarelo > verde > azul, criteria configurable per-escola in `escolas.configuracoes`). Never hardcode a color or label elsewhere.
- **UI feedback goes through `toast`/`confirmAction` from `src/utils/appFeedback.js`**, never native `alert()`/`confirm()`. New modals extend `src/components/ModalShell.jsx` and reuse `.btn-primary`/`.btn-secondary`/`.input-group` classes rather than introducing new ad hoc styles.
- **UI and user-facing copy are in Brazilian Portuguese**; this includes commit messages when asked to commit (short, PT-BR, matching recent history).
- Only commit/push when the user explicitly asks.
