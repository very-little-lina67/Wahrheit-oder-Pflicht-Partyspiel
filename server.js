import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import webpush from 'web-push';

import {
    initializeDatabase,
    getUserByEmail,
    createUser,
    updateUserProfile,
    setOnlineStatus,
    searchUsers,
    getAllUsers,
    getLeaderboardUsers,
    updateUserRole,
    deleteUser,
    getFriends,
    addFriendPair,
    removeFriendPair,
    createFriendRequest,
    getFriendRequests,
    deleteFriendRequest,
    saveDirectMessage,
    getDirectMessages,
    markDirectMessagesRead,
    getUnreadDmCount,
    getDmConversations,
    createInvite,
    getInvites,
    deleteInvite,
    saveFeedback,
    getAllFeedback,
    deleteFeedback,
    saveLobbyState,
    getLobbyState,
    deleteLobbyState,
    getOrInitVapidKeys,
    savePushSubscription,
    deletePushSubscription,
    sendWebPushNotification
} from './database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT, 10) || 3002;
const MASTER_EMAIL_LIST = (
    process.env.MASTER_EMAILS ||
    process.env.MASTER_EMAIL ||
    'master@vibe.party,christian.heinrich@omoflow.de'
).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const MASTER_EMAIL = MASTER_EMAIL_LIST[0] || 'master@vibe.party';
function isMasterEmail(email) {
    return MASTER_EMAIL_LIST.includes(String(email || '').trim().toLowerCase());
}

const app = express();
app.set('trust proxy', true);

// CORS-Konfiguration
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : ['https://www.wop.omoflow.de', 'https://wop.omoflow.de', 'http://localhost:3000', 'http://localhost:3002'];

app.use(cors({
    origin: (origin, callback) => {
        // Erlaube mobile Apps, lokale Aufrufe ohne Origin & konfigurierte Domains
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.omoflow.de')) {
            callback(null, true);
        } else {
            callback(null, true); // Tolerant für Browser/PWA
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sicherheits- & Cache-Header für Frontend & PWA
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Statische Dateien (Frontend)
app.use(express.static(__dirname, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
            // HTML & Service Worker nicht lange cachen
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        }
    }
}));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    pingInterval: 25000,
    pingTimeout: 20000
});

// ==============================================================================
// IN-MEMORY REGISTRIES
// ==============================================================================

// email -> Set of socket.ids
const userSockets = new Map();
// socket.id -> { email, name }
const socketUsers = new Map();
// lobbyCode -> { code, hostEmail, settings, players: [], state: {}, spectators: [] }
const activeLobbies = new Map();

function getSocketsForEmail(email) {
    if (!email) return [];
    const set = userSockets.get(String(email).trim().toLowerCase());
    return set ? Array.from(set) : [];
}

function emitToUser(email, event, data) {
    if (!email) return;
    const cleanEmail = String(email).trim().toLowerCase();
    io.to(`user:${cleanEmail}`).emit(event, data);
    const sockets = getSocketsForEmail(cleanEmail);
    sockets.forEach(sId => {
        io.to(sId).emit(event, data);
    });
}

function isUserActiveInApp(email) {
    if (!email) return false;
    const cleanEmail = String(email).trim().toLowerCase();
    const sockets = getSocketsForEmail(cleanEmail);
    if (!sockets || !sockets.length) return false;
    // Prüfen, ob mindestens ein Socket für diese E-Mail aktuell sichtbar/im Vordergrund ist
    return sockets.some(sId => {
        const u = socketUsers.get(sId);
        return u && u.isVisible !== false;
    });
}

// Master / Admin Prüfung
function isAdminOrMaster(role, email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    return isMasterEmail(cleanEmail) || role === 'admin' || role === 'master';
}

// ==============================================================================
// REST API ROUTES
// ==============================================================================

// Healthcheck
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'wop-backend',
        version: '2.0.0',
        uptime: process.uptime(),
        activeConnections: socketUsers.size,
        activeLobbies: activeLobbies.size,
        timestamp: new Date().toISOString()
    });
});

