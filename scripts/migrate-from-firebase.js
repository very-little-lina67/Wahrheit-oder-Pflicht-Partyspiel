/**
 * ==============================================================================
 * FIREBASE ZU SQLITE MIGRATIONS-SKRIPT
 * ==============================================================================
 * Migriert alle bestehenden Daten aus Google Firebase Cloud Firestore nach SQLite:
 * 1. Benutzerkonten (users) inkl. passHash, XP, Coins, Badges, Items, Themes
 * 2. Freundschaften (friends)
 * 3. Chatverläufe (directMessages)
 * 4. Offene Freundschaftsanfragen (friendRequests)
 * 5. Feedback / Bug-Reports (feedback)
 * ==============================================================================
 */

import { initializeDatabase, dbRun, dbGet } from '../database.js';

const PROJECT_ID = 'wahrheit-oder-pflicht-22116';
const BASE_FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function parseFirestoreValue(val) {
    if (!val || typeof val !== 'object') return null;
    if ('stringValue' in val) return val.stringValue;
    if ('integerValue' in val) return parseInt(val.integerValue, 10);
    if ('doubleValue' in val) return parseFloat(val.doubleValue);
    if ('booleanValue' in val) return val.booleanValue;
    if ('timestampValue' in val) return val.timestampValue;
    if ('nullValue' in val) return null;
    if ('arrayValue' in val) {
        return (val.arrayValue.values || []).map(parseFirestoreValue);
    }
    if ('mapValue' in val) {
        const res = {};
        for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
            res[k] = parseFirestoreValue(v);
        }
        return res;
    }
    return null;
}

async function fetchAllDocuments(collectionName) {
    let documents = [];
    let pageToken = '';

    do {
        const url = `${BASE_FIRESTORE_URL}/${collectionName}?pageSize=100${pageToken ? '&pageToken=' + pageToken : ''}`;
        const res = await fetch(url);
        if (!res.ok) {
            console.warn(`Konnte Collection "${collectionName}" nicht abrufen (HTTP ${res.status})`);
            break;
        }
        const data = await res.json();
        if (data.documents && data.documents.length) {
            documents.push(...data.documents);
        }
        pageToken = data.nextPageToken || '';
    } while (pageToken);

    return documents.map(doc => {
        const id = doc.name.split('/').pop();
        const fields = {};
        for (const [k, v] of Object.entries(doc.fields || {})) {
            fields[k] = parseFirestoreValue(v);
        }
        return { id, ...fields };
    });
}

