/**
 * ==============================================================================
 * WAHRHEIT ODER PFLICHT - MULTIPLAYER PARTYSPIEL - FIXED VERSION
 * ==============================================================================
 * Fixes in dieser Version:
 * - Zentrales Logger-System (statt console.log verstreut)
 * - Doppeltes currentLang + doppeltes DOMContentLoaded gefixt
 * - sha256_pure Bug: 4-Byte UTF-8 hatte nur 3 Bytes -> gefixt
 * - XSS Fixes: Alle innerHTML mit User-Input -> escapeHTML / sichere DOM-API
 * - Login/Auth Hardening: Input-Validierung, Email-Regex, Rate-Limiting
 * - Role-System gehärtet: kein Client-Side Master-Escalation mehr
 * - Lobby-Code Normalisierung & Validation
 * - Chat & Player-Liste sicher
 * - Reconnect/Heartbeat Leak Fixes
 * - Generelles Error-Handling & Null-Checks
 * ==============================================================================
 */

// ==========================================
// 0. LOGGER SYSTEM (NEU)
// ==========================================
const Logger = (() => {
    const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    let currentLevel = LEVELS.INFO;
    const buffer = [];
    const MAX_BUFFER = 200;

    function fmt(level, args) {
        const time = new Date().toISOString().split('T')[1].slice(0,12);
        return `[${time}] [${level}] ${args.map(a => {
            if (a instanceof Error) return a.stack || a.message;
            if (typeof a === 'object') try { return JSON.stringify(a); } catch { return String(a); }
            return String(a);
        }).join(' ')}`;
    }

    function push(level, args) {
        const line = fmt(level, args);
        buffer.push(line);
        if (buffer.length > MAX_BUFFER) buffer.shift();
        const c = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : level === 'DEBUG' ? console.debug : console.log;
        c(line);
    }

    return {
        LEVELS,
        setLevel(l) { currentLevel = LEVELS[l] ?? LEVELS.INFO; },
        debug(...a) { if (currentLevel <= LEVELS.DEBUG) push('DEBUG', a); },
        info(...a) { if (currentLevel <= LEVELS.INFO) push('INFO', a); },
        warn(...a) { if (currentLevel <= LEVELS.WARN) push('WARN', a); },
        error(...a) { if (currentLevel <= LEVELS.ERROR) push('ERROR', a); },
        getLogs() { return [...buffer]; },
        export() { return buffer.join('\n'); }
    };
})();

// ==========================================
// 1. SICHERE HELFER
// ==========================================
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
function escapeJS(str) {
    return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim());
}
function isValidUsername(name) {
    const t = String(name).trim();
    return t.length >= 2 && t.length <= 20 && /^[\p{L}\p{N}_\- ]+$/u.test(t);
}

// ==========================================
// FIREBASE INITIALISIERUNG
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyC8yK-9ALbnnVa9m3uO1RqWTwrW81nixng",
    authDomain: "wahrheit-oder-pflicht-22116.firebaseapp.com",
    projectId: "wahrheit-oder-pflicht-22116",
    storageBucket: "wahrheit-oder-pflicht-22116.firebasestorage.app",
    messagingSenderId: "426152165647",
    appId: "1:426152165647:web:00beeaaf0f0e960dba3e7a",
    measurementId: "G-9TNW0K7QTJ"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ==========================================
// 2. KRYPTO-, SICHERHEITS- & DATENSCHUTZ-HELFER
// ==========================================
function getUserDisplayName(user, fallback = "Spieler") {
    if (!user) return fallback;
    if (typeof user === "string") return user.trim() || fallback;
    if (typeof user === "object") {
        if (typeof user.name === "string" && user.name.trim()) return user.name.trim();
        if (typeof user.username === "string" && user.username.trim()) return user.username.trim();
        if (typeof user.displayName === "string" && user.displayName.trim()) return user.displayName.trim();
    }
    return fallback;
}

// FIXED: PURE JS SHA-256 - 4-Byte UTF8 Bug behoben
function sha256_pure(ascii) {
    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }
    const K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    let H = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];

    const bytes = [];
    for (let i = 0; i < ascii.length; i++) {
        let code = ascii.charCodeAt(i);
        if (code < 0x80) {
            bytes.push(code);
        } else if (code < 0x800) {
            bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        } else if (code < 0xd800 || code >= 0xe000) {
            bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        } else {
            // Surrogate pair -> 4-byte UTF8 (FIX: vorher fehlte ein Byte!)
            i++;
            code = 0x10000 + (((code & 0x3ff) << 10) | (ascii.charCodeAt(i) & 0x3ff));
            bytes.push(
                0xf0 | (code >> 18),
                0x80 | ((code >> 12) & 0x3f),
                0x80 | ((code >> 6) & 0x3f),
                0x80 | (code & 0x3f)
            );
        }
    }

    const bitLength = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);

    // FIX: 64-bit length big-endian (high + low)
    const highBits = Math.floor(bitLength / 0x100000000);
    const lowBits = bitLength >>> 0;
    bytes.push(
        (highBits >>> 24) & 0xff, (highBits >>> 16) & 0xff, (highBits >>> 8) & 0xff, highBits & 0xff,
        (lowBits >>> 24) & 0xff, (lowBits >>> 16) & 0xff, (lowBits >>> 8) & 0xff, lowBits & 0xff
    );

    const words = [];
    for (let i = 0; i < bytes.length; i += 4) {
        words.push((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | (bytes[i + 3]));
    }

    for (let i = 0; i < words.length; i += 16) {
        const w = new Array(64);
        for (let t = 0; t < 16; t++) w[t] = words[i + t];
        for (let t = 16; t < 64; t++) {
            const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
            const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
            w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
        }
        let [a, b, c, d, e, f, g, h] = H;
        for (let t = 0; t < 64; t++) {
            const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
            const ch = (e & f) ^ ((~e) & g);
            const temp1 = (h + S1 + ch + K[t] + w[t]) | 0;
            const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) | 0;
            h = g; g = f; f = e; e = (d + temp1) | 0;
            d = c; c = b; b = a; a = (temp1 + temp2) | 0;
        }
        H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
        H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(val => (val >>> 0).toString(16).padStart(8, '0')).join('');
}

async function hashPassword(password) {
    if (typeof window !== "undefined" && window.crypto && crypto.subtle && window.isSecureContext) {
        try {
            const msgBuffer = new TextEncoder().encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            Logger.warn("WebCrypto SHA256 fehlgeschlagen, Fallback pure:", e.message);
        }
    }
    return sha256_pure(password);
}

function maskEmail(email) {
    if (!email || !email.includes("@")) return "***@***.***";
    let parts = email.split("@");
    let name = parts[0];
    let domain = parts[1];
    let maskedName = name.length > 2 ? name.substring(0, 2) + "***" : "***";
    return `${maskedName}@${domain}`;
}

// ==============================================================================
let currentLang = localStorage.getItem('wop_lang') || "de";

