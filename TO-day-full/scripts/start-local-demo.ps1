[CmdletBinding(PositionalBinding = $false)]
param(
  [string]$ServerDir,
  [string]$EnvFile,
  [string]$WhatsAppNumber,
  [string]$FrontendUrl,
  [int]$Port = 4000,
  [switch]$SetupOnly,
  [switch]$SkipMigrate,
  [switch]$SkipSeed,
  [switch]$NoTunnel
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $ServerDir) { $ServerDir = Join-Path $repoRoot 'server' }
if (-not $EnvFile) { $EnvFile = Join-Path $ServerDir '.env' }

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "== $Message ==" -ForegroundColor Cyan
}

function Write-Warn([string]$Message) {
  Write-Host "PERINGATAN: $Message" -ForegroundColor Yellow
}

function Convert-ToWhatsAppNumber([string]$Value) {
  $digits = ($Value -replace '\D', '')
  if ($digits.StartsWith('0')) { $digits = '62' + $digits.Substring(1) }
  elseif ($digits.StartsWith('8')) { $digits = '62' + $digits }
  return $digits
}

function Test-CloudflaredBinary([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  try {
    $version = & $Path --version 2>$null
    return ($LASTEXITCODE -eq 0 -and $version -match 'cloudflared')
  } catch {
    return $false
  }
}

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "File $EnvFile tidak ditemukan. Salin server/.env.example ke server/.env lalu isi DATABASE_URL dan JWT_SECRET."
}

$lines = [System.Collections.Generic.List[string]]::new()
foreach ($line in (Get-Content -LiteralPath $EnvFile)) { [void]$lines.Add($line) }

function Get-EnvValue([string]$Key) {
  foreach ($line in $lines) {
    if ($line -match "^\s*$([regex]::Escape($Key))\s*=(.*)$") { return $Matches[1].Trim() }
  }
  return ''
}

function Set-EnvValue([string]$Key, [string]$Value) {
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^\s*$([regex]::Escape($Key))\s*=") {
      $lines[$i] = "$Key=$Value"
      return
    }
  }
  [void]$lines.Add("$Key=$Value")
}

Write-Step 'Memeriksa server/.env'

$databaseUrl = Get-EnvValue 'DATABASE_URL'
$jwtSecret = Get-EnvValue 'JWT_SECRET'

if (-not $databaseUrl) {
  throw 'DATABASE_URL kosong. Isi connection string Supabase (Session pooler) terlebih dahulu.'
}
if ($databaseUrl -notmatch '^postgres(ql)?://') {
  throw 'DATABASE_URL harus berupa connection string postgresql://...'
}
if ($databaseUrl -match 'fpgpagnnvmnawvnpdqkl') {
  Write-Warn 'DATABASE_URL memakai project Supabase lama. Jika migrasi gagal, buka dashboard Supabase: pastikan project tidak paused, lalu salin ulang Session pooler connection string.'
}
if ($databaseUrl -match 'supabase' -and $databaseUrl -notmatch 'pooler\.supabase\.com') {
  Write-Warn 'DATABASE_URL memakai Direct connection Supabase. Jika koneksi gagal (IPv6), gunakan Session pooler: host *.pooler.supabase.com, port 5432, dengan ?sslmode=require.'
}
if (-not $jwtSecret -or $jwtSecret -match 'ganti-dengan') {
  Write-Warn 'JWT_SECRET masih kosong atau placeholder. Ganti dengan string acak yang panjang.'
}

$defaultWhatsApp = '6281957052500'
$waNumber = $WhatsAppNumber
if (-not $waNumber) { $waNumber = Get-EnvValue 'WHATSAPP_NUMBER' }
if (-not $waNumber) {
  $inputNumber = Read-Host "Nomor WhatsApp admin [$defaultWhatsApp]"
  if ($inputNumber) { $waNumber = $inputNumber } else { $waNumber = $defaultWhatsApp }
}
$waNumber = Convert-ToWhatsAppNumber $waNumber
if ($waNumber) {
  Set-EnvValue 'WHATSAPP_NUMBER' $waNumber
} else {
  Write-Warn 'WHATSAPP_NUMBER kosong: pembayaran manual akan nonaktif.'
}

$frontend = $FrontendUrl
if (-not $frontend) { $frontend = Get-EnvValue 'FRONTEND_URL' }
if (-not $frontend) {
  $frontend = Read-Host 'Domain Vercel (https://...). Kosongkan untuk mengizinkan semua origin'
}
$frontend = ($frontend -replace '/+$', '')
if ($frontend -and $frontend -ne '*' -and $frontend -notmatch ',' -and $frontend -notmatch '^https?://') {
  $frontend = "https://$frontend"
}
if ($frontend) {
  Set-EnvValue 'FRONTEND_URL' $frontend
} else {
  Write-Warn 'FRONTEND_URL kosong: CORS mengizinkan semua origin. Bisa untuk demo, kurang aman untuk produksi.'
}