async function migrate() {
    console.log('====================================================');
    console.log('🔄 Starte Migration von Firebase Firestore -> SQLite...');
    console.log('====================================================');

    await initializeDatabase();

    // 1. Users migrieren
    console.log('\n📥 1/5 Rufe Benutzerdaten ab...');
    const rawUsers = await fetchAllDocuments('users');
    let userCount = 0;
    let friendCount = 0;

    for (const u of rawUsers) {
        const email = String(u.id || u.email || '').trim().toLowerCase();
        if (!email) continue;

        const name = u.name || 'Spieler';
        const passHash = u.passHash || u.pass || '';
        const role = u.role || 'user';
        const xp = Number(u.xp) || 0;
        const coins = (u.coins !== undefined && u.coins !== null) ? Number(u.coins) : 50;
        const monthlyCoins = Number(u.monthlyCoins) || 0;
        const monthlyCoinsMonth = u.monthlyCoinsMonth || '';
        const streak = Number(u.streak) || 0;
        const gameStreak = Number(u.gameStreak) || 0;
        const accessory = u.accessory || '';
        const avatarEmote = u.avatarEmote || '😊';
        const items = JSON.stringify(Array.isArray(u.items) ? u.items : []);
        const themes = JSON.stringify(Array.isArray(u.themes) ? u.themes : []);
        const badges = JSON.stringify(Array.isArray(u.badges) ? u.badges : []);
        const emotes = JSON.stringify(Array.isArray(u.emotes) ? u.emotes : []);
        const truthCount = Number(u.truthCount) || 0;
        const dareCount = Number(u.dareCount) || 0;
        const jokerSkip = Number(u.jokerSkip) || 0;
        const jokerForce = Number(u.jokerForce) || 0;
        const jokersUsedSkip = Number(u.jokersUsedSkip) || 0;
        const jokersUsedForce = Number(u.jokersUsedForce) || 0;
        const lastLoginDate = u.lastLoginDate || '';
        const theme = u.theme || 'theme-default';
        const createdAt = u.createdAt || new Date().toISOString();
        const updatedAt = new Date().toISOString();

        await dbRun(
            `INSERT INTO users (
                email, name, passHash, role, xp, coins, monthlyCoins, monthlyCoinsMonth,
                streak, gameStreak, accessory, avatarEmote, items, themes, badges, emotes,
                truthCount, dareCount, jokerSkip, jokerForce, jokersUsedSkip, jokersUsedForce,
                lastLoginDate, theme, isOnline, currentLobby, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '', ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                name = excluded.name,
                passHash = CASE WHEN users.passHash != '' THEN users.passHash ELSE excluded.passHash END,
                role = excluded.role,
                xp = MAX(users.xp, excluded.xp),
                coins = excluded.coins,
                monthlyCoins = excluded.monthlyCoins,
                streak = MAX(users.streak, excluded.streak),
                gameStreak = MAX(users.gameStreak, excluded.gameStreak),
                accessory = excluded.accessory,
                avatarEmote = excluded.avatarEmote,
                items = excluded.items,
                themes = excluded.themes,
                badges = excluded.badges,
                emotes = excluded.emotes,
                truthCount = MAX(users.truthCount, excluded.truthCount),
                dareCount = MAX(users.dareCount, excluded.dareCount),
                jokerSkip = excluded.jokerSkip,
                jokerForce = excluded.jokerForce,
                jokersUsedSkip = excluded.jokersUsedSkip,
                jokersUsedForce = excluded.jokersUsedForce,
                lastLoginDate = excluded.lastLoginDate,
                theme = excluded.theme,
                updatedAt = excluded.updatedAt`,
            [
                email, name, passHash, role, xp, coins, monthlyCoins, monthlyCoinsMonth,
                streak, gameStreak, accessory, avatarEmote, items, themes, badges, emotes,
                truthCount, dareCount, jokerSkip, jokerForce, jokersUsedSkip, jokersUsedForce,
                lastLoginDate, theme, createdAt, updatedAt
            ]
        );
        userCount++;

        // Freundschaften migrieren
        if (Array.isArray(u.friends)) {
            for (const f of u.friends) {
                const friendEmail = String(f || '').trim().toLowerCase();
                if (friendEmail && friendEmail !== email) {
                    await dbRun(
                        'INSERT OR IGNORE INTO friends (userEmail, friendEmail) VALUES (?, ?)',
                        [email, friendEmail]
                    );
                    friendCount++;
                }
            }
        }
    }
    console.log(`✅ ${userCount} Benutzerkonten und ${friendCount} Freundschaftsverknüpfungen migriert.`);

    // 2. Chatnachrichten (directMessages)
    console.log('\n📥 2/5 Rufe Direktnachrichten ab...');
    const rawDMs = await fetchAllDocuments('directMessages');
    let dmCount = 0;
    for (const dm of rawDMs) {
        if (!dm.fromEmail || !dm.toEmail || !dm.text) continue;
        const fromEmail = String(dm.fromEmail).trim().toLowerCase();
        const toEmail = String(dm.toEmail).trim().toLowerCase();
        const createdAt = dm.createdAt || (dm.createdAtMs ? new Date(dm.createdAtMs).toISOString() : new Date().toISOString());
        const read = dm.read ? 1 : 0;

        await dbRun(
            `INSERT INTO direct_messages (fromEmail, fromName, toEmail, text, read, createdAt)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [fromEmail, dm.fromName || '', toEmail, dm.text, read, createdAt]
        );
        dmCount++;
    }
    console.log(`✅ ${dmCount} Direktnachrichten migriert.`);

    // 3. Freundschaftsanfragen (friendRequests)
    console.log('\n📥 3/5 Rufe Freundschaftsanfragen ab...');
    const rawReqs = await fetchAllDocuments('friendRequests');
    let reqCount = 0;
    for (const r of rawReqs) {
        if (!r.fromEmail || !r.toEmail) continue;
        const fromEmail = String(r.fromEmail).trim().toLowerCase();
        const toEmail = String(r.toEmail).trim().toLowerCase();
        const createdAt = r.timestamp || new Date().toISOString();

        await dbRun(
            `INSERT INTO friend_requests (fromEmail, fromName, toEmail, createdAt)
             VALUES (?, ?, ?, ?)`,
            [fromEmail, r.fromName || '', toEmail, createdAt]
        );
        reqCount++;
    }
    console.log(`✅ ${reqCount} Freundschaftsanfragen migriert.`);

    // 4. Feedback
    console.log('\n📥 4/5 Rufe Feedback-Einträge ab...');
    const rawFeedback = await fetchAllDocuments('feedback');
    let fbCount = 0;
    for (const fb of rawFeedback) {
        if (!fb.email || !fb.text) continue;
        const email = String(fb.email).trim().toLowerCase();
        const createdAt = fb.timestamp || new Date().toISOString();

        await dbRun(
            `INSERT INTO feedback (email, name, type, text, createdAt)
             VALUES (?, ?, ?, ?, ?)`,
            [email, fb.name || '', fb.type || 'general', fb.text, createdAt]
        );
        fbCount++;
    }
    console.log(`✅ ${fbCount} Feedback-Einträge migriert.`);

    console.log('\n====================================================');
    console.log('🎉 DATENBANK-MIGRATION ERFOLGREICH ABGESCHLOSSEN!');
    console.log('====================================================');
    console.log(`👤 Konten:          ${userCount}`);
    console.log(`👥 Freundschaften:  ${friendCount}`);
    console.log(`💬 Chat-Nachrichten:${dmCount}`);
    console.log(`📩 Offene Anfragen: ${reqCount}`);
    console.log(`📝 Feedback:        ${fbCount}`);
    console.log('====================================================');

    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Fehler bei der Migration:', err);
    process.exit(1);
});

