[CmdletBinding()]
param(
    [string]$BackupRoot = (Join-Path $PSScriptRoot "..\backups"),
    [string]$Database = "EvotechSolution",
    [string]$DatabaseUser = "postgres"
)

$ErrorActionPreference = "Stop"

function Invoke-DockerCompose {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    & docker compose @Arguments
    if ($LASTEXITCODE -ne 0) { throw "docker compose $($Arguments -join ' ') failed." }
}

try { & docker info *> $null } catch { throw "Docker Desktop must be running and your user must be allowed to access Docker." }
if ($LASTEXITCODE -ne 0) { throw "Docker Desktop must be running and your user must be allowed to access Docker." }

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if (-not [System.IO.Path]::IsPathRooted($BackupRoot)) {
    $BackupRoot = Join-Path $projectRoot $BackupRoot
}
$BackupRoot = [System.IO.Path]::GetFullPath($BackupRoot)
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $BackupRoot "evotech-$stamp"
$configPath = Join-Path $backupPath "configuration"
New-Item -ItemType Directory -Path $configPath -Force | Out-Null

Push-Location $projectRoot
try {
    # A logical PostgreSQL dump is transaction-consistent while the database is running.
    Invoke-DockerCompose up -d postgres
    $dumpPath = Join-Path $backupPath "postgres.sql"
    & docker compose exec -T postgres pg_dump -U $DatabaseUser -d $Database --clean --if-exists --no-owner --no-privileges | Out-File -FilePath $dumpPath -Encoding utf8
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL dump failed." }

    $filesToPreserve = @(
        "docker-compose.yml", ".dockerignore",
        "backend\Dockerfile", "backend\.env", "backend\.env.example", "backend\.dockerignore", "backend\package.json", "backend\package-lock.json",
        "frontend\Dockerfile", "frontend\nginx.docker.conf", "frontend\.dockerignore", "frontend\package.json", "frontend\package-lock.json"
    )
    foreach ($relativePath in $filesToPreserve) {
        $source = Join-Path $projectRoot $relativePath
        if (Test-Path -LiteralPath $source) {
            $destination = Join-Path $configPath $relativePath
            New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
            Copy-Item -LiteralPath $source -Destination $destination -Force
        }
    }
    Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $configPath "Backup-Docker.ps1") -Force

    # Keep a portable copy of the application needed to rebuild Docker elsewhere.
    # Dependencies and build output are deliberately excluded because Docker rebuilds them.
    $applicationPath = Join-Path $backupPath "application"
    $sourceFiles = Get-ChildItem -LiteralPath $projectRoot -Recurse -File | Where-Object {
        $relativePath = $_.FullName.Substring($projectRoot.Length).TrimStart("\\", "/")
        $relativePath -notmatch '(^|\\)(\.git|backups|node_modules|dist|build)(\\|$)'
    }
    foreach ($sourceFile in $sourceFiles) {
        $relativePath = $sourceFile.FullName.Substring($projectRoot.Length).TrimStart("\\", "/")
        $destination = Join-Path $applicationPath $relativePath
        New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
        Copy-Item -LiteralPath $sourceFile.FullName -Destination $destination -Force
    }

    $metadata = [ordered]@{
        created_at       = (Get-Date).ToString("o")
        database         = $Database
        database_user    = $DatabaseUser
        compose_project  = (& docker compose config --format json | ConvertFrom-Json).name
        docker_volume    = "evotechsolutionfinal-main_pgdata"
        application_files = "application"
        restore_command  = ".\scripts\Restore-Docker.ps1 -BackupPath '$backupPath'"
    }
    $metadata | ConvertTo-Json | Set-Content -Path (Join-Path $backupPath "metadata.json") -Encoding utf8
    Get-ChildItem -LiteralPath $backupPath -Recurse -File | Get-FileHash -Algorithm SHA256 |
        Select-Object Algorithm, Hash, Path | ConvertTo-Json | Set-Content -Path (Join-Path $backupPath "checksums.json") -Encoding utf8
}
finally { Pop-Location }

Write-Host "Backup complete: $backupPath"
