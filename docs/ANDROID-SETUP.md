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

## Erro de SSL ao compilar (PKIX / certificado)

**Sintoma:** `npm run release:android` (ou `gradlew bundleRelease`) falha com:

```
Could not download aapt2-...-windows.jar
> PKIX path building failed: unable to find valid certification path to requested target
```

**Causa:** o antivírus (aqui, **Avast**) inspeciona conexões HTTPS e troca o
certificado dos sites por um próprio. O Windows confia nesse certificado, mas o
Java usado pelo Gradle tem o próprio cofre de certificados e não o conhece — é a
mesma raiz do `NODE_OPTIONS=--use-system-ca` da seção acima.

**Correção (por máquina, fora do repositório):** criar um cofre de certificados
com o certificado do antivírus incluído e apontar o Gradle para ele. Nada é
enfraquecido — o Java passa a confiar exatamente no mesmo certificado que o
Windows já confia.

**1. Exportar o certificado do antivírus** (PowerShell):

```powershell
$c = Get-ChildItem Cert:\LocalMachine\Root, Cert:\CurrentUser\Root | Where-Object { $_.Subject -like "*Avast*" } | Select-Object -First 1
[System.IO.File]::WriteAllBytes("$env:TEMP\av-root.cer", $c.Export('Cert'))
```

**2. Criar o cofre com esse certificado dentro:**

```powershell
$jbr = "C:\Program Files\Android\Android Studio\jbr"
Copy-Item "$jbr\lib\security\cacerts" "$env:USERPROFILE\.gradle\cacerts-avast.jks" -Force
& "$jbr\bin\keytool.exe" -importcert -noprompt -trustcacerts -alias av-root -file "$env:TEMP\av-root.cer" -keystore "$env:USERPROFILE\.gradle\cacerts-avast.jks" -storepass changeit
```

**3. Apontar o Gradle para o cofre** — adicionar ao `~/.gradle/gradle.properties`:

```
systemProp.javax.net.ssl.trustStore=C:/Users/SEU_USUARIO/.gradle/cacerts-avast.jks
systemProp.javax.net.ssl.trustStorePassword=changeit
```

Refaça isso ao trocar de antivírus ou reinstalar o Android Studio.

> **Por que não há um script pronto para isso:** um `.ps1` que lê o repositório
> de certificados é colocado em quarentena pelo próprio Avast. Pior: o arquivo
> em quarentena vira uma entrada quebrada na pasta, e o `npm run dev` passa a
> falhar com `UNKNOWN: lstat ...` quando o Vite tenta observá-lo. Por isso os
> comandos ficam aqui, para colar no terminal.

> `systemProp.javax.net.ssl.trustStoreType=Windows-ROOT` **não** funciona com o
> JBR do Android Studio (erro `Windows-ROOT not found`) — por isso o cofre em arquivo.

## Fase 3 — UI mobile (em andamento)

Melhorias no CSS global e telas P0. Teste **sem Android Studio** com F12 → modo celular no navegador.

Checklist: [`CHECKLIST-USUARIO.md`](./CHECKLIST-USUARIO.md)

## Fase 2 concluída no código

- `@capacitor/app` + `@capacitor/browser`
- `getAuthRedirectUrl()` — web vs app nativo
- Login Google abre browser in-app e retorna via deep link
- Recuperação de senha usa o mesmo deep link

## Gerar AAB para Play Store

Com Android Studio instalado:

```powershell
npm run release:android
```

O script:

1. Faz `build` web + `cap sync android`
2. Usa o JDK do Android Studio
3. Cria `android/sacp-release.keystore` na primeira execução (se ainda não existir)
4. Gera `release/sacp-<versao>.aab` pronto para upload

**Importante:** se o app **já foi publicado** na Play Store, use o **mesmo keystore de upload** da primeira versão. Copie o arquivo `.keystore` e crie `android/keystore.properties` a partir de `android/keystore.properties.example`.

Credenciais geradas localmente ficam em `android/KEYSTORE-CREDENTIALS.local.txt` (não commitar).

## Publicação

- Conta Google Play Developer (~US$ 25)
- Keystore de produção (nunca commitar)
- Política de privacidade (LGPD)
