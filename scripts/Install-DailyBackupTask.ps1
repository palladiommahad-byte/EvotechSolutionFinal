[CmdletBinding()]
param(
    [string]$BackupRoot = "D:\EvotechBackups",
    [datetime]$Time = (Get-Date "02:00"),
    [string]$TaskName = "Evotech Daily Docker Backup"
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backupScript = Join-Path $PSScriptRoot "Backup-Docker.ps1"

if (-not [System.IO.Path]::IsPathRooted($BackupRoot)) {
    $BackupRoot = Join-Path $projectRoot $BackupRoot
}
New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null

$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`" -BackupRoot `"$BackupRoot`""
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 4)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "Daily backup task '$TaskName' is scheduled for $($Time.ToString('HH:mm')) to $BackupRoot"
Write-Host "Docker Desktop must be running and the user must be signed in at that time."
