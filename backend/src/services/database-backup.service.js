const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const googleDriveBackup = require('./google-drive-backup.service');

const BACKUP_ROOT = path.resolve(process.env.BACKUP_DIR || '/app/backups');
const CONFIG_ROOT = path.resolve(process.env.BACKUP_CONFIG_DIR || '/app/backup-config');
const DATABASE = process.env.DB_NAME || 'EvotechSolution';
const DATABASE_USER = process.env.DB_USER || 'postgres';
const DATABASE_HOST = process.env.DB_HOST || 'postgres';
const DATABASE_PORT = String(process.env.DB_PORT || '5432');

let activeOperation = null;

function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

function commandEnvironment() {
    return {
        ...process.env,
        PGPASSWORD: process.env.DB_PASSWORD || '',
    };
}

function run(command, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            env: commandEnvironment(),
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stderr = '';
        child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
        child.on('error', (error) => {
            reject(new Error(`${command} could not start: ${error.message}`));
        });
        child.on('close', (code) => {
            if (code === 0) return resolve();
            reject(new Error(`${command} failed${stderr ? `: ${stderr.trim()}` : ''}`));
        });
    });
}

async function checksum(filePath) {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

async function copyConfiguration(destination) {
    await fs.mkdir(destination, { recursive: true });
    const entries = await fs.readdir(CONFIG_ROOT, { withFileTypes: true }).catch(() => []);
    await Promise.all(entries
        .filter((entry) => entry.isFile())
        .map((entry) => fs.copyFile(path.join(CONFIG_ROOT, entry.name), path.join(destination, entry.name))));
}

async function createBackup(kind = 'regular') {
    await fs.mkdir(BACKUP_ROOT, { recursive: true });
    const folderName = `${kind === 'regular' ? 'database' : 'pre-restore'}-${timestamp()}`;
    const backupPath = path.join(BACKUP_ROOT, folderName);
    const temporaryDump = path.join(backupPath, 'database.dump.partial');
    const dumpPath = path.join(backupPath, 'database.dump');

    await fs.mkdir(backupPath, { recursive: false });
    try {
        await run('pg_dump', [
            '--format=custom', '--no-owner', '--no-privileges',
            '--host', DATABASE_HOST, '--port', DATABASE_PORT,
            '--username', DATABASE_USER, '--file', temporaryDump, DATABASE,
        ]);
        await fs.rename(temporaryDump, dumpPath);
        await copyConfiguration(path.join(backupPath, 'configuration'));

        const metadata = {
            version: 1,
            type: kind,
            createdAt: new Date().toISOString(),
            database: DATABASE,
            file: 'database.dump',
            sha256: await checksum(dumpPath),
            includes: ['PostgreSQL database dump', 'docker-compose.yml', 'Dockerfiles', 'nginx.conf'],
        };
        await fs.writeFile(path.join(backupPath, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
        // Cloud-upload errors never invalidate a completed local backup. They are
        // returned and recorded separately so the local recovery copy is always safe.
        const googleDrive = kind === 'regular'
            ? await googleDriveBackup.uploadBackup(backupPath, folderName)
            : { configured: false, uploaded: false };
        return { folderName, ...metadata, googleDrive };
    } catch (error) {
        await fs.rm(backupPath, { recursive: true, force: true });
        throw error;
    }
}

async function getBackupCandidates() {
    const entries = await fs.readdir(BACKUP_ROOT, { withFileTypes: true }).catch(() => []);
    const candidates = [];

    for (const entry of entries) {
        const fullPath = path.join(BACKUP_ROOT, entry.name);
        if (entry.isDirectory() && entry.name.startsWith('database-')) {
            try {
                const metadata = JSON.parse(await fs.readFile(path.join(fullPath, 'metadata.json'), 'utf8'));
                if (metadata.type === 'regular' && metadata.file === 'database.dump') {
                    candidates.push({
                        name: entry.name,
                        path: path.join(fullPath, metadata.file),
                        createdAt: metadata.createdAt,
                        metadata,
                    });
                }
            } catch {
                // An incomplete backup is never offered for restore.
            }
        } else if (entry.isFile() && /^evotech_.+\.dump$/i.test(entry.name)) {
            // Keep backups made by the older batch script usable after this upgrade.
            const stat = await fs.stat(fullPath);
            candidates.push({ name: entry.name, path: fullPath, createdAt: stat.mtime.toISOString(), metadata: null });
        }
    }

    return candidates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getLatestBackup() {
    const [latest] = await getBackupCandidates();
    return latest || null;
}

async function verifyBackup(backup) {
    if (!backup || !backup.path.startsWith(BACKUP_ROOT)) {
        throw new Error('The selected backup is outside the configured backup folder.');
    }
    await fs.access(backup.path);
    if (backup.metadata?.sha256 && (await checksum(backup.path)) !== backup.metadata.sha256) {
        throw new Error('The latest backup failed its integrity check and was not restored.');
    }
    await run('pg_restore', ['--list', backup.path]);
}

async function restoreLatestBackup() {
    const latest = await getLatestBackup();
    if (!latest) throw new Error('No database backup is available to restore.');
    await verifyBackup(latest);

    // Preserve the current state separately; it is intentionally excluded from "latest" selection.
    const safetyBackup = await createBackup('pre-restore');

    await run('psql', [
        '--host', DATABASE_HOST, '--port', DATABASE_PORT, '--username', DATABASE_USER,
        '--dbname', DATABASE,
        '--set', 'ON_ERROR_STOP=1',
        '--command', 'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();',
    ]);
    await run('pg_restore', [
        '--host', DATABASE_HOST, '--port', DATABASE_PORT, '--username', DATABASE_USER,
        '--dbname', DATABASE, '--clean', '--if-exists', '--no-owner', '--no-privileges', '--exit-on-error', latest.path,
    ]);
    return { restored: latest, safetyBackup };
}

async function withOperation(name, operation) {
    if (activeOperation) throw new Error(`A ${activeOperation} operation is already running.`);
    activeOperation = name;
    try {
        return await operation();
    } finally {
        activeOperation = null;
    }
}

async function getStatus() {
    const latest = await getLatestBackup();
    return {
        backupDirectory: BACKUP_ROOT,
        operation: activeOperation,
        latestBackup: latest && { name: latest.name, createdAt: latest.createdAt },
    };
}

module.exports = {
    createRegularBackup: () => withOperation('backup', () => createBackup('regular')),
    restoreLatestBackup: () => withOperation('restore', restoreLatestBackup),
    getStatus,
};