// Lobby Details / Verfügbarkeits-Check
app.get('/api/lobby/:code', async (req, res) => {
    try {
        const cleanCode = String(req.params.code || '').trim().toLowerCase();
        let lobby = activeLobbies.get(cleanCode);
        if (!lobby) {
            lobby = await getLobbyState(cleanCode);
        }
        if (!lobby) {
            return res.status(404).json({ error: 'Lobby nicht gefunden.' });
        }
        res.json({ exists: true, lobby });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1. Authentifizierung & Profil
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, username, password, passHash } = req.body;
        if (!email || !username || (!password && !passHash)) {
            return res.status(400).json({ error: 'Bitte E-Mail, Name und Passwort angeben.' });
        }
        const cleanEmail = String(email).trim().toLowerCase();
        const existing = await getUserByEmail(cleanEmail);
        if (existing) {
            return res.status(409).json({ error: 'Ein Account mit dieser E-Mail existiert bereits.' });
        }

        const role = isMasterEmail(cleanEmail) ? 'master' : 'user';
        const finalHash = passHash || password; // Unterstützt Client-Hash

        const user = await createUser({
            email: cleanEmail,
            name: username.trim(),
            passHash: finalHash,
            role
        });

        res.status(201).json({ success: true, user });
    } catch (err) {
        console.error('Register-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler bei der Registrierung.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, passHash } = req.body;
        if (!email || (!password && !passHash)) {
            return res.status(400).json({ error: 'E-Mail und Passwort erforderlich.' });
        }
        const cleanEmail = String(email).trim().toLowerCase();
        const user = await getUserByEmail(cleanEmail);
        if (!user) {
            return res.status(404).json({ error: 'Benutzerkonto nicht gefunden.' });
        }

        const inputHash = passHash || password;
        const matches = (user.passHash && user.passHash === inputHash) ||
                        (user.passHash && user.passHash === password);

        if (!matches) {
            return res.status(401).json({ error: 'Ungültiges Passwort.' });
        }

        // Master-Account Absicherung
        if (isMasterEmail(cleanEmail) && user.role !== 'master') {
            await updateUserRole(cleanEmail, 'master');
            user.role = 'master';
        }

        // Online-Status und lastActive sofort aktualisieren
        await setOnlineStatus(cleanEmail, true);
        user.isOnline = true;
        user.lastActive = new Date().toISOString();
        io.emit('social:presence', { email: cleanEmail, isOnline: true });

        res.json({ success: true, user });
    } catch (err) {
        console.error('Login-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler beim Login.' });
    }
});

