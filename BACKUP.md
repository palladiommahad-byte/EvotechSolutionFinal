# Docker backup and restore

Run this from the project directory in PowerShell:

```powershell
.\scripts\Backup-Docker.ps1
```

Each backup is stored in `backups\evotech-YYYYMMDD-HHMMSS`. It includes a transaction-consistent PostgreSQL export of the `pgdata` Docker volume, the Compose file, Dockerfiles, relevant package manifests, backend environment files, and an `application` folder. This folder contains the application files required to rebuild the Docker stack on a replacement machine; generated dependencies and build output are excluded because Docker recreates them. The backup directory is ignored by Git because it contains database data and secrets.

To store backups on the `D:` drive instead, pass an absolute destination (the folder is created automatically):

```powershell
.\scripts\Backup-Docker.ps1 -BackupRoot "D:\EvotechBackups"
```

This creates folders such as `D:\EvotechBackups\evotech-YYYYMMDD-HHMMSS`.

## Daily automatic backup

Run this once in PowerShell to create a Windows Task Scheduler task that runs daily at 02:00:

```powershell
.\scripts\Install-DailyBackupTask.ps1 -BackupRoot "D:\EvotechBackups"
```

Choose another time if needed:

```powershell
.\scripts\Install-DailyBackupTask.ps1 -BackupRoot "D:\EvotechBackups" -Time "23:30"
```

The task runs under the signed-in Windows user, so Docker Desktop must be running and that user must be signed in at the scheduled time. Check it in **Task Scheduler > Task Scheduler Library > Evotech Daily Docker Backup**. Run it manually once from that screen after installation to confirm that a backup appears on `D:`.

To restore a specific backup:

```powershell
.\scripts\Restore-Docker.ps1 -BackupPath .\backups\evotech-YYYYMMDD-HHMMSS
```

Restore overwrites the database objects in `EvotechSolution`; make a new backup first if the current data matters. Docker Desktop must be running. Keep the `backups` directory on a separate disk or cloud location as well—files on the same disk do not protect against disk loss.

The current compose project has a single persistent volume: `evotechsolutionfinal-main_pgdata`. PostgreSQL logical export is used instead of copying its live data files, so the backup remains consistent while the database is running.

## Disaster recovery on a new machine

1. Install Docker Desktop and copy one backup folder from `D:` to the new machine.
2. Copy the backup's `application` folder to a new working location.
3. In that copied `application` folder, run `docker compose up -d --build`.
4. Run `scripts\Restore-Docker.ps1` and point `-BackupPath` to the backup folder.
