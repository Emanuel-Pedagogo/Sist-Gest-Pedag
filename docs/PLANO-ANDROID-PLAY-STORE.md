# Plano: SACP para Android (Play Store)

Documento de referência para publicar o **SACP — Sistema de Apoio à Coordenação Pedagógica** na Google Play Store, reaproveitando o app React + Vite + Supabase existente via **Capacitor**.

---

## 1. Resumo executivo

| Item | Decisão |
|------|---------|
| Estratégia | Capacitor (WebView nativo) — reutiliza ~95% do código React |
| Backend | Mantém Supabase (auth, DB, storage, edge functions) |
| Prazo estimado | **6 a 12 semanas** até publicação na loja |
| Esforço principal | UI mobile, OAuth no app, conformidade Play Store / LGPD |
| Modelo comercial sugerido | App gratuito na loja + assinatura via site (evita taxa Google de 15–30%) |

### Por que Capacitor (e não reescrever)

O projeto já é uma SPA React com Supabase. Reescrever em Kotlin ou Flutter levaria meses. Capacitor empacota o build web em um app Android nativo, com acesso a câmera, arquivos e deep links quando necessário.

---

## 2. Arquitetura alvo

```
┌─────────────────────────────────────────┐
│           Google Play Store             │
│         (distribui .aab assinado)       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         App Android (Capacitor)         │
│  ┌─────────────────────────────────┐    │
│  │   WebView → build Vite (React)  │    │
│  │   Plugins: App, Browser, Files  │    │
│  └─────────────────────────────────┘    │
└─────────────────┬───────────────────────┘
                  │ HTTPS
┌─────────────────▼───────────────────────┐
│              Supabase                   │
│  Auth · PostgreSQL · Storage · Edge Fn  │
└─────────────────────────────────────────┘
```

**Fluxo de build:**

1. `npm run build` → gera `dist/`
2. Capacitor copia `dist/` para `android/app/src/main/assets/public/`
3. Android Studio gera `.aab` assinado para upload na Play Console

---

## 3. Cronograma por fases

| Fase | Duração | Entregável |
|------|---------|------------|
| **0 — Preparação** | 2–3 dias | Conta Play Developer, variáveis de ambiente, decisão de monetização |
| **1 — Capacitor + build** | 1 semana | App instalável no celular (APK debug) |
| **2 — Autenticação mobile** | 3–5 dias | Login e-mail/senha + Google OAuth + recuperação de senha |
| **3 — UI/UX mobile** | 2–4 semanas | Telas críticas usáveis em celular e tablet |
| **4 — Recursos nativos** | 1 semana | Upload PDF/foto, exportação de arquivos, teclado/viewport |
| **5 — Testes** | 1 semana | Testes em 3+ dispositivos (celular + tablet) |
| **6 — Play Store** | 1–2 semanas | Assets, política de privacidade, revisão Google |

**Total:** ~6 semanas (MVP publicável) a ~12 semanas (versão polida para venda).

---

## 4. Fase 0 — Preparação

### 4.1 Contas e ferramentas

