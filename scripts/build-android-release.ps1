# Gera o pacote .aab assinado para a Google Play Store.
# Requisitos: Android Studio (JDK) e Android SDK configurados em android/local.properties

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$AndroidDir = Join-Path $Root 'android'
$Jbr = 'C:\Program Files\Android\Android Studio\jbr'
$Keytool = Join-Path $Jbr 'bin\keytool.exe'
$KeystoreFile = Join-Path $AndroidDir 'sacp-release.keystore'
$KeystoreProps = Join-Path $AndroidDir 'keystore.properties'
$CredentialsFile = Join-Path $AndroidDir 'KEYSTORE-CREDENTIALS.local.txt'

function New-RandomPassword {
    param([int]$Length = 24)
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    -join ((1..$Length) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
}

if (-not (Test-Path (Join-Path $Jbr 'bin\java.exe'))) {
    throw 'JDK do Android Studio nao encontrado. Instale o Android Studio ou ajuste o caminho do JBR no script.'
}

$env:JAVA_HOME = $Jbr
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

Write-Host '>> Build web + sync Capacitor...'
Push-Location $Root
npm run build:android
Pop-Location

if (-not (Test-Path $KeystoreFile)) {
    Write-Host '>> Keystore de release nao encontrado. Gerando sacp-release.keystore...'
    Write-Host '   ATENCAO: se o app ja foi publicado na Play Store, cancele e use o keystore original.'

    $storePassword = New-RandomPassword
    $keyPassword = $storePassword
    $dname = 'CN=SACP Coordenacao Pedagogica, OU=Mobile, O=SACP, L=Belem, ST=PA, C=BR'

    & $Keytool -genkeypair -v `
        -storetype PKCS12 `
        -keystore $KeystoreFile `
        -alias sacp `
        -keyalg RSA `
        -keysize 2048 `
        -validity 10000 `
        -storepass $storePassword `
        -keypass $keyPassword `
        -dname $dname

    @(
        'Credenciais locais do keystore de upload do SACP'
        'Guarde este arquivo em local seguro (gerenciador de senhas).'
        ''
        "Keystore: $KeystoreFile"
        'Alias: sacp'
        "Store password: $storePassword"
        "Key password: $keyPassword"
        ''
        'Se perder este arquivo, nao sera possivel publicar atualizacoes com o mesmo certificado.'
    ) | Set-Content -Path $CredentialsFile -Encoding UTF8

    Write-Host ">> Credenciais salvas em: $CredentialsFile"
}

if (-not (Test-Path $KeystoreProps)) {
    Write-Host '>> Criando android/keystore.properties...'

    if (Test-Path $CredentialsFile) {
        $credText = Get-Content $CredentialsFile -Raw
        $storeMatch = [regex]::Match($credText, 'Store password:\s*(.+)', 'IgnoreCase')
        $storePassword = if ($storeMatch.Success) { $storeMatch.Groups[1].Value.Trim() } else { '' }
    } else {
        throw 'keystore.properties ausente e credenciais nao encontradas.'
    }

    @(
        'storeFile=sacp-release.keystore'
        "storePassword=$storePassword"
        'keyAlias=sacp'
        "keyPassword=$storePassword"
    ) | ForEach-Object { $_ } | Set-Content -Path $KeystoreProps -Encoding ascii
}

$aab = Join-Path $AndroidDir 'app\build\outputs\bundle\release\app-release.aab'

# Remove qualquer AAB antigo antes de compilar, para nunca reaproveitar um
# arquivo de uma build anterior caso o gradlew falhe silenciosamente.
if (Test-Path $aab) {
    Remove-Item $aab -Force
}

Write-Host '>> Gerando app-release.aab...'
Push-Location $AndroidDir
.\gradlew.bat bundleRelease
$gradleExitCode = $LASTEXITCODE
Pop-Location

if ($gradleExitCode -ne 0) {
    throw "gradlew bundleRelease falhou (codigo $gradleExitCode). Veja o log acima para a causa."
}

if (-not (Test-Path $aab)) {
    throw "AAB nao encontrado em $aab"
}

$releaseDir = Join-Path $Root 'release'
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
$versionName = (Select-String -Path (Join-Path $AndroidDir 'app\build.gradle') -Pattern 'versionName\s+"([^"]+)"').Matches[0].Groups[1].Value
$dest = Join-Path $releaseDir "sacp-$versionName.aab"
Copy-Item -Path $aab -Destination $dest -Force

Write-Host ''
Write-Host 'Concluido.'
Write-Host "AAB assinado: $dest"
Write-Host 'Proximo passo: enviar este arquivo na Google Play Console (Producao ou Teste interno).'
