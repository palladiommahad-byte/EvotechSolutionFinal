const crypto = require('crypto');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const { google } = require('googleapis');
const { query } = require('../config/database');

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const SETTINGS_ID = true;
const DEFAULT_FOLDER_NAME = 'EvoTech Backups';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const defaultRedirectUri = () => process.env.GOOGLE_DRIVE_REDIRECT_URI || `http://localhost:${process.env.PORT || 3000}/api/settings/google-drive/callback`;
const defaultFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:8080';

function getEncryptionKey() {
    const secret = process.env.BACKUP_ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!secret) throw new Error('BACKUP_ENCRYPTION_KEY or JWT_SECRET must be configured to protect the Google Drive connection.');
    return crypto.createHash('sha256').update(secret).digest();
}

async function getStoredConfiguration() {
    const result = await query('SELECT * FROM google_drive_backup_configuration WHERE id = $1', [SETTINGS_ID]);
    return result.rows[0] || null;
}

async function getConnectionConfiguration() {
    const saved = await getStoredConfiguration();
    if (saved) {
        return {
            clientId: saved.client_id,
            clientSecret: decrypt(saved.client_secret),
            redirectUri: saved.redirect_uri,
            frontendUrl: saved.frontend_url,
            saved: true,
        };
    }
    return {
        clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || '',
        redirectUri: defaultRedirectUri(),
        frontendUrl: defaultFrontendUrl(),
        saved: false,
    };
}

async function getOAuthClient() {
    const config = await getConnectionConfiguration();
    if (!config.clientId || !config.clientSecret) {
        throw new Error('Enter the Google OAuth client ID and client secret in Database settings before connecting Google Drive.');
    }
    return new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        config.redirectUri,
    );
}

function encrypt(value) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decrypt(value) {
    const [ivPart, tagPart, encryptedPart] = String(value).split('.');
    if (!ivPart || !tagPart || !encryptedPart) throw new Error('Stored Google Drive credentials are invalid. Please reconnect Google Drive.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivPart, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedPart, 'base64url')), decipher.final()]).toString('utf8');
}

function encodeState(payload) {
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', getEncryptionKey()).update(data).digest('base64url');
    return `${data}.${signature}`;
}

function decodeState(state) {
    const [data, suppliedSignature] = String(state || '').split('.');
    if (!data || !suppliedSignature) throw new Error('Google Drive connection state is invalid. Please try again.');
    const expectedSignature = crypto.createHmac('sha256', getEncryptionKey()).update(data).digest('base64url');
    if (suppliedSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(suppliedSignature), Buffer.from(expectedSignature))) {
        throw new Error('Google Drive connection state could not be verified. Please try again.');
    }
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!payload.expiresAt || Date.now() > payload.expiresAt) throw new Error('Google Drive connection request expired. Please try again.');
    return payload;
}

async function getStoredSettings() {
    const result = await query('SELECT * FROM google_drive_backup_settings WHERE id = $1', [SETTINGS_ID]);
    return result.rows[0] || null;
}

async function getStatus() {
    const [settings, config] = await Promise.all([getStoredSettings(), getConnectionConfiguration()]);
    return {
        configured: Boolean(config.clientId && config.clientSecret),
        connected: Boolean(settings),
        setup: {
            clientId: config.clientId,
            redirectUri: config.redirectUri,
            frontendUrl: config.frontendUrl,
            savedInSettings: config.saved,
        },
        folderName: settings?.folder_name || null,
        connectedAt: settings?.connected_at || null,
        lastUploadedAt: settings?.last_uploaded_at || null,
        lastUploadError: settings?.last_upload_error || null,
    };
}

async function saveConfiguration({ clientId, clientSecret, redirectUri, frontendUrl }) {
    if (!clientId || !clientSecret) throw new Error('Google OAuth client ID and client secret are required.');
    for (const [label, value] of [['Redirect URI', redirectUri], ['Application URL', frontendUrl]]) {
        try {
            const url = new URL(value);
            if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
        } catch {
            throw new Error(`${label} must be a valid http:// or https:// URL.`);
        }
    }
    await query(
        `INSERT INTO google_drive_backup_configuration (id, client_id, client_secret, redirect_uri, frontend_url, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (id) DO UPDATE SET client_id = EXCLUDED.client_id, client_secret = EXCLUDED.client_secret,
           redirect_uri = EXCLUDED.redirect_uri, frontend_url = EXCLUDED.frontend_url, updated_at = NOW()`,
        [SETTINGS_ID, clientId.trim(), encrypt(clientSecret.trim()), redirectUri.trim(), frontendUrl.trim()],
    );
    // A refresh token belongs to a specific OAuth client; reconnect after changing setup.
    await disconnect();
}

