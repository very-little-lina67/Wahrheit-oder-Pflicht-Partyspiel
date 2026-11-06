import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import tls from 'tls';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import webpush from 'web-push';

import dns from 'dns/promises';
import {
    initializeDatabase,
    dbRun,
    dbGet,
    dbAll,
    getUserByEmail,
    createUser,
    updateUserProfile,
    setOnlineStatus,
    setPresenceStatus,
    setUserCurrentLobby,
    clearLobbyForUsers,
    normalizePresenceStatus,
    generateVerificationCode,
    setVerificationCode,
    markEmailVerified,
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env zuverlässig laden (sowohl aus Verzeichnis der server.js als auch process.cwd())
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

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

/** Wegwerf- / Spaß-Domains blockieren */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
    'mailinator.com', 'guerrillamail.com', 'guerrillamail.de', '10minutemail.com', 'tempmail.com',
    'temp-mail.org', 'throwaway.email', 'yopmail.com', 'sharklasers.com', 'trashmail.com',
    'getnada.com', 'maildrop.cc', 'discard.email', 'mailnesia.com', 'fakeinbox.com',
    'tempail.com', 'emailondeck.com', 'moakt.com', 'tmpmail.org', 'tmpmail.net',
    'spamgourmet.com', 'mailcatch.com', 'mytrashmail.com', 'mintemail.com',
    'example.com', 'example.org', 'example.net', 'test.com', 'localhost',
    'mail.com.com', 'asdasd.com', 'asdf.com', 'qwe.com', 'abc.com',
    'spaß.de', 'spass.de', 'fake.de', 'test.de', 'dummy.de', 'invalid.de'
]);

function isValidEmailFormat(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
}

function getEmailDomain(email) {
    const parts = String(email || '').trim().toLowerCase().split('@');
    return parts.length === 2 ? parts[1] : '';
}

function isDisposableEmail(email) {
    const domain = getEmailDomain(email);
    if (!domain) return true;
    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
    // Häufige Spaß-Muster
    if (/^(test|fake|spam|temp|trash|noreply|no-reply)\./.test(domain)) return true;
    return false;
}

/** Prüft, ob die Domain MX-Records hat (kann E-Mails empfangen) */
async function domainCanReceiveEmail(email) {
    const domain = getEmailDomain(email);
    if (!domain || domain.length < 3) return false;
    try {
        const mx = await dns.resolveMx(domain);
        return Array.isArray(mx) && mx.length > 0;
    } catch {
        // Fallback: A/AAAA – manche Domains haben nur A, aber MX ist Standard
        try {
            const a = await dns.resolve4(domain);
            return Array.isArray(a) && a.length > 0;
        } catch {
            try {
                const aaaa = await dns.resolve6(domain);
                return Array.isArray(aaaa) && aaaa.length > 0;
            } catch {
                return false;
            }
        }
    }
}

async function validateRealEmail(email) {
    const clean = String(email || '').trim().toLowerCase();
    if (!isValidEmailFormat(clean)) {
        return { ok: false, error: 'Bitte eine gültige E-Mail-Adresse eingeben (z. B. name@domain.de).' };
    }
    if (isDisposableEmail(clean)) {
        return { ok: false, error: 'Wegwerf- oder Spaß-E-Mail-Adressen sind nicht erlaubt. Bitte eine echte E-Mail nutzen.' };
    }
    const canReceive = await domainCanReceiveEmail(clean);
    if (!canReceive) {
        return { ok: false, error: 'Diese E-Mail-Domain existiert nicht oder kann keine E-Mails empfangen. Bitte eine echte Adresse verwenden.' };
    }
    return { ok: true, email: clean };
}

function verificationExpiryIso() {
    return new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 Minuten
}

