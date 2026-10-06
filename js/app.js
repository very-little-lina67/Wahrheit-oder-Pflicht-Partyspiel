/**
 * ==============================================================================
 * WAHRHEIT ODER PFLICHT - MULTIPLAYER PARTYSPIEL
 * ==============================================================================
 * Architektur & Features:
 * - Firebase Firestore für Echtzeit-Lobby-Synchronisation & Benutzerprofile
 * - Sichere Passwort-Verschlüsselung (SHA-256 mit WebCrypto & Fallback)
 * - Level-, XP-, Streak-, Badges- und Coin-System mit In-Game Shop
 * - Echtzeit-Lobby: Host-Client Kommunikation, Aufgaben-Erstellung, Rad-Phase
 * - Freundesliste, Ranglisten, Feedback-System und Admin-Bereich
 * - Vollständig statisch hostbar auf Vercel (Client-Side Vanilla JS)
 * ==============================================================================
 */

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

let currentLang = "de";

// --- SICHERHEITS-HELFER: HASHING (SHA-256) ---

// ==============================================================================
// 2. KRYPTO-, SICHERHEITS- & DATENSCHUTZ-HELFER
// ==============================================================================
// --- HELFER: BENUTZERNAME SICHER LESEN ---
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

// --- PURE JS SHA-256 IMPLEMENTATION (Funktioniert überall, auch offline, HTTP & Webview) ---
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
            i++;
            code = 0x10000 + (((code & 0x3ff) << 10) | (ascii.charCodeAt(i) & 0x3ff));
            bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | (code & 0x3f));
        }
    }

    const bitLength = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) {
        bytes.push(0);
    }

    bytes.push(0, 0, 0, 0);
    bytes.push(
        (bitLength >>> 24) & 0xff,
        (bitLength >>> 16) & 0xff,
        (bitLength >>> 8) & 0xff,
        bitLength & 0xff
    );

    const words = [];
    for (let i = 0; i < bytes.length; i += 4) {
        words.push((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | (bytes[i + 3]));
    }

    for (let i = 0; i < words.length; i += 16) {
        const w = new Array(64);
        for (let t = 0; t < 16; t++) {
            w[t] = words[i + t];
        }
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

            h = g;
            g = f;
            f = e;
            e = (d + temp1) | 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) | 0;
        }

        H[0] = (H[0] + a) | 0;
        H[1] = (H[1] + b) | 0;
        H[2] = (H[2] + c) | 0;
        H[3] = (H[3] + d) | 0;
        H[4] = (H[4] + e) | 0;
        H[5] = (H[5] + f) | 0;
        H[6] = (H[6] + g) | 0;
        H[7] = (H[7] + h) | 0;
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
        } catch (e) {}
    }
    return sha256_pure(password);
}

// --- DATENSCHUTZ-HELFER: EMAIL MASKIEREN ---
function maskEmail(email) {
    if (!email || !email.includes("@")) return "***@***.***";
    let parts = email.split("@");
    let name = parts[0];
    let domain = parts[1];
    let maskedName = name.length > 2 ? name.substring(0, 2) + "***" : "***";
    return `${maskedName}@${domain}`;
}