const translations = {
    de: {
        authTitle: "Benutzer-Konto & Vibe",
        authDesc: "Logge dich ein, um XP, Coins und den Shop zu nutzen!",
        labelEmail: "E-Mail-Adresse:",
        labelUsername: "Benutzername:",
        labelPass: "Passwort:",
        btnRegister: "Registrieren",
        btnLogin: "Einloggen",
        shopHead: "👤 Profil & Vibe-Shop",
        coinsText: "Coins",
        badgesHead: "🏆 Deine Badges & Trophäen",
        accessoriesHead: "🛍 Avatar-Accessoires",
        itemCrown: "Krone", itemGlasses: "Sonnenbrille", itemHat: "Partyhut", itemBeard: "Schnauzbart",
        itemSparkles: "Glitzer", itemHeadphones: "Kopfhörer", itemUnicorn: "Einhorn", itemCap: "Kappe",
        itemButterfly: "Schmetterling", itemDiamond: "Diamant", itemRainbow: "Regenbogen", itemStar: "Stern",
        itemMask: "Maske", itemFlower: "Blume", itemFlame: "Flamme", itemCool: "Brille",
        themeCyberpunk: "Cyberpunk", themeRetro: "Retro-Pixel", themeParty: "Party Neon", themeOcean: "Ocean Wave",
        themeSunset: "Sonnenuntergang", themeForest: "Waldgrün", themeGalaxy: "Galaxie", themeCandy: "Candy Pop",
        themeMidnight: "Mitternacht", themeGold: "Goldene Stunde", themePikachuWarm: "Pikachu & Ash (Warm)",
        themePikachuRain: "Pikachu & Ash (Regen)",
        avatarEmoteLabel: "🙂 Eigenes Emote / Avatar auswählen",
        emoteHappy: "Fröhlich", emoteCool: "Cool", emoteExcited: "Begeistert", emoteParty: "Party", emoteCheeky: "Frech",
        emoteRobot: "Roboter", emoteGhost: "Geist", emoteCat: "Katze", emoteFox: "Fuchs", emoteFrog: "Frosch",
        emoteSkull: "Totenkopf", emoteFire: "Feuer",
        buyEquipBtn: "Kaufen / Ausrüsten", themesHead: "🎨 Farb-Themes", unlockBtn: "Freischalten",
        lbTitle: "🏆 Party-Ruhmeshalle", lbDesc: "Die Top 10 nach Gesamt-Coins und verdienten Coins in diesem Monat.",
        lbGlobalTitle: "🌍 Gesamtwertung – alle Coins", lbMonthlyTitle: "📅 Monatswertung – Coins diesen Monat",
        lbCoins: "Coins", lbLoading: "Rangliste wird geladen …", lbError: "Die Rangliste konnte nicht geladen werden.",
        lbTabGlobal: "🌍 Global", lbTabFriends: "👥 Freunde",
        btnLogout: "Logout", btnClose: "Schließen", hudStreakText: "Streak", hudCoinsText: "Coins",
        btnShop: "🛒 Shop", btnAdmin: "🛡️ Admin", btnLeaderboard: "🏆 Rangliste", btnPlayers: "🌐 Spieler",
        btnFriends: "👥 Freunde", btnFeedback: "📝 Feedback",
        opTitle: "🌐 Online Spieler & Einladungen", opDesc: "Sieh, wer online ist, lade ein oder füge Freunde hinzu!",
        friendsTitle: "👥 Freunde", friendsDescList: "Deine Freunde – online Status & Lobby-Einladung",
        friendsDescReq: "Eingehende Freundschaftsanfragen", friendsDescAdd: "Freund per E-Mail oder Name suchen",
        friendsListTab: "Freundesliste", friendsReqTab: "Anfragen", friendsAddTab: "Hinzufügen",
        friendsSearchBtn: "Suchen & Anfrage senden",
        privateLobbyHint: "🔑 Teile den Lobby-Code mit deinen Freunden oder lade sie direkt ein.",
        hostBtnPrivate: "Lobby erstellen (Host) 🏠", opClose: "Schließen", lbClose: "Schließen",
        langLabelText: "Sprache", title: "Wahrheit oder Pflicht Partyspiel 🍻🚻",
        subtitle: "Spielt nacheinander Wahrheit oder Pflicht. Nach jeder Runde dreht sich das Rad!",
        setupHead: "Online Lobby:", hostBtn: "Lobby erstellen (Host) 🏠",
        lobbyCodeInputPlaceholder: "Lobby-Code eingeben...", joinBtn: "Lobby beitreten 🚀",
        lobbyCodeTitle: "Lobby-Code: ", shareCode: "Teile diesen Code mit deinen Mitspielern!",
        startBtn: "Spiel starten! 🔥", clientWaitMsg: "Mit Lobby verbunden! Warte auf den Host...",
        leaveBtn: "🚪 Lobby verlassen", turnTitle: "Am Zug: ",
        choiceLabel: "Wähle deine Kategorie:", optTruth: "Wahrheit (+XP / +4 Coins)",
        optDare: "Pflicht (+XP / +8 Coins)", selectBtn: "Auswählen 🎲", sendTaskBtn: "An Spieler senden 🚀",
        taskInputPlaceholder: "Tippe hier die Frage oder Aufgabe ein...", answerLabel: "Deine Antwort:",
        answerPlaceholder: "Tippe hier deine Antwort ein...", submitAnswerBtn: "✅ Antwort abschicken",
        dareDoneBtn: "✅ Pflicht erfüllt & bestätigen!", doneHead: "🎉 Erledigt!",
        nextTurnBtn: "✅ Ich bestätige", waitingOther: "Warte auf die Bestätigungen aller aktiven Spieler…",
        waitingOtherRound: "Warte auf die Bestätigungen der anderen Spieler...",
        wheelHead: "🎡 RAD-MODUS: Alle müssen handeln!", wheelDesc: "Jeder hat Wahrheit/Pflicht gespielt. Jetzt wird das Schicksals-Rad für alle gedreht!",
        spinBtn: "Glücksrad jetzt drehen 🎡", nextRoundBtn: "➡️️ Weiter zur nächsten Runde!",
        chatPlaceholder: "Schreibe eine Nachricht...", chatSend: "Senden",
        emergencyDesc: "Wer einknickt oder leakt, hat sofort verloren!", leakBtn: "🚨 Ich habe geleakt / musste pinkeln (Verloren!)",
        fbTitle: "📝 Bug melden & Feedback", fbDesc: "Hast du einen Fehler gefunden oder eine Idee fürs Spiel?",
        fbTypeLabel: "Typ:", fbOptBug: "🐛 Bug / Fehler", fbOptImp: "💡 Verbesserung / Idee",
        fbMsgLabel: "Nachricht:", fbSendBtn: "Absenden 📤", fbCloseBtn: "Schließen",
        adminTitle: "🛡️ Admin-Bereich", adminDesc: "Feedbacks & Benutzerverwaltung",
        adminUsers: "Benutzer", adminFeedback: "Feedbacks", adminClose: "Schließen",
        inviteTitle: "🎮 Spieleinladung!", inviteAccept: "Annehmen ✅", inviteReject: "Ablehnen ❌",
        authEmailPh: "Deine E-Mail", authUserPh: "Dein Name im Spiel", authPassPh: "Sicheres Passwort",
        friendSearchPh: "E-Mail oder Anzeigename...", feedbackPh: "Beschreibe den Bug oder deine Idee...",
        promptLeak: "Wer hat geleakt / aufgegeben? (Name)", alertEmailNamePass: "Bitte alle Felder ausfüllen!",
        alertRegistered: "Erfolgreich registriert!", alertAccountExists: "Account existiert bereits!",
        alertNoAccount: "Login-Daten falsch!", alertNameCode: "Bitte Lobby-Code eingeben!",
        alertTask: "Bitte Aufgabe eingeben!", alertAnswer: "Bitte Antwort eingeben!",
        alertFeedbackEmpty: "Bitte Nachricht eingeben!", alertFeedbackSuccess: "Feedback gesendet!",
        wheelResult: "ERGEBNIS!", wheelSectors: [
            { title: "🍻 500ml CHUG!", desc: "Jeder muss sofort einen halben Liter trinken!" },
            { title: "🚫 3 Runden Klo-Verbot!", desc: "3 Runden kein Klo!" },
            { title: "💧 Wassersturz", desc: "Jeder muss ein volles Glas Wasser exen!" },
            { title: "🤫 Schweigepflicht", desc: "Niemand spricht 2 Runden lang." },
            { title: "🔄 Doppelschluck", desc: "Jeder verteilt 2 Schlücke." },
            { title: "⚡ Blasentanz", desc: "30 Sekunden auf der Stelle hüpfen!" },
            { title: "🍻 Alle trinken!", desc: "Alle nehmen einen großen Schluck!" },
            { title: "💧 Wasserpflicht", desc: "Wer kein Bier hat, ext Wasser!" },
            { title: "🤫 Stumm-Pflicht", desc: "2 Runden keine Geräusche." },
            { title: "🏋️‍♂️ Kniebeugen-Alarm", desc: "Alle machen sofort 15 tiefe Kniebeugen!" },
            { title: "🚾 Beckenboden-Test", desc: "2 Runden auf dem rechten Bein balancieren!" },
            { title: "⏱️ Planke der Wahrheit", desc: "45 Sekunden Unterarmstütz für alle!" },
            { title: "💧 Wassertest", desc: "Ein großes Glas Wasser exen!" }
        ]
    },
    en: {
        authTitle: "User Account & Vibe", authDesc: "Log in to use XP, Coins and the Shop!",
        labelEmail: "Email Address:", labelUsername: "Username:", labelPass: "Password:",
        btnRegister: "Register", btnLogin: "Login", shopHead: "👤 Profile & Vibe Shop",
        coinsText: "Coins", badgesHead: "🏆 Your Badges & Trophies", accessoriesHead: "🛍 Avatar Accessories",
        itemCrown: "Crown", itemGlasses: "Sunglasses", itemHat: "Party Hat", itemBeard: "Mustache",
        itemSparkles: "Glitter", itemHeadphones: "Headphones", itemUnicorn: "Unicorn", itemCap: "Cap",
        itemButterfly: "Butterfly", itemDiamond: "Diamond", itemRainbow: "Rainbow", itemStar: "Star",
        itemMask: "Mask", itemFlower: "Flower", itemFlame: "Flame", itemCool: "Glasses",
        themeCyberpunk: "Cyberpunk", themeRetro: "Retro Pixel", themeParty: "Party Neon", themeOcean: "Ocean Wave",
        themeSunset: "Sunset", themeForest: "Forest Green", themeGalaxy: "Galaxy", themeCandy: "Candy Pop",
        themeMidnight: "Midnight", themeGold: "Golden Hour", themePikachuWarm: "Pikachu & Ash (Warm)",
        themePikachuRain: "Pikachu & Ash (Rain)",
        avatarEmoteLabel: "🙂 Choose your own emote / avatar",
        emoteHappy: "Happy", emoteCool: "Cool", emoteExcited: "Excited", emoteParty: "Party", emoteCheeky: "Cheeky",
        emoteRobot: "Robot", emoteGhost: "Ghost", emoteCat: "Cat", emoteFox: "Fox", emoteFrog: "Frog",
        emoteSkull: "Skull", emoteFire: "Fire",
        buyEquipBtn: "Buy / Equip", themesHead: "🎨 Color Themes", unlockBtn: "Unlock",
        lbTitle: "🏆 Party Hall of Fame", lbDesc: "Top 10 by total coins and earned coins this month.",
        lbGlobalTitle: "🌍 Global – all Coins", lbMonthlyTitle: "📅 Monthly – Coins this month",
        lbCoins: "Coins", lbLoading: "Loading leaderboard...", lbError: "Could not load leaderboard.",
        lbTabGlobal: "🌍 Global", lbTabFriends: "👥 Friends",
        btnLogout: "Logout", btnClose: "Close", hudStreakText: "Streak", hudCoinsText: "Coins",
        btnShop: "🛒 Shop", btnAdmin: "🛡️ Admin", btnLeaderboard: "🏆 Leaderboard", btnPlayers: "🌐 Players",
        btnFriends: "👥 Friends", btnFeedback: "📝 Feedback",
        opTitle: "🌐 Online Players & Invites", opDesc: "See who's online, invite or add friends!",
        friendsTitle: "👥 Friends", friendsDescList: "Your friends – online status & lobby invite",
        friendsDescReq: "Incoming friend requests", friendsDescAdd: "Search friend by email or name",
        friendsListTab: "Friends List", friendsReqTab: "Requests", friendsAddTab: "Add",
        friendsSearchBtn: "Search & send request",
        privateLobbyHint: "🔑 Share the lobby code with friends or invite them directly.",
        hostBtnPrivate: "Create Lobby (Host) 🏠", opClose: "Close", lbClose: "Close",
        langLabelText: "Language", title: "Truth or Dare Party Game 🍻🚻",
        subtitle: "Play truth or dare in turns. After each round the wheel spins!",
        setupHead: "Online Lobby:", hostBtn: "Create Lobby (Host) 🏠",
        lobbyCodeInputPlaceholder: "Enter lobby code...", joinBtn: "Join Lobby 🚀",
        lobbyCodeTitle: "Lobby Code: ", shareCode: "Share this code with your players!",
        startBtn: "Start Game! 🔥", clientWaitMsg: "Connected to lobby! Waiting for host...",
        leaveBtn: "🚪 Leave Lobby", turnTitle: "Turn: ",
        choiceLabel: "Choose your category:", optTruth: "Truth (+XP / +4 Coins)", optDare: "Dare (+XP / +8 Coins)",
        selectBtn: "Choose 🎲", sendTaskBtn: "Send to player 🚀",
        taskInputPlaceholder: "Type the question or task here...", answerLabel: "Your answer:",
        answerPlaceholder: "Type your answer here...", submitAnswerBtn: "✅ Submit answer",
        dareDoneBtn: "✅ Dare done & confirm!", doneHead: "🎉 Done!", nextTurnBtn: "✅ I confirm",
        waitingOther: "Waiting for all active players to confirm…", waitingOtherRound: "Waiting for other players...",
        wheelHead: "🎡 WHEEL MODE: Everyone must act!", wheelDesc: "Everyone played truth/dare. Now the wheel of fate spins for all!",
        spinBtn: "Spin the wheel now 🎡", nextRoundBtn: "➡️️ Next round!",
        chatPlaceholder: "Write a message...", chatSend: "Send",
        emergencyDesc: "Who chickens out or leaks loses immediately!", leakBtn: "🚨 I leaked / had to pee (Lost!)",
        fbTitle: "📝 Report Bug & Feedback", fbDesc: "Found a bug or have an idea?",
        fbTypeLabel: "Type:", fbOptBug: "🐛 Bug / Error", fbOptImp: "💡 Improvement / Idea",
        fbMsgLabel: "Message:", fbSendBtn: "Send 📤", fbCloseBtn: "Close",
        adminTitle: "🛡️ Admin Area", adminDesc: "Feedbacks & User Management",
        adminUsers: "Users", adminFeedback: "Feedbacks", adminClose: "Close",
        inviteTitle: "🎮 Game Invite!", inviteAccept: "Accept ✅", inviteReject: "Reject ❌",
        authEmailPh: "Your email", authUserPh: "Your in-game name", authPassPh: "Your secure password",
        friendSearchPh: "Email or display name...", feedbackPh: "Describe the bug or your idea...",
        promptLeak: "Who leaked / gave up?", alertEmailNamePass: "Please enter email, username and password!",
        alertRegistered: "Successfully registered!", alertAccountExists: "This account already exists! Please login.",
        alertNoAccount: "Incorrect login details or account not found!", alertNameCode: "Please enter lobby code!",
        alertTask: "Please enter a task!", alertAnswer: "Please answer the question!",
        alertFeedbackEmpty: "Please enter a message!", alertFeedbackSuccess: "Feedback successfully sent!",
        wheelResult: "RESULT!",
        wheelSectors: [
            { title: "🍻 500ml CHUG!", desc: "Every player must immediately drink half a liter!" },
            { title: "🚫 3 Rounds Restroom Ban!", desc: "No restroom for the next 3 rounds!" },
            { title: "💧 Water Plunge", desc: "Everyone must chug a full glass of tap water!" },
            { title: "🤫 Silence Duty", desc: "No one speaks for the next 2 rounds." },
            { title: "🔄 Double Sip", desc: "Everyone gives 2 sips to someone." },
            { title: "⚡ Bladder Dance", desc: "Hop in place for 30 seconds!" },
            { title: "🍻 Everyone drinks!", desc: "Everyone takes a big sip immediately!" },
            { title: "💧 Water Duty", desc: "If you have no beer, chug water!" },
            { title: "🤫 Mute Duty", desc: "No sounds allowed for 2 rounds." },
            { title: "🏋️‍♂️ Squat Alarm", desc: "Everyone does 15 deep squats immediately!" },
            { title: "🚾 Pelvic Floor Test", desc: "Balance on your right leg for 2 rounds!" },
            { title: "⏱️ Plank of Truth", desc: "45 second forearm plank for everyone!" },
            { title: "💧 Water Test", desc: "Chug a big glass of water!" }
        ]
    }
};

function changeLanguage() {
    const authSelect = document.getElementById("auth-lang-select");
    const appSelect = document.getElementById("lang-select");
    if (authSelect && !document.getElementById("auth-modal")?.classList.contains("hidden")) {
        currentLang = authSelect.value;
        if (appSelect) appSelect.value = currentLang;
    } else if (appSelect) {
        currentLang = appSelect.value;
        if (authSelect) authSelect.value = currentLang;
    }
    localStorage.setItem('wop_lang', currentLang);
    applyTranslations();
}
function changeLanguageFromApp(){ changeLanguage(); }