- [ ] Criar conta [Google Play Console](https://play.google.com/console) (taxa única ~US$ 25)
- [ ] Instalar [Android Studio](https://developer.android.com/studio) (SDK, emuladores)
- [ ] Node.js LTS + Java 17 (requerido pelo Gradle Android)
- [ ] Definir **nome do pacote** (ex.: `br.com.seudominio.sacp`) — imutável após publicação

### 4.2 Decisões de produto

- [ ] **Monetização:** assinatura externa (site) vs. Google Play Billing
- [ ] **Público:** só coordenadores ou também professores?
- [ ] **Offline:** MVP online-only (Supabase) ou cache parcial depois?
- [ ] **Multi-escola:** manter fluxo atual (select de escola no header)

### 4.3 Segurança (antes de publicar)

- [ ] Mover `supabaseUrl` e `supabaseAnonKey` de `src/supabaseClient.js` para variáveis `VITE_*` (`.env`)
- [ ] Revisar RLS (Row Level Security) no Supabase — dados de alunos exigem isolamento por escola/usuário
- [ ] Redigir **Política de Privacidade** (LGPD) — hospedar em URL pública

---

## 5. Fase 1 — Integração Capacitor

### 5.1 Comandos iniciais

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "SACP" br.com.seudominio.sacp --web-dir dist
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

### 5.2 Ajustes no Vite (`vite.config.js`)

```js
export default defineConfig({
  plugins: [react()],
  base: './',  // necessário para assets no WebView (caminhos relativos)
})
```

### 5.3 Ajustes no `index.html`

- [ ] `lang="pt-BR"`
- [ ] Título: `SACP — Coordenação Pedagógica`
- [ ] Meta tags PWA (opcional): `theme-color`, ícone 512×512
- [ ] Viewport já existe: `width=device-width, initial-scale=1.0` ✓

### 5.4 Configuração Android (`capacitor.config.ts`)

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.seudominio.sacp',
  appName: 'SACP',
  webDir: 'dist',
  server: {
    androidScheme: 'https',  // evita mixed content / cookies
  },
};

export default config;
```

### 5.5 Scripts úteis (`package.json`)

```json
"scripts": {
  "build:android": "npm run build && npx cap sync android",
  "open:android": "npx cap open android"
}
```

### 5.6 Critério de conclusão da Fase 1

- [ ] App abre no emulador/dispositivo
- [ ] Login e-mail/senha funciona
- [ ] Navegação entre views carrega sem erro 404 de assets

---

## 6. Fase 2 — Autenticação no app

### 6.1 Situação atual

Em `src/App.jsx`:

- `signInWithPassword` — funciona no WebView sem alteração
- `signInWithOAuth({ provider: 'google' })` — **precisa de deep link** (hoje usa redirect web)
- `resetPasswordForEmail` com `redirectTo: window.location.origin` — precisa URL do app

### 6.2 OAuth Google + Supabase (passo a passo)

1. **Supabase Dashboard** → Authentication → URL Configuration:
   - Site URL: `https://seudominio.com` (produção web)
   - Redirect URLs adicionar:
     - `br.com.seudominio.sacp://login-callback`
     - `https://localhost` (dev Capacitor)

2. **Google Cloud Console** → OAuth Client:
   - Criar client **Android** (package name + SHA-1 do keystore debug/release)
   - Manter client **Web** para Supabase

3. **Código** — criar helper `src/utils/authRedirect.js`:

```js
import { Capacitor } from '@capacitor/core';

export function getAuthRedirectUrl() {
  if (Capacitor.isNativePlatform()) {
    return 'br.com.seudominio.sacp://login-callback';
  }
  return `${window.location.origin}/`;
}
```

4. Atualizar `handleGoogleAuth`:

```js
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: getAuthRedirectUrl() },
});
```

5. Instalar e configurar deep link:

```bash
npm install @capacitor/app @capacitor/browser
```

- Abrir OAuth no **Browser in-app** (`Browser.open`) ou Custom Tabs
- Escutar `App.addListener('appUrlOpen', ...)` para capturar callback
- Chamar `supabase.auth.exchangeCodeForSession(code)` (PKCE)

6. **AndroidManifest.xml** — intent filter para scheme `br.com.seudominio.sacp`

### 6.3 Recuperação de senha

- Opção A: link do e-mail abre no navegador → usuário redefine → volta ao app manualmente
- Opção B: deep link `br.com.seudominio.sacp://reset-password` (melhor UX)

### 6.4 Critério de conclusão

- [ ] Login Google funciona no dispositivo físico
- [ ] Recuperação de senha completa o fluxo
- [ ] Sessão persiste ao fechar e reabrir o app

---

## 7. Fase 3 — Prioridade de telas mobile

O app tem **14 views** e **12 modais**. Já existe menu mobile e breakpoints em `App.css` (`768px`, `480px`). A priorização abaixo segue uso típico de coordenação pedagógica em campo.

### Prioridade P0 — Bloqueia uso no celular

| Tela / componente | Arquivo | Problema provável | Ação |
|-------------------|---------|-------------------|------|
| Login / cadastro | `App.jsx` | Teclado cobre campos | `viewport-fit`, scroll, botões maiores |
| Header + seletor escola | `App.jsx` | Select estreito no mobile | Layout empilhado ou drawer |
| Dashboard | `DashboardView.jsx` | Cards + calendário apertados | Grid 1 coluna, calendário horizontal scroll |
| Agenda | `AgendaView.jsx` | Lista/calendário denso | Cards full-width, FAB para novo evento |
| Detalhe evento | `AgendaEventDetailView.jsx` | Anexos e textos longos | Stack vertical, botões fixos no rodapé |
| Turmas | `ClassesView.jsx` | Grid de turmas | 1–2 colunas responsivas |
| Alunos (lista) | `StudentsView.jsx` | Tabela larga | Lista tipo card (já parcial?) |
| Detalhe aluno | `StudentDetailView.jsx` | Abas + muitos dados | Tabs scroll horizontal ✓, conteúdo em accordion |
| Modais (todos) | `components/modals/*` | Overflow / botões cortados | `max-height: 90vh`, scroll interno, footer fixo |

### Prioridade P1 — Uso frequente, adaptar em seguida

| Tela | Arquivo | Ação |
|------|---------|------|
| Professores | `TeachersView.jsx` | Lista card, busca sticky |
| Detalhe professor | `TeacherDetailView.jsx` | Tabs + formulários empilhados |
| Escolas | `SchoolsView.jsx` | Cards em vez de tabela |
| Configurações | `SettingsView.jsx` | Formulários full-width |
| Biblioteca | `LibraryView.jsx` | Empréstimos em lista |
| Dashboard da turma | `ClassDashboardView.jsx` | Métricas empilhadas |

### Prioridade P2 — Funciona melhor em tablet

| Tela | Arquivo | Nota |
|------|---------|------|
| Relatórios | `ReportsView.jsx` | Export DOCX — testar share nativo |
| Gráficos | `ChartsView.jsx` | Recharts — largura mínima, scroll ou simplificar |
| Boletim | `BoletimView.jsx` | Tabela wide — landscape ou scroll horizontal |
| Diário frequência especial | `DiarioFrequenciaEspecialView.jsx` | Grid de presença — tablet first |
| Importações PDF | `Importar*.jsx` | Upload OK; preview PDF difícil no mobile |

### Prioridade P3 — Pode ficar “web only” no MVP

- Importação em lote de boletim turma (`ImportarBoletimTurma.jsx`)
- Gráficos analíticos complexos (`ChartsView.jsx`) — versão simplificada no app

### Padrões CSS recomendados

```css
/* Alvos de toque mínimos (Material Design) */
button, .nav-item, li[role="button"] {
  min-height: 44px;
  min-width: 44px;
}

/* Modais mobile */
.modal-content {
  max-height: 90dvh;
  overflow-y: auto;
  margin: 16px;
  width: calc(100% - 32px);
}

/* Tabelas → scroll horizontal controlado */
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Tablet: sidebar opcional persistente */
@media (min-width: 768px) and (max-width: 1024px) {
  aside { width: 240px; }
}
```

### Refatoração futura (não bloqueia MVP)

- `App.jsx` com ~5.200 linhas — considerar extrair rotas e hooks depois da publicação
- Adicionar React Router ou similar para deep links internos (`/aluno/:id`)

---

## 8. Fase 4 — Recursos nativos e plugins

### 8.1 Upload de arquivos

| Feature | Arquivo | Abordagem |
|---------|---------|-----------|
| PDF boletim | `ImportarBoletim.jsx`, `ImportarBoletimTurma.jsx` | `<input type="file">` funciona no WebView — testar |
| PDF lista alunos | `ImportarListaAlunos.jsx` | Idem |
| Foto sondagem | `ImportarSondagemFoto.jsx` | Testar câmera; se falhar: `@capacitor/camera` |

### 8.2 Exportação PDF/DOCX

- `jspdf`, `docx`, `file-saver` — no Android o download via blob pode falhar
- Solução: `@capacitor/filesystem` + `@capacitor/share` para “Salvar/Compartilhar”

```bash
npm install @capacitor/filesystem @capacitor/share
```

### 8.3 Plugins Capacitor sugeridos

| Plugin | Uso |
|--------|-----|
| `@capacitor/app` | Deep links, botão voltar, lifecycle |
| `@capacitor/browser` | OAuth Google |
| `@capacitor/keyboard` | Ajustar layout quando teclado abre |
| `@capacitor/status-bar` | Cor da barra de status |
| `@capacitor/splash-screen` | Splash nativa |
| `@capacitor/camera` | Foto de sondagem (fallback) |
| `@capacitor/filesystem` + `share` | Exportar relatórios |

### 8.4 Edge Functions (Gemini)

- `extract-sondagens`, `extract-boletins-pdf`, `generate-resumo-aluno` — **sem mudança** (chamadas HTTPS do app)
- Garantir CORS nas functions aceita origem do app (geralmente OK para mobile)

---

## 9. Fase 5 — Testes

### 9.1 Matriz de dispositivos

| Tipo | Exemplo | Objetivo |
|------|---------|----------|
| Celular pequeno | 5,5" · 360×640 | Layout mínimo |
| Celular grande | 6,7" · 412×915 | Uso principal |
| Tablet 10" | 800×1280 | Gráficos, boletim, diário |

### 9.2 Checklist funcional

- [ ] Instalar APK limpo (sem dev server)
- [ ] Login, logout, persistência de sessão
- [ ] Login Google (dispositivo real)
- [ ] Trocar escola ativa
- [ ] CRUD: aluno, turma, evento agenda
- [ ] Upload PDF e foto de sondagem
- [ ] Exportar relatório PDF/DOCX e compartilhar
- [ ] Rotação portrait/landscape
- [ ] App em background → retorno sem crash
- [ ] Conexão lenta / offline → mensagem clara (não tela branca)

### 9.3 Testes de release

```bash
cd android
./gradlew assembleRelease   # ou via Android Studio: Build → Generate Signed Bundle
```

- [ ] Assinar com keystore de **produção** (guardar backup seguro!)
- [ ] Testar `.aab` via **Internal testing** na Play Console antes de produção

---

## 10. Fase 6 — Publicação na Play Store

### 10.1 Assets obrigatórios

| Asset | Especificação |
|-------|---------------|
| Ícone | 512×512 PNG |
| Feature graphic | 1024×500 |
| Screenshots phone | Mín. 2 · 16:9 ou 9:16 |
| Screenshots tablet 7" | Recomendado |
| Screenshots tablet 10" | Recomendado |
| Descrição curta | Até 80 caracteres |
| Descrição completa | Benefícios para coordenação pedagógica |
| Política de privacidade | URL HTTPS obrigatória |

### 10.2 Play Console — formulários

- [ ] **App content** → Data safety (dados de menores — escola/educação)
- [ ] **Target audience** → provavelmente 18+ (app para adultos/coordenadores)
- [ ] **Content rating** → questionário IARC
- [ ] **News app / COVID / etc.** → N/A na maioria dos casos
- [ ] **Ads** → declarar se não há anúncios

### 10.3 LGPD e dados sensíveis

O SACP trata **dados de alunos** (menores). Documentar na política de privacidade:

- Quais dados são coletados (nome, matrícula, notas, frequência, ocorrências)
- Base legal (execução de contrato / legítimo interesse da escola)
- Onde são armazenados (Supabase — região do projeto)
- Retenção e exclusão
- Contato do encarregado (DPO) ou responsável
- Direitos do titular (acesso, correção, exclusão)

**Recomendação:** contrato de tratamento de dados (DPA) com escolas clientes.

### 10.4 Monetização na loja

| Modelo | Prós | Contras |
|--------|------|---------|
| App grátis + assinatura no site | Sem taxa Google; flexível B2B | Usuário paga fora do app |
| Assinatura in-app (Play Billing) | Descoberta + cobrança integrada | Taxa 15–30%; mais implementação |
| Compra única | Simples | Pouco comum para SaaS |

Para SaaB educacional B2B, **app gratuito + cobrança externa** é o caminho mais comum no MVP.

### 10.5 Versionamento

- `versionCode` incrementa a cada upload (inteiro)
- `versionName` semver visível ao usuário (ex.: `1.0.0`)
- Manter changelog na Play Console

---

## 11. Estrutura de pastas após Capacitor

```
Sist-Gest-Pedag/
├── android/                 # projeto Android (gerado)
├── dist/                    # build Vite
├── src/                     # React (existente)
├── capacitor.config.json    # config Capacitor
├── docs/
│   ├── GEMINI-SETUP.md
│   └── PLANO-ANDROID-PLAY-STORE.md  ← este arquivo
└── package.json
```

Adicionar ao `.gitignore` (se necessário):

- `android/.gradle/`
- `android/app/build/`
- `*.keystore` (nunca commitar keystore de produção)

---

## 12. Riscos e mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| OAuth Google falha no WebView | Alto | Browser plugin + deep link + PKCE |
| Tabelas ilegíveis no celular | Alto | P0 UI: cards e scroll |
| Export PDF não salva no Android | Médio | Filesystem + Share plugins |
| Rejeição Play Store (dados de crianças) | Alto | Política clara; app para adultos; Data safety correto |
| Chaves Supabase no código | Médio | `.env` + RLS rigoroso |
| `App.jsx` monolítico | Médio | MVP primeiro; refatorar depois |
| Revisão Google demorada | Baixo | Internal testing antes |

---

## 13. Próximos passos imediatos (esta semana)

Ordem sugerida para começar a implementação:

1. **Definir `appId`** (ex.: `br.com.seudominio.sacp`) e criar conta Play Developer
2. **Fase 1:** instalar Capacitor, `base: './'` no Vite, primeiro build no emulador
3. **Testar login e-mail/senha** no dispositivo — valida 80% do fluxo
4. **Fase 2:** configurar deep link + Google OAuth
5. **P0 UI:** Dashboard, Agenda, lista de alunos, modais
6. **Redigir rascunho** da política de privacidade (pode ser revisada por advogado depois)

---

## 14. Referências

- [Capacitor — Getting Started](https://capacitorjs.com/docs/getting-started)
- [Supabase — Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Google Play — Launch checklist](https://developer.android.com/distribute/best-practices/launch/launch-checklist)
- [Google Play — Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [LGPD — ANPD](https://www.gov.br/anpd/pt-br)

---

*Documento criado para o repositório SACP. Atualize o `appId`, domínio e prazos conforme suas decisões de produto.*
