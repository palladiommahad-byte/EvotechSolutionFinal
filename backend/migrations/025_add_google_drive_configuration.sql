CREATE TABLE IF NOT EXISTS google_drive_backup_configuration (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    frontend_url TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