/** Direct-TLS Fallback: Versendet E-Mails über reines Node.js tls ohne npm-Abhängigkeiten */
function sendRawTlsEmail({ host, port, user, pass, from, to, subject, html, text }) {
    return new Promise((resolve, reject) => {
        let timer = null;
        const socket = tls.connect({
            host,
            port,
            rejectUnauthorized: false
        }, () => {
            let step = 0;
            let buffer = '';

            timer = setTimeout(() => {
                try { socket.destroy(); } catch (_) {}
                reject(new Error('SMTP Timeout (15s)'));
            }, 15000);

            socket.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\r\n');
                const lastLine = lines[lines.length - 2] || lines[lines.length - 1];

                if (!/^\d{3}[ -]/.test(lastLine)) return;
                if (/^\d{3}-/.test(lastLine)) return; // Mehrzeilige SMTP-Antworten abwarten

                const code = parseInt(lastLine.slice(0, 3), 10);
                buffer = '';

                if (step === 0 && code === 220) {
                    step = 1;
                    socket.write('EHLO omoflow.de\r\n');
                } else if (step === 1 && code === 250) {
                    step = 2;
                    socket.write('AUTH LOGIN\r\n');
                } else if (step === 2 && code === 334) {
                    step = 3;
                    socket.write(Buffer.from(user).toString('base64') + '\r\n');
                } else if (step === 3 && code === 334) {
                    step = 4;
                    socket.write(Buffer.from(pass).toString('base64') + '\r\n');
                } else if (step === 4 && code === 235) {
                    step = 5;
                    socket.write(`MAIL FROM:<${user}>\r\n`);
                } else if (step === 5 && code === 250) {
                    step = 6;
                    socket.write(`RCPT TO:<${to}>\r\n`);
                } else if (step === 6 && code === 250) {
                    step = 7;
                    socket.write('DATA\r\n');
                } else if (step === 7 && code === 354) {
                    step = 8;
                    const boundary = `====wop_${Date.now()}====`;
                    const mailData =
                        `From: ${from}\r\n` +
                        `To: ${to}\r\n` +
                        `Subject: ${subject}\r\n` +
                        `MIME-Version: 1.0\r\n` +
                        `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n` +
                        `--${boundary}\r\n` +
                        `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
                        `${text}\r\n\r\n` +
                        `--${boundary}\r\n` +
                        `Content-Type: text/html; charset=UTF-8\r\n\r\n` +
                        `${html}\r\n\r\n` +
                        `--${boundary}--\r\n.\r\n`;
                    socket.write(mailData);
                } else if (step === 8 && code === 250) {
                    step = 9;
                    socket.write('QUIT\r\n');
                    clearTimeout(timer);
                    resolve({ sent: true, response: lastLine });
                } else if (code >= 400) {
                    clearTimeout(timer);
                    try { socket.destroy(); } catch (_) {}
                    reject(new Error(`SMTP Fehler (${code}): ${lastLine}`));
                }
            });

            socket.on('error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
        });
    });
}

/** Bestätigungscode nur per E-Mail senden – nie an den Client zurückgeben */
async function sendVerificationEmail(toEmail, code) {
    const host = process.env.SMTP_HOST || 'mxe8db.netcup.net';
    const user = process.env.SMTP_USER || 'no-reply@omoflow.de';
    let pass = process.env.SMTP_PASS || 'F44l$66ee';
    if (pass === 'F44l6ee') pass = 'F44l$66ee'; // Auto-Fix falls bash $6 als Variable geschluckt hat
    const from = process.env.SMTP_FROM || `"Wahrheit oder Pflicht" <${user}>`;
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true' || port === 465;

    const subject = 'Dein Bestätigungscode – Wahrheit oder Pflicht';
    const text =
        `Hallo!\n\n` +
        `Dein Bestätigungscode für Wahrheit oder Pflicht lautet: ${code}\n\n` +
        `Der Code ist 30 Minuten gültig.\n` +
        `Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.\n\n` +
        `— WOP / omoflow`;
    const html =
        `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:12px">` +
        `<h2 style="margin:0 0 12px;color:#34d399">E-Mail bestätigen</h2>` +
        `<p style="margin:0 0 16px">Dein Bestätigungscode für <strong>Wahrheit oder Pflicht</strong>:</p>` +
        `<p style="font-size:28px;font-weight:700;letter-spacing:6px;text-align:center;padding:16px;background:#1e293b;border-radius:10px;margin:0 0 16px">${code}</p>` +
        `<p style="font-size:13px;color:#94a3b8;margin:0">Gültig für 30 Minuten. Wenn du dich nicht registriert hast, ignoriere diese Nachricht.</p>` +
        `</div>`;

    // 1. Zuerst nodemailer versuchen (falls installiert)
    try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
            tls: { rejectUnauthorized: false }
        });
        await transporter.sendMail({ from, to: toEmail, subject, text, html });
        console.log(`[VERIFY] Bestätigungscode via nodemailer an ${toEmail} gesendet.`);
        return { sent: true };
    } catch (nmErr) {
        console.warn(`[VERIFY] nodemailer fehlgeschlagen oder nicht installiert (${nmErr.message}), starte Direct-TLS Fallback...`);
    }

    // 2. Direct-TLS SMTPS Fallback (funktioniert immer direkt über Node.js tls auf Port 465)
    try {
        await sendRawTlsEmail({ host, port: 465, user, pass, from, to: toEmail, subject, html, text });
        console.log(`[VERIFY] Bestätigungscode via Direct-TLS an ${toEmail} gesendet.`);
        return { sent: true };
    } catch (rawErr) {
        console.error(`[VERIFY] Direct-TLS SMTP-Fehler:`, rawErr.message);
        return { sent: false, reason: rawErr.message || 'smtp_error' };
    }
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
    pingInterval: 8000,
    pingTimeout: 5000
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

function findLiveLobbyForUser(userEmail) {
    const clean = String(userEmail || '').trim().toLowerCase();
    if (!clean) return '';
    for (const [code, lobby] of activeLobbies.entries()) {
        if (lobby.hostEmail && lobby.hostEmail.toLowerCase() === clean) return code;
        if (Array.isArray(lobby.players) && lobby.players.some(p => p.email && p.email.toLowerCase() === clean)) return code;
        if (Array.isArray(lobby.spectators) && lobby.spectators.some(s => s.email && s.email.toLowerCase() === clean)) return code;
    }
    return '';
}

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
    // Wenn mindestens ein Socket aktiv verbunden ist: User befindet sich live in der App!
    return sockets.some(sId => {
        const s = io.sockets.sockets.get(sId);
        return Boolean(s && s.connected);
    });
}

// Master / Admin Prüfung
function isAdminOrMaster(role, email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const r = String(role || '').trim().toLowerCase();
    return isMasterEmail(cleanEmail) || r === 'admin' || r === 'master';
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

        const validation = await validateRealEmail(email);
        if (!validation.ok) {
            return res.status(400).json({ error: validation.error });
        }
        const cleanEmail = validation.email;

        const existing = await getUserByEmail(cleanEmail);
        if (existing) {
            return res.status(409).json({ error: 'Ein Account mit dieser E-Mail existiert bereits.' });
        }

        const role = isMasterEmail(cleanEmail) ? 'master' : 'user';
        const finalHash = passHash || password;
        const code = generateVerificationCode();
        const expires = verificationExpiryIso();
        // Master-Accounts sofort verifiziert
        const emailVerified = isMasterEmail(cleanEmail) ? 1 : 0;

        const user = await createUser({
            email: cleanEmail,
            name: username.trim(),
            passHash: finalHash,
            role,
            emailVerified,
            verificationCode: emailVerified ? '' : code,
            verificationExpires: emailVerified ? '' : expires
        });

        if (!emailVerified) {
            const mailResult = await sendVerificationEmail(cleanEmail, code);
            if (!mailResult.sent) {
                // Account wieder entfernen, damit keine „halben“ Konten ohne erreichbaren Code bleiben
                try {
                    await deleteUser(cleanEmail);
                } catch (delErr) {
                    console.warn('[VERIFY] Rollback nach Mail-Fehler:', delErr.message);
                }
                return res.status(503).json({
                    error: 'Bestätigungscode konnte nicht per E-Mail gesendet werden. Bitte später erneut versuchen oder den Admin informieren (SMTP).'
                });
            }
        }

        res.status(201).json({
            success: true,
            needsVerification: !emailVerified,
            message: emailVerified
                ? 'Registrierung erfolgreich.'
                : 'Registrierung erfolgreich. Bitte den Code aus deiner E-Mail eingeben.',
            user: { ...user, verificationCode: undefined, passHash: undefined }
        });
    } catch (err) {
        console.error('Register-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler bei der Registrierung.' });
    }
});