// ==============================================================================
// 3. MEHRSPRACHIGKEIT & ÜBERSETZUNGEN (DE / EN)
// ==============================================================================
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
        itemCrown: "Krone",
        itemGlasses: "Sonnenbrille",
        itemHat: "Partyhut",
        itemBeard: "Schnauzbart",
        itemSparkles: "Glitzer",
        itemHeadphones: "Kopfhörer",
        itemUnicorn: "Einhorn",
        itemCap: "Kappe",
        itemButterfly: "Schmetterling",
        itemDiamond: "Diamant",
        itemRainbow: "Regenbogen",
        itemStar: "Stern",
        itemMask: "Maske",
        itemFlower: "Blume",
        itemFlame: "Flamme",
        itemCool: "Brille",
        themeCyberpunk: "Cyberpunk",
        themeRetro: "Retro-Pixel",
        themeParty: "Party Neon",
        themeOcean: "Ocean Wave",
        themeSunset: "Sonnenuntergang",
        themeForest: "Waldgrün",
        themeGalaxy: "Galaxie",
        themeCandy: "Candy Pop",
        themeMidnight: "Mitternacht",
        themeGold: "Goldene Stunde",
        themePikachuWarm: "Pikachu & Ash (Warm)",
        themePikachuRain: "Pikachu & Ash (Regen)",
        avatarEmoteLabel: "🙂 Eigenes Emote / Avatar auswählen",
        emoteHappy: "Fröhlich", emoteCool: "Cool", emoteExcited: "Begeistert", emoteParty: "Party", emoteCheeky: "Frech", emoteRobot: "Roboter", emoteGhost: "Geist", emoteCat: "Katze", emoteFox: "Fuchs", emoteFrog: "Frosch", emoteSkull: "Totenkopf", emoteFire: "Feuer",
        buyEquipBtn: "Kaufen / Ausrüsten",
        themesHead: "🎨 Farb-Themes",
        unlockBtn: "Freischalten",
        lbTitle: "🏆 Party-Ruhmeshalle",
        lbDesc: "Die Top 10 nach Gesamt-Coins und verdienten Coins in diesem Monat.",
        lbGlobalTitle: "🌍 Gesamtwertung – alle Coins",
        lbMonthlyTitle: "📅 Monatswertung – Coins diesen Monat",
        lbCoins: "Coins",
        lbLoading: "Rangliste wird geladen …",
        lbError: "Die Rangliste konnte nicht geladen werden.",
        lbTabGlobal: "🌍 Global",
        lbTabFriends: "👥 Freunde",
        btnLogout: "Logout",
        btnClose: "Schließen",
        hudStreakText: "Streak",
        hudCoinsText: "Coins",
        btnShop: "🛒 Shop",
        btnAdmin: "🛡️ Admin",
        btnLeaderboard: "🏆 Rangliste",
        btnPlayers: "🌐 Spieler",
        btnFriends: "👥 Freunde",
        btnFeedback: "📝 Feedback",
        opTitle: "🌐 Online Spieler & Einladungen",
        opDesc: "Sieh, wer online ist, lade ein oder füge Freunde hinzu!",
        friendsTitle: "👥 Freunde",
        friendsDescList: "Deine Freunde – online Status & Lobby-Einladung",
        friendsDescReq: "Eingehende Freundschaftsanfragen",
        friendsDescAdd: "Freund per E-Mail oder Name suchen",
        friendsListTab: "Freundesliste",
        friendsReqTab: "Anfragen",
        friendsAddTab: "Hinzufügen",
        friendsSearchBtn: "Suchen & Anfrage senden",
        privateLobbyHint: "🔑 Teile den Lobby-Code mit deinen Freunden oder lade sie direkt ein.",
        hostBtnPrivate: "Lobby erstellen (Host) 🏠",
        opClose: "Schließen",
        lbClose: "Schließen",
        langLabelText: "Sprache",
        title: "Wahrheit oder Pflicht Partyspiel 🍻🚻",
        subtitle: "Spielt nacheinander Wahrheit oder Pflicht. Nach jeder Runde dreht sich das Rad!",
        setupHead: "Online Lobby:",
        hostBtn: "Lobby erstellen (Host) 🏠",
        lobbyCodeInputPlaceholder: "Lobby-Code eingeben...",
        joinBtn: "Lobby beitreten 🚀",
        lobbyCodeTitle: "Lobby-Code: ",
        shareCode: "Teile diesen Code mit deinen Mitspielern!",
        startBtn: "Spiel starten! 🔥",
        clientWaitMsg: "Mit Lobby verbunden! Warte auf den Host...",
        leaveBtn: "🚪 Lobby verlassen",
        turnTitle: "Am Zug: ",
        choiceLabel: "Wähle deine Kategorie:",
        optTruth: "Wahrheit (+XP / +4 Coins)",
        optDare: "Pflicht (+XP / +8 Coins)",
        selectBtn: "Auswählen 🎲",
        sendTaskBtn: "An Spieler senden 🚀",
        taskInputPlaceholder: "Tippe hier die Frage oder Aufgabe ein...",
        answerLabel: "Deine Antwort:",
        answerPlaceholder: "Tippe hier deine Antwort ein...",
        submitAnswerBtn: "✅ Antwort abschicken",
        dareDoneBtn: "✅ Pflicht erfüllt & bestätigen!",
        doneHead: "🎉 Erledigt!",
        nextTurnBtn: "✅ Ich bestätige",
        waitingOther: "Warte auf die Bestätigungen aller aktiven Spieler…",
        waitingOtherRound: "Warte auf die Bestätigungen der anderen Spieler...",
        wheelHead: "🎡 RAD-MODUS: Alle müssen handeln!",
        wheelDesc: "Jeder hat Wahrheit/Pflicht gespielt. Jetzt wird das Schicksals-Rad für alle gedreht!",
        spinBtn: "Glücksrad jetzt drehen 🎡",
        nextRoundBtn: "➡️️ Weiter zur nächsten Runde!",
        chatPlaceholder: "Schreibe eine Nachricht...",
        chatSend: "Senden",
        emergencyDesc: "Wer einknickt oder leakt, hat sofort verloren!",
        leakBtn: "🚨 Ich habe geleakt / musste pinkeln (Verloren!)",
        fbTitle: "📝 Bug melden & Feedback",
        fbDesc: "Hast du einen Bug gefunden oder eine Idee? Sende es direkt an die Admins!",
        fbTypeLabel: "Art des Feedbacks:",
        fbOptBug: "🐛 Bug / technischer Fehler",
        fbOptImp: "💡 Verbesserung / Feature-Wunsch",
        fbMsgLabel: "Deine Nachricht:",
        fbSendBtn: "Feedback absenden",
        fbCloseBtn: "Schließen",
        inviteTitle: "📬 Spiel-Einladung!",
        inviteAccept: "Annehmen ✅",
        inviteReject: "Ablehnen ❌",
        adminTitle: "🛡️ Admin Panel",
        adminDesc: "Verwalte Benutzer und Feedback.",
        adminUsers: "👥 Benutzer:",
        adminFeedback: "📥 Feedback:",
        adminClose: "Schließen",
        authEmailPh: "name@example.com",
        authUserPh: "Dein Spielername",
        authPassPh: "Dein sicheres Passwort",
        friendSearchPh: "E-Mail oder Anzeigename...",
        feedbackPh: "Beschreibe den Bug oder deine Idee...",
        promptLeak: "Wer hat geleakt / aufgegeben?",
        alertEmailNamePass: "Bitte E-Mail, Benutzername und Passwort eingeben!",
        alertRegistered: "Erfolgreich registriert!",
        alertAccountExists: "Dieses Konto existiert bereits! Bitte einloggen.",
        alertNoAccount: "Falsche Anmeldedaten oder Konto nicht gefunden!",
        alertNameCode: "Bitte Lobby-Code eingeben!",
        alertTask: "Bitte eine Aufgabe eingeben!",
        alertAnswer: "Bitte antworte auf die Frage!",
        alertFeedbackEmpty: "Bitte gib eine Nachricht ein!",
        alertFeedbackSuccess: "Feedback wurde erfolgreich gesendet!",
        wheelResult: "ERGEBNIS!",
        wheelSectors: [
            { title: "🍻 500ml EX!", desc: "Jeder Spieler muss sofort einen halben Liter trinken!" },
            { title: "🚫 3 Runden Klo-Verbot!", desc: "Ab jetzt darf für 3 Runden niemand auf Toilette!" },
            { title: "💧 Wasser-Sturzflug", desc: "Jeder muss ein volles Glas Leitungswasser austrinken!" },
            { title: "🤫 Schweige-Pflicht", desc: "In den nächsten 2 Runden darf niemand sprechen." },
            { title: "🔄 Doppel-Schluck", desc: "Jeder verteilt 2 Schlucke an eine Person." },
            { title: "⚡ Der Blasen-Tanz", desc: "Alle müssen 30 Sekunden lang auf der Stelle hüpfen!" },
            { title: "🍻 Alle trinken!", desc: "Jeder nimmt sofort einen großen Schluck!" },
            { title: "💧 Wasser-Pflicht", desc: "Wer kein Bier hat, trinkt Wasser in einem Zug!" },
            { title: "🤫 Mute-Pflicht", desc: "Niemand darf Geräusche machen für 2 Runden." },
            { title: "🏋️‍♂️ Kniebeugen-Alarm", desc: "Alle machen sofort 15 tiefe Kniebeugen!" },
            { title: "🚾 Beckenboden-Test", desc: "Auf dem rechten Bein balancieren für 2 Runden!" },
            { title: "⏱️ Planke der Wahrheit", desc: "45 Sekunden Unterarmstütz für alle!" },
            { title: "💧 Wassertest", desc: "Großes Glas Wasser auf Ex trinken!" }
        ]
    },
    en: {
        authTitle: "User Account & Vibe",
        authDesc: "Log in to use your XP, coins and the shop!",
        labelEmail: "Email Address:",
        labelUsername: "Username:",
        labelPass: "Password:",
        btnRegister: "Register",
        btnLogin: "Log In",
        shopHead: "👤 Profile & Vibe Shop",
        coinsText: "Coins",
        badgesHead: "🏆 Your Badges & Trophies",
        accessoriesHead: "🛍️ Avatar Accessories",
        itemCrown: "Crown",
        itemGlasses: "Sunglasses",
        itemHat: "Party Hat",
        itemBeard: "Mustache",
        itemSparkles: "Sparkles",
        itemHeadphones: "Headphones",
        itemUnicorn: "Unicorn",
        itemCap: "Cap",
        itemButterfly: "Butterfly",
        itemDiamond: "Diamond",
        itemRainbow: "Rainbow",
        itemStar: "Star",
        itemMask: "Mask",
        itemFlower: "Flower",
        itemFlame: "Flame",
        itemCool: "Glasses",
        themeCyberpunk: "Cyberpunk",
        themeRetro: "Retro-Pixel",
        themeParty: "Party Neon",
        themeOcean: "Ocean Wave",
        themeSunset: "Sunset Glow",
        themeForest: "Forest Green",
        themeGalaxy: "Galaxy Night",
        themeCandy: "Candy Pop",
        themeMidnight: "Midnight",
        themeGold: "Golden Hour",
        themePikachuWarm: "Pikachu & Ash (Warm)",
        themePikachuRain: "Pikachu & Ash (Rain)",
        avatarEmoteLabel: "🙂 Choose your own emote / avatar",
        emoteHappy: "Happy", emoteCool: "Cool", emoteExcited: "Excited", emoteParty: "Party", emoteCheeky: "Cheeky", emoteRobot: "Robot", emoteGhost: "Ghost", emoteCat: "Cat", emoteFox: "Fox", emoteFrog: "Frog", emoteSkull: "Skull", emoteFire: "Fire",
        buyEquipBtn: "Buy / Equip",
        themesHead: "🎨 Color Themes",
        unlockBtn: "Unlock",
        lbTitle: "🏆 Party Hall of Fame",
        lbDesc: "Top 10 by total coins and coins earned this month.",
        lbGlobalTitle: "🌍 All-time ranking – total coins",
        lbMonthlyTitle: "📅 Monthly ranking – coins this month",
        lbCoins: "Coins",
        lbLoading: "Loading leaderboard …",
        lbError: "Could not load the leaderboard.",
        lbTabGlobal: "🌍 Global",
        lbTabFriends: "👥 Friends",
        btnLogout: "Logout",
        btnClose: "Close",
        hudStreakText: "Streak",
        hudCoinsText: "Coins",
        btnShop: "🛒 Shop",
        btnAdmin: "🛡️ Admin",
        btnLeaderboard: "🏆 Ranking",
        btnPlayers: "🌐 Players",
        btnFriends: "👥 Friends",
        btnFeedback: "📝 Feedback",
        opTitle: "🌐 Online Players & Invites",
        opDesc: "See who is online, invite them or add as friend!",
        friendsTitle: "👥 Friends",
        friendsDescList: "Your friends – online status & lobby invites",
        friendsDescReq: "Incoming friend requests",
        friendsDescAdd: "Search friend by email or name",
        friendsListTab: "Friend List",
        friendsReqTab: "Requests",
        friendsAddTab: "Add",
        friendsSearchBtn: "Search & Send Request",
        privateLobbyHint: "🔑 Share the lobby code with your friends or invite them directly.",
        hostBtnPrivate: "Create Lobby (Host) 🏠",
        opClose: "Close",
        lbClose: "Close",
        langLabelText: "Language",
        title: "Truth or Dare Party Game 🍻🚻",
        subtitle: "Take turns playing truth or dare. After every full round, the wheel spins!",
        setupHead: "Online Lobby:",
        hostBtn: "Create Lobby (Host) 🏠",
        lobbyCodeInputPlaceholder: "Enter lobby code...",
        joinBtn: "Join Lobby 🚀",
        lobbyCodeTitle: "Lobby Code: ",
        shareCode: "Share this code with your friends!",
        startBtn: "Start Game! 🔥",
        clientWaitMsg: "Connected to lobby! Waiting for host...",
        leaveBtn: "🚪 Leave Lobby",
        turnTitle: "Current Turn: ",
        choiceLabel: "What do you choose?",
        optTruth: "Truth (+XP / +4 Coins)",
        optDare: "Dare (+XP / +8 Coins)",
        selectBtn: "Select 🎲",
        sendTaskBtn: "Send to player 🚀",
        taskInputPlaceholder: "Type your question or dare here...",
        answerLabel: "Your Answer:",
        answerPlaceholder: "Type your answer here...",
        submitAnswerBtn: "✅ Submit Answer",
        dareDoneBtn: "✅ Dare completed & confirm!",
        doneHead: "🎉 Done!",
        nextTurnBtn: "✅ I confirm",
        waitingOther: "Waiting for all active players to confirm…",
        waitingOtherRound: "Waiting for other players to confirm...",
        wheelHead: "🎡 WHEEL MODE: Everyone acts!",
        wheelDesc: "Everyone played truth or dare. Now the wheel of fate spins for everyone!",
        spinBtn: "Spin the wheel now 🎡",
        nextRoundBtn: "➡️️ Next Round!",
        chatPlaceholder: "Type a message...",
        chatSend: "Send",
        emergencyDesc: "Anyone who caves or leaks loses immediately!",
        leakBtn: "🚨 I leaked / had to pee (Lost!)",
        fbTitle: "📝 Report Bug & Feedback",
        fbDesc: "Found a bug or have an improvement suggestion? Send it directly!",
        fbTypeLabel: "Feedback Type:",
        fbOptBug: "🐛 Bug / Technical Issue",
        fbOptImp: "💡 Improvement / Feature Request",
        fbMsgLabel: "Your Message:",
        fbSendBtn: "Send Feedback",
        fbCloseBtn: "Close",
        inviteTitle: "📬 Game Invitation!",
        inviteAccept: "Accept ✅",
        inviteReject: "Decline ❌",
        adminTitle: "🛡️️ Admin Panel",
        adminDesc: "Manage users and feedback.",
        adminUsers: "👥 Users:",
        adminFeedback: "📥 Feedback:",
        adminClose: "Close",
        authEmailPh: "name@example.com",
        authUserPh: "Your Player Name",
        authPassPh: "Your secure password",
        friendSearchPh: "Email or display name...",
        feedbackPh: "Describe the bug or your idea...",
        promptLeak: "Who leaked / gave up?",
        alertEmailNamePass: "Please enter email, username and password!",
        alertRegistered: "Successfully registered!",
        alertAccountExists: "This account already exists! Please login.",
        alertNoAccount: "Incorrect login details or account not found!",
        alertNameCode: "Please enter lobby code!",
        alertTask: "Please enter a task!",
        alertAnswer: "Please answer the question!",
        alertFeedbackEmpty: "Please enter a message!",
        alertFeedbackSuccess: "Feedback successfully sent!",
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

let currentLang = localStorage.getItem('wop_lang') || "de";

function changeLanguage() {
    const authSelect = document.getElementById("auth-lang-select");
    const appSelect = document.getElementById("lang-select");
    
    if (authSelect && !document.getElementById("auth-modal").classList.contains("hidden")) {
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

// INIT LANGUAGE ON LOAD
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('wop_lang');
    if(saved && translations[saved]) currentLang = saved;
    const authSel = document.getElementById('auth-lang-select');
    const appSel = document.getElementById('lang-select');
    if(authSel) authSel.value = currentLang;
    if(appSel) appSel.value = currentLang;
    applyTranslations();
});


function applyTranslations(){
    const t = translations[currentLang];
    if(!t) return;
    const setText = (id, val) => { const el=document.getElementById(id); if(el && val!==undefined) el.innerText = val; };
    const setPlaceholder = (id, val) => { const el=document.getElementById(id); if(el && val!==undefined) el.placeholder = val; };
    const setHTML = (id, val) => { const el=document.getElementById(id); if(el && val!==undefined) el.innerHTML = val; };

    setText("ui-auth-title", t.authTitle);
    setText("ui-auth-desc", t.authDesc);
    setText("ui-label-email", t.labelEmail);
    setText("ui-label-username", t.labelUsername);
    setText("ui-label-pass", t.labelPass);
    setText("ui-btn-register", t.btnRegister);
    setText("ui-btn-login", t.btnLogin);

    setText("ui-shop-head", t.shopHead);
    setText("ui-coins-text", t.coinsText);
    setText("ui-badges-head", t.badgesHead);
    setText("ui-accessories-head", t.accessoriesHead);
    setText("ui-item-crown", t.itemCrown);
    setText("ui-item-glasses", t.itemGlasses);
    setText("ui-item-hat", t.itemHat);
    setText("ui-item-beard", t.itemBeard);
    setText("ui-item-sparkles", t.itemSparkles);
    setText("ui-item-headphones", t.itemHeadphones);
    const extraItemIds = {
        "ui-item-unicorn": t.itemUnicorn,
        "ui-item-cap": t.itemCap,
        "ui-item-butterfly": t.itemButterfly,
        "ui-item-diamond": t.itemDiamond,
        "ui-item-rainbow": t.itemRainbow,
        "ui-item-star": t.itemStar,
        "ui-item-mask": t.itemMask,
        "ui-item-flower": t.itemFlower,
        "ui-item-flame": t.itemFlame,
        "ui-item-cool": t.itemCool
    };
    Object.entries(extraItemIds).forEach(([id, label]) => { const el = document.getElementById(id); if (el) el.innerText = label; });
    const themeIds = {
        "ui-theme-cyberpunk": t.themeCyberpunk,
        "ui-theme-retro": t.themeRetro,
        "ui-theme-party": t.themeParty,
        "ui-theme-ocean": t.themeOcean,
        "ui-theme-sunset": t.themeSunset,
        "ui-theme-forest": t.themeForest,
        "ui-theme-galaxy": t.themeGalaxy,
        "ui-theme-candy": t.themeCandy,
        "ui-theme-midnight": t.themeMidnight,
        "ui-theme-gold": t.themeGold,
        "ui-theme-pikachu-warm": t.themePikachuWarm,
        "ui-theme-pikachu-rain": t.themePikachuRain
    };
    Object.entries(themeIds).forEach(([id, label]) => { const el = document.getElementById(id); if (el) el.innerText = label; });
    setText("ui-avatar-emote-label", t.avatarEmoteLabel);
    const emoteLabels = {
        "ui-emote-happy": ["😊 ", t.emoteHappy],
        "ui-emote-excited": ["🤩 ", t.emoteExcited], "ui-emote-party": ["🥳 ", t.emoteParty],
        "ui-emote-cheeky": ["😈 ", t.emoteCheeky], "ui-emote-robot": ["🤖 ", t.emoteRobot],
        "ui-emote-ghost": ["👻 ", t.emoteGhost], "ui-emote-cat": ["🐱 ", t.emoteCat],
        "ui-emote-fox": ["🦊 ", t.emoteFox], "ui-emote-frog": ["🐸 ", t.emoteFrog],
        "ui-emote-skull": ["💀 ", t.emoteSkull], "ui-emote-fire": ["🔥 ", t.emoteFire]
    };
    Object.entries(emoteLabels).forEach(([id, parts]) => { const el=document.getElementById(id); if(el) el.textContent = parts[0] + parts[1]; });
    document.querySelectorAll(".shop-action-btn").forEach(el => el.innerText = t.buyEquipBtn);
    setText("ui-themes-head", t.themesHead);
    document.querySelectorAll(".theme-action-btn").forEach(el => el.innerText = t.unlockBtn);
    setText("ui-btn-logout", t.btnLogout);
    setText("ui-btn-close", t.btnClose);

    setText("ui-fb-title", t.fbTitle);
    setText("ui-fb-desc", t.fbDesc);
    setText("ui-fb-type-label", t.fbTypeLabel);
    setText("ui-fb-opt-bug", t.fbOptBug);
    setText("ui-fb-opt-imp", t.fbOptImp);
    setText("ui-fb-msg-label", t.fbMsgLabel);
    setText("ui-fb-send-btn", t.fbSendBtn);
    setText("ui-fb-close-btn", t.fbCloseBtn);
    setText("ui-lb-title", t.lbTitle);
    setText("ui-lb-desc", t.lbDesc);
    setText("ui-op-title", t.opTitle);
    setText("ui-op-desc", t.opDesc);
    setText("ui-lb-close-btn", t.lbClose);
    setText("ui-op-close-btn", t.opClose);

    setText("ui-friends-title", t.friendsTitle);
    setText("ui-friends-tab-list", t.friendsListTab);
    const reqTab = document.getElementById("ui-friends-tab-requests-text");
    if(reqTab) reqTab.innerText = t.friendsReqTab;
    setText("ui-friends-tab-add", t.friendsAddTab);
    setText("ui-friends-search-btn", t.friendsSearchBtn);
    setText("ui-friends-close", t.btnClose);
    setText("ui-admin-title", t.adminTitle);
    setText("ui-admin-desc", t.adminDesc);
    setText("ui-admin-users", t.adminUsers);
    setText("ui-admin-feedback", t.adminFeedback);
    setText("ui-admin-close", t.adminClose);
    setText("ui-invite-title", t.inviteTitle);
    setText("ui-invite-accept", t.inviteAccept);
    setText("ui-invite-reject", t.inviteReject);
    setText("ui-private-lobby-hint", t.privateLobbyHint);
    setText("ui-lb-tab-global-text", t.lbTabGlobal);
    setText("ui-lb-tab-friends-text", t.lbTabFriends);

    setText("ui-hud-streak-text", t.hudStreakText);
    setText("ui-hud-coins-text", t.hudCoinsText);
    setText("ui-btn-shop", t.btnShop);
    const adminBtn = document.getElementById("btn-admin-panel");
    if (adminBtn) adminBtn.innerText = t.btnAdmin;
    setText("ui-btn-leaderboard", t.btnLeaderboard);
    setText("ui-btn-friends", t.btnFriends);
    setText("ui-btn-players", t.btnPlayers);
    setText("ui-btn-feedback", t.btnFeedback);
    setText("ui-lang-label-text", t.langLabelText);
    setText("ui-title", t.title);
    setText("ui-subtitle", t.subtitle);
    setText("ui-setup-head", t.setupHead);
    setText("ui-host-btn", t.hostBtn);
    setPlaceholder("lobby-code-input", t.lobbyCodeInputPlaceholder);
    setText("ui-join-btn", t.joinBtn);
    const displayCodeEl = document.getElementById("display-code");
    const codeVal = displayCodeEl ? displayCodeEl.innerText : "";
    const lobbyTitleEl = document.getElementById("ui-lobby-code-title");
    if(lobbyTitleEl) lobbyTitleEl.innerHTML = t.lobbyCodeTitle + `<span id="display-code" style="color: #ffcc00; font-size: 18px;">${codeVal}</span>`;
    setText("ui-share-code", t.shareCode);
    setText("start-btn", t.startBtn);
    setText("client-wait-msg", t.clientWaitMsg);
    setText("leave-lobby-btn", t.leaveBtn);
    setText("ui-choice-label", t.choiceLabel);
    setText("ui-opt-truth", t.optTruth);
    setText("ui-opt-dare", t.optDare);
    setText("ui-select-btn", t.selectBtn);
    setText("ui-send-task-btn", t.sendTaskBtn);
    setPlaceholder("custom-task-input", t.taskInputPlaceholder);
    setText("ui-answer-label", t.answerLabel);
    setPlaceholder("player-answer-input", t.answerPlaceholder);
    setText("ui-submit-answer-btn", t.submitAnswerBtn);
    setText("ui-dare-done-btn", t.dareDoneBtn);
    setText("ui-done-head", t.doneHead);
    setText("ui-next-turn-btn", t.nextTurnBtn);
    setText("next-turn-btn", t.nextTurnBtn);
    setText("ui-waiting-other", t.waitingOther);
    setText("ui-waiting-other-round", t.waitingOtherRound);
    setText("ui-wheel-head", t.wheelHead);
    setText("ui-wheel-desc", t.wheelDesc);
    setText("spin-btn", t.spinBtn);
    setText("ui-spin-btn", t.spinBtn);
    setText("next-round-btn", t.nextRoundBtn);
    setText("ui-next-round-btn", t.nextRoundBtn);
    setPlaceholder("chat-input", t.chatPlaceholder);
    setText("ui-chat-send", t.chatSend);
    setText("ui-emergency-desc", t.emergencyDesc);
    setText("ui-leak-btn", t.leakBtn);

    setPlaceholder("auth-email", t.authEmailPh);
    setPlaceholder("auth-username", t.authUserPh);
    setPlaceholder("auth-password", t.authPassPh);
    setPlaceholder("friend-search-input", t.friendSearchPh);
    setPlaceholder("feedback-text-input", t.feedbackPh);

    if(typeof updateHUD === 'function') try{ updateHUD(); }catch(e){}
}

// Restliche Spiellogik (Daten, User, Lobby, etc.)...
