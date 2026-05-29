# SACP — O que você precisa fazer (checklist)

Tarefas **suas** vs. o que o código já faz sozinho.

---

## Agora (5 minutos) — testar layout mobile no navegador

Você **não precisa** do Android Studio para ver as melhorias de UI.

1. Com o app rodando (`npm run dev`), abra no Chrome ou Edge
2. Pressione **F12** → ícone de celular (modo responsivo) ou `Ctrl+Shift+M`
3. Escolha um dispositivo (ex.: iPhone 12, Pixel 7) ou largura **390px**
4. Navegue por: Dashboard, Agenda, Alunos, abra um modal de evento

**O que validar:** menu ☰, seletor de escola em linha cheia, cards em 2 colunas, modais deslizando de baixo, botões grandes o suficiente para tocar.

---

## Quando puder (10 minutos) — Supabase para login Google no app

Só necessário **antes de testar login Google no celular**. Login e-mail/senha já funciona sem isso.

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard) → seu projeto
2. **Authentication** → **URL Configuration**
3. Em **Redirect URLs**, adicione:
   ```
   br.com.sacp.coordenacao://login-callback
   ```
4. Salve

---

## Depois (quando quiser testar no celular) — Android Studio

1. Instale [Android Studio](https://developer.android.com/studio)
2. No terminal do projeto:
   ```powershell
   $env:NODE_OPTIONS="--use-system-ca"
   npm run open:android
   ```
3. Aguarde o Gradle sync → conecte o celular (depuração USB) → **Run** ▶

Guia completo: [`ANDROID-SETUP.md`](./ANDROID-SETUP.md)

---

## Publicação na Play Store (futuro)

| Tarefa | Quando |
|--------|--------|
| Conta Google Play Developer (~US$ 25) | Antes de publicar |
| Política de privacidade (LGPD) em URL pública | Obrigatório na loja |
| Ícone 512×512 e screenshots | Antes do upload |
| Keystore de produção | Gerar no Android Studio; **fazer backup** |

---

## O que já está pronto no código

- [x] Capacitor + pasta `android/`
- [x] Deep link OAuth (`br.com.sacp.coordenacao://login-callback`)
- [x] Login Google preparado para app nativo
- [x] UI mobile: header, dashboard, agenda, alunos, modais (EventModal, ClassModal)
- [x] CSS responsivo global (`App.css`)

## Próximas melhorias (sem ação sua)

- Migrar demais modais para `ModalShell`
- Ajustes em detalhe do aluno, gráficos e boletim (tablet)