async function createAuthorizationUrl() {
    const oauth2Client = await getOAuthClient();
    const state = encodeState({ expiresAt: Date.now() + OAUTH_STATE_TTL_MS, nonce: crypto.randomBytes(16).toString('hex') });
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [DRIVE_SCOPE],
        state,
    });
}

async function createFolder(drive, name, parentId) {
    const result = await drive.files.create({
        requestBody: {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            ...(parentId ? { parents: [parentId] } : {}),
        },
        fields: 'id, name',
    });
    return result.data;
}

async function completeAuthorization(code, state) {
    decodeState(state);
    const oauth2Client = await getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) throw new Error('Google did not return a refresh token. Disconnect this app in Google Account permissions, then connect again.');

    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const folder = await createFolder(drive, DEFAULT_FOLDER_NAME);
    await query(
        `INSERT INTO google_drive_backup_settings (id, refresh_token, folder_id, folder_name, connected_at, last_uploaded_at, last_upload_error, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NULL, NULL, NOW())
         ON CONFLICT (id) DO UPDATE SET refresh_token = EXCLUDED.refresh_token, folder_id = EXCLUDED.folder_id,
           folder_name = EXCLUDED.folder_name, connected_at = NOW(), last_uploaded_at = NULL, last_upload_error = NULL, updated_at = NOW()`,
        [SETTINGS_ID, encrypt(tokens.refresh_token), folder.id, folder.name || DEFAULT_FOLDER_NAME],
    );
}

async function getDriveClient() {
    const settings = await getStoredSettings();
    if (!settings) return null;
    const oauth2Client = await getOAuthClient();
    oauth2Client.setCredentials({ refresh_token: decrypt(settings.refresh_token) });
    return { drive: google.drive({ version: 'v3', auth: oauth2Client }), settings };
}

async function getFiles(folderPath) {
    const entries = await fsPromises.readdir(folderPath, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...await getFiles(fullPath));
        } else if (entry.isFile()) {
            files.push(fullPath);
        }
    }
    return files;
}

async function uploadBackup(backupPath, folderName) {
    let client;
    try {
        client = await getDriveClient();
    } catch (error) {
        console.error('Google Drive backup is unavailable:', error.message);
        return { configured: true, uploaded: false, error: error.message };
    }
    if (!client) return { configured: false, uploaded: false };

    try {
        const backupFolder = await createFolder(client.drive, folderName, client.settings.folder_id);
        const files = await getFiles(backupPath);
        for (const filePath of files) {
            const relativePath = path.relative(backupPath, filePath);
            const relativeDirectory = path.dirname(relativePath);
            let parentId = backupFolder.id;
            if (relativeDirectory !== '.') {
                for (const directory of relativeDirectory.split(path.sep)) {
                    const folder = await createFolder(client.drive, directory, parentId);
                    parentId = folder.id;
                }
            }
            await client.drive.files.create({
                requestBody: { name: path.basename(filePath), parents: [parentId] },
                media: { mimeType: 'application/octet-stream', body: fs.createReadStream(filePath) },
                fields: 'id',
            });
        }
        await query('UPDATE google_drive_backup_settings SET last_uploaded_at = NOW(), last_upload_error = NULL, updated_at = NOW() WHERE id = $1', [SETTINGS_ID]);
        return { configured: true, uploaded: true, folderId: backupFolder.id };
    } catch (error) {
        await query('UPDATE google_drive_backup_settings SET last_upload_error = $1, updated_at = NOW() WHERE id = $2', [String(error.message).slice(0, 2000), SETTINGS_ID]).catch(() => {});
        console.error('Google Drive backup upload failed:', error.message);
        return { configured: true, uploaded: false, error: error.message };
    }
}

async function disconnect() {
    await query('DELETE FROM google_drive_backup_settings WHERE id = $1', [SETTINGS_ID]);
}

async function getClientOrigin() {
    const config = await getConnectionConfiguration();
    return config.frontendUrl.replace(/\/$/, '');
}

module.exports = {
    getStatus,
    saveConfiguration,
    createAuthorizationUrl,
    completeAuthorization,
    uploadBackup,
    disconnect,
    getClientOrigin,
};
