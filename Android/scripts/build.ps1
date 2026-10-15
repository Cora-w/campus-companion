param(
    [string]$Sdk = "$env:LOCALAPPDATA\Android\Sdk",
    [string]$Jdk = 'C:\Program Files\Android\Android Studio\jbr'
)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$androidRoot = Join-Path $projectRoot 'Android'
$build = Join-Path $androidRoot ('build\' + [DateTime]::Now.ToString('yyyyMMdd-HHmmss'))
if (-not $build.StartsWith($androidRoot + '\')) { throw 'Invalid build path' }
$tools = (Get-ChildItem (Join-Path $Sdk 'build-tools') -Directory | Sort-Object Name -Descending | Select-Object -First 1).FullName
$platform = (Get-ChildItem (Join-Path $Sdk 'platforms') -Directory | Sort-Object Name -Descending | Select-Object -First 1).FullName
$androidJar = Join-Path $platform 'android.jar'
$java = Join-Path $Jdk 'bin\java.exe'
function Run([string]$exe, [string[]]$arguments) {
    & $exe @arguments
    if ($LASTEXITCODE -ne 0) { throw "Build command failed: $exe ($LASTEXITCODE)" }
}
New-Item -ItemType Directory -Force -Path $build, "$build\classes", "$build\dex", "$build\assets\web", "$androidRoot\.signing", "$projectRoot\Releases" | Out-Null
Push-Location "$projectRoot\Frontend"
$previousMode = $env:VITE_API_MODE
try {
    $env:VITE_API_MODE = 'mock'
    Run 'npm.cmd' @('run', 'build', '--', '--configLoader', 'native')
} finally { $env:VITE_API_MODE = $previousMode; Pop-Location }
Copy-Item "$projectRoot\Frontend\dist\*" "$build\assets\web" -Recurse
Run "$tools\aapt2.exe" @('compile', '--dir', "$androidRoot\res", '-o', "$build\resources.zip")
Run "$tools\aapt2.exe" @('link', '-o', "$build\unsigned.apk", '-I', $androidJar, '--manifest', "$androidRoot\AndroidManifest.xml", "$build\resources.zip")
$sources = @(Get-ChildItem "$androidRoot\src" -Filter *.java -Recurse | ForEach-Object FullName)
Run "$Jdk\bin\javac.exe" (@('--release', '8', '-encoding', 'UTF-8', '-classpath', $androidJar, '-d', "$build\classes") + $sources)
Run "$Jdk\bin\jar.exe" @('--create', '--file', "$build\app.jar", '-C', "$build\classes", '.')
Run $java @('-cp', "$tools\lib\d8.jar", 'com.android.tools.r8.D8', '--lib', $androidJar, '--min-api', '26', '--output', "$build\dex", "$build\app.jar")
Run "$Jdk\bin\jar.exe" @('--update', '--file', "$build\unsigned.apk", '-C', "$build\dex", 'classes.dex', '-C', $build, 'assets')
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead("$build\unsigned.apk")
try {
    if (!$archive.GetEntry('assets/web/index.html')) { throw 'APK homepage missing' }
    foreach ($entry in $archive.Entries) {
        if ($entry.FullName.Contains('\')) { throw "Invalid Android archive path: $($entry.FullName)" }
    }
    foreach ($file in Get-ChildItem "$build\assets" -Recurse -File) {
        $relative = [IO.Path]::GetRelativePath($build, $file.FullName).Replace('\', '/')
        $entry = $archive.GetEntry($relative)
        if (!$entry -or $entry.Length -ne $file.Length) { throw "Missing or truncated asset: $relative" }
    }
    Write-Output 'Verified homepage and all bundled asset paths.'
} finally { $archive.Dispose() }
Run "$tools\zipalign.exe" @('-f', '-p', '4', "$build\unsigned.apk", "$build\aligned.apk")
$key = "$androidRoot\.signing\demo.keystore"
$passwordFile = "$androidRoot\.signing\password.local"
if (!(Test-Path $key)) {
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $env:CAMPUS_SIGN_PASSWORD = [Convert]::ToHexString($bytes)
    [IO.File]::WriteAllText($passwordFile, $env:CAMPUS_SIGN_PASSWORD)
    Run "$Jdk\bin\keytool.exe" @('-genkeypair', '-keystore', $key, '-storepass:env', 'CAMPUS_SIGN_PASSWORD', '-keypass:env', 'CAMPUS_SIGN_PASSWORD', '-alias', 'campus-demo', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000', '-dname', 'CN=Campus Companion Demo, O=Campus Companion, C=CN')
} else { $env:CAMPUS_SIGN_PASSWORD = [IO.File]::ReadAllText($passwordFile) }
$output = "$projectRoot\Releases\campus-companion-0.1.27.apk"
try {
    Run $java @('-jar', "$tools\lib\apksigner.jar", 'sign', '--ks', $key, '--ks-key-alias', 'campus-demo', '--ks-pass', 'env:CAMPUS_SIGN_PASSWORD', '--key-pass', 'env:CAMPUS_SIGN_PASSWORD', '--out', $output, "$build\aligned.apk")
    Run $java @('-jar', "$tools\lib\apksigner.jar", 'verify', '--verbose', $output)
} finally { Remove-Item Env:CAMPUS_SIGN_PASSWORD -ErrorAction SilentlyContinue }
Get-FileHash -Algorithm SHA256 $output | Format-List
Write-Output "APK ready: $output"
