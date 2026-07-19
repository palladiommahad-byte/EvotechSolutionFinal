CREATE TABLE IF NOT EXISTS google_drive_backup_settings (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    refresh_token TEXT NOT NULL,
    folder_id TEXT NOT NULL,
    folder_name TEXT NOT NULL DEFAULT 'EvoTech Backups',
    connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_uploaded_at TIMESTAMP,
    last_upload_error TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
