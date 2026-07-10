[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$BackupPath,
    [string]$Database = "EvotechSolution",
    [string]$DatabaseUser = "postgres"
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BackupPath = (Resolve-Path $BackupPath).Path
$dumpPath = Join-Path $BackupPath "postgres.sql"
if (-not (Test-Path -LiteralPath $dumpPath)) { throw "postgres.sql was not found in '$BackupPath'." }

Push-Location $projectRoot
try {
    & docker info *> $null
    if ($LASTEXITCODE -ne 0) { throw "Docker Desktop must be running and accessible." }
    & docker compose up -d postgres
    if ($LASTEXITCODE -ne 0) { throw "Could not start PostgreSQL." }

    # This replaces database objects with the contents of the selected backup.
    Get-Content -LiteralPath $dumpPath -Raw | & docker compose exec -T postgres psql -U $DatabaseUser -d $Database -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL restore failed." }
    & docker compose up -d
    if ($LASTEXITCODE -ne 0) { throw "Could not start the full application stack." }
}
finally { Pop-Location }

Write-Host "Restore complete from: $BackupPath"