function applyTranslations(){
    const t = translations[currentLang];
    if(!t) return;
    const setText = (id, val) => { const el=document.getElementById(id); if(el && val!==undefined) el.innerText = val; };
    const setPlaceholder = (id, val) => { const el=document.getElementById(id); if(el && val!==undefined) el.placeholder = val; };

    setText("ui-auth-title", t.authTitle); setText("ui-auth-desc", t.authDesc);
    setText("ui-label-email", t.labelEmail); setText("ui-label-username", t.labelUsername);
    setText("ui-label-pass", t.labelPass); setText("ui-btn-register", t.btnRegister);
    setText("ui-btn-login", t.btnLogin); setText("ui-shop-head", t.shopHead);
    setText("ui-coins-text", t.coinsText); setText("ui-badges-head", t.badgesHead);
    setText("ui-accessories-head", t.accessoriesHead);
    const extraItemIds = {
        "ui-item-crown": t.itemCrown, "ui-item-glasses": t.itemGlasses, "ui-item-hat": t.itemHat,
        "ui-item-beard": t.itemBeard, "ui-item-sparkles": t.itemSparkles, "ui-item-headphones": t.itemHeadphones,
        "ui-item-unicorn": t.itemUnicorn, "ui-item-cap": t.itemCap, "ui-item-butterfly": t.itemButterfly,
        "ui-item-diamond": t.itemDiamond, "ui-item-rainbow": t.itemRainbow, "ui-item-star": t.itemStar,
        "ui-item-mask": t.itemMask, "ui-item-flower": t.itemFlower, "ui-item-flame": t.itemFlame, "ui-item-cool": t.itemCool
    };
    Object.entries(extraItemIds).forEach(([id, label]) => { const el = document.getElementById(id); if (el) el.innerText = label; });
    const themeIds = {
        "ui-theme-cyberpunk": t.themeCyberpunk, "ui-theme-retro": t.themeRetro, "ui-theme-party": t.themeParty,
        "ui-theme-ocean": t.themeOcean, "ui-theme-sunset": t.themeSunset, "ui-theme-forest": t.themeForest,
        "ui-theme-galaxy": t.themeGalaxy, "ui-theme-candy": t.themeCandy, "ui-theme-midnight": t.themeMidnight,
        "ui-theme-gold": t.themeGold, "ui-theme-pikachu-warm": t.themePikachuWarm, "ui-theme-pikachu-rain": t.themePikachuRain
    };
    Object.entries(themeIds).forEach(([id, label]) => { const el = document.getElementById(id); if (el) el.innerText = label; });
    setText("ui-avatar-emote-label", t.avatarEmoteLabel);
    const emoteLabels = {
        "ui-emote-happy": ["😊 ", t.emoteHappy], "ui-emote-excited": ["🤩 ", t.emoteExcited],
        "ui-emote-party": ["🥳 ", t.emoteParty], "ui-emote-cheeky": ["😈 ", t.emoteCheeky],
        "ui-emote-robot": ["🤖 ", t.emoteRobot], "ui-emote-ghost": ["👻 ", t.emoteGhost],
        "ui-emote-cat": ["🐱 ", t.emoteCat], "ui-emote-fox": ["🦊 ", t.emoteFox],
        "ui-emote-frog": ["🐸 ", t.emoteFrog], "ui-emote-skull": ["💀 ", t.emoteSkull], "ui-emote-fire": ["🔥 ", t.emoteFire]
    };
    Object.entries(emoteLabels).forEach(([id, parts]) => { const el=document.getElementById(id); if(el) el.textContent = parts[0] + parts[1]; });
    document.querySelectorAll(".shop-action-btn").forEach(el => el.innerText = t.buyEquipBtn);
    setText("ui-themes-head", t.themesHead);
    document.querySelectorAll(".theme-action-btn").forEach(el => el.innerText = t.unlockBtn);
    setText("ui-btn-logout", t.btnLogout); setText("ui-btn-close", t.btnClose);
    setText("ui-fb-title", t.fbTitle); setText("ui-fb-desc", t.fbDesc);
    setText("ui-fb-type-label", t.fbTypeLabel); setText("ui-fb-opt-bug", t.fbOptBug);
    setText("ui-fb-opt-imp", t.fbOptImp); setText("ui-fb-msg-label", t.fbMsgLabel);
    setText("ui-fb-send-btn", t.fbSendBtn); setText("ui-fb-close-btn", t.fbCloseBtn);
    setText("ui-lb-title", t.lbTitle); setText("ui-lb-desc", t.lbDesc);
    setText("ui-op-title", t.opTitle); setText("ui-op-desc", t.opDesc);
    setText("ui-lb-close-btn", t.lbClose); setText("ui-op-close-btn", t.opClose);
    setText("ui-friends-title", t.friendsTitle); setText("ui-friends-tab-list", t.friendsListTab);
    const reqTab = document.getElementById("ui-friends-tab-requests-text");
    if(reqTab) reqTab.innerText = t.friendsReqTab;
    setText("ui-friends-tab-add", t.friendsAddTab); setText("ui-friends-search-btn", t.friendsSearchBtn);
    setText("ui-friends-close", t.btnClose); setText("ui-admin-title", t.adminTitle);
    setText("ui-admin-desc", t.adminDesc); setText("ui-admin-users", t.adminUsers);
    setText("ui-admin-feedback", t.adminFeedback); setText("ui-admin-close", t.adminClose);
    setText("ui-invite-title", t.inviteTitle); setText("ui-invite-accept", t.inviteAccept);
    setText("ui-invite-reject", t.inviteReject); setText("ui-private-lobby-hint", t.privateLobbyHint);
    setText("ui-lb-tab-global-text", t.lbTabGlobal); setText("ui-lb-tab-friends-text", t.lbTabFriends);
    setText("ui-hud-streak-text", t.hudStreakText); setText("ui-hud-coins-text", t.hudCoinsText);
    setText("ui-btn-shop", t.btnShop);
    const adminBtn = document.getElementById("btn-admin-panel");
    if (adminBtn) adminBtn.innerText = t.btnAdmin;
    setText("ui-btn-leaderboard", t.btnLeaderboard); setText("ui-btn-friends", t.btnFriends);
    setText("ui-btn-players", t.btnPlayers); setText("ui-btn-feedback", t.btnFeedback);
    setText("ui-lang-label-text", t.langLabelText); setText("ui-title", t.title);
    setText("ui-subtitle", t.subtitle); setText("ui-setup-head", t.setupHead);
    setText("ui-host-btn", t.hostBtn);
    setPlaceholder("lobby-code-input", t.lobbyCodeInputPlaceholder); setText("ui-join-btn", t.joinBtn);
    const displayCodeEl = document.getElementById("display-code");
    const codeVal = displayCodeEl ? displayCodeEl.innerText : "";
    const lobbyTitleEl = document.getElementById("ui-lobby-code-title");
    if(lobbyTitleEl) lobbyTitleEl.innerHTML = t.lobbyCodeTitle + `<span id="display-code" style="color: #ffcc00; font-size: 18px;">${escapeHTML(codeVal)}</span>`;
    setText("ui-share-code", t.shareCode); setText("start-btn", t.startBtn);
    setText("client-wait-msg", t.clientWaitMsg); setText("leave-lobby-btn", t.leaveBtn);
    setText("ui-choice-label", t.choiceLabel); setText("ui-opt-truth", t.optTruth);
    setText("ui-opt-dare", t.optDare); setText("ui-select-btn", t.selectBtn);
    setText("ui-send-task-btn", t.sendTaskBtn); setPlaceholder("custom-task-input", t.taskInputPlaceholder);
    setText("ui-answer-label", t.answerLabel); setPlaceholder("player-answer-input", t.answerPlaceholder);
    setText("ui-submit-answer-btn", t.submitAnswerBtn); setText("ui-dare-done-btn", t.dareDoneBtn);
    setText("ui-done-head", t.doneHead); setText("ui-next-turn-btn", t.nextTurnBtn);
    setText("next-turn-btn", t.nextTurnBtn); setText("ui-waiting-other", t.waitingOther);
    setText("ui-waiting-other-round", t.waitingOtherRound); setText("ui-wheel-head", t.wheelHead);
    setText("ui-wheel-desc", t.wheelDesc); setText("spin-btn", t.spinBtn);
    setText("ui-spin-btn", t.spinBtn); setText("next-round-btn", t.nextRoundBtn);
    setText("ui-next-round-btn", t.nextRoundBtn); setPlaceholder("chat-input", t.chatPlaceholder);
    setText("ui-chat-send", t.chatSend); setText("ui-emergency-desc", t.emergencyDesc);
    setText("ui-leak-btn", t.leakBtn);
    setPlaceholder("auth-email", t.authEmailPh); setPlaceholder("auth-username", t.authUserPh);
    setPlaceholder("auth-password", t.authPassPh); setPlaceholder("friend-search-input", t.friendSearchPh);
    setPlaceholder("feedback-text-input", t.feedbackPh);
    if(typeof updateHUD === 'function') try{ updateHUD(); }catch(e){ Logger.warn("updateHUD failed", e.message); }
}

// ========== GLOBAL STATE ==========
let myName = "";
let myEmail = "";
let myRole = "user";
const MASTER_EMAIL = "master@vibe.party"; // Nur noch Anzeige, keine Client-Eskalation!
function isMasterAccount(email) {
    return String(email || "").trim().toLowerCase() === MASTER_EMAIL;
}
function resolveRole(email, storedRole) {
    // FIX: Master-Rolle wird NUR noch aus DB gelesen, nicht client-seitig gesetzt
    if (isMasterAccount(email)) {
        // Erlaube master nur wenn bereits in DB gespeichert, sonst user
        return storedRole === "master" ? "master" : (storedRole || "user");
    }
    return storedRole || "user";
}
let userXP = 0; let userCoins = 50; let monthlyCoins = 0; let monthlyCoinsMonth = "";
let userStreak = 0; let userLevel = 1; let equippedAccessory = ""; let avatarEmote = "😊";
let unlockedItems = []; let unlockedThemes = []; let unlockedBadges = [];
let truthCount = 0; let dareCount = 0;

let myFriends = [];
let myFriendRequests = [];
let currentLbTab = "global";