app.post('/api/auth/verify-email', async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ error: 'E-Mail und Bestätigungscode erforderlich.' });
        }
        const cleanEmail = String(email).trim().toLowerCase();
        const user = await getUserByEmail(cleanEmail);
        if (!user) {
            return res.status(404).json({ error: 'Benutzerkonto nicht gefunden.' });
        }
        if (user.emailVerified) {
            return res.json({ success: true, alreadyVerified: true, user: { ...user, verificationCode: undefined, passHash: undefined } });
        }
        const expected = String(user.verificationCode || '').trim();
        const expires = user.verificationExpires ? new Date(user.verificationExpires).getTime() : 0;
        if (!expected || String(code).trim() !== expected) {
            return res.status(400).json({ error: 'Ungültiger Bestätigungscode.' });
        }
        if (expires && Date.now() > expires) {
            return res.status(400).json({ error: 'Bestätigungscode abgelaufen. Bitte neu anfordern.' });
        }
        const verifiedUser = await markEmailVerified(cleanEmail);
        res.json({
            success: true,
            user: verifiedUser ? { ...verifiedUser, verificationCode: undefined, passHash: undefined } : null
        });
    } catch (err) {
        console.error('Verify-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler bei der Verifizierung.' });
    }
});

app.post('/api/auth/resend-code', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'E-Mail erforderlich.' });
        const validation = await validateRealEmail(email);
        if (!validation.ok) return res.status(400).json({ error: validation.error });
        const cleanEmail = validation.email;
        const user = await getUserByEmail(cleanEmail);
        if (!user) return res.status(404).json({ error: 'Benutzerkonto nicht gefunden.' });
        if (user.emailVerified) {
            return res.json({ success: true, alreadyVerified: true });
        }
        const code = generateVerificationCode();
        const expires = verificationExpiryIso();
        await setVerificationCode(cleanEmail, code, expires);
        const mailResult = await sendVerificationEmail(cleanEmail, code);
        if (!mailResult.sent) {
            return res.status(503).json({
                error: 'Code konnte nicht per E-Mail gesendet werden. Bitte später erneut versuchen.'
            });
        }
        res.json({
            success: true,
            sent: true,
            message: 'Neuer Bestätigungscode wurde an deine E-Mail gesendet.'
        });
    } catch (err) {
        console.error('Resend-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler.' });
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

        // Neue Accounts müssen E-Mail bestätigen (bestehende bleiben freigeschaltet)
        if (!user.emailVerified && !isMasterEmail(cleanEmail)) {
            return res.status(403).json({
                error: 'E-Mail noch nicht bestätigt. Bitte den Code aus deiner E-Mail eingeben.',
                needsVerification: true,
                email: cleanEmail
            });
        }

        // Master-Account Absicherung
        if (isMasterEmail(cleanEmail) && user.role !== 'master') {
            await updateUserRole(cleanEmail, 'master');
            user.role = 'master';
        }

        // Online-Status und lastActive sofort aktualisieren (gespeicherten Presence-Status beibehalten)
        const loginStatus = normalizePresenceStatus(user.presenceStatus);
        const loginOnline = loginStatus !== 'offline';
        await setOnlineStatus(cleanEmail, loginOnline, '', loginStatus);
        user.isOnline = loginOnline;
        user.presenceStatus = loginStatus;
        user.lastActive = new Date().toISOString();
        io.emit('social:presence', {
            email: cleanEmail,
            isOnline: loginOnline,
            presenceStatus: loginStatus
        });

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
        const clean = String(user.email || '').trim().toLowerCase();
        const liveOnline = userSockets.has(clean);
        const storedStatus = normalizePresenceStatus(user.presenceStatus);
        const effectiveStatus = !liveOnline ? 'offline' : storedStatus;
        user.isOnline = liveOnline && effectiveStatus !== 'offline';
        user.presenceStatus = effectiveStatus;
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Beacon / Unload Offline-Endpoint
app.post('/api/user/offline', async (req, res) => {
    try {
        let email = '';
        if (typeof req.body === 'string') {
            try { email = JSON.parse(req.body).email; } catch (_) {}
        } else if (req.body && req.body.email) {
            email = req.body.email;
        }
        if (email) {
            const clean = String(email).trim().toLowerCase();

            // Prüfen, ob der Nutzer Mitglied einer aktiven Spielrunde/Lobby ist
            let inActiveLobby = false;
            let currentLobbyCode = '';
            for (const [code, l] of activeLobbies.entries()) {
                if (
                    (l.hostEmail && l.hostEmail.toLowerCase() === clean) ||
                    (l.players && l.players.some(p => p.email && p.email.toLowerCase() === clean)) ||
                    (l.spectators && l.spectators.some(s => s.email && s.email.toLowerCase() === clean))
                ) {
                    inActiveLobby = true;
                    currentLobbyCode = code;
                    break;
                }
            }

            if (!inActiveLobby) {
                const userRow = await dbGet('SELECT currentLobby FROM users WHERE email = ?', [clean]).catch(() => null);
                if (userRow && userRow.currentLobby) {
                    inActiveLobby = true;
                    currentLobbyCode = userRow.currentLobby;
                }
            }

            if (inActiveLobby) {
                // Nutzer ist in einer aktiven Spielrunde – Socket NICHT killen und Lobby NICHT löschen!
                await setOnlineStatus(clean, false, currentLobbyCode);
                io.emit('social:presence', {
                    email: clean,
                    isOnline: false,
                    presenceStatus: 'offline',
                    currentLobby: currentLobbyCode
                });
            } else {
                const sockets = userSockets.get(clean);
                if (sockets) {
                    for (const sId of sockets) {
                        socketUsers.delete(sId);
                        const s = io.sockets.sockets.get(sId);
                        if (s) s.disconnect(false);
                    }
                    userSockets.delete(clean);
                }
                await setOnlineStatus(clean, false, '');
                io.emit('social:presence', {
                    email: clean,
                    isOnline: false,
                    presenceStatus: 'offline',
                    currentLobby: ''
                });
            }
        }
        res.json({ success: true });
    } catch (_) {
        res.status(200).json({ success: false });
    }
});

