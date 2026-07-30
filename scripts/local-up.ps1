[CmdletBinding()]
param()

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ComposeFile = Join-Path $RepoRoot "infrastructure\docker-compose.local.yml"
$EnvExampleFile = Join-Path $RepoRoot "infrastructure\.env.local.example"
$EnvFile = Join-Path $RepoRoot "infrastructure\.env.local"
$ComposeDisplay = "docker compose -f infrastructure/docker-compose.local.yml"

function Stop-LocalStack {
    param([Parameter(Mandatory = $true)][string]$Message)

    [Console]::Error.WriteLine("ERROR: $Message")
    [Console]::Error.WriteLine("Next step: $ComposeDisplay ps")
    [Console]::Error.WriteLine("Logs:      $ComposeDisplay logs --tail=200 <service>")
    exit 1
}

function New-SecureRandomString {
    param([int]$Length = 64)

    $alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    $bytes = New-Object byte[] $Length
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()

    try {
        $generator.GetBytes($bytes)
    }
    finally {
        $generator.Dispose()
    }

    $builder = New-Object System.Text.StringBuilder $Length
    foreach ($byte in $bytes) {
        [void]$builder.Append($alphabet[$byte -band 63])
    }

    return $builder.ToString()
}

function Initialize-LocalEnvironment {
    if (Test-Path -LiteralPath $EnvFile) {
        return
    }

    if (-not (Test-Path -LiteralPath $EnvExampleFile)) {
        Stop-LocalStack "Missing environment template: $EnvExampleFile"
    }

    Copy-Item -LiteralPath $EnvExampleFile -Destination $EnvFile
    $secretKeys = @(
        "API_TOKEN_SALT",
        "ADMIN_JWT_SECRET",
        "TRANSFER_TOKEN_SALT",
        "JWT_SECRET",
        "MYSQL_PASSWORD",
        "MYSQL_ROOT_PASSWORD",
        "STRAPI_API_TOKEN",
        "STRAPI_ADMIN_TOKEN",
        "REVALIDATE_SECRET",
        "ADMIN_SESSION_SECRET",
        "CLIENT_ADMIN_PASSWORD"
    )

    $generatedLines = foreach ($line in [System.IO.File]::ReadAllLines($EnvFile)) {
        if ($line -notmatch "^([^#][^=]*)=<generate-random>$") {
            $line
            continue
        }

        $key = $Matches[1].Trim()
        if ($key -eq "APP_KEYS") {
            $keys = 1..4 | ForEach-Object { New-SecureRandomString -Length 32 }
            "$key=$($keys -join ',')"
            continue
        }

        if ($secretKeys -contains $key) {
            "$key=$(New-SecureRandomString -Length 64)"
            continue
        }

        Stop-LocalStack "No random-value rule is defined for '$key'."
    }

    $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllLines($EnvFile, $generatedLines, $utf8WithoutBom)
    Write-Host "Created infrastructure/.env.local with cryptographically secure secrets."
}