if ((Get-EnvValue 'MANUAL_PAYMENT_ENABLED') -ne 'true') {
  Set-EnvValue 'MANUAL_PAYMENT_ENABLED' 'true'
}
if (-not (Get-EnvValue 'MANUAL_HOLD_HOURS')) {
  Set-EnvValue 'MANUAL_HOLD_HOURS' '24'
}

$adminToken = Get-EnvValue 'ADMIN_TOKEN'
if (-not $adminToken) {
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $bytes = New-Object byte[] 48
  $rng.GetBytes($bytes)
  $adminToken = -join ($bytes | ForEach-Object { $_.ToString('x2') })
  Set-EnvValue 'ADMIN_TOKEN' $adminToken
  Write-Host 'ADMIN_TOKEN baru dibuat dan disimpan di server/.env.'
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($EnvFile, $lines, $utf8)

$frontendLabel = if ($frontend) { $frontend } else { '(semua origin)' }
Write-Host "Env tersimpan: $EnvFile"
Write-Host "  WHATSAPP_NUMBER : $waNumber"
Write-Host "  FRONTEND_URL    : $frontendLabel"
Write-Host "  ADMIN_TOKEN     : lihat $EnvFile"

if ($SetupOnly) { return }

if (-not $SkipMigrate) {
  Write-Step 'Menyiapkan skema database'
  Push-Location $ServerDir
  try {
    & node src/db/migrate.js
    if ($LASTEXITCODE -ne 0) { throw 'Migrasi database gagal. Jika memakai Supabase lama, Unpause project lalu salin ulang Session pooler connection string di server/.env.' }
  } finally {
    Pop-Location
  }
}

if (-not $SkipSeed) {
  Write-Step 'Mengisi data awal'
  Push-Location $ServerDir
  $env:SEED_DEMO_ACCOUNTS = 'true'
  try {
    & node src/db/seed.js
    if ($LASTEXITCODE -ne 0) { throw 'Seed database gagal.' }
  } finally {
    Remove-Item Env:SEED_DEMO_ACCOUNTS -ErrorAction SilentlyContinue
    Pop-Location
  }
}

Write-Step 'Menjalankan backend lokal'

$portInUse = $false
try {
  $portInUse = [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
} catch { }
if ($portInUse) {
  throw "Port $Port sudah dipakai. Hentikan proses lain terlebih dahulu."
}

$logDir = Join-Path $env:TEMP 'TO-Day-demo'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$backendOut = Join-Path $logDir 'backend.out.log'
$backendErr = Join-Path $logDir 'backend.err.log'
Remove-Item -LiteralPath $backendOut, $backendErr -ErrorAction SilentlyContinue

$backend = $null
$tunnel = $null

try {
  $backend = Start-Process -FilePath 'node' -ArgumentList 'src/index.js' -WorkingDirectory $ServerDir -PassThru -WindowStyle Hidden -RedirectStandardOutput $backendOut -RedirectStandardError $backendErr

  $backendReady = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if ($backend.HasExited) { break }
    try {
      $health = Invoke-RestMethod -Uri "http://localhost:$Port/api/health" -TimeoutSec 2
      if ($health.ok) { $backendReady = $true; break }
    } catch { }
  }

  if (-not $backendReady) {
    if (Test-Path -LiteralPath $backendErr) {
      Write-Host '--- log backend ---' -ForegroundColor DarkGray
      Get-Content -LiteralPath $backendErr -Tail 40 | Write-Host
    }
    throw 'Backend gagal start. Periksa log di atas.'
  }

  Write-Host "Backend siap: http://localhost:$Port"

  if ($NoTunnel) {
    Write-Host 'Mode -NoTunnel: backend lokal saja. Tekan Enter untuk berhenti...'
    [void](Read-Host)
    return
  }

  Write-Step 'Menyiapkan Cloudflare Quick Tunnel'

  $cloudflaredDir = Join-Path $env:LOCALAPPDATA 'TO-Day'
  $cloudflared = Join-Path $cloudflaredDir 'cloudflared.exe'
  if (-not (Test-CloudflaredBinary $cloudflared)) {
    New-Item -ItemType Directory -Force -Path $cloudflaredDir | Out-Null
    Remove-Item -LiteralPath $cloudflared -ErrorAction SilentlyContinue
    Write-Host 'Mengunduh cloudflared (hanya sekali, sekitar 55 MB)...'
    $downloadUrl = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
    $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
    if ($curl) {
      & $curl.Source --fail --location --retry 3 --retry-delay 2 --output $cloudflared $downloadUrl
    } else {
      Invoke-WebRequest -Uri $downloadUrl -OutFile $cloudflared -UseBasicParsing
    }
    if (-not (Test-CloudflaredBinary $cloudflared)) {
      throw "cloudflared gagal diunduh dengan benar. Unduh manual dari $downloadUrl lalu simpan sebagai $cloudflared."
    }
  }

  $tunnelOut = Join-Path $logDir 'tunnel.out.log'
  $tunnelErr = Join-Path $logDir 'tunnel.err.log'
  Remove-Item -LiteralPath $tunnelOut, $tunnelErr -ErrorAction SilentlyContinue

  $tunnel = Start-Process -FilePath $cloudflared -ArgumentList 'tunnel', '--url', "http://localhost:$Port" -PassThru -WindowStyle Hidden -RedirectStandardOutput $tunnelOut -RedirectStandardError $tunnelErr

  $tunnelUrl = $null
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    if ($tunnel.HasExited) { break }
    foreach ($logFile in @($tunnelOut, $tunnelErr)) {
      if (Test-Path -LiteralPath $logFile) {
        $match = Select-String -LiteralPath $logFile -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches | Select-Object -First 1
        if ($match) { $tunnelUrl = $match.Matches[0].Value; break }
      }
    }
    if ($tunnelUrl) { break }
  }

  if (-not $tunnelUrl) {
    if (Test-Path -LiteralPath $tunnelErr) {
      Write-Host '--- log tunnel ---' -ForegroundColor DarkGray
      Get-Content -LiteralPath $tunnelErr -Tail 40 | Write-Host
    }
    throw 'Gagal mendapatkan URL tunnel. Periksa koneksi internet.'
  }

  $tunnelHost = ([Uri]$tunnelUrl).Host
  $tunnelIp = $null
  for ($i = 0; $i -lt 30 -and -not $tunnelIp; $i++) {
    foreach ($dnsServer in @('1.1.1.1', '8.8.8.8')) {
      try {
        $dns = Resolve-DnsName -Name $tunnelHost -Server $dnsServer -Type A -ErrorAction Stop
        $tunnelIp = ($dns | Where-Object { $_.Type -eq 'A' } | Select-Object -First 1).IPAddress
        if ($tunnelIp) { break }
      } catch { }
    }
    if (-not $tunnelIp) { Start-Sleep -Seconds 2 }
  }

  $remoteHealthy = $false
  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  if ($tunnelIp -and $curl) {
    try {
      $body = & $curl.Source --silent --show-error --fail --max-time 20 --resolve "${tunnelHost}:443:$tunnelIp" "$tunnelUrl/api/health"
      if ($LASTEXITCODE -eq 0 -and $body -match '"ok"') { $remoteHealthy = $true }
    } catch { }
  }
  if ($remoteHealthy) {
    Write-Host 'Health check tunnel OK.' -ForegroundColor Green
  } else {
    Write-Warn 'Health check tunnel belum berhasil. Coba buka URL tunnel di browser/HP; DNS lokal kadang butuh beberapa detik.'
  }
  & ipconfig /flushdns 2>$null | Out-Null

  try { Set-Clipboard -Value "$tunnelUrl/api" } catch { }

  Write-Host ''
  Write-Host '========================================' -ForegroundColor Green
  Write-Host ' SIAP UNTUK DEMO' -ForegroundColor Green
  Write-Host '========================================' -ForegroundColor Green
  Write-Host "Backend lokal : http://localhost:$Port"
  Write-Host "Tunnel publik : $tunnelUrl"
  Write-Host ''
  Write-Host 'Akun demo (dibuat/di-reset oleh seed):' -ForegroundColor Yellow
  Write-Host '  Admin          : @admin   | admin@today.demo / admin1234'
  Write-Host '  Premium        : @premium | premium@today.demo / premium1234 (12 riwayat tryout)'
  Write-Host '  Belum premium  : @siswa   | siswa@today.demo / siswa1234'
  Write-Host ''
  Write-Host 'Set di Vercel (Production), lalu Redeploy:' -ForegroundColor Yellow
  Write-Host "  VITE_API_URL=$tunnelUrl/api"
  Write-Host ''
  if ($frontend) { Write-Host "Pastikan FRONTEND_URL di server/.env = $frontend" }
  Write-Host "ADMIN_TOKEN  : fallback API di $EnvFile"
  Write-Host "Log          : $logDir"
  Write-Host ''
  Write-Host 'Jangan tutup jendela ini selama presentasi.'
  Write-Host 'Tekan Enter untuk menghentikan backend + tunnel...'
  [void](Read-Host)
} finally {
  if ($tunnel -and -not $tunnel.HasExited) { Stop-Process -Id $tunnel.Id -Force }
  if ($backend -and -not $backend.HasExited) { Stop-Process -Id $backend.Id -Force }
  Write-Host 'Backend dan tunnel dihentikan.'
}
