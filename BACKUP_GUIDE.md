# EvoTech Database Backups

The application data is stored in PostgreSQL inside Docker, not in the frontend or backend source files.

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

## Correct backup routine

1. Start Docker and the application:

```bat
docker compose up -d
```

2. Run:

```bat
backup-database.bat
```

3. Copy the newest `.dump` file somewhere outside the computer, for example:

```text
USB drive
External hard drive
NAS/server
Google Drive / OneDrive / Dropbox
```

Do not keep the only backup inside Docker or only inside the project folder.

## Restore a backup

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