function Import-LocalEnvironment {
    foreach ($line in [System.IO.File]::ReadAllLines($EnvFile)) {
        if ($line -match "^\s*#" -or [string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        $separator = $line.IndexOf("=")
        if ($separator -lt 1) {
            continue
        }

        $key = $line.Substring(0, $separator).Trim()
        $value = $line.Substring($separator + 1).Trim()
        $currentValue = [System.Environment]::GetEnvironmentVariable($key, "Process")
        if ([string]::IsNullOrEmpty($currentValue)) {
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

function Get-LocalPort {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Default
    )

    $value = [System.Environment]::GetEnvironmentVariable($Name, "Process")
    if ([string]::IsNullOrEmpty($value)) {
        return $Default
    }

    return $value
}

# PowerShell 5.1 + Set-StrictMode + ErrorActionPreference=Stop spuriously raises
# RemoteException on ANY stderr from native commands (even benign Docker Desktop
# warnings like "No blkio throttle.read_bps_device support"). Start-Process
# runs the binary outside PowerShell's pipeline so stderr is fully isolated.
function Invoke-Docker {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [switch]$ShowStderrOnError
    )

    $stderrFile = [System.IO.Path]::GetTempFileName()
    try {
        $proc = Start-Process -FilePath "docker" -ArgumentList $Arguments -NoNewWindow -Wait -PassThru `
            -RedirectStandardError $stderrFile
        if ($proc.ExitCode -ne 0 -and $ShowStderrOnError) {
            $content = Get-Content -LiteralPath $stderrFile -Raw -ErrorAction SilentlyContinue
            if ($content) {
                [Console]::Error.WriteLine("--- docker stderr ---")
                [Console]::Error.WriteLine($content)
                [Console]::Error.WriteLine("--- end stderr ---")
            }
        }
        return $proc.ExitCode
    }
    finally {
        Remove-Item -LiteralPath $stderrFile -Force -ErrorAction SilentlyContinue
    }
}

if ((Invoke-Docker -Arguments @("info")) -ne 0) {
    Stop-LocalStack "Docker is not running. Start Docker Desktop and retry."
}

Initialize-LocalEnvironment
Import-LocalEnvironment

Push-Location $RepoRoot
try {
    Write-Host "Starting the local stack..."
    $composeUpExit = Invoke-Docker -Arguments @(
        "compose", "-f", "infrastructure/docker-compose.local.yml",
        "up", "-d", "--build", "--force-recreate"
    ) -ShowStderrOnError
    if ($composeUpExit -ne 0) {
        Stop-LocalStack "Docker Compose could not build or start the local stack."
    }

    $services = @("web", "cms", "db", "proxy")
    $pending = @($services)
    $deadline = (Get-Date).AddMinutes(5)
    $delaySeconds = 2

    while ($pending.Count -gt 0 -and (Get-Date) -lt $deadline) {
        $stillPending = @()

        foreach ($service in $pending) {
            $containerIds = @(& docker compose -f "infrastructure/docker-compose.local.yml" ps -q $service 2>$null)
            $containerId = if ($containerIds.Count -gt 0) { $containerIds[0].Trim() } else { "" }

            if ([string]::IsNullOrEmpty($containerId)) {
                $stillPending += $service
                continue
            }

            $status = (& docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}" $containerId 2>$null).Trim()
            if ($status -eq "healthy") {
                Write-Host "  $service is healthy."
                continue
            }

            if ($status -in @("unhealthy", "exited", "dead")) {
                Stop-LocalStack "Service '$service' entered state '$status'."
            }

            $stillPending += $service
        }

        $pending = @($stillPending)
        if ($pending.Count -gt 0) {
            Write-Host "Waiting for healthchecks: $($pending -join ', ')"
            Start-Sleep -Seconds $delaySeconds
            $delaySeconds = [Math]::Min($delaySeconds * 2, 15)
        }
    }

    if ($pending.Count -gt 0) {
        Stop-LocalStack "Timed out after 5 minutes waiting for: $($pending -join ', ')."
    }

    $webPort = Get-LocalPort -Name "WEB_PORT" -Default "4780"
    $cmsPort = Get-LocalPort -Name "CMS_PORT" -Default "4781"
    $dbPort = Get-LocalPort -Name "DB_PORT" -Default "4782"
    $dashboardPort = Get-LocalPort -Name "PROXY_DASHBOARD_PORT" -Default "4785"

    Write-Host ""
    Write-Host "Local stack is healthy:"
    Write-Host "  Sitio web:          http://localhost:$webPort"
    Write-Host "  Strapi admin:        http://localhost:$cmsPort/admin (first-time setup required)"
    Write-Host "  Traefik dashboard:   http://localhost:$dashboardPort/dashboard/"
    Write-Host "  MySQL:               localhost:$dbPort (use any MySQL client; credentials are in infrastructure/.env.local)"
}
finally {
    Pop-Location
}
