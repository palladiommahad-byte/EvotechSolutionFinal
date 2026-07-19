# EvoTech Database Backups

The application data is stored in PostgreSQL inside Docker, not in the frontend or backend source files.

## Back up or restore from the application

After the updated Docker stack is running, an administrator can use **Settings > Database**:

- **Backup database** automatically creates a compressed PostgreSQL dump in `backups\database-<timestamp>`. It also saves the Docker Compose file, Dockerfiles, and Nginx configuration with that backup.
- **Restore latest database** automatically verifies and restores the newest valid regular backup. Before replacing data, it saves the current database in a separate `pre-restore-<timestamp>` safety backup.

## Automatic daily safety backup

While the Docker application is running, the backend creates a database backup automatically every day at **02:00 Africa/Casablanca time**. This does not depend on anyone clicking the **Backup database** button; that button remains useful for an extra backup before a major change.

To use another time or time zone, add these values to the deployment `.env` file and restart the stack:

```env
BACKUP_TIMEZONE=Africa/Casablanca
DAILY_BACKUP_CRON=0 2 * * *
```

The automatic backup needs Docker Desktop and the application to be running at its scheduled time. Keep the `backups` folder on a separate drive or cloud location as well, since a backup on the same computer cannot protect against disk loss.

## Google Drive cloud copy

An administrator can connect a Google account from **Settings > Database > Connect Google Drive**. Once connected, every new regular database backup is stored locally first and then uploaded to that account's `EvoTech Backups` folder. A cloud upload failure never deletes or invalidates the local backup.

Before the first connection, create a **Web application** OAuth client in Google Cloud, enable the Google Drive API, and add the callback URL shown in **Settings > Database** as an authorized redirect URI. Paste the client ID, client secret, callback URL, and application URL directly into that page, then click **Save Google Drive setup** and **Connect Google Drive**.

For a deployed domain, use that domain instead of localhost for both URLs and register the exact callback URL in Google Cloud. The app requests only the `drive.file` scope and encrypts both the saved client secret and Google refresh token before writing them to the database.

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

The application now creates one backup every day automatically. Create an additional manual backup before:

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