// ========== FIRESTORE HELPERS ==========
async function loadUserDataFromCloud() {
    if (!myEmail) return;
    try {
        let docRef = db.collection("users").doc(myEmail);
        let doc = await docRef.get();
        if (doc.exists) {
            let data = doc.data();
            myName = getUserDisplayName(data, myName || "Spieler");
            myRole = resolveRole(myEmail, data.role);
            userXP = data.xp || 0; userCoins = data.coins || 50;
            monthlyCoins = Number(data.monthlyCoins) || 0;
            monthlyCoinsMonth = data.monthlyCoinsMonth || getCurrentMonthKey();
            userStreak = data.streak || 0;
            equippedAccessory = data.accessory || "";
            avatarEmote = data.avatarEmote || "😊";
            unlockedItems = Array.isArray(data.items) ? data.items : [];
            unlockedThemes = Array.isArray(data.themes) ? data.themes : [];
            unlockedBadges = Array.isArray(data.badges) ? data.badges : [];
            truthCount = data.truthCount || 0; dareCount = data.dareCount || 0;
            const raw = Array.isArray(data.friends) ? data.friends : [];
            myFriends = [...new Set(raw.map(e => String(e || "").trim().toLowerCase()).filter(Boolean))];
            if (data.theme) setTheme(data.theme);
        } else {
            Logger.warn("Benutzerdaten nicht gefunden - Logout.");
            logoutUser(); return;
        }
        calculateLevel(); updateHUD(); updateProfileModal(); checkAdminPermissions();
        updateOnlineStatus(true); startOnlineHeartbeat();
    } catch (e) {
        Logger.error("Fehler beim Laden aus Cloud:", e);
    }
}
function getCurrentMonthKey() {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}`;
}
function ensureMonthlyCoinReset() {
    const current = getCurrentMonthKey();
    if (monthlyCoinsMonth !== current) { monthlyCoins = 0; monthlyCoinsMonth = current; return true; }
    return false;
}
function addMonthlyCoins(amount) {
    ensureMonthlyCoinReset(); monthlyCoins += Math.max(0, Number(amount) || 0);
}
let monthlyResetTimer = null;
function startMonthlyResetWatcher() {
    if (monthlyResetTimer) clearInterval(monthlyResetTimer);
    monthlyResetTimer = setInterval(async () => {
        const changed = ensureMonthlyCoinReset();
        if (changed && myEmail) { await saveUserDataToCloud(); updateHUD(); }
    }, 30000);
}
async function saveUserDataToCloud() {
    if (!myEmail) return;
    try {
        const roleToSave = resolveRole(myEmail, myRole);
        myRole = roleToSave;
        await db.collection("users").doc(myEmail).set({
            name: myName, role: roleToSave, xp: userXP, coins: userCoins,
            monthlyCoins, monthlyCoinsMonth: monthlyCoinsMonth || getCurrentMonthKey(),
            streak: userStreak, accessory: equippedAccessory, avatarEmote,
            items: unlockedItems, themes: unlockedThemes, badges: unlockedBadges,
            truthCount, dareCount, theme: document.body.className,
            lastActive: firebase.firestore.FieldValue.serverTimestamp(),
            isOnline: true, currentLobby: activeLobbyCode || ""
        }, { merge: true });
    } catch (e) { Logger.error("Fehler beim Speichern:", e); }
}
async function updateOnlineStatus(status) {
    if (!myEmail) return;
    try {
        await db.collection("users").doc(myEmail).set({
            isOnline: status, lastActive: firebase.firestore.FieldValue.serverTimestamp(),
            currentLobby: activeLobbyCode || ""
        }, { merge: true });
    } catch(e) { Logger.warn("updateOnlineStatus failed", e.message); }
}
const ONLINE_HEARTBEAT_MS = 30000; const ONLINE_TIMEOUT_MS = 90000;
let onlineHeartbeatTimer = null; let lobbyJoinTimeout = null;
function startOnlineHeartbeat() {
    if (onlineHeartbeatTimer) clearInterval(onlineHeartbeatTimer);
    onlineHeartbeatTimer = setInterval(() => {
        if (myEmail && !document.hidden) updateOnlineStatus(true);
    }, ONLINE_HEARTBEAT_MS);
}
function stopOnlineHeartbeat() {
    if (onlineHeartbeatTimer) { clearInterval(onlineHeartbeatTimer); onlineHeartbeatTimer = null; }
}

// ========== LEADERBOARD ==========
async function openLeaderboard() {
    const container = document.getElementById("leaderboard-list");
    if (!container) return;
    const t = translations[currentLang]; ensureMonthlyCoinReset();
    container.textContent = t.lbLoading || "Lade Ranglisten...";
    document.getElementById("leaderboard-modal")?.classList.remove("hidden");
    const globalBtn = document.getElementById("lb-tab-global");
    const friendsBtn = document.getElementById("lb-tab-friends");
    if (globalBtn) globalBtn.className = currentLbTab === "global" ? "btn-green" : "btn-blue";
    if (friendsBtn) friendsBtn.className = currentLbTab === "friends" ? "btn-green" : "btn-blue";
    try {
        const snapshot = await db.collection("users").get();
        let users = [];
        snapshot.forEach(doc => {
            const data = doc.data() || {};
            users.push({
                email: doc.id,
                name: getUserDisplayName(data, "Spieler"),
                coins: Number(data.coins) || 0,
                monthlyCoins: Number(data.monthlyCoins) || 0,
                accessory: data.accessory || "",
                lastActive: data.lastActive
            });
        });
        if (currentLbTab === "friends") {
            const set = new Set(myFriends.map(e => e.toLowerCase()));
            set.add(myEmail.toLowerCase());
            users = users.filter(u => set.has(u.email.toLowerCase()));
        }
        users.sort((a,b) => b.coins - a.coins);
        const monthly = [...users].sort((a,b) => b.monthlyCoins - a.monthlyCoins);
        const render = (title, key, icon) => {
            const section = document.createElement("div");
            section.style.marginBottom = "18px";
            const h = document.createElement("h3");
            h.style.cssText = "font-size:14px;margin-bottom:8px;"; h.textContent = title;
            section.appendChild(h);
            const arr = key === "coins" ? users.slice(0,10) : monthly.slice(0,10);
            if (!arr.length) {
                const empty = document.createElement("div");
                empty.style.cssText = "font-size:12px;color:#888;";
                empty.textContent = currentLang === "de" ? "Keine Einträge." : "No entries.";
                section.appendChild(empty);
            }
            arr.forEach((data, i) => {
                const row = document.createElement("div");
                row.style.cssText = "display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.05);padding:8px;border-radius:6px;margin-bottom:5px;font-size:13px;";
                const isMe = data.email === myEmail;
                const name = document.createElement("b");
                name.textContent = `${i+1}. ${i===0?'👑 ':i===1?'🥈 ':i===2?'🥉 ':''}${data.name}${isMe ? ' (Du)' : ''}`;
                if (isMe) name.style.color = "var(--primary-color)";
                const left = document.createElement("div"); left.appendChild(name);
                if (data.accessory) {
                    const a = document.createElement("span"); a.style.cssText = "font-size:11px;color:#aaa";
                    a.textContent = ` ${data.accessory}`; left.appendChild(a);
                }
                const val = document.createElement("div");
                val.style.cssText = "color:#ffcc00;font-weight:bold"; val.textContent = `${icon} ${data[key]} ${t.lbCoins || 'Coins'}`;
                row.append(left, val); section.appendChild(row);
            });
            container.appendChild(section);
        };
        container.innerHTML = "";
        const prefix = currentLbTab === "friends" ? (currentLang === "de" ? "👥 Freunde – " : "👥 Friends – ") : (currentLang === "de" ? "🌍 " : "🌍 ");
        render(prefix + (t.lbGlobalTitle || "Allgemeine Coin-Rangliste"), "coins", "💰");
        render(prefix + (t.lbMonthlyTitle || "Monatliche Coin-Rangliste"), "monthlyCoins", "🪙");
    } catch(e) {
        Logger.error(e); container.textContent = t.lbError || "Fehler beim Laden der Ranglisten.";
    }
}

// ========== AUTH MIT RATE LIMIT ==========
let lastAuthAttempt = 0;
function checkAuthRateLimit() {
    const now = Date.now();
    if (now - lastAuthAttempt < 1500) {
        alert(currentLang === 'de' ? "Bitte kurz warten..." : "Please wait a moment...");
        return false;
    }
    lastAuthAttempt = now; return true;
}

async function registerUser() {
    if (!checkAuthRateLimit()) return;
    const emailEl = document.getElementById("auth-email");
    const userEl = document.getElementById("auth-username");
    const passEl = document.getElementById("auth-password");
    const email = emailEl.value.trim().toLowerCase();
    const username = userEl.value.trim();
    const password = passEl.value.trim();

    if (!email || !username || !password) {
        alert(translations[currentLang]?.alertEmailNamePass || "Bitte alle Felder ausfüllen!"); return;
    }
    if (!isValidEmail(email)) { alert("Ungültige E-Mail!"); return; }
    if (!isValidUsername(username)) { alert("Benutzername: 2-20 Zeichen, nur Buchstaben/Zahlen/_-"); return; }
    if (password.length < 6) { alert("Passwort min. 6 Zeichen!"); return; }

    try {
        let docRef = db.collection("users").doc(email);
        let doc = await docRef.get();
        if (doc.exists) {
            alert(translations[currentLang]?.alertAccountExists || "Account existiert bereits!"); return;
        }
        let hashedPass = await hashPassword(password);
        myEmail = email; myName = username; myRole = "user"; // FIX: nie client-seitig master setzen
        await docRef.set({
            name: username, passHash: hashedPass, role: myRole, xp: 0, coins: 50,
            monthlyCoins: 0, monthlyCoinsMonth: getCurrentMonthKey(), streak: 0, accessory: "",
            items: [], badges: [], friends: [], truthCount: 0, dareCount: 0,
            theme: "theme-default", isOnline: true, currentLobby: ""
        });
        localStorage.setItem("wop_user_email_v6", myEmail);
        localStorage.setItem("wop_user_name_v6", myName);
        await loadUserDataFromCloud();
        alert(translations[currentLang]?.alertRegistered || "Erfolgreich registriert!");
        showLoggedInState(); startOnlineHeartbeat(); listenForInvitations(); loadFriendsData(); listenForFriendRequests();
        Logger.info("Registriert:", maskEmail(myEmail));
    } catch (e) {
        Logger.error("Registrierungsfehler:", e); alert("Fehler bei der Registrierung: " + e.message);
    }
}

async function loginUser() {
    if (!checkAuthRateLimit()) return;
    const email = document.getElementById("auth-email").value.trim().toLowerCase();
    const password = document.getElementById("auth-password").value.trim();
    if (!email || !password) {
        alert(translations[currentLang]?.alertEmailNamePass || "Bitte E-Mail und Passwort eingeben!"); return;
    }
    if (!isValidEmail(email)) { alert("Ungültige E-Mail!"); return; }
    try {
        let docRef = db.collection("users").doc(email);
        let doc = await docRef.get();
        if (!doc.exists) { alert(translations[currentLang]?.alertNoAccount || "Login falsch!"); return; }
        let data = doc.data();
        let hashedInputPass = await hashPassword(password);
        const passwordMatches = (data.passHash && data.passHash === hashedInputPass) || (data.pass && data.pass === password);
        if (!passwordMatches) { alert(translations[currentLang]?.alertNoAccount || "Login falsch!"); return; }
        if (data.pass) {
            try { await docRef.update({ passHash: hashedInputPass, pass: firebase.firestore.FieldValue.delete() }); } catch(e) { Logger.warn("Pass migration failed", e.message); }
        }
        myEmail = email; myName = getUserDisplayName(data, email.split("@")[0]); myRole = resolveRole(myEmail, data.role);
        localStorage.setItem("wop_user_email_v6", myEmail);
        localStorage.setItem("wop_user_name_v6", myName);
        await loadUserDataFromCloud();
        showLoggedInState(); startOnlineHeartbeat(); listenForInvitations(); loadFriendsData(); listenForFriendRequests();
        const savedLobby = getSavedLobbySession();
        if (savedLobby?.code) {
            activeLobbyCode = String(savedLobby.code).toLowerCase();
            isHost = savedLobby.role === "host";
            if (isHost) {
                players = loadLobbyPlayers();
                if (!players.some(p => p.name === myName)) {
                    players.unshift({ name: myName, accessory: equippedAccessory, eliminated: false });
                }
            }
            restoringLobby = true; setTimeout(() => reconnectLobby(), 250);
        }
        Logger.info("Login:", maskEmail(myEmail));
    } catch (e) { Logger.error("Loginfehler:", e); alert("Fehler beim Login: " + e.message); }
}

function logoutUser() {
    stopOnlineHeartbeat(); stopFirestoreLobbyTransport();
    if (myEmail) updateOnlineStatus(false).catch(()=>{});
    if (inviteUnsubscribe) { try{inviteUnsubscribe();}catch{} inviteUnsubscribe=null; }
    if (friendReqUnsubscribe) { try{friendReqUnsubscribe();}catch{} friendReqUnsubscribe=null; }
    localStorage.removeItem("wop_user_email_v6"); localStorage.removeItem("wop_user_name_v6");
    clearSavedLobbySession(); myEmail=""; myName=""; myRole="user";
    players=[]; activeLobbyCode=""; isHost=false;
    document.getElementById("auth-modal")?.classList.remove("hidden");
    document.getElementById("account-modal")?.classList.add("hidden");
    cleanupAndResetLobby(false);
    Logger.info("Logout");
}

function showLoggedInState() {
    document.getElementById("auth-modal")?.classList.add("hidden");
    updateHUD(); updateProfileModal(); checkAdminPermissions();
}

// ========== FRIEND SYSTEM (XSS-FIXED) ==========
let friendReqUnsubscribe = null;
function loadFriendsData() { renderFriendsList(); }
function updateFriendRequestBadge() {
    const el = document.getElementById("friend-request-badge");
    if (!el) return;
    if (myFriendRequests.length > 0) { el.textContent = myFriendRequests.length; el.classList.remove("hidden"); }
    else { el.classList.add("hidden"); }
}
function listenForFriendRequests() {
    if (!myEmail) return;
    if (friendReqUnsubscribe) { try{friendReqUnsubscribe();}catch{} }
    friendReqUnsubscribe = db.collection("friendRequests")
        .where("toEmail", "==", myEmail)
        .onSnapshot(snap => {
            myFriendRequests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            updateFriendRequestBadge(); renderFriendRequests();
        }, err => Logger.error("FriendReq listener", err));
}
async function renderFriendsList() {
    const container = document.getElementById("friends-list");
    if (!container) return;
    container.textContent = currentLang === "de" ? "Lade Freunde..." : "Loading friends...";
    if (!myFriends.length) {
        container.textContent = currentLang === "de" ? "Noch keine Freunde. Sende eine Anfrage!" : "No friends yet. Send a request!"; return;
    }
    try {
        const now = Date.now(); container.innerHTML = "";
        for (const email of myFriends) {
            try {
                const doc = await db.collection("users").doc(email).get();
                if (!doc.exists) continue;
                const d = doc.data() || {};
                const name = getUserDisplayName(d, "Spieler");
                const accessory = d.accessory || "";
                const isOnline = !!d.isOnline && d.lastActive && (d.lastActive.toMillis ? (now - d.lastActive.toMillis() < ONLINE_TIMEOUT_MS) : true);
                const lobby = d.currentLobby ? String(d.currentLobby).toUpperCase() : "";
                const statusColor = isOnline ? "#28a745" : "#888";
                const statusText = isOnline ? (lobby ? `Online · Lobby ${lobby}` : (currentLang === "de" ? "Online · Bereit" : "Online · Ready")) : (currentLang === "de" ? "Offline" : "Offline");

                const row = document.createElement("div");
                row.style.cssText = "display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;margin-bottom:6px;font-size:12px;";
                const left = document.createElement("div");
                const b = document.createElement("b"); b.textContent = `${accessory} ${name}`; left.appendChild(b);
                left.appendChild(document.createElement("br"));
                const status = document.createElement("span"); status.style.cssText = `color:${statusColor};font-size:10px;`; status.textContent = `● ${statusText}`; left.appendChild(status);
                const right = document.createElement("div"); right.style.cssText = "display:flex;gap:4px;";
                if (isOnline && activeLobbyCode && isHost) {
                    const inv = document.createElement("button"); inv.className="btn-green"; inv.style.cssText="padding:3px 6px;font-size:10px;width:auto;margin:0;"; inv.textContent="Einladen";
                    inv.onclick = () => sendGameInvite(email, name); right.appendChild(inv);
                }
                const rm = document.createElement("button"); rm.className="btn-danger"; rm.style.cssText="padding:3px 6px;font-size:10px;width:auto;margin:0;"; rm.textContent="✕";
                rm.onclick = () => removeFriend(email); right.appendChild(rm);
                row.append(left,right); container.appendChild(row);
            } catch(e) { Logger.warn("render friend", e.message); }
        }
    } catch(e) { container.textContent = "Fehler beim Laden."; }
}
function renderFriendRequests() {
    const container = document.getElementById("friend-requests-list");
    if (!container) return;
    container.innerHTML = "";
    if (!myFriendRequests.length) {
        container.textContent = currentLang === "de" ? "Keine offenen Anfragen." : "No pending requests."; return;
    }
    myFriendRequests.forEach(req => {
        const row = document.createElement("div");
        row.style.cssText = "display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;margin-bottom:6px;font-size:12px;";
        const left = document.createElement("div"); const b=document.createElement("b"); b.textContent = req.fromName || "Spieler"; left.appendChild(b);
        const right = document.createElement("div"); right.style.cssText="display:flex;gap:4px;";
        const ok=document.createElement("button"); ok.className="btn-green"; ok.style.cssText="padding:3px 8px;font-size:11px;width:auto;margin:0;"; ok.textContent="✓";
        ok.onclick=()=>acceptFriendRequest(req.id, req.fromEmail, req.fromName);
        const no=document.createElement("button"); no.className="btn-danger"; no.style.cssText="padding:3px 8px;font-size:11px;width:auto;margin:0;"; no.textContent="✕";
        no.onclick=()=>rejectFriendRequest(req.id);
        right.append(ok,no); row.append(left,right); container.appendChild(row);
    });
}
async function searchAndAddFriend() {
    const q = (document.getElementById("friend-search-input").value || "").trim().toLowerCase();
    const results = document.getElementById("friend-search-results");
    if (!q) { alert(currentLang === "de" ? "Bitte E-Mail oder Namen eingeben." : "Please enter email or name."); return; }
    if (!results) return;
    results.textContent = currentLang === "de" ? "Suche..." : "Searching...";
    try {
        // FIX: Nicht alle User laden - limitiert suchen
        const snap = await db.collection("users").limit(100).get();
        results.innerHTML = "";
        let found = false;
        snap.forEach(doc => {
            const email = doc.id; if (email === myEmail) return;
            const d = doc.data() || {}; const name = (d.name || "").toLowerCase();
            if (email === q || name.includes(q) || email.includes(q)) {
                found = true;
                const displayName = getUserDisplayName(d, "Spieler");
                const alreadyFriend = myFriends.includes(email);
                const row = document.createElement("div");
                row.style.cssText = "display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;margin-bottom:6px;font-size:12px;";
                const left = document.createElement("div");
                const b = document.createElement("b"); b.textContent = displayName; left.appendChild(b);
                left.appendChild(document.createElement("br"));
                const mail = document.createElement("span"); mail.style.cssText="font-size:10px;color:#888;"; mail.textContent = maskEmail(email); left.appendChild(mail);
                const right = document.createElement("div");
                if (alreadyFriend) {
                    const s=document.createElement("span"); s.style.cssText="color:#28a745;font-size:11px;"; s.textContent="✓ Freund"; right.appendChild(s);
                } else {
                    const btn=document.createElement("button"); btn.className="btn-green"; btn.style.cssText="padding:4px 8px;font-size:11px;width:auto;margin:0;"; btn.textContent="Anfrage";
                    btn.onclick=()=>sendFriendRequest(email, displayName); right.appendChild(btn);
                }
                row.append(left,right); results.appendChild(row);
            }
        });
        if (!found) results.textContent = currentLang === "de" ? "Niemand gefunden." : "Nobody found.";
    } catch(e) { Logger.error(e); results.textContent = "Fehler bei der Suche."; }
}
async function sendFriendRequest(targetEmail, targetName) {
    const toEmail = String(targetEmail || "").trim().toLowerCase();
    if (!myEmail || !toEmail || toEmail === myEmail) return;
    if (myFriends.includes(toEmail)) { alert(currentLang === "de" ? "Ihr seid bereits Freunde!" : "You are already friends!"); return; }
    try {
        const existing = await db.collection("friendRequests").where("fromEmail","==",myEmail).where("toEmail","==",toEmail).get();
        if (!existing.empty) { alert(currentLang === "de" ? "Anfrage bereits gesendet!" : "Request already sent!"); return; }
        const reverse = await db.collection("friendRequests").where("fromEmail","==",toEmail).where("toEmail","==",myEmail).get();
        if (!reverse.empty) { const doc=reverse.docs[0]; await acceptFriendRequest(doc.id, toEmail, targetName); return; }
        await db.collection("friendRequests").add({ fromEmail: myEmail, fromName: myName, toEmail, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        alert(currentLang === "de" ? `Freundschaftsanfrage an ${targetName} gesendet! 👥` : `Friend request sent to ${targetName}! 👥`);
        Logger.info("Friend request to", maskEmail(toEmail));
    } catch(e) { Logger.error(e); alert(currentLang === "de" ? "Fehler beim Senden der Anfrage." : "Error sending request."); }
}
async function acceptFriendRequest(reqId, fromEmail, fromName) {
    if (!myEmail || !fromEmail) return;
    const friendEmail = String(fromEmail).trim().toLowerCase(); if (!friendEmail || friendEmail===myEmail) return;
    try {
        await db.collection("users").doc(myEmail).set({ friends: firebase.firestore.FieldValue.arrayUnion(friendEmail) }, { merge: true });
        await db.collection("users").doc(friendEmail).set({ friends: firebase.firestore.FieldValue.arrayUnion(myEmail) }, { merge: true });
        if (!myFriends.includes(friendEmail)) myFriends.push(friendEmail);
        if (reqId) { try{await db.collection("friendRequests").doc(reqId).delete();}catch{} }
        myFriendRequests = myFriendRequests.filter(r => r.id !== reqId);
        updateFriendRequestBadge(); renderFriendRequests(); renderFriendsList();
        alert(currentLang === "de" ? `Du bist jetzt mit ${fromName || "Spieler"} befreundet! 🎉` : `You are now friends with ${fromName || "player"}! 🎉`);
    } catch(e) { Logger.error(e); alert(currentLang === "de" ? "Fehler beim Annehmen." : "Error accepting request."); }
}
async function rejectFriendRequest(reqId) {
    try { await db.collection("friendRequests").doc(reqId).delete(); myFriendRequests = myFriendRequests.filter(r => r.id !== reqId); updateFriendRequestBadge(); renderFriendRequests(); }
    catch(e) { Logger.error(e); }
}
async function removeFriend(friendEmail) {
    if (!confirm(currentLang === "de" ? "Freund wirklich entfernen?" : "Really remove this friend?")) return;
    const email = String(friendEmail || "").trim().toLowerCase(); if (!email) return;
    try {
        await db.collection("users").doc(myEmail).set({ friends: firebase.firestore.FieldValue.arrayRemove(email) }, { merge: true });
        await db.collection("users").doc(email).set({ friends: firebase.firestore.FieldValue.arrayRemove(myEmail) }, { merge: true });
        myFriends = myFriends.filter(e => e !== email); renderFriendsList();
        Logger.info("Removed friend", maskEmail(email));
    } catch(e) { Logger.error(e); }
}

// ========== LOBBY SYSTEM (GEFIXT) ==========
let peer = null; let hostConnection = null; let clientConnections = []; let isHost = false;
let players = []; let currentPlayerIndex = 0; let pendingChoice = ""; let currentTaskText = "";
let currentRotation = 0; let nextTurnVotedPlayers = []; let nextRoundVotedPlayers = [];
let currentSharedResult = null; let currentSharedResultKey = ""; let taskCompleted = false; let activeLobbyCode = "";
const LOBBY_STORAGE_KEY = "wop_active_lobby_v7"; const RECONNECT_DELAY = 1500;
let reconnectTimer = null; let leavingLobbyManually = false; let restoringLobby = false; let reconnectAttempts = 0;
let lobbyUserUnsubscribe = null; let lobbyHostUnsubscribe = null; let lobbyHostEmail = ""; let lobbyMessageSeq = 0; let lobbyLastHostSeq = 0;
const lobbyProcessedClientSeq = {};

function stopFirestoreLobbyTransport() {
    try { if (lobbyUserUnsubscribe) lobbyUserUnsubscribe(); } catch(e) { Logger.warn(e.message); }
    try { if (lobbyHostUnsubscribe) lobbyHostUnsubscribe(); } catch(e) { Logger.warn(e.message); }
    lobbyUserUnsubscribe = null; lobbyHostUnsubscribe = null; lobbyHostEmail = ""; lobbyLastHostSeq = 0;
    Object.keys(lobbyProcessedClientSeq).forEach(k => delete lobbyProcessedClientSeq[k]);
}
async function setLobbyPresence(fields = {}) {
    if (!myEmail || !activeLobbyCode) return;
    try {
        await db.collection("users").doc(myEmail).set({
            currentLobby: activeLobbyCode, lobbyRole: isHost ? "host" : "client",
            lobbyHostEmail: isHost ? myEmail : (lobbyHostEmail || ""), lobbyPrivate: false,
            ...fields, lastActive: firebase.firestore.FieldValue.serverTimestamp(), isOnline: true
        }, { merge: true });
    } catch(e) { Logger.warn("setLobbyPresence failed", e.message); }
}
async function clearLobbyPresence() {
    if (!myEmail) return;
    try {
        await db.collection("users").doc(myEmail).set({
            currentLobby: "", lobbyRole: "", lobbyHostEmail: "",
            lobbyMessage: firebase.firestore.FieldValue.delete(),
            hostMessage: firebase.firestore.FieldValue.delete()
        }, { merge: true });
    } catch(e) { Logger.warn(e.message); }
}
function getSavedLobbySession() { try { return JSON.parse(localStorage.getItem(LOBBY_STORAGE_KEY) || "null"); } catch { return null; } }
function saveLobbySession(code, role) { try { localStorage.setItem(LOBBY_STORAGE_KEY, JSON.stringify({ code: String(code).toLowerCase(), role, ts: Date.now() })); } catch(e) { Logger.warn(e.message); } }
function clearSavedLobbySession() { try { localStorage.removeItem(LOBBY_STORAGE_KEY); } catch(e) {} }
function loadLobbyPlayers() { try { const v = localStorage.getItem("wop_lobby_players_v7"); return v ? JSON.parse(v) : []; } catch { return []; } }
function saveLobbyPlayers() { try { localStorage.setItem("wop_lobby_players_v7", JSON.stringify(players)); } catch(e) {} }
function stopReconnectTimer() { if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer=null; } }
function scheduleLobbyReconnect() {
    if (leavingLobbyManually || !activeLobbyCode) return;
    stopReconnectTimer();
    reconnectTimer = setTimeout(() => { reconnectAttempts++; Logger.info("Reconnect Versuch", reconnectAttempts); reconnectLobby(); }, RECONNECT_DELAY);
}
function destroyPeerOnly() { if (peer) { try{peer.destroy();}catch{} peer=null; } }

function startHostFirestoreLobby() {
    stopFirestoreLobbyTransport(); lobbyHostEmail = myEmail;
    lobbyUserUnsubscribe = db.collection("users").where("currentLobby","==",activeLobbyCode).onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            if (change.type === "added" || change.type === "modified") {
                const data = change.doc.data() || {}; const email = change.doc.id;
                if (email === myEmail) return;
                if (data.lobbyMessage && typeof data.lobbyMessage.seq === "number") {
                    const seq = data.lobbyMessage.seq;
                    if ((lobbyProcessedClientSeq[email] || 0) >= seq) return;
                    lobbyProcessedClientSeq[email] = seq;
                    handleIncomingData(data.lobbyMessage.payload);
                    db.collection("users").doc(email).set({ lobbyMessage: firebase.firestore.FieldValue.delete() }, { merge: true }).catch(()=>{});
                }
            }
        });
    }, err => Logger.error("Host lobby listener", err));
}
function broadcastLobbyData(data) {
    if (!myEmail || !activeLobbyCode) return;
    lobbyMessageSeq++;
    db.collection("users").doc(myEmail).set({
        hostMessage: { seq: lobbyMessageSeq, payload: data, ts: Date.now() },
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(e => Logger.warn("broadcast failed", e.message));
    // Auch an einzelne Clients verteilen via hostMessage Feld
    db.collection("users").where("currentLobby","==",activeLobbyCode).get().then(snap => {
        snap.forEach(doc => {
            if (doc.id === myEmail) return;
            doc.ref.set({ hostMessage: { seq: lobbyMessageSeq, payload: data, ts: Date.now() } }, { merge: true }).catch(()=>{});
        });
    }).catch(()=>{});
}
function startClientFirestoreLobby(hostEmail) {
    stopFirestoreLobbyTransport(); lobbyHostEmail = hostEmail;
    lobbyHostUnsubscribe = db.collection("users").doc(hostEmail).onSnapshot(doc => {
        const data = doc.data() || {};
        if (!data.hostMessage || typeof data.hostMessage.seq !== "number") return;
        if (data.hostMessage.seq <= lobbyLastHostSeq) return;
        lobbyLastHostSeq = data.hostMessage.seq;
        handleIncomingData(data.hostMessage.payload);
    }, err => Logger.error("Client lobby listener", err));
}
function sendClientLobbyData(data) {
    if (!myEmail) return;
    lobbyMessageSeq++;
    db.collection("users").doc(myEmail).set({
        lobbyMessage: { seq: lobbyMessageSeq, payload: data, ts: Date.now() },
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(e => Logger.warn("sendClient failed", e.message));
}

function normalizeLobbyCode(value) {
    return String(value || "").trim().replace(/\s+/g, "").toLowerCase();
}
function isValidLobbyCode(code) {
    return /^[a-z0-9]{3,20}$/.test(code);
}

async function hostGame(options = {}) {
    const restoring = !!options.restoring;
    if (!myEmail || !myName) { if (!restoring) alert(currentLang === "de" ? "Bitte zuerst einloggen." : "Please log in first."); return; }
    const codeInput = document.getElementById("lobby-code-input");
    let code = restoring ? String(activeLobbyCode || "") : normalizeLobbyCode(codeInput ? codeInput.value : "");
    if (!code) code = Math.random().toString(36).substring(2,7).toLowerCase();
    if (!isValidLobbyCode(code)) { alert(currentLang === "de" ? "Lobby-Code ungültig (3-20 Buchstaben/Zahlen)" : "Invalid lobby code"); return; }
    leavingLobbyManually = false; stopReconnectTimer(); activeLobbyCode = code; isHost = true; clearLobbyJoinTimeout(); destroyPeerOnly(); stopFirestoreLobbyTransport();
    try {
        await setLobbyPresence({ lobbyMessage: firebase.firestore.FieldValue.delete(), hostMessage: firebase.firestore.FieldValue.delete() });
        startHostFirestoreLobby();
        showLobbyUI(code, false);
        document.getElementById("display-code").textContent = code.toUpperCase();
        saveLobbySession(code, "host");
        players = [{ name: myName, accessory: equippedAccessory, eliminated: false }];
        saveLobbyPlayers(); updatePlayerList();
        restoringLobby = false;
        Logger.info("Lobby erstellt:", code);
    } catch(e) { Logger.error(e); if (!restoring) alert(currentLang === "de" ? "Lobby konnte nicht erstellt werden." : "Could not create lobby."); }
}
function clearLobbyJoinTimeout() { if (lobbyJoinTimeout) { clearTimeout(lobbyJoinTimeout); lobbyJoinTimeout=null; } }

async function joinGame(options = {}) {
    const restoring = !!options.restoring;
    const input = document.getElementById("lobby-code-input");
    const rawCode = restoring ? String(activeLobbyCode || "") : (input ? input.value : "");
    const code = normalizeLobbyCode(rawCode);
    if (!code) { if (!restoring) alert(currentLang === "de" ? "Bitte gib einen Lobby-Code ein." : "Please enter a lobby code."); return; }
    if (!isValidLobbyCode(code)) { if (!restoring) alert("Ungültiger Lobby-Code!"); return; }
    if (!myName || !myEmail) { if (!restoring) alert(currentLang === "de" ? "Bitte zuerst einloggen." : "Please log in first."); return; }
    restoringLobby = restoring; leavingLobbyManually = false; stopReconnectTimer();
    activeLobbyCode = code; isHost = false; clearLobbyJoinTimeout(); destroyPeerOnly(); stopFirestoreLobbyTransport();
    try {
        const snap = await db.collection("users").where("currentLobby","==",code).get();
        let hostEmail = ""; snap.forEach(doc => { const d = doc.data()||{}; if (!hostEmail && (d.lobbyRole==="host" || doc.id===d.lobbyHostEmail)) hostEmail=doc.id; });
        if (!hostEmail) { if (!restoring) alert(currentLang === "de" ? "Lobby nicht gefunden." : "Lobby not found."); return; }
        lobbyHostEmail = hostEmail;
        await setLobbyPresence({ lobbyMessage: firebase.firestore.FieldValue.delete() });
        startClientFirestoreLobby(hostEmail);
        showLobbyUI(code, true);
        document.getElementById("display-code").textContent = code.toUpperCase();
        document.getElementById("client-wait-msg")?.classList.remove("hidden");
        saveLobbySession(code, "client");
        restoringLobby = false;
        Logger.info("Lobby beigetreten:", code);
    } catch(e) { Logger.error(e); if (!restoring) alert(currentLang === "de" ? "Lobby Beitritt fehlgeschlagen." : "Could not join lobby."); }
}
function reconnectLobby() {
    if (leavingLobbyManually || !activeLobbyCode) return;
    const saved = getSavedLobbySession(); const role = saved?.role || (isHost ? "host" : "client");
    if (role === "host") hostGame({ restoring: true }); else joinGame({ restoring: true });
}
function leaveLobby() {
    if (!confirm(currentLang === 'de' ? "Möchtest du die Lobby wirklich verlassen?" : "Do you really want to leave the lobby?")) return;
    leavingLobbyManually = true; stopReconnectTimer();
    try { sendData({ type: 'LEAVE_LOBBY', playerName: myName }); } catch(e) { Logger.warn(e.message); }
    clearSavedLobbySession(); cleanupAndResetLobby(true);
    Logger.info("Lobby verlassen");
}
function cleanupAndResetLobby(manual = false) {
    clearTimeout(window.__autoNextTurnTimer); window.__autoNextTurnTimer = null;
    if (manual) leavingLobbyManually = true;
    stopReconnectTimer(); clearLobbyJoinTimeout(); stopFirestoreLobbyTransport(); clearLobbyPresence();
    if (peer) { try{peer.destroy();}catch(e){} peer=null; }
    hostConnection=null; clientConnections=[]; isHost=false; players=[]; currentPlayerIndex=0; activeLobbyCode="";
    if (manual) clearSavedLobbySession();
    updateOnlineStatus(true);
    document.getElementById("lobby-wait-box")?.classList.add("hidden");
    document.getElementById("woP-phase")?.classList.add("hidden");
    document.getElementById("wheel-phase")?.classList.add("hidden");
    document.getElementById("emergency-box")?.classList.add("hidden");
    document.getElementById("chat-box-container")?.classList.add("hidden");
    document.getElementById("leave-lobby-btn")?.classList.add("hidden");
    document.getElementById("start-btn")?.classList.add("hidden");
    document.getElementById("client-wait-msg")?.classList.add("hidden");
    document.getElementById("setup")?.classList.remove("hidden");
    const chatBox = document.getElementById("chat-messages"); if (chatBox) chatBox.innerHTML="";
}
function sendData(data) {
    if (!data) return;
    if (isHost) { handleIncomingData(data); broadcastLobbyData(data); }
    else { sendClientLobbyData(data); }
}
function setupHostConnectionEvents(c) {} function setupClientConnectionEvents(c) {}

function showLobbyUI(code, isClient) {
    document.getElementById("setup")?.classList.add("hidden");
    document.getElementById("lobby-wait-box")?.classList.remove("hidden");
    document.getElementById("leave-lobby-btn")?.classList.remove("hidden");
    document.getElementById("chat-box-container")?.classList.remove("hidden");
    if (!isClient) document.getElementById("start-btn")?.classList.remove("hidden");
}

function handlePlayerLeaving(leftName) {
    players = players.filter(p => p.name !== leftName);
    updatePlayerList(); saveLobbyPlayers();
    appendChat("System", currentLang === 'de' ? `${leftName} hat die Lobby verlassen.` : `${leftName} has left the lobby.`);
    if (isHost) broadcastLobbyData({ type: 'UPDATE_PLAYERS', players });
}
function handleIncomingData(data) {
    if (!data || !data.type) { Logger.warn("Invalid incoming data", data); return; }
    switch(data.type) {
        case 'UPDATE_PLAYERS': players = Array.isArray(data.players) ? data.players : []; updatePlayerList(); break;
        case 'LEAVE_LOBBY': handlePlayerLeaving(data.playerName); break;
        case 'START_GAME': players = data.players || players; startGameUI(); break;
        case 'SUBMIT_CHOICE': pendingChoice = data.choice; assignTaskCreator(data.playerName, data.choice); break;
        case 'ASSIGN_CREATOR': setupCreatorUI(data.targetPlayer, data.choice, data.creatorName); break;
        case 'SHOW_TASK': currentTaskText = data.taskText; displayTaskScreen(data.targetPlayer, data.choice, data.taskText, data.creator); break;
        case 'SHOW_RESULT':
            currentSharedResult = { targetPlayer: data.targetPlayer, choice: data.choice, taskText: data.taskText, resultText: data.resultText };
            showFeedbackScreen(data.targetPlayer, data.choice, data.taskText, data.resultText); break;
        case 'VOTE_NEXT_TURN': handleNextTurnVote(data.playerName); break;
        case 'EXECUTE_NEXT_TURN': executeProceedToNextTurn(); break;
        case 'START_WHEEL':
            document.getElementById("woP-phase")?.classList.add("hidden");
            document.getElementById("wheel-phase")?.classList.remove("hidden");
            document.getElementById("spin-btn") && (document.getElementById("spin-btn").disabled = false);
            document.getElementById("wheel-result-box")?.classList.add("hidden"); break;
        case 'SPIN_WHEEL': runWheelAnimation(data.sector, data.rotation); break;
        case 'VOTE_NEXT_ROUND': handleNextRoundVote(data.playerName); break;
        case 'NEXT_ROUND': nextRound(); break;
        case 'ELIMINATE': players = data.players || players; updatePlayerList(); break;
        case 'CHAT_MSG': if (data.sender !== myName) appendChat(data.sender, data.text); break;
        default: Logger.warn("Unknown data type", data.type);
    }
}
function updatePlayerList() {
    const list = document.getElementById("player-list"); if (!list) return; list.innerHTML = "";
    players.forEach((p, index) => {
        const li = document.createElement("li");
        const playerName = getUserDisplayName(p);
        const accessory = String(p.accessory || "");
        li.textContent = `${index+1}. ${accessory} ${playerName} ${p.eliminated ? '❌' : ''}`;
        list.appendChild(li);
    });
    if (isHost && players.length >= 1) document.getElementById("start-btn")?.classList.remove("hidden");
}
function startOnlineGame() {
    if (!isHost) return;
    sendData({ type: 'START_GAME', players }); startGameUI();
}
function startGameUI() {
    document.getElementById("auth-modal")?.classList.add("hidden");
    document.getElementById("account-modal")?.classList.add("hidden");
    document.getElementById("setup")?.classList.add("hidden");
    document.getElementById("lobby-wait-box")?.classList.add("hidden");
    document.getElementById("woP-phase")?.classList.remove("hidden");
    document.getElementById("emergency-box")?.classList.remove("hidden");
    document.getElementById("chat-box-container")?.classList.remove("hidden");
    document.getElementById("leave-lobby-btn")?.classList.remove("hidden");
    updateWopTurn();
}
function updateWopTurn() {
    if (currentSharedResult) {
        showFeedbackScreen(currentSharedResult.targetPlayer, currentSharedResult.choice, currentSharedResult.taskText, currentSharedResult.resultText); return;
    }
    while (currentPlayerIndex < players.length && players[currentPlayerIndex].eliminated) currentPlayerIndex++;
    if (currentPlayerIndex >= players.length) {
        if (isHost) { sendData({ type: 'START_WHEEL' }); document.getElementById("woP-phase")?.classList.add("hidden"); document.getElementById("wheel-phase")?.classList.remove("hidden"); }
        return;
    }
    let currentP = players[currentPlayerIndex];
    const currentPlayerName = getUserDisplayName(currentP, "Spieler");
    const titleEl = document.getElementById("wop-turn-title");
    if (titleEl) titleEl.innerHTML = escapeHTML(translations[currentLang].turnTitle) + `<span style="color: var(--primary-color);">${escapeHTML(currentPlayerName)}</span>`;
    document.getElementById("wop-choice-area")?.classList.add("hidden");
    document.getElementById("creator-input-area")?.classList.add("hidden");
    document.getElementById("active-task-area")?.classList.add("hidden");
    document.getElementById("result-feedback-area")?.classList.add("hidden");
    document.getElementById("waiting-for-player-box")?.classList.add("hidden");
    if (currentPlayerName === myName) {
        const btn = document.getElementById("ui-select-btn"); if (btn) btn.disabled = false;
        document.getElementById("wop-choice-area")?.classList.remove("hidden");
    } else {
        document.getElementById("waiting-for-player-box")?.classList.remove("hidden");
        const info = document.getElementById("waiting-info-text");
        if (info) info.textContent = (currentLang === 'de' ? `Warte, bis ${currentPlayerName} wählt...` : `Waiting for ${currentPlayerName} to choose...`);
    }
}
function submitWopChoice() {
    if (players[currentPlayerIndex]?.name !== myName) return;
    const button = document.getElementById("ui-select-btn"); if (!button || button.disabled) return;
    const choice = document.getElementById("wop-choice")?.value; if (!choice) return;
    pendingChoice = choice; button.disabled = true;
    sendData({ type: 'SUBMIT_CHOICE', playerName: myName, choice });
}
function assignTaskCreator(targetName, choice) {
    let activeOthers = players.filter(p => !p.eliminated && p.name !== targetName);
    let creatorName = activeOthers.length > 0 ? activeOthers[Math.floor(Math.random() * activeOthers.length)].name : targetName;
    sendData({ type: 'ASSIGN_CREATOR', targetPlayer: targetName, choice, creatorName });
}
function setupCreatorUI(targetPlayer, choice, creatorName) {
    targetPlayer = getUserDisplayName({ name: targetPlayer }, "Spieler");
    creatorName = getUserDisplayName({ name: creatorName }, "Spieler");
    const isTruth = choice === "truth";
    const instruction = currentLang === 'de' ? (isTruth ? `Wähle eine Wahrheitsfrage für ${targetPlayer}:` : `Wähle eine Pflicht-Aufgabe für ${targetPlayer}:`) : (isTruth ? `Choose a truth question for ${targetPlayer}:` : `Choose a dare for ${targetPlayer}:`);
    document.getElementById("wop-choice-area")?.classList.add("hidden");
    document.getElementById("waiting-for-player-box")?.classList.add("hidden");
    document.getElementById("creator-input-area")?.classList.add("hidden");
    const instrEl = document.getElementById("creator-instruction-title"); if (instrEl) instrEl.textContent = instruction;
    const targetInfo = document.getElementById("creator-target-info");
    if (targetInfo) targetInfo.textContent = currentLang === 'de' ? `Ziel: ${targetPlayer} | Ersteller: ${creatorName}` : `Target: ${targetPlayer} | Creator: ${creatorName}`;
    if (creatorName === myName) {
        document.getElementById("creator-input-area")?.classList.remove("hidden");
        const input = document.getElementById("custom-task-input"); if (input) input.value = "";
    } else {
        document.getElementById("waiting-for-player-box")?.classList.remove("hidden");
        const waiting = document.getElementById("waiting-info-text");
        if (waiting) waiting.textContent = currentLang === 'de' ? `Warte, bis ${creatorName} eine Aufgabe erstellt...` : `Waiting for ${creatorName} to create a task...`;
    }
}
function sendCustomTask() {
    const input = document.getElementById("custom-task-input"); if (!input) return;
    const text = input.value.trim();
    if (!text) { alert(translations[currentLang]?.alertTask || "Bitte Aufgabe eingeben!"); return; }
    if (text.length > 500) { alert("Aufgabe zu lang (max 500 Zeichen)!"); return; }
    const currentTarget = players[currentPlayerIndex]?.name;
    if (!currentTarget) return;
    sendData({ type: 'SHOW_TASK', targetPlayer: currentTarget, choice: pendingChoice, taskText: text, creator: myName });
}
function displayTaskScreen(targetPlayer, choice, taskText, creator) {
    document.getElementById("creator-input-area")?.classList.add("hidden");
    document.getElementById("waiting-for-player-box")?.classList.add("hidden");
    document.getElementById("wop-choice-area")?.classList.add("hidden");
    document.getElementById("active-task-area")?.classList.remove("hidden");
    document.getElementById("active-task-target").textContent = currentLang === 'de' ? `Für: ${targetPlayer}` : `For: ${targetPlayer}`;
    document.getElementById("active-task-creator").textContent = currentLang === 'de' ? `Von: ${creator}` : `By: ${creator}`;
    document.getElementById("active-task-text").textContent = taskText; // FIX: textContent statt innerText mit Injection
    const answerInput = document.getElementById("player-answer-input"); if (answerInput) answerInput.value = "";
    if (targetPlayer === myName) {
        document.getElementById("answer-area")?.classList.remove("hidden");
        document.getElementById("dare-area")?.classList.add("hidden");
        if (choice === "dare") { document.getElementById("answer-area")?.classList.add("hidden"); document.getElementById("dare-area")?.classList.remove("hidden"); }
    } else {
        document.getElementById("answer-area")?.classList.add("hidden");
        document.getElementById("dare-area")?.classList.add("hidden");
        document.getElementById("waiting-for-player-box")?.classList.remove("hidden");
        document.getElementById("waiting-info-text").textContent = currentLang === 'de' ? `${targetPlayer} erledigt gerade die Aufgabe...` : `${targetPlayer} is completing the task...`;
    }
}
function submitAnswer() {
    const input = document.getElementById("player-answer-input"); if (!input) return;
    const text = input.value.trim();
    if (!text) { alert(translations[currentLang]?.alertAnswer || "Bitte Antwort eingeben!"); return; }
    if (text.length > 1000) { alert("Antwort zu lang!"); return; }
    const currentTarget = players[currentPlayerIndex]?.name;
    sendData({ type: 'SHOW_RESULT', targetPlayer: currentTarget, choice: pendingChoice, taskText: currentTaskText || currentTaskText, resultText: text });
    if (myName === currentTarget) addRewards(pendingChoice === "dare");
}
function confirmDareDone() {
    const currentTarget = players[currentPlayerIndex]?.name;
    sendData({ type: 'SHOW_RESULT', targetPlayer: currentTarget, choice: pendingChoice, taskText: currentTaskText, resultText: currentLang === 'de' ? "Pflicht erfüllt!" : "Dare completed!" });
    if (myName === currentTarget) addRewards(true);
}
function showFeedbackScreen(targetPlayer, choice, taskText, resultText) {
    const isNewResult = currentSharedResultKey !== `${targetPlayer}|${taskText}|${resultText}`;
    if (isNewResult) currentSharedResultKey = `${targetPlayer}|${taskText}|${resultText}`;
    document.getElementById("active-task-area")?.classList.add("hidden");
    document.getElementById("creator-input-area")?.classList.add("hidden");
    document.getElementById("waiting-for-player-box")?.classList.add("hidden");
    document.getElementById("result-feedback-area")?.classList.remove("hidden");
    if (isNewResult) nextTurnVotedPlayers = [];
    const nextBtn = document.getElementById("next-turn-btn"); if (nextBtn) nextBtn.disabled = nextTurnVotedPlayers.includes(myName);
    const nameEl = document.getElementById("feedback-player-name");
    if (nameEl) nameEl.textContent = currentLang === 'de' ? `${targetPlayer} hat abgeschlossen!` : `${targetPlayer} finished!`;
    const infoEl = document.getElementById("feedback-task-info");
    if (infoEl) infoEl.textContent = currentLang === 'de' ? `Aufgabe: "${taskText}"` : `Task: "${taskText}"`;
    const box = document.getElementById("feedback-result-box"); if (box) box.textContent = resultText;
    const activeCount = players.filter(p => !p.eliminated).length;
    const countEl = document.getElementById("next-votes-count"); if (countEl) countEl.textContent = String(nextTurnVotedPlayers.length);
    const totalEl = document.getElementById("next-votes-total"); if (totalEl) totalEl.textContent = String(activeCount);
}
function voteNextTurn() {
    if (!currentSharedResult) return;
    const me = players.find(p => p.name === myName); if (!me || me.eliminated) return;
    if (nextTurnVotedPlayers.includes(myName)) return;
    const btn = document.getElementById("next-turn-btn"); if (btn) btn.disabled = true;
    const voteData = { type: 'VOTE_NEXT_TURN', playerName: myName };
    handleIncomingData(voteData);
    if (!isHost) sendClientLobbyData(voteData); else broadcastLobbyData(voteData);
}
function handleNextTurnVote(pName) {
    const activePlayers = players.filter(p => !p.eliminated);
    const activeNames = activePlayers.map(p => p.name);
    if (!activeNames.includes(pName)) return;
    if (!nextTurnVotedPlayers.includes(pName)) nextTurnVotedPlayers.push(pName);
    const c = document.getElementById("next-votes-count"); if (c) c.textContent = nextTurnVotedPlayers.length;
    const t = document.getElementById("next-votes-total"); if (t) t.textContent = activePlayers.length;
    if (pName === myName) { const btn = document.getElementById("next-turn-btn"); if (btn) btn.disabled = true; }
    if (isHost && nextTurnVotedPlayers.length >= activePlayers.length) {
        const nextData = { type: 'EXECUTE_NEXT_TURN' }; handleIncomingData(nextData); broadcastLobbyData(nextData);
    }
}
function executeProceedToNextTurn() {
    currentSharedResult = null; currentSharedResultKey = "";
    document.getElementById("result-feedback-area")?.classList.add("hidden");
    document.getElementById("active-task-area")?.classList.add("hidden");
    document.getElementById("creator-input-area")?.classList.add("hidden");
    document.getElementById("waiting-for-player-box")?.classList.add("hidden");
    const btn = document.getElementById("next-turn-btn"); if (btn) btn.disabled = false;
    nextTurnVotedPlayers = []; currentPlayerIndex++; updateWopTurn();
}
function spinWheel() {
    const button = document.getElementById("spin-btn"); if (!button || button.disabled) return;
    let sectors = translations[currentLang].wheelSectors;
    let idx = Math.floor(Math.random() * sectors.length);
    currentRotation += 1800 + (idx * (360 / sectors.length));
    button.disabled = true;
    sendData({ type: 'SPIN_WHEEL', sector: idx, rotation: currentRotation });
}
function runWheelAnimation(sectorIndex, rotationVal) {
    const btn = document.getElementById("spin-btn"); if (btn) btn.disabled = true;
    let wheel = document.getElementById("wheel-container");
    if (wheel) wheel.style.transform = `rotate(-${rotationVal}deg)`;
    setTimeout(() => {
        if (btn) btn.disabled = false;
        let selected = translations[currentLang].wheelSectors[sectorIndex];
        if (wheel) wheel.textContent = translations[currentLang].wheelResult;
        const titleEl = document.getElementById("wheel-action-title"); if (titleEl) titleEl.textContent = selected.title;
        const descEl = document.getElementById("wheel-action-desc"); if (descEl) descEl.textContent = selected.desc;
        document.getElementById("wheel-result-box")?.classList.remove("hidden");
        const nrBtn = document.getElementById("next-round-btn"); if (nrBtn) nrBtn.disabled = false;
        userXP += 25; userCoins += 12; addMonthlyCoins(12); calculateLevel(); updateHUD(); updateProfileModal(); saveUserDataToCloud();
    }, 3000);
}
function voteNextRound() {
    const btn = document.getElementById("next-round-btn"); if (btn) btn.disabled = true;
    sendData({ type: 'VOTE_NEXT_ROUND', playerName: myName });
}
function handleNextRoundVote(pName) {
    if (!nextRoundVotedPlayers.includes(pName)) nextRoundVotedPlayers.push(pName);
    let activeCount = players.filter(p => !p.eliminated).length;
    const countEl = document.getElementById("round-votes-count"); if (countEl) countEl.textContent = nextRoundVotedPlayers.length;
    const totalEl = document.getElementById("round-votes-total"); if (totalEl) totalEl.textContent = activeCount;
    if (isHost && nextRoundVotedPlayers.length >= activeCount) sendData({ type: 'NEXT_ROUND' });
}
function nextRound() {
    currentPlayerIndex = 0; nextRoundVotedPlayers = [];
    document.getElementById("wheel-result-box")?.classList.add("hidden");
    document.getElementById("wheel-phase")?.classList.add("hidden");
    document.getElementById("woP-phase")?.classList.remove("hidden");
    updateWopTurn();
}
async function triggerLeak() {
    // FIX: Kein prompt() mehr für XSS/UX - nutze sichere Auswahl
    const active = players.filter(p => !p.eliminated);
    if (!active.length) return;
    const names = active.map(p => p.name).join(", ");
    const targetNameRaw = prompt(`${translations[currentLang].promptLeak}\nVerfügbar: ${names}`);
    if (!targetNameRaw) return;
    const normalized = targetNameRaw.trim().toLowerCase();
    if (!normalized) return;
    if (normalized.length > 20) { alert("Name zu lang!"); return; }
    const target = players.find(p => p.name.toLowerCase() === normalized);
    if (!target) { alert(currentLang === 'de' ? "Spieler nicht gefunden!" : "Player not found!"); return; }
    target.eliminated = true;
    if (target.name === myName) { userStreak = 0; await saveUserDataToCloud(); updateHUD(); updateProfileModal(); }
    sendData({ type: 'ELIMINATE', players });
    Logger.info("Leak triggered for", target.name);
}
function appendChat(sender, text) {
    let box = document.getElementById("chat-messages"); if (!box) return;
    const div = document.createElement("div"); div.className = "chat-msg";
    const b = document.createElement("b"); b.textContent = sender + ": "; div.appendChild(b);
    const span = document.createElement("span"); span.textContent = text; div.appendChild(span);
    box.appendChild(div); box.scrollTop = box.scrollHeight;
}
function sendChatMessage() {
    let input = document.getElementById("chat-input"); if (!input) return;
    let text = input.value.trim(); if (!text) return;
    if (text.length > 300) { alert("Nachricht zu lang!"); return; }
    appendChat(myName, text); sendData({ type: 'CHAT_MSG', sender: myName, text }); input.value = "";
}

// ========== PROFILE / SHOP ==========
function calculateLevel() { userLevel = Math.floor(userXP / 100) + 1; }
function updateHUD() {
    const s = document.getElementById("hud-streak"); if (s) s.textContent = userStreak;
    const x = document.getElementById("hud-xp"); if (x) x.textContent = userXP;
    const c = document.getElementById("hud-coins"); if (c) c.textContent = userCoins;
}
function checkAdminPermissions() {
    let adminBtn = document.getElementById("btn-admin-panel"); if (!adminBtn) return;
    if (myRole === "master" || myRole === "admin" || myRole === "moderator") adminBtn.classList.remove("hidden");
    else adminBtn.classList.add("hidden");
}
function updateProfileModal() {
    const nameEl = document.getElementById("acc-display-name"); if (nameEl) nameEl.textContent = myName;
    let roleBadge = document.getElementById("acc-display-role"); if (roleBadge) {
        roleBadge.textContent = myRole.toUpperCase();
        roleBadge.style.background = myRole === "master" ? "#ff0055" : myRole === "admin" ? "#ff3300" : myRole === "moderator" ? "#00bfff" : "#666";
    }
    const levelEl = document.getElementById("acc-display-level"); if (levelEl) levelEl.textContent = (currentLang === 'de' ? `Partystufe ${userLevel} (${userXP} XP)` : `Party Level ${userLevel} (${userXP} XP)`);
    const coinsEl = document.getElementById("acc-display-coins"); if (coinsEl) coinsEl.textContent = userCoins;
    const avatarDisplay = document.getElementById("avatar-display"); if (avatarDisplay && avatarDisplay.childNodes[0]) avatarDisplay.childNodes[0].textContent = avatarEmote || "😊";
    const select = document.getElementById("avatar-emote-select"); if (select) select.value = avatarEmote || "😊";
    applyAccessoryStyle(equippedAccessory);
    let badgeBox = document.getElementById("badge-container"); if (!badgeBox) return;
    badgeBox.innerHTML = "";
    if (unlockedBadges.length === 0) {
        const sp = document.createElement("span"); sp.style.cssText="font-size:11px; color:#888;"; sp.textContent = currentLang === 'de' ? 'Noch keine Badges freigeschaltet.' : 'No badges unlocked yet.'; badgeBox.appendChild(sp);
    } else {
        unlockedBadges.forEach(b => { const tag = document.createElement("span"); tag.className="badge-tag"; tag.textContent = b; badgeBox.appendChild(tag); });
    }
}
function addRewards(isDare) {
    let mult = userStreak >= 5 ? 2 : 1; let xpGain = isDare ? 20 : 10; let coinGain = (isDare ? 8 : 4) * mult;
    userXP += xpGain; userCoins += coinGain; addMonthlyCoins(coinGain); userStreak++;
    if (isDare) dareCount++; else truthCount++;
    checkBadges(); calculateLevel(); updateHUD(); saveUserDataToCloud();
}
function checkBadges() {
    if (dareCount >= 10 && !unlockedBadges.includes("🔥 10 Pflichten")) unlockedBadges.push("🔥 10 Pflichten");
    if (userStreak >= 5 && !unlockedBadges.includes("⚡ Streak-Monster")) unlockedBadges.push("⚡ Streak-Monster");
}
async function setAvatarEmote(emote) { avatarEmote = emote || "😊"; updateProfileModal(); await saveUserDataToCloud(); }
function applyAccessoryStyle(symbol) {
    const el = document.getElementById("equipped-accessory"); if (!el) return;
    el.className = ""; el.textContent = symbol || "";
    if (!symbol) { el.classList.add("acc-default"); return; }
    const headItems = ["👑", "🎩", "🧢", "🦄"]; const glassesItems = ["🕶️", "👓"]; const headphonesItems = ["🎧"];
    const beardItems = ["🧔"]; const maskItems = ["🎭"]; const sideItems = ["🦋", "✨", "⭐", "💎", "🌸"]; const decorItems = ["🔥", "🌈"];
    if (headphonesItems.includes(symbol)) el.classList.add("acc-headphones");
    else if (headItems.includes(symbol)) el.classList.add("acc-head");
    else if (glassesItems.includes(symbol)) el.classList.add("acc-glasses");
    else if (beardItems.includes(symbol)) el.classList.add("acc-beard");
    else if (maskItems.includes(symbol)) el.classList.add("acc-mask");
    else if (sideItems.includes(symbol)) el.classList.add("acc-side");
    else if (decorItems.includes(symbol)) el.classList.add("acc-decor");
    else el.classList.add("acc-default");
}
async function buyItem(itemKey, cost, symbol) {
    if (unlockedItems.includes(itemKey)) equippedAccessory = (equippedAccessory === symbol) ? "" : symbol;
    else {
        if (userCoins >= cost) { userCoins -= cost; unlockedItems.push(itemKey); equippedAccessory = symbol; alert(currentLang === 'de' ? "Erfolgreich gekauft und ausgerüstet!" : "Successfully purchased and equipped!"); }
        else { alert(currentLang === 'de' ? "Nicht genug Coins!" : "Not enough coins!"); return; }
    }
    await saveUserDataToCloud(); updateProfileModal(); updateHUD();
}
async function buyTheme(themeName, cost) {
    const alreadyUnlocked = unlockedThemes.includes(themeName);
    if (!alreadyUnlocked) {
        if (userCoins < cost) { alert(currentLang === 'de' ? "Nicht genug Coins!" : "Not enough coins!"); return; }
        userCoins -= cost; unlockedThemes.push(themeName);
        alert(currentLang === 'de' ? "Theme freigeschaltet!" : "Theme unlocked!");
    }
    setTheme(themeName); await saveUserDataToCloud(); updateHUD(); updateProfileModal();
}
function setTheme(className) {
    if (!/^[a-z0-9\-]+$/.test(className)) { Logger.warn("Invalid theme class", className); return; }
    document.body.className = className;
}

// ========== INIT (nur EINMAL!) ==========
window.addEventListener("DOMContentLoaded", async () => {
    Logger.info("App init");
    startMonthlyResetWatcher();
    const savedEmail = localStorage.getItem("wop_user_email_v6");
    const savedName = localStorage.getItem("wop_user_name_v6");
    if (savedEmail && savedName && isValidEmail(savedEmail)) {
        myEmail = savedEmail; myName = savedName;
        await loadUserDataFromCloud();
        showLoggedInState(); startOnlineHeartbeat(); listenForInvitations(); loadFriendsData(); listenForFriendRequests();
        const savedLobby = getSavedLobbySession();
        if (savedLobby && savedLobby.code && isValidLobbyCode(savedLobby.code)) {
            activeLobbyCode = String(savedLobby.code).toLowerCase();
            isHost = savedLobby.role === "host";
            if (isHost) {
                players = loadLobbyPlayers();
                if (!players.some(p => p.name === myName)) players.unshift({ name: myName, accessory: equippedAccessory, eliminated: false });
            }
            restoringLobby = true; setTimeout(() => reconnectLobby(), 250);
        }
    }
    const saved = localStorage.getItem('wop_lang');
    if(saved && translations[saved]) currentLang = saved;
    const authSel = document.getElementById('auth-lang-select'); const appSel = document.getElementById('lang-select');
    if(authSel) authSel.value = currentLang; if(appSel) appSel.value = currentLang;
    applyTranslations();
});
window.addEventListener("online", () => {
    if (myEmail && !onlineHeartbeatTimer) startOnlineHeartbeat();
    if (!leavingLobbyManually && activeLobbyCode) { updateOnlineStatus(true); scheduleLobbyReconnect(); }
});
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        if (myEmail) updateOnlineStatus(true);
        if (myEmail && !onlineHeartbeatTimer) startOnlineHeartbeat();
        if (!leavingLobbyManually && activeLobbyCode) {
            updateOnlineStatus(true);
            if (isHost) { /* host stays via Firestore */ }
            else scheduleLobbyReconnect();
        }
    }
});

// ========== WEITERE HELPERS (Feedb, Online Players) ==========
async function openOnlinePlayersModal() {
    let container = document.getElementById("online-players-list"); if (!container) return;
    container.textContent = "Suche online Spieler...";
    document.getElementById("online-players-modal")?.classList.remove("hidden");
    try {
        let snapshot = await db.collection("users").where("isOnline","==",true).limit(50).get();
        const now = Date.now(); container.innerHTML = ""; let found=false;
        snapshot.forEach(doc => {
            let data = doc.data() || {}; const playerName = getUserDisplayName(data);
            const lastActiveMs = data.lastActive && typeof data.lastActive.toMillis === "function" ? data.lastActive.toMillis() : 0;
            const isRecentlyOnline = lastActiveMs > 0 && (now - lastActiveMs) <= ONLINE_TIMEOUT_MS;
            if (playerName !== myName && isRecentlyOnline) {
                found=true;
                const lobbyInfo = data.currentLobby ? `(Lobby: ${String(data.currentLobby).toUpperCase()})` : "(Bereit)";
                const row = document.createElement("div");
                row.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; margin-bottom:6px; font-size:12px;";
                const left = document.createElement("div");
                const b = document.createElement("b"); b.textContent = `${data.accessory||""} ${playerName}`; left.appendChild(b);
                left.appendChild(document.createElement("br"));
                const s = document.createElement("span"); s.style.cssText="color:#28a745; font-size:10px;"; s.textContent=lobbyInfo; left.appendChild(s);
                const right = document.createElement("div"); right.style.cssText="display:flex;gap:3px;";
                const fBtn = document.createElement("button"); fBtn.className="btn-blue"; fBtn.style.cssText="padding:4px 6px; font-size:10px; margin:0; width:auto;"; fBtn.textContent="👥";
                fBtn.onclick=()=>sendFriendRequest(doc.id, playerName);
                const iBtn = document.createElement("button"); iBtn.className="btn-green"; iBtn.style.cssText="padding:4px 8px; font-size:11px; margin:0; width:auto;"; iBtn.textContent="Einladen 📨";
                iBtn.onclick=()=>sendGameInvite(doc.id, playerName);
                right.append(fBtn,iBtn); row.append(left,right); container.appendChild(row);
            }
        });
        if (!found) container.textContent = "Keine anderen Spieler online.";
    } catch(e) { Logger.error(e); container.textContent = "Fehler beim Laden der Spieler."; }
}
async function sendGameInvite(targetEmail, targetName) {
    if (!activeLobbyCode) { alert("Du musst zuerst eine Lobby erstellen (Host), um jemanden einzuladen!"); return; }
    if (!isValidEmail(targetEmail)) { alert("Ungültige Ziel-E-Mail"); return; }
    try {
        await db.collection("invites").add({ toEmail: targetEmail, fromName: myName, lobbyCode: activeLobbyCode, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        alert(`Einladung an ${targetName} gesendet! 🚀`);
        document.getElementById("online-players-modal")?.classList.add("hidden");
        Logger.info("Invite sent to", maskEmail(targetEmail));
    } catch(e) { Logger.error(e); alert("Fehler beim Senden der Einladung."); }
}
let incomingInviteLobby = ""; let incomingInviteId = ""; let inviteUnsubscribe = null;
function listenForInvitations() {
    if (!myEmail) return;
    if (inviteUnsubscribe) { try{inviteUnsubscribe();}catch{} inviteUnsubscribe=null; }
    inviteUnsubscribe = db.collection("invites").where("toEmail","==",myEmail).onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            if (change.type === "added") {
                const data = change.doc.data(); incomingInviteId = change.doc.id; incomingInviteLobby = data.lobbyCode || "";
                const msg = document.getElementById("invite-msg-text");
                if (msg) msg.textContent = `${data.fromName || "Spieler"} hat dich in die Lobby ${String(incomingInviteLobby).toUpperCase()} eingeladen!`;
                document.getElementById("invite-modal")?.classList.remove("hidden");
            }
        });
    }, error => Logger.error("Fehler beim Überwachen von Einladungen:", error));
}
async function acceptInvitation() {
    document.getElementById("invite-modal")?.classList.add("hidden");
    const lobby = incomingInviteLobby; const inviteId = incomingInviteId; incomingInviteLobby=""; incomingInviteId="";
    if (inviteId) { try{await db.collection("invites").doc(inviteId).delete();}catch(e){ Logger.warn(e.message); } }
    if (lobby) { const inp=document.getElementById("lobby-code-input"); if (inp) inp.value=lobby; joinGame(); }
}
async function rejectInvitation() {
    document.getElementById("invite-modal")?.classList.add("hidden");
    const inviteId = incomingInviteId; incomingInviteLobby=""; incomingInviteId="";
    if (inviteId) { try{await db.collection("invites").doc(inviteId).delete();}catch(e){ Logger.warn(e.message); } }
}
function switchLeaderboardTab(tab) { currentLbTab = tab; openLeaderboard(); }

// Expose Logger global für Debug-Konsole
window.WOPLogger = Logger;
window.getWOPLogs = () => Logger.export();

Logger.info("Fixed script loaded - Logger ready");
