import sqlite3Pkg from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';

const sqlite3 = sqlite3Pkg.verbose();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'wop.sqlite');

export const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Fehler beim Öffnen der SQLite-Datenbank:', err.message);
    } else {
        console.log('✅ SQLite-Datenbank erfolgreich initialisiert:', dbPath);
    }
});

// SQLite-Performance & Concurrency (WAL-Modus, Timeout)
db.configure('busyTimeout', 10000);
db.run('PRAGMA busy_timeout = 10000;');
db.run('PRAGMA journal_mode = WAL;');
db.run('PRAGMA synchronous = NORMAL;');
db.run('PRAGMA temp_store = MEMORY;');
db.run('PRAGMA cache_size = -16000;');

// Promisified DB Helpers
export function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

export function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

export function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

export async function initializeDatabase() {
    return new Promise((resolve) => {
        db.serialize(() => {
            // 1. Users Tabelle
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    email TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    passHash TEXT NOT NULL,
                    role TEXT DEFAULT 'user',
                    xp INTEGER DEFAULT 0,
                    coins INTEGER DEFAULT 50,
                    monthlyCoins INTEGER DEFAULT 0,
                    monthlyCoinsMonth TEXT DEFAULT '',
                    streak INTEGER DEFAULT 0,
                    gameStreak INTEGER DEFAULT 0,
                    accessory TEXT DEFAULT '',
                    avatarEmote TEXT DEFAULT '😊',
                    items TEXT DEFAULT '[]',
                    themes TEXT DEFAULT '[]',
                    badges TEXT DEFAULT '[]',
                    emotes TEXT DEFAULT '[]',
                    truthCount INTEGER DEFAULT 0,
                    dareCount INTEGER DEFAULT 0,
                    jokerSkip INTEGER DEFAULT 0,
                    jokerForce INTEGER DEFAULT 0,
                    jokersUsedSkip INTEGER DEFAULT 0,
                    jokersUsedForce INTEGER DEFAULT 0,
                    lastLoginDate TEXT DEFAULT '',
                    theme TEXT DEFAULT 'theme-default',
                    isOnline INTEGER DEFAULT 0,
                    currentLobby TEXT DEFAULT '',
                    lastActive DATETIME DEFAULT CURRENT_TIMESTAMP,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // 2. Friends Tabelle
            db.run(`
                CREATE TABLE IF NOT EXISTS friends (
                    userEmail TEXT NOT NULL,
                    friendEmail TEXT NOT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (userEmail, friendEmail)
                )
            `);

            // 3. Friend Requests Tabelle
            db.run(`
                CREATE TABLE IF NOT EXISTS friend_requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fromEmail TEXT NOT NULL,
                    fromName TEXT DEFAULT '',
                    toEmail TEXT NOT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // 4. Direct Messages
            db.run(`
                CREATE TABLE IF NOT EXISTS direct_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fromEmail TEXT NOT NULL,
                    fromName TEXT DEFAULT '',
                    toEmail TEXT NOT NULL,
                    text TEXT NOT NULL,
                    read INTEGER DEFAULT 0,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // 5. Game Invites
            db.run(`
                CREATE TABLE IF NOT EXISTS invites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fromEmail TEXT NOT NULL,
                    fromName TEXT DEFAULT '',
                    toEmail TEXT NOT NULL,
                    lobbyCode TEXT NOT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // 6. User Feedback / Bug Reports
            db.run(`
                CREATE TABLE IF NOT EXISTS feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL,
                    name TEXT DEFAULT '',
                    type TEXT NOT NULL,
                    text TEXT NOT NULL,
                    errorCode TEXT DEFAULT '',
                    analysis TEXT DEFAULT '',
                    meta TEXT DEFAULT '',
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            // Migration für bestehende DBs (ignoriert Fehler wenn Spalte schon existiert)
            db.run(`ALTER TABLE feedback ADD COLUMN errorCode TEXT DEFAULT ''`, () => {});
            db.run(`ALTER TABLE feedback ADD COLUMN analysis TEXT DEFAULT ''`, () => {});
            db.run(`ALTER TABLE feedback ADD COLUMN meta TEXT DEFAULT ''`, () => {});

            // 7. Lobbies (Persistenz / Wiederherstellung)
            db.run(`
                CREATE TABLE IF NOT EXISTS lobbies (
                    code TEXT PRIMARY KEY,
                    hostEmail TEXT NOT NULL,
                    settings TEXT DEFAULT '{}',
                    state TEXT DEFAULT '{}',
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // 8. Server-Settings (z. B. persistente VAPID Web-Push Keys)
            db.run(`
                CREATE TABLE IF NOT EXISTS server_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            `);

            // 9. Web Push Subscriptions (für mobile Hintergrund-Benachrichtigungen)
            db.run(`
                CREATE TABLE IF NOT EXISTS push_subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL,
                    endpoint TEXT NOT NULL UNIQUE,
                    p256dh TEXT NOT NULL,
                    auth TEXT NOT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Indizes für schnelle Abfragen
            db.run(`CREATE INDEX IF NOT EXISTS idx_dm_emails ON direct_messages(fromEmail, toEmail)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_dm_unread ON direct_messages(toEmail, read)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_invites_to ON invites(toEmail)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_requests_to ON friend_requests(toEmail)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(userEmail)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_push_email ON push_subscriptions(email)`);

            console.log('✅ SQLite-Tabellen & Indizes erfolgreich angelegt/geprüft.');
            resolve();
        });
    });
}

// ==============================================================================
// User Management
// ==============================================================================

export async function getUserByEmail(email) {
    if (!email) return null;
    const cleanEmail = String(email).trim().toLowerCase();
    const row = await dbGet('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (!row) return null;

    // Freunde ermitteln
    const friendRows = await dbAll('SELECT friendEmail FROM friends WHERE userEmail = ?', [cleanEmail]);
    const friends = friendRows.map(r => r.friendEmail);

    // JSON Felder parsen
    return {
        ...row,
        friends,
        items: parseJsonArray(row.items),
        themes: parseJsonArray(row.themes),
        badges: parseJsonArray(row.badges),
        emotes: parseJsonArray(row.emotes),
        isOnline: Boolean(row.isOnline)
    };
}

export async function createUser({ email, name, passHash, role = 'user' }) {
    const cleanEmail = String(email).trim().toLowerCase();
    const now = new Date().toISOString();
    await dbRun(
        `INSERT INTO users (email, name, passHash, role, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [cleanEmail, name.trim(), passHash, role, now, now]
    );
    return getUserByEmail(cleanEmail);
}

export async function updateUserProfile(email, data) {
    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await getUserByEmail(cleanEmail);
    if (!existing) return null;

    if (Array.isArray(data.friendsToAdd)) {
        for (const f of data.friendsToAdd) {
            await addFriendPair(cleanEmail, f);
        }
    }
    if (Array.isArray(data.friendsToRemove)) {
        for (const f of data.friendsToRemove) {
            await removeFriendPair(cleanEmail, f);
        }
    }

    const name = data.name !== undefined ? data.name : existing.name;
    const passHash = data.passHash !== undefined ? data.passHash : existing.passHash;
    const role = data.role !== undefined ? data.role : existing.role;
    const xp = data.xp !== undefined ? Number(data.xp) : existing.xp;
    const coins = data.coins !== undefined ? Number(data.coins) : existing.coins;
    const monthlyCoins = data.monthlyCoins !== undefined ? Number(data.monthlyCoins) : existing.monthlyCoins;
    const monthlyCoinsMonth = data.monthlyCoinsMonth !== undefined ? data.monthlyCoinsMonth : existing.monthlyCoinsMonth;
    const streak = data.streak !== undefined ? Number(data.streak) : existing.streak;
    const gameStreak = data.gameStreak !== undefined ? Number(data.gameStreak) : existing.gameStreak;
    const accessory = data.accessory !== undefined ? data.accessory : existing.accessory;
    const avatarEmote = data.avatarEmote !== undefined ? data.avatarEmote : existing.avatarEmote;
    const items = JSON.stringify(Array.isArray(data.items) ? data.items : existing.items);
    const themes = JSON.stringify(Array.isArray(data.themes) ? data.themes : existing.themes);
    const badges = JSON.stringify(Array.isArray(data.badges) ? data.badges : existing.badges);
    const emotes = JSON.stringify(Array.isArray(data.emotes) ? data.emotes : existing.emotes);
    const truthCount = data.truthCount !== undefined ? Number(data.truthCount) : existing.truthCount;
    const dareCount = data.dareCount !== undefined ? Number(data.dareCount) : existing.dareCount;
    const jokerSkip = data.jokerSkip !== undefined ? Number(data.jokerSkip) : existing.jokerSkip;
    const jokerForce = data.jokerForce !== undefined ? Number(data.jokerForce) : existing.jokerForce;
    const jokersUsedSkip = data.jokersUsedSkip !== undefined ? Number(data.jokersUsedSkip) : existing.jokersUsedSkip;
    const jokersUsedForce = data.jokersUsedForce !== undefined ? Number(data.jokersUsedForce) : existing.jokersUsedForce;
    const lastLoginDate = data.lastLoginDate !== undefined ? data.lastLoginDate : existing.lastLoginDate;
    const theme = data.theme !== undefined ? data.theme : existing.theme;
    const isOnline = data.isOnline !== undefined ? (data.isOnline ? 1 : 0) : (existing.isOnline ? 1 : 0);
    const currentLobby = data.currentLobby !== undefined ? data.currentLobby : existing.currentLobby;
    const now = new Date().toISOString();

    await dbRun(
        `UPDATE users SET
            name = ?, passHash = ?, role = ?, xp = ?, coins = ?, monthlyCoins = ?, monthlyCoinsMonth = ?,
            streak = ?, gameStreak = ?, accessory = ?, avatarEmote = ?, items = ?, themes = ?,
            badges = ?, emotes = ?, truthCount = ?, dareCount = ?, jokerSkip = ?, jokerForce = ?,
            jokersUsedSkip = ?, jokersUsedForce = ?, lastLoginDate = ?, theme = ?, isOnline = ?,
            currentLobby = ?, lastActive = ?, updatedAt = ?
         WHERE email = ?`,
        [
            name, passHash, role, xp, coins, monthlyCoins, monthlyCoinsMonth, streak, gameStreak,
            accessory, avatarEmote, items, themes, badges, emotes, truthCount, dareCount,
            jokerSkip, jokerForce, jokersUsedSkip, jokersUsedForce, lastLoginDate, theme,
            isOnline, currentLobby, now, now, cleanEmail
        ]
    );

    return getUserByEmail(cleanEmail);
}

export async function setOnlineStatus(email, isOnline, currentLobby = '') {
    if (!email) return;
    const cleanEmail = String(email).trim().toLowerCase();
    const now = new Date().toISOString();
    await dbRun(
        `UPDATE users SET isOnline = ?, currentLobby = ?, lastActive = ? WHERE email = ?`,
        [isOnline ? 1 : 0, currentLobby, now, cleanEmail]
    );
}

export async function searchUsers(query, limit = 40) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) {
        const rows = await dbAll('SELECT email, name, role, isOnline, avatarEmote FROM users LIMIT ?', [limit]);
        return rows.map(r => ({ ...r, isOnline: Boolean(r.isOnline) }));
    }
    const rows = await dbAll(
        `SELECT email, name, role, isOnline, avatarEmote FROM users
         WHERE email LIKE ? OR LOWER(name) LIKE ?
         LIMIT ?`,
        [`%${q}%`, `%${q}%`, limit]
    );
    return rows.map(r => ({ ...r, isOnline: Boolean(r.isOnline) }));
}

export async function getAllUsers() {
    const rows = await dbAll(`
        SELECT email, name, role, xp, coins, monthlyCoins, monthlyCoinsMonth,
               streak, truthCount, dareCount, accessory, avatarEmote,
               isOnline, currentLobby, lastActive, createdAt
        FROM users ORDER BY createdAt DESC
    `);
    return rows.map(r => ({ ...r, isOnline: Boolean(r.isOnline) }));
}

/** Öffentliche Rangliste – ohne sensible Felder (Passwort etc.) */
export async function getLeaderboardUsers() {
    const rows = await dbAll(`
        SELECT email, name, xp, coins, monthlyCoins, monthlyCoinsMonth,
               streak, accessory, avatarEmote
        FROM users
    `);
    return rows.map(r => ({
        email: r.email,
        name: r.name,
        xp: Number(r.xp) || 0,
        coins: Number(r.coins) || 0,
        monthlyCoins: Number(r.monthlyCoins) || 0,
        monthlyCoinsMonth: r.monthlyCoinsMonth || '',
        streak: Number(r.streak) || 0,
        accessory: r.accessory || '',
        avatarEmote: r.avatarEmote || '😊'
    }));
}

export async function updateUserRole(email, newRole) {
    const cleanEmail = String(email).trim().toLowerCase();
    await dbRun('UPDATE users SET role = ? WHERE email = ?', [newRole, cleanEmail]);
}

export async function deleteUser(email) {
    const cleanEmail = String(email).trim().toLowerCase();
    await dbRun('DELETE FROM users WHERE email = ?', [cleanEmail]);
    await dbRun('DELETE FROM friends WHERE userEmail = ? OR friendEmail = ?', [cleanEmail, cleanEmail]);
    await dbRun('DELETE FROM friend_requests WHERE fromEmail = ? OR toEmail = ?', [cleanEmail, cleanEmail]);
    await dbRun('DELETE FROM direct_messages WHERE fromEmail = ? OR toEmail = ?', [cleanEmail, cleanEmail]);
    await dbRun('DELETE FROM invites WHERE fromEmail = ? OR toEmail = ?', [cleanEmail, cleanEmail]);
    await dbRun('DELETE FROM feedback WHERE email = ?', [cleanEmail]);
}

// ==============================================================================
// Friends & Social
// ==============================================================================

export async function getFriends(email) {
    const cleanEmail = String(email).trim().toLowerCase();
    const rows = await dbAll(
        `SELECT u.email, u.name, u.role, u.isOnline, u.currentLobby, u.avatarEmote
         FROM friends f
         JOIN users u ON u.email = f.friendEmail
         WHERE f.userEmail = ?`,
        [cleanEmail]
    );
    return rows.map(r => ({ ...r, isOnline: Boolean(r.isOnline) }));
}

export async function addFriendPair(email1, email2) {
    const e1 = String(email1 || '').trim().toLowerCase();
    const e2 = String(email2 || '').trim().toLowerCase();
    if (!e1 || !e2 || e1 === e2) return;
    await dbRun('INSERT OR IGNORE INTO friends (userEmail, friendEmail) VALUES (?, ?)', [e1, e2]);
    await dbRun('INSERT OR IGNORE INTO friends (userEmail, friendEmail) VALUES (?, ?)', [e2, e1]);
}

export async function removeFriendPair(email1, email2) {
    const e1 = String(email1 || '').trim().toLowerCase();
    const e2 = String(email2 || '').trim().toLowerCase();
    if (!e1 || !e2) return;
    await dbRun('DELETE FROM friends WHERE (userEmail = ? AND friendEmail = ?) OR (userEmail = ? AND friendEmail = ?)', [e1, e2, e2, e1]);
}

export async function createFriendRequest(fromEmail, fromName, toEmail) {
    const fEmail = String(fromEmail).trim().toLowerCase();
    const tEmail = String(toEmail).trim().toLowerCase();
    if (fEmail === tEmail) return null;

    // Prüfen ob bereits befreundet
    const alreadyFriends = await dbGet('SELECT 1 FROM friends WHERE userEmail = ? AND friendEmail = ?', [fEmail, tEmail]);
    if (alreadyFriends) return { alreadyFriends: true };

    // Prüfen ob bereits eine offene Anfrage existiert
    const existing = await dbGet('SELECT * FROM friend_requests WHERE fromEmail = ? AND toEmail = ?', [fEmail, tEmail]);
    if (existing) return existing;

    const res = await dbRun(
        'INSERT INTO friend_requests (fromEmail, fromName, toEmail) VALUES (?, ?, ?)',
        [fEmail, fromName || '', tEmail]
    );
    return { id: res.lastID, fromEmail: fEmail, fromName, toEmail: tEmail };
}

export async function getFriendRequests(email) {
    const cleanEmail = String(email).trim().toLowerCase();
    return dbAll(
        'SELECT * FROM friend_requests WHERE toEmail = ? ORDER BY createdAt DESC',
        [cleanEmail]
    );
}

export async function deleteFriendRequest(id) {
    await dbRun('DELETE FROM friend_requests WHERE id = ?', [id]);
}

// ==============================================================================
// Direct Messages
// ==============================================================================

export async function saveDirectMessage(fromEmail, fromName, toEmail, text) {
    const fEmail = String(fromEmail).trim().toLowerCase();
    const tEmail = String(toEmail).trim().toLowerCase();
    const res = await dbRun(
        `INSERT INTO direct_messages (fromEmail, fromName, toEmail, text, read)
         VALUES (?, ?, ?, ?, 0)`,
        [fEmail, fromName || '', tEmail, text]
    );
    return dbGet('SELECT * FROM direct_messages WHERE id = ?', [res.lastID]);
}

export async function getDirectMessages(me, other, limit = 50) {
    const m = String(me).trim().toLowerCase();
    const o = String(other).trim().toLowerCase();
    return dbAll(
        `SELECT * FROM direct_messages
         WHERE (fromEmail = ? AND toEmail = ?) OR (fromEmail = ? AND toEmail = ?)
         ORDER BY createdAt ASC LIMIT ?`,
        [m, o, o, m, limit]
    );
}

export async function markDirectMessagesRead(me, other) {
    const m = String(me).trim().toLowerCase();
    const o = String(other).trim().toLowerCase();
    await dbRun(
        'UPDATE direct_messages SET read = 1 WHERE toEmail = ? AND fromEmail = ?',
        [m, o]
    );
}

export async function getUnreadDmCount(email) {
    const m = String(email).trim().toLowerCase();
    const row = await dbGet('SELECT COUNT(*) as count FROM direct_messages WHERE toEmail = ? AND read = 0', [m]);
    return row?.count || 0;
}

export async function getDmConversations(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) return [];
    const sql = `
        SELECT 
            m.id, m.fromEmail, m.fromName, m.toEmail, m.text, m.read, m.createdAt,
            u.name as partnerName,
            u.avatarEmote as partnerAvatar,
            u.isOnline as partnerOnline,
            CASE WHEN m.fromEmail = ? THEN m.toEmail ELSE m.fromEmail END as otherEmail,
            (SELECT COUNT(*) FROM direct_messages unread_dm 
             WHERE unread_dm.toEmail = ? 
               AND unread_dm.fromEmail = (CASE WHEN m.fromEmail = ? THEN m.toEmail ELSE m.fromEmail END) 
               AND unread_dm.read = 0) as unreadCount
        FROM direct_messages m
        LEFT JOIN users u ON u.email = (CASE WHEN m.fromEmail = ? THEN m.toEmail ELSE m.fromEmail END)
        WHERE m.id IN (
            SELECT MAX(id)
            FROM direct_messages
            WHERE fromEmail = ? OR toEmail = ?
            GROUP BY (CASE WHEN fromEmail = ? THEN toEmail ELSE fromEmail END)
        )
        ORDER BY m.createdAt DESC
    `;
    const rows = await dbAll(sql, [cleanEmail, cleanEmail, cleanEmail, cleanEmail, cleanEmail, cleanEmail, cleanEmail]);
    return rows.map(r => ({
        ...r,
        partnerOnline: Boolean(r.partnerOnline)
    }));
}

// ==============================================================================
// Game Invites
// ==============================================================================

export async function createInvite(fromEmail, fromName, toEmail, lobbyCode) {
    const fEmail = String(fromEmail).trim().toLowerCase();
    const tEmail = String(toEmail).trim().toLowerCase();
    const code = String(lobbyCode).trim().toUpperCase();

    const res = await dbRun(
        'INSERT INTO invites (fromEmail, fromName, toEmail, lobbyCode) VALUES (?, ?, ?, ?)',
        [fEmail, fromName || '', tEmail, code]
    );
    return { id: res.lastID, fromEmail: fEmail, fromName, toEmail: tEmail, lobbyCode: code };
}

export async function getInvites(email) {
    const cleanEmail = String(email).trim().toLowerCase();
    return dbAll('SELECT * FROM invites WHERE toEmail = ? ORDER BY createdAt DESC', [cleanEmail]);
}

export async function deleteInvite(id) {
    await dbRun('DELETE FROM invites WHERE id = ?', [id]);
}

// ==============================================================================
// Feedback
// ==============================================================================

export async function saveFeedback(email, name, type, text, extra = {}) {
    const errorCode = extra.errorCode || '';
    const analysis = extra.analysis || '';
    const meta = typeof extra.meta === 'string' ? extra.meta : JSON.stringify(extra.meta || {});
    const res = await dbRun(
        `INSERT INTO feedback (email, name, type, text, errorCode, analysis, meta)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            String(email).trim().toLowerCase(),
            name || '',
            type || 'general',
            text,
            errorCode,
            analysis,
            meta
        ]
    );
    return { id: res.lastID, success: true, errorCode };
}

export async function getAllFeedback() {
    return dbAll('SELECT * FROM feedback ORDER BY createdAt DESC');
}

export async function deleteFeedback(id) {
    await dbRun('DELETE FROM feedback WHERE id = ?', [id]);
}

// ==============================================================================
// Lobby State Storage
// ==============================================================================

export async function saveLobbyState(code, hostEmail, settings = {}, state = {}) {
    const cleanCode = String(code).trim().toLowerCase();
    const now = new Date().toISOString();
    await dbRun(
        `INSERT INTO lobbies (code, hostEmail, settings, state, updatedAt)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(code) DO UPDATE SET
            hostEmail = excluded.hostEmail,
            settings = excluded.settings,
            state = excluded.state,
            updatedAt = excluded.updatedAt`,
        [cleanCode, hostEmail, JSON.stringify(settings), JSON.stringify(state), now]
    );
}

export async function getLobbyState(code) {
    const cleanCode = String(code).trim().toLowerCase();
    const row = await dbGet('SELECT * FROM lobbies WHERE code = ?', [cleanCode]);
    if (!row) return null;
    return {
        code: row.code,
        hostEmail: row.hostEmail,
        settings: safeJsonParse(row.settings, {}),
        state: safeJsonParse(row.state, {}),
        updatedAt: row.updatedAt
    };
}

export async function deleteLobbyState(code) {
    const cleanCode = String(code).trim().toLowerCase();
    await dbRun('DELETE FROM lobbies WHERE code = ?', [cleanCode]);
}

// ==============================================================================
// Web Push Notifications & VAPID Management
// ==============================================================================

export async function getOrInitVapidKeys() {
    const pubRow = await dbGet('SELECT value FROM server_settings WHERE key = ?', ['vapid_public_key']);
    const privRow = await dbGet('SELECT value FROM server_settings WHERE key = ?', ['vapid_private_key']);
    if (pubRow && privRow && pubRow.value && privRow.value) {
        return { publicKey: pubRow.value, privateKey: privRow.value };
    }
    const newKeys = webpush.generateVAPIDKeys();
    await dbRun('INSERT OR REPLACE INTO server_settings (key, value) VALUES (?, ?)', ['vapid_public_key', newKeys.publicKey]);
    await dbRun('INSERT OR REPLACE INTO server_settings (key, value) VALUES (?, ?)', ['vapid_private_key', newKeys.privateKey]);
    return newKeys;
}

export async function savePushSubscription(email, subscription) {
    if (!email || !subscription || !subscription.endpoint) return;
    const cleanEmail = String(email).trim().toLowerCase();
    const endpoint = subscription.endpoint;
    const keys = subscription.keys || {};
    const p256dh = keys.p256dh || '';
    const auth = keys.auth || '';
    await dbRun(
        `INSERT INTO push_subscriptions (email, endpoint, p256dh, auth)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET
            email = excluded.email,
            p256dh = excluded.p256dh,
            auth = excluded.auth`,
        [cleanEmail, endpoint, p256dh, auth]
    );
}

export async function deletePushSubscription(endpoint) {
    if (!endpoint) return;
    await dbRun('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
}

export async function getPushSubscriptionsForUser(email) {
    if (!email) return [];
    const cleanEmail = String(email).trim().toLowerCase();
    return dbAll('SELECT * FROM push_subscriptions WHERE email = ?', [cleanEmail]);
}

export async function sendWebPushNotification(email, payload) {
    if (!email) return;
    const subs = await getPushSubscriptionsForUser(email);
    if (!subs || !subs.length) return;
    const jsonPayload = JSON.stringify(payload);
    for (const sub of subs) {
        const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
            }
        };
        try {
            await webpush.sendNotification(pushSubscription, jsonPayload);
        } catch (err) {
            // 410 Gone / 404 Not Found: Subscription ist ungültig oder abgelaufen
            if (err.statusCode === 410 || err.statusCode === 404) {
                await deletePushSubscription(sub.endpoint);
            } else {
                console.warn('WebPush Zustellwarnung:', sub.endpoint, err.message);
            }
        }
    }
}

// ==============================================================================
// Utility Functions
// ==============================================================================

function parseJsonArray(val) {
    if (!val) return [];
    try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function safeJsonParse(val, fallback = {}) {
    if (!val) return fallback;
    try {
        return JSON.parse(val);
    } catch {
        return fallback;
    }
}
