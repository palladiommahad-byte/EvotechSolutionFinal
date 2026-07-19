# EvoTech Database Backups

The application data is stored in PostgreSQL inside Docker, not in the frontend or backend source files.

## Back up or restore from the application

After the updated Docker stack is running, an administrator can use **Settings > Database**:

- **Backup database** automatically creates a compressed PostgreSQL dump in `backups\database-<timestamp>`. It also saves the Docker Compose file, Dockerfiles, and Nginx configuration with that backup.
- **Restore latest database** automatically verifies and restores the newest valid regular backup. Before replacing data, it saves the current database in a separate `pre-restore-<timestamp>` safety backup.

No command-line command or backup-file selection is required. Only administrators can use these actions. The `backups` folder should still be copied to a separate disk or cloud location to protect against disk loss.

## Where backups are saved

Run:

```bat
backup-database.bat
```

Backups are saved here:

```text
EvotechSolutionFinal-main\backups\
```

Each backup file looks like:

```text
evotech_2026-07-11_16-30-00.dump
```

A `.sha256` file is created beside it so you can verify the backup file was not changed or corrupted.

## Legacy script routine

The batch files below remain available for support or offline recovery, but the in-application Database page is the normal client workflow.

## Correct backup routine

1. Open Docker Desktop and wait until it is ready.

2. Run:

```bat
backup-database.bat
```

The script will automatically start the PostgreSQL container if it is stopped.

If Docker Desktop is closed, the script will ask you to open Docker first.

You can still start the full app manually with:

```bat
docker compose up -d
```

3. Copy the newest `.dump` file somewhere outside the computer, for example:

```text
USB drive
External hard drive
NAS/server
Google Drive / OneDrive / Dropbox
```

Do not keep the only backup inside Docker or only inside the project folder.

## Restore a backup manually (legacy)

Run:

```bat
restore-database.bat "backups\evotech_YYYY-MM-DD_HH-mm-ss.dump"
```

The restore script replaces the current database, so it asks you to type `RESTORE` before continuing.

## Important Docker warning

Never run this command on the client machine unless you already have a backup:

```bat
docker compose down -v
```

The `-v` option deletes Docker volumes. In this project that can delete the PostgreSQL database.

Use this instead for normal stop/start:

```bat
docker compose down
docker compose up -d
```

## Recommended schedule

Create at least one backup every day.

Also create a backup before:

- Updating the app
- Reinstalling Docker
- Moving the app to another computer
- Running migrations
- Changing server/database configuration

For business data, keep at least:

- Daily backups for the last 7 days
- Weekly backups for the last 4 weeks
- Monthly backups for the last 12 months