app.get('/api/user/profile', async (req, res) => {
    try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ error: 'E-Mail erforderlich.' });
        const user = await getUserByEmail(email);
        if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
        user.isOnline = userSockets.has(user.email) || Boolean(user.isOnline);
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/user/profile', async (req, res) => {
    try {
        const { email, ...data } = req.body;
        if (!email) return res.status(400).json({ error: 'E-Mail erforderlich.' });
        const cleanEmail = String(email).trim().toLowerCase();
        let user = await getUserByEmail(cleanEmail);
        if (!user) {
            // Automatisch erstellen, falls Neuanlage via Client-Adapter
            user = await createUser({
                email: cleanEmail,
                name: data.name || 'Spieler',
                passHash: data.passHash || 'auth_pass_placeholder',
                role: isMasterEmail(cleanEmail) ? 'master' : (data.role || 'user')
            });
        }
        const updated = await updateUserProfile(cleanEmail, data);
        res.json({ success: true, user: updated });
    } catch (err) {
        console.error('Update-Fehler:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/online', async (req, res) => {
    try {
        const onlineEmails = Array.from(userSockets.keys());
        const users = [];
        for (const email of onlineEmails) {
            const u = await getUserByEmail(email);
            if (u) {
                users.push({
                    ...u,
                    isOnline: true
                });
            }
        }
        res.json({ online: onlineEmails, users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/search', async (req, res) => {
    try {
        const q = req.query.q || '';
        const users = await searchUsers(q);
        // Live Online-Status verknüpfen
        const enriched = users.map(u => ({
            ...u,
            isOnline: userSockets.has(u.email)
        }));
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Öffentliche Rangliste (Coins / Monats-Coins / XP) – für alle eingeloggten Nutzer
app.get('/api/leaderboard', async (req, res) => {
    try {
        const users = await getLeaderboardUsers();
        res.json(users);
    } catch (err) {
        console.error('Leaderboard-Fehler:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Freunde & Social
app.get('/api/social/friends', async (req, res) => {
    try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ error: 'E-Mail erforderlich.' });
        const friends = await getFriends(email);
        const enriched = friends.map(f => ({
            ...f,
            isOnline: userSockets.has(f.email)
        }));
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/social/requests', async (req, res) => {
    try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ error: 'E-Mail erforderlich.' });
        const requests = await getFriendRequests(email);
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/social/friend-request', async (req, res) => {
    try {
        const { fromEmail, fromName, toEmail } = req.body;
        if (!fromEmail || !toEmail) return res.status(400).json({ error: 'Parameter unvollständig.' });
        const result = await createFriendRequest(fromEmail, fromName, toEmail);
        if (!result) return res.status(400).json({ error: 'Anfrage nicht möglich.' });
        if (result.alreadyFriends) return res.json({ alreadyFriends: true });

        // Sofortige Socket-Benachrichtigung an den Empfänger
        emitToUser(toEmail, 'social:friend_request_received', result);

        res.json({ success: true, request: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/social/accept-request', async (req, res) => {
    try {
        const { reqId, userEmail, friendEmail } = req.body;
        await addFriendPair(userEmail, friendEmail);
        if (reqId) await deleteFriendRequest(reqId);

        // Echtzeit-Update an beide Freunde
        emitToUser(userEmail, 'social:friends_updated');
        emitToUser(friendEmail, 'social:friends_updated');

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/social/decline-request', async (req, res) => {
    try {
        const { reqId } = req.body;
        if (reqId) await deleteFriendRequest(reqId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/social/remove-friend', async (req, res) => {
    try {
        const { userEmail, friendEmail } = req.body;
        await removeFriendPair(userEmail, friendEmail);
        emitToUser(userEmail, 'social:friends_updated');
        emitToUser(friendEmail, 'social:friends_updated');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Game Invites
app.get('/api/social/invites', async (req, res) => {
    try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ error: 'E-Mail erforderlich.' });
        const invites = await getInvites(email);
        res.json(invites);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/social/invite', async (req, res) => {
    try {
        const { fromEmail, fromName, toEmail, lobbyCode } = req.body;
        if (!fromEmail || !toEmail || !lobbyCode) return res.status(400).json({ error: 'Parameter unvollständig.' });
        const inv = await createInvite(fromEmail, fromName, toEmail, lobbyCode);

        // Push via WebSocket
        emitToUser(toEmail, 'social:invite_received', inv);

        res.json({ success: true, invite: inv });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/social/invite/:id', async (req, res) => {
    try {
        await deleteInvite(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Direktnachrichten (1-on-1 Chat)
app.get('/api/dm/history', async (req, res) => {
    try {
        const { me, other, limit } = req.query;
        if (!me || !other) return res.status(400).json({ error: 'me und other erforderlich.' });
        const messages = await getDirectMessages(me, other, parseInt(limit, 10) || 50);
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/dm/send', async (req, res) => {
    try {
        const { fromEmail, fromName, toEmail, text } = req.body;
        if (!fromEmail || !toEmail || !text) return res.status(400).json({ error: 'Parameter unvollständig.' });
        const msg = await saveDirectMessage(fromEmail, fromName, toEmail, text);

        // 1. Sofortige Echtzeit-Auslieferung via WebSocket
        emitToUser(toEmail, 'dm:incoming', msg);
        emitToUser(fromEmail, 'dm:incoming', msg);

        // 2. Web Push an Empfänger senden (weckt Smartphone im Standby/Hintergrund auf)
        // WICHTIG: Wenn der Empfänger aktuell mit sichtbarer App im Vordergrund aktiv ist, KEIN System-Web-Push!
        // Verhindert auf iOS und Android doppelte Benachrichtigungen (OS-Banner über App-Ansicht).
        const recipientIsActive = isUserActiveInApp(toEmail);
        if (!recipientIsActive) {
            sendWebPushNotification(toEmail, {
                title: `💬 ${fromName || 'Neue Nachricht'}`,
                body: String(text).slice(0, 100),
                icon: './icon-192.png',
                badge: './favicon-48.png',
                tag: `dm-${String(fromEmail).toLowerCase()}`,
                data: {
                    url: './',
                    fromEmail: String(fromEmail).toLowerCase(),
                    fromName: fromName || 'Spieler'
                }
            }).catch(e => console.warn('Push-Benachrichtigung fehlgeschlagen:', e.message));
        }

        res.json({ success: true, message: msg });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/dm/mark-read', async (req, res) => {
    try {
        const { me, other } = req.body;
        if (me && other) await markDirectMessagesRead(me, other);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dm/conversations', async (req, res) => {
    try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ error: 'E-Mail erforderlich.' });
        const list = await getDmConversations(email);
        const enriched = list.map(c => ({
            ...c,
            partnerOnline: userSockets.has(c.otherEmail) || Boolean(c.partnerOnline)
        }));
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dm/unread-count', async (req, res) => {
    try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ error: 'E-Mail erforderlich.' });
        const count = await getUnreadDmCount(email);
        res.json({ unread: count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Web Push Notifications
app.get('/api/push/public-key', async (req, res) => {
    try {
        const keys = await getOrInitVapidKeys();
        res.json({ publicKey: keys.publicKey });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/push/subscribe', async (req, res) => {
    try {
        const { email, subscription } = req.body;
        if (!email || !subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Ungültige Subscription-Daten.' });
        }
        await savePushSubscription(email, subscription);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/push/unsubscribe', async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (endpoint) await deletePushSubscription(endpoint);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Feedback
app.post('/api/feedback', async (req, res) => {
    try {
        const { email, name, type, text, errorCode, analysis, meta, author } = req.body;
        if (!email || !text) return res.status(400).json({ error: 'E-Mail und Text erforderlich.' });
        const result = await saveFeedback(
            email,
            name || author || '',
            type,
            text,
            { errorCode, analysis, meta }
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Admin Panel
app.get('/api/admin/users', async (req, res) => {
    try {
        const requester = req.query.requester;
        const u = await getUserByEmail(requester);
        if (!u || !isAdminOrMaster(u.role, requester)) {
            return res.status(403).json({ error: 'Zugriff verweigert.' });
        }
        const users = await getAllUsers();
        const enriched = users.map(user => {
            const email = String(user.email || '').trim().toLowerCase();
            const liveOnline = userSockets.has(email);
            return {
                ...user,
                email,
                isOnline: liveOnline || Boolean(user.isOnline),
                // lastActive als ISO-String für den Client
                lastActive: user.lastActive
                    ? (typeof user.lastActive === 'string'
                        ? user.lastActive
                        : new Date(user.lastActive).toISOString())
                    : null
            };
        });
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/user/role', async (req, res) => {
    try {
        const { requester, email, role } = req.body;
        const u = await getUserByEmail(requester);
        if (!u || !isAdminOrMaster(u.role, requester)) {
            return res.status(403).json({ error: 'Zugriff verweigert.' });
        }
        await updateUserRole(email, role);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/user', async (req, res) => {
    try {
        const { requester, email } = req.body;
        const u = await getUserByEmail(requester);
        if (!u || !isMasterEmail(requester)) {
            return res.status(403).json({ error: 'Nur der Master-Account darf Konten löschen.' });
        }
        await deleteUser(email);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/feedback', async (req, res) => {
    try {
        const requester = req.query.requester;
        const u = await getUserByEmail(requester);
        if (!u || !isAdminOrMaster(u.role, requester)) {
            return res.status(403).json({ error: 'Zugriff verweigert.' });
        }
        const list = await getAllFeedback();
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/feedback/:id', async (req, res) => {
    try {
        const requester = req.query.requester;
        const u = await getUserByEmail(requester);
        if (!u || !isAdminOrMaster(u.role, requester)) {
            return res.status(403).json({ error: 'Zugriff verweigert.' });
        }
        await deleteFeedback(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==============================================================================
// SOCKET.IO REALTIME EVENT HANDLERS
// ==============================================================================

io.on('connection', (socket) => {
    // 1. Identifikation & Online-Status
    socket.on('auth:identify', async (data) => {
        if (!data || !data.email) return;
        const email = String(data.email).trim().toLowerCase();
        const name = data.name || 'Spieler';
        const currentLobby = data.currentLobby || '';
        const isVisible = data.isVisible !== false;

        socketUsers.set(socket.id, { email, name, isVisible });
        if (!userSockets.has(email)) {
            userSockets.set(email, new Set());
        }
        userSockets.get(email).add(socket.id);
        socket.join(`user:${email}`);

        await setOnlineStatus(email, true, currentLobby);
        io.emit('social:presence', { email, isOnline: true, currentLobby });
    });

    // Client meldet Änderung der Sichtbarkeit (App im Vordergrund vs. Hintergrund/Minimiert)
    socket.on('user:visibility', (data) => {
        const user = socketUsers.get(socket.id);
        if (user && data) {
            user.isVisible = Boolean(data.isVisible);
        }
    });

    socket.on('user:heartbeat', async (data) => {
        if (!data || !data.email) return;
        const email = String(data.email).trim().toLowerCase();
        const currentLobby = data.currentLobby || '';
        const isVisible = data.isVisible !== false;

        const existing = socketUsers.get(socket.id) || { email, name: 'Spieler' };
        existing.isVisible = isVisible;
        socketUsers.set(socket.id, existing);

        if (!userSockets.has(email)) {
            userSockets.set(email, new Set());
        }
        userSockets.get(email).add(socket.id);
        socket.join(`user:${email}`);

        await setOnlineStatus(email, true, currentLobby);
    });

    // 2. Lobbies
    socket.on('lobby:create', async ({ code, settings, hostPlayer }, callback) => {
        const cleanCode = String(code).trim().toLowerCase();
        const roomName = `lobby:${cleanCode}`;

        socket.join(roomName);

        const lobbyObj = {
            code: cleanCode,
            hostEmail: hostPlayer?.email || '',
            hostName: hostPlayer?.name || 'Host',
            settings: settings || {},
            players: hostPlayer ? [hostPlayer] : [],
            spectators: [],
            state: {
                started: false,
                currentPlayerIndex: 0,
                currentTask: null,
                gameState: {}
            },
            updatedAt: Date.now()
        };

        activeLobbies.set(cleanCode, lobbyObj);
        await saveLobbyState(cleanCode, lobbyObj.hostEmail, lobbyObj.settings, lobbyObj.state);

        if (typeof callback === 'function') {
            callback({ success: true, code: cleanCode, lobby: lobbyObj });
        }
    });

    socket.on('lobby:join', async ({ code, player, isSpectator }, callback) => {
        const cleanCode = String(code).trim().toLowerCase();
        const roomName = `lobby:${cleanCode}`;

        let lobby = activeLobbies.get(cleanCode);
        if (!lobby) {
            // Aus SQLite wiederherstellen, falls Server neu gestartet wurde
            const persisted = await getLobbyState(cleanCode);
            if (persisted) {
                lobby = {
                    code: cleanCode,
                    hostEmail: persisted.hostEmail,
                    settings: persisted.settings || {},
                    players: persisted.state?.players || [],
                    spectators: [],
                    state: persisted.state || {},
                    updatedAt: Date.now()
                };
                activeLobbies.set(cleanCode, lobby);
            }
        }

        if (!lobby) {
            if (typeof callback === 'function') {
                return callback({ success: false, error: 'Lobby nicht gefunden.' });
            }
            return;
        }

        socket.join(roomName);

        if (isSpectator) {
            if (!lobby.spectators.some(s => s.email === player.email)) {
                lobby.spectators.push(player);
            }
        } else if (player && player.name) {
            const existingIdx = lobby.players.findIndex(p =>
                (p.email && p.email === player.email) ||
                (p.name && p.name.toLowerCase() === player.name.toLowerCase())
            );
            if (existingIdx >= 0) {
                lobby.players[existingIdx] = { ...lobby.players[existingIdx], ...player };
            } else {
                lobby.players.push(player);
            }
        }

        lobby.updatedAt = Date.now();

        // Broadcast an alle in der Lobby
        io.to(roomName).emit('lobby:player_joined', { player, isSpectator, players: lobby.players });
        io.to(roomName).emit('lobby:players_updated', { players: lobby.players });

        if (typeof callback === 'function') {
            callback({ success: true, lobby });
        }
    });

    socket.on('lobby:leave', ({ code, playerName }) => {
        const cleanCode = String(code).trim().toLowerCase();
        const roomName = `lobby:${cleanCode}`;
        socket.leave(roomName);

        const lobby = activeLobbies.get(cleanCode);
        if (lobby && playerName) {
            lobby.players = lobby.players.filter(p => p.name !== playerName);
            lobby.spectators = lobby.spectators.filter(s => s.name !== playerName);
            io.to(roomName).emit('lobby:player_left', { playerName, players: lobby.players });
            io.to(roomName).emit('lobby:players_updated', { players: lobby.players });

            if (lobby.players.length === 0) {
                activeLobbies.delete(cleanCode);
                deleteLobbyState(cleanCode).catch(() => {});
            }
        }
    });

    // Universeller Spiel-Event-Kanal (Latenz < 15ms)
    socket.on('lobby:data', ({ code, data, targetEmail }) => {
        const cleanCode = String(code).trim().toLowerCase();
        const roomName = `lobby:${cleanCode}`;

        if (targetEmail) {
            // Gezielt an einen Spieler
            emitToUser(targetEmail, 'lobby:data', data);
        } else {
            // An alle im Raum (inklusive Sender oder exklusive je nach Broadcast)
            socket.to(roomName).emit('lobby:data', data);
        }
    });

    // State-Sync (Host sichert Spielzustand)
    socket.on('lobby:state_sync', ({ code, state }) => {
        const cleanCode = String(code).trim().toLowerCase();
        const roomName = `lobby:${cleanCode}`;
        const lobby = activeLobbies.get(cleanCode);

        if (lobby) {
            lobby.state = { ...lobby.state, ...state };
            lobby.updatedAt = Date.now();
            socket.to(roomName).emit('lobby:state', lobby.state);

            // Asynchron in SQLite persistieren
            saveLobbyState(cleanCode, lobby.hostEmail, lobby.settings, lobby.state).catch(() => {});
        }
    });

    // 3. Disconnect Handling
    socket.on('disconnect', async () => {
        const userInfo = socketUsers.get(socket.id);
        socketUsers.delete(socket.id);

        if (userInfo && userInfo.email) {
            const email = userInfo.email;
            const sockets = userSockets.get(email);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    userSockets.delete(email);

                    // Nach kurzer Grace-Period (5 Sek.) offline schalten, falls kein schneller Reconnect
                    setTimeout(async () => {
                        if (!userSockets.has(email)) {
                            await setOnlineStatus(email, false);
                            io.emit('social:presence', { email, isOnline: false });
                        }
                    }, 5000);
                }
            }
        }
    });
});

// Initialisierung von Datenbank und Serverstart
initializeDatabase().then(async () => {
    try {
        const vapidKeys = await getOrInitVapidKeys();
        webpush.setVapidDetails(
            process.env.VAPID_SUBJECT || 'mailto:admin@omoflow.de',
            vapidKeys.publicKey,
            vapidKeys.privateKey
        );
        console.log('🔔 Web-Push VAPID Initialisierung erfolgreich.');
    } catch (pushErr) {
        console.warn('⚠️ Web-Push VAPID Initialisierung fehlgeschlagen:', pushErr.message);
    }

    server.listen(PORT, '0.0.0.0', () => {
        console.log('====================================================');
        console.log(`🚀 Wahrheit-oder-Pflicht Backend läuft auf Port: ${PORT}`);
        console.log(`🌐 Subdomain: https://www.wop.omoflow.de`);
        console.log(`📡 WebSocket Engine: Socket.io v4.8+`);
        console.log(`💾 SQLite WAL Mode: Aktiv`);
        console.log('====================================================');
    });
}).catch((err) => {
    console.error('Fataler Fehler bei der Datenbank-Initialisierung:', err);
    process.exit(1);
});