app.put('/api/user/profile', async (req, res) => {
    try {
        const { email, ...data } = req.body;
        if (!email) return res.status(400).json({ error: 'E-Mail erforderlich.' });
        const cleanEmail = String(email).trim().toLowerCase();
        let user = await getUserByEmail(cleanEmail);
        if (!user) {
            // Neuanlage nur mit echter E-Mail (Format + Domain + kein Wegwerf)
            const validation = await validateRealEmail(cleanEmail);
            if (!validation.ok) {
                return res.status(400).json({ error: validation.error });
            }
            const role = isMasterEmail(cleanEmail) ? 'master' : (data.role || 'user');
            const emailVerified = isMasterEmail(cleanEmail) ? 1 : 0;
            const code = emailVerified ? '' : generateVerificationCode();
            const expires = emailVerified ? '' : verificationExpiryIso();
            user = await createUser({
                email: cleanEmail,
                name: data.name || 'Spieler',
                passHash: data.passHash || 'auth_pass_placeholder',
                role,
                emailVerified,
                verificationCode: code,
                verificationExpires: expires
            });
            if (!emailVerified && code) {
                await sendVerificationEmail(cleanEmail, code);
            }
        }
        const updated = await updateUserProfile(cleanEmail, data);
        res.json({ success: true, user: updated, needsVerification: updated && !updated.emailVerified });
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
                const status = normalizePresenceStatus(u.presenceStatus);
                // Manuell offline: nicht in der Online-Liste
                if (status === 'offline') continue;
                users.push({
                    ...u,
                    isOnline: true,
                    presenceStatus: status
                });
            }
        }
        res.json({ online: users.map(u => u.email), users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/search', async (req, res) => {
    try {
        const q = req.query.q || '';
        const users = await searchUsers(q);
        // Live Online-Status + Presence verknüpfen
        const enriched = users.map(u => {
            const live = userSockets.has(u.email);
            const stored = normalizePresenceStatus(u.presenceStatus);
            const effective = !live ? 'offline' : stored;
            return {
                ...u,
                isOnline: effective !== 'offline',
                presenceStatus: effective
            };
        });
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
        const enriched = friends.map(f => {
            const live = userSockets.has(f.email);
            const stored = normalizePresenceStatus(f.presenceStatus);
            const effective = !live ? 'offline' : stored;
            return {
                ...f,
                isOnline: effective !== 'offline',
                presenceStatus: effective
            };
        });
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

        const cleanFrom = String(fromEmail).trim().toLowerCase();
        const cleanTo = String(toEmail).trim().toLowerCase();
        const target = await getUserByEmail(cleanTo);
        if (!target) return res.status(404).json({ error: 'Zielbenutzer nicht gefunden.' });

        const status = normalizePresenceStatus(target.presenceStatus);
        if (status === 'dnd') {
            return res.status(403).json({
                error: 'Dieser Spieler möchte nicht gestört werden (Bitte nicht stören).'
            });
        }

        const inv = await createInvite(cleanFrom, fromName, cleanTo, lobbyCode);

        // 1. Push via WebSocket (Echtzeit-Zustellung falls online)
        emitToUser(cleanTo, 'social:invite_received', inv);

        // 2. Web Push an Empfänger, falls nicht aktiv im Vordergrund der App
        if (!isUserActiveInApp(cleanTo)) {
            sendWebPushNotification(cleanTo, {
                title: 'Lobby-Einladung 🎮',
                body: `${fromName || 'Ein Spieler'} hat dich in die Lobby ${String(lobbyCode).toUpperCase()} eingeladen!`,
                icon: './icon-192.png',
                badge: './favicon-48.png',
                tag: `invite-${inv.id}`,
                data: {
                    url: './',
                    type: 'lobby_invite',
                    lobbyCode: String(lobbyCode).toUpperCase()
                }
            }).catch(() => {});
        }

        res.json({ success: true, invite: inv });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Presence-Status manuell setzen (Profil)
app.put('/api/user/presence', async (req, res) => {
    try {
        const { email, presenceStatus } = req.body || {};
        if (!email) return res.status(400).json({ error: 'E-Mail erforderlich.' });
        const status = normalizePresenceStatus(presenceStatus);
        const user = await setPresenceStatus(email, status);
        if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
        const clean = String(email).trim().toLowerCase();
        const liveOnline = userSockets.has(clean);
        // Effektiver Status: ohne Socket immer offline; mit Socket der gewählte Status
        const effective = !liveOnline && status !== 'offline' ? 'offline' : status;
        const isOnline = effective !== 'offline';
        io.emit('social:presence', {
            email: clean,
            isOnline,
            presenceStatus: effective,
            currentLobby: user.currentLobby || ''
        });
        res.json({ success: true, presenceStatus: status, effectiveStatus: effective, isOnline, user });
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
            const stored = normalizePresenceStatus(user.presenceStatus);
            const effective = !liveOnline ? 'offline' : stored;
            const liveLobby = liveOnline ? findLiveLobbyForUser(email) : '';
            return {
                ...user,
                email,
                isOnline: effective !== 'offline',
                presenceStatus: effective,
                currentLobby: liveLobby || (liveOnline ? (user.currentLobby || '') : ''),
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
        const cleanRequester = String(requester || '').trim().toLowerCase();
        const cleanEmail = String(email || '').trim().toLowerCase();
        const newRole = String(role || '').trim().toLowerCase();
        const u = await getUserByEmail(cleanRequester);
        if (!u || !isAdminOrMaster(u.role, cleanRequester)) {
            return res.status(403).json({ error: 'Zugriff verweigert.' });
        }
        // Feste Master-E-Mails dürfen nie geändert werden
        if (isMasterEmail(cleanEmail)) {
            return res.status(403).json({ error: 'Feste Master-Accounts sind unveränderlich.' });
        }
        const requesterIsMaster = isMasterEmail(cleanRequester) || String(u.role || '').toLowerCase() === 'master';
        // Admin darf nur user/moderator/admin setzen; Master darf zusätzlich master vergeben
        const allowed = requesterIsMaster
            ? ['user', 'moderator', 'admin', 'master']
            : ['user', 'moderator', 'admin'];
        if (!allowed.includes(newRole)) {
            return res.status(403).json({ error: 'Diese Rolle darf nicht vergeben werden.' });
        }
        await updateUserRole(cleanEmail, newRole);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/user', async (req, res) => {
    try {
        const cleanRequester = String(req.body?.requester || req.query?.requester || '').trim().toLowerCase();
        const cleanTarget = String(req.body?.email || req.query?.email || '').trim().toLowerCase();

        if (!cleanRequester || !cleanTarget) {
            return res.status(400).json({ error: 'Fehlende Parameter (requester / email).' });
        }

        // Feste Master-Accounts können niemals gelöscht werden (Schutz gegen versehentlichen Lockout)
        if (isMasterEmail(cleanTarget)) {
            return res.status(403).json({ error: 'Feste Master-Accounts können nicht gelöscht werden.' });
        }

        const reqUser = await getUserByEmail(cleanRequester);
        const reqIsMaster = isMasterEmail(cleanRequester) || String(reqUser?.role || '').toLowerCase() === 'master';

        if (!reqUser && !reqIsMaster) {
            return res.status(403).json({ error: 'Anfragender Benutzer nicht gefunden.' });
        }

        const isSelf = cleanRequester === cleanTarget;
        if (!isSelf) {
            const reqIsAdmin = String(reqUser?.role || '').toLowerCase() === 'admin';
            if (!reqIsMaster && !reqIsAdmin) {
                return res.status(403).json({ error: 'Nur Administratoren und der Master-Account dürfen fremde Konten löschen.' });
            }

            const targetUser = await getUserByEmail(cleanTarget);
            if (targetUser) {
                const targetIsMaster = isMasterEmail(cleanTarget) || String(targetUser.role || '').toLowerCase() === 'master';
                const targetIsAdmin = String(targetUser.role || '').toLowerCase() === 'admin';
                if (reqIsAdmin && !reqIsMaster && (targetIsMaster || targetIsAdmin)) {
                    return res.status(403).json({ error: 'Admins dürfen keine Administratoren oder den Master-Account löschen.' });
                }
            }
        }

        await deleteUser(cleanTarget);

        // Aktive Sockets des gelöschten Users sofort trennen
        const targetSockets = userSockets.get(cleanTarget);
        if (targetSockets) {
            for (const sid of targetSockets) {
                const s = io.sockets.sockets.get(sid);
                if (s) {
                    try {
                        s.emit('auth:deleted', { message: 'Dein Konto wurde gelöscht.' });
                        s.disconnect(true);
                    } catch (_) {}
                }
            }
            userSockets.delete(cleanTarget);
        }
        broadcastPresence(cleanTarget, false, 'offline');

        res.json({ success: true, message: 'Konto erfolgreich gelöscht.' });
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

        // Gespeicherten Presence-Status laden (manuelles Offline bleibt offline)
        let status = 'online';
        if (data.presenceStatus && data.presenceStatus !== 'offline') {
            status = normalizePresenceStatus(data.presenceStatus);
        }

        const isOnlineFlag = status !== 'offline';
        await setOnlineStatus(email, isOnlineFlag, currentLobby, status);
        io.emit('social:presence', {
            email,
            isOnline: isOnlineFlag,
            presenceStatus: status,
            currentLobby
        });
    });

    // Client meldet Änderung der Sichtbarkeit (App im Vordergrund vs. Hintergrund/Minimiert)
    socket.on('user:visibility', (data) => {
        const user = socketUsers.get(socket.id);
        if (user && data) {
            user.isVisible = Boolean(data.isVisible);
        }
    });

    // Manueller Presence-Status (online / away / dnd / offline)
    socket.on('user:setPresence', async (data, callback) => {
        try {
            const userInfo = socketUsers.get(socket.id);
            const email = String((data && data.email) || (userInfo && userInfo.email) || '').trim().toLowerCase();
            if (!email) {
                if (typeof callback === 'function') callback({ success: false, error: 'E-Mail fehlt' });
                return;
            }
            const status = normalizePresenceStatus(data && data.presenceStatus);
            const user = await setPresenceStatus(email, status);
            const liveOnline = userSockets.has(email);
            const effective = !liveOnline && status !== 'offline' ? 'offline' : status;
            const isOnline = effective !== 'offline';
            io.emit('social:presence', {
                email,
                isOnline,
                presenceStatus: effective,
                currentLobby: (user && user.currentLobby) || ''
            });
            if (typeof callback === 'function') {
                callback({ success: true, presenceStatus: status, effectiveStatus: effective, isOnline });
            }
        } catch (err) {
            if (typeof callback === 'function') callback({ success: false, error: err.message });
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

        const dbUser = await getUserByEmail(email);
        const status = normalizePresenceStatus(dbUser?.presenceStatus);
        const isOnlineFlag = status !== 'offline';
        await setOnlineStatus(email, isOnlineFlag, currentLobby, status);
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
            chatMessages: [],
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

        if (hostPlayer && hostPlayer.email) {
            const hEmail = String(hostPlayer.email).trim().toLowerCase();
            await setUserCurrentLobby(hEmail, cleanCode).catch(() => {});
            io.emit('social:presence', { email: hEmail, isOnline: true, currentLobby: cleanCode });
        }

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
                    chatMessages: persisted.state?.chatMessages || [],
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

        if (player && player.email) {
            const pEmail = String(player.email).trim().toLowerCase();
            await setUserCurrentLobby(pEmail, cleanCode).catch(() => {});
            io.emit('social:presence', { email: pEmail, isOnline: true, currentLobby: cleanCode });
        }
        await saveLobbyState(cleanCode, lobby.hostEmail, lobby.settings, { ...lobby.state, players: lobby.players }).catch(() => {});

        // Chat-Verlauf an neu beigetretenen / reconnectenden Client senden
        if (lobby.chatMessages && lobby.chatMessages.length > 0) {
            socket.emit('lobby:chat_history', {
                code: cleanCode,
                messages: lobby.chatMessages
            });
        }

        // Broadcast an alle in der Lobby
        io.to(roomName).emit('lobby:player_joined', { player, isSpectator, players: lobby.players });
        io.to(roomName).emit('lobby:players_updated', { players: lobby.players });

        if (typeof callback === 'function') {
            callback({ success: true, lobby });
        }
    });

    socket.on('lobby:leave', async ({ code, playerName, isHost }) => {
        const cleanCode = String(code).trim().toLowerCase();
        const roomName = `lobby:${cleanCode}`;
        socket.leave(roomName);

        const lobby = activeLobbies.get(cleanCode);
        const userInfo = socketUsers.get(socket.id);
        const userEmail = String(userInfo?.email || '').trim().toLowerCase();

        if (userEmail) {
            await setUserCurrentLobby(userEmail, '').catch(() => {});
            io.emit('social:presence', { email: userEmail, isOnline: true, currentLobby: '' });
        }

        if (lobby) {
            const isHostLeaving = !!isHost ||
                (userEmail && lobby.hostEmail && userEmail === lobby.hostEmail.toLowerCase()) ||
                (playerName && lobby.hostName && playerName.toLowerCase() === lobby.hostName.toLowerCase());

            if (isHostLeaving) {
                // Host verlässt die Lobby -> Ganze Lobby wird für alle geschlossen!
                io.to(roomName).emit('lobby:closed', {
                    code: cleanCode,
                    reason: 'host_left',
                    message: 'Der Host hat die Lobby verlassen. Die Lobby wurde beendet.'
                });
                io.in(roomName).socketsLeave(roomName);
                activeLobbies.delete(cleanCode);
                deleteLobbyState(cleanCode).catch(() => {});
                await clearLobbyForUsers(cleanCode).catch(() => {});
                return;
            }

            if (playerName) {
                lobby.players = lobby.players.filter(p => p.name !== playerName);
                lobby.spectators = lobby.spectators.filter(s => s.name !== playerName);
                io.to(roomName).emit('lobby:player_left', { playerName, players: lobby.players });
                io.to(roomName).emit('lobby:players_updated', { players: lobby.players });
            }

            if (lobby.players.length === 0) {
                activeLobbies.delete(cleanCode);
                deleteLobbyState(cleanCode).catch(() => {});
                await clearLobbyForUsers(cleanCode).catch(() => {});
            } else {
                saveLobbyState(cleanCode, lobby.hostEmail, lobby.settings, { ...lobby.state, players: lobby.players }).catch(() => {});
            }
        }
    });

    // Universeller Spiel-Event-Kanal (Latenz < 15ms)
    socket.on('lobby:data', ({ code, data, targetEmail }) => {
        const cleanCode = String(code).trim().toLowerCase();
        const roomName = `lobby:${cleanCode}`;
        const lobby = activeLobbies.get(cleanCode);

        // Chat-Filter: Nur Spieler/Zuschauer, die wirklich in dieser Lobby sind, dürfen darin chatten
        if (lobby && data && data.type === 'CHAT_MSG' && data.sender) {
            const senderInLobby = (lobby.players || []).some(p =>
                (p.name && p.name.toLowerCase() === String(data.sender).toLowerCase())
            ) || (lobby.spectators || []).some(s =>
                (s.name && s.name.toLowerCase() === String(data.sender).toLowerCase())
            );
            if (!senderInLobby) {
                return;
            }
            if (!lobby.chatMessages) lobby.chatMessages = [];
            const msgObj = {
                id: data.id || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                type: 'CHAT_MSG',
                sender: data.sender,
                text: data.text,
                timestamp: data.timestamp || Date.now()
            };
            data.id = msgObj.id;
            lobby.chatMessages.push(msgObj);
            if (lobby.chatMessages.length > 100) lobby.chatMessages.shift();
            lobby.state = { ...(lobby.state || {}), chatMessages: lobby.chatMessages };
            saveLobbyState(cleanCode, lobby.hostEmail, lobby.settings, lobby.state).catch(() => {});
        }

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

                    // Aktuelle Lobby des Nutzers ermitteln, damit diese bei temporärem Disconnect nicht verloren geht
                    let currentLobbyCode = '';
                    for (const [code, l] of activeLobbies.entries()) {
                        if (
                            (l.hostEmail && l.hostEmail.toLowerCase() === email) ||
                            (l.players && l.players.some(p => p.email && p.email.toLowerCase() === email)) ||
                            (l.spectators && l.spectators.some(s => s.email && s.email.toLowerCase() === email))
                        ) {
                            currentLobbyCode = code;
                            break;
                        }
                    }

                    // Sofort offline anzeigen – presenceStatus in SQLite nicht überschreiben; currentLobby beibehalten
                    try {
                        await setOnlineStatus(email, false, currentLobbyCode || null);
                    } catch (_) { /* ignore */ }
                    io.emit('social:presence', {
                        email,
                        isOnline: false,
                        presenceStatus: 'offline',
                        currentLobby: currentLobbyCode || ''
                    });
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

    // Periodischer Bereinigungs-Sweep für getrennte / zombifizierte Sockets (alle 15 Sek.)
    setInterval(() => {
        for (const [email, socketIds] of userSockets.entries()) {
            for (const sId of socketIds) {
                const s = io.sockets.sockets.get(sId);
                if (!s || !s.connected) {
                    socketIds.delete(sId);
                    socketUsers.delete(sId);
                }
            }
            if (socketIds.size === 0) {
                userSockets.delete(email);
                setOnlineStatus(email, false).catch(() => {});
                io.emit('social:presence', {
                    email,
                    isOnline: false,
                    presenceStatus: 'offline',
                    currentLobby: ''
                });
            }
        }
    }, 15000);

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
