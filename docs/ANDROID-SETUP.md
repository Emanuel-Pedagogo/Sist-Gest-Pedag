# SACP — Setup Android (Fase 1)

Guia rápido para rodar o app Android após a integração Capacitor.

## O que já está pronto

- Capacitor configurado (`capacitor.config.json`)
- Plataforma `android/` gerada
- Vite com `base: './'` (assets corretos no WebView)
- Scripts npm: `build:android` e `open:android`
- **Fase 2:** deep link OAuth, login Google nativo, recuperação de senha (`src/utils/nativeAuth.js`)

**App ID:** `br.com.sacp.coordenacao`  
**Deep link OAuth:** `br.com.sacp.coordenacao://login-callback`

> Você **não precisa** do Android Studio para continuar o desenvolvimento web/Capacitor. Só será necessário quando for compilar e testar no celular.

## Configurar Supabase (antes de testar login Google no app)

No [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **URL Configuration**:

1. Em **Redirect URLs**, adicione:
   - `br.com.sacp.coordenacao://login-callback`
   - URL da web em produção (ex.: `https://seu-dominio.vercel.app/`)
   - `http://localhost:5173/` (desenvolvimento web)

No [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. Mantenha o client **Web** (usado pelo Supabase)
2. Quando instalar o Android Studio, crie um client **Android** com:
   - Package name: `br.com.sacp.coordenacao`
   - SHA-1 do keystore debug (Android Studio → Gradle → signingReport)

## Pré-requisitos no seu PC

1. [Android Studio](https://developer.android.com/studio) (inclui Android SDK)
2. **JDK 17** — o Android Studio costuma instalar; ou [Adoptium Temurin 17](https://adoptium.net/)
3. Variável `JAVA_HOME` apontando para o JDK (Android Studio → Settings → Build → Gradle → JDK)

## Comandos do dia a dia

```powershell
# Se npm falhar com erro de certificado SSL neste PC:
$env:NODE_OPTIONS="--use-system-ca"

# Build web + copiar para Android
npm run build:android

# Abrir no Android Studio
npm run open:android
```

No Android Studio: aguarde o Gradle sync → escolha emulador ou celular USB → **Run** (▶).

## Testar no celular (USB)

1. Ative **Opções do desenvolvedor** e **Depuração USB** no Android
2. Conecte o cabo; aceite a autorização no celular
3. Selecione o dispositivo no Android Studio e clique Run

## Gerar APK de teste (linha de comando)

Com `JAVA_HOME` configurado:

```powershell
cd android
.\gradlew.bat assembleDebug
```

APK em: `android/app/build/outputs/apk/debug/app-debug.apk`

## Fluxo após mudar o código React

Sempre que alterar `src/`:

```powershell
npm run build:android
```

Depois rode de novo no Android Studio (ou `npx cap run android` se SDK estiver no PATH).

## Problema conhecido: npm e SSL

Neste ambiente, `npm install` pode exigir:

```powershell
$env:NODE_OPTIONS="--use-system-ca"
```

Considere adicionar permanentemente nas variáveis de ambiente do Windows, se o erro persistir.

## Fase 3 — UI mobile (em andamento)

Melhorias no CSS global e telas P0. Teste **sem Android Studio** com F12 → modo celular no navegador.

Checklist: [`CHECKLIST-USUARIO.md`](./CHECKLIST-USUARIO.md)

## Fase 2 concluída no código

- `@capacitor/app` + `@capacitor/browser`
- `getAuthRedirectUrl()` — web vs app nativo
- Login Google abre browser in-app e retorna via deep link
- Recuperação de senha usa o mesmo deep link

## Publicação

- Conta Google Play Developer (~US$ 25)
- Keystore de produção (nunca commitar)
- Política de privacidade (LGPD)
