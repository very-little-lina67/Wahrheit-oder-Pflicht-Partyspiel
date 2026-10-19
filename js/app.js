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

        // Unnötige WebChannel-Warnungen unterdrücken (status: 1 = temporary transport error)
        try {
            firebase.firestore.setLogLevel("error");
        } catch (e) {}

        const db = firebase.firestore();

        // Stabilere Verbindung (besonders auf Mobile / instabilem Netz)
        try {
            db.settings({
                experimentalAutoDetectLongPolling: true,
                merge: true
            });
        } catch (e) {}

        let currentLang = "de";
        try {
            const storedLang = localStorage.getItem("lang") || localStorage.getItem("wop_lang");
            if (storedLang === "en" || storedLang === "de") {
                currentLang = storedLang;
            }
        } catch (e) {}

        // --- SICHERHEITS-HELFER: HASHING (SHA-256) ---
        
// ==============================================================================
// 2. KRYPTO-, SICHERHEITS- & DATENSCHUTZ-HELFER
// ==============================================================================
        // --- HELFER: BENUTZERNAME SICHER LESEN ---
        function getUserDisplayName(user, fallback = (currentLang === "de" ? "Spieler" : "Player")) {
            if (!user) return fallback;
            if (typeof user === "string") return user.trim() || fallback;
            if (typeof user === "object") {
                if (typeof user.name === "string" && user.name.trim()) return user.name.trim();
                if (typeof user.username === "string" && user.username.trim()) return user.username.trim();
                if (typeof user.displayName === "string" && user.displayName.trim()) return user.displayName.trim();
            }
            return fallback;
        }

        /** Robuster Namensvergleich (trim, leere Strings = kein Match) */
        function namesEqual(a, b) {
            const na = getUserDisplayName(a, "");
            const nb = getUserDisplayName(b, "");
            return !!(na && nb && na === nb);
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
                authUsernamePlaceholder: "Dein Spielername",
                authPasswordPlaceholder: "Dein sicheres Passwort",
                btnRegister: "Registrieren",
                btnLogin: "Einloggen",
                shopHead: "🛒 Vibe-Shop",
                coinsText: "Coins",
                badgesHead: "🏆 Deine Badges & Trophäen",
                statsHead: "📊 Deine Statistiken",
                statLevel: "Level",
                statXp: "XP",
                statCoins: "Coins",
                statMonthly: "Diesen Monat",
                statStreak: "Streak",
                statTruth: "Wahrheiten",
                statDare: "Pflichten",
                statTotal: "Aufgaben gesamt",
                statBadges: "Badges",
                statItems: "Items",
                statThemes: "Themes",
                btnProfile: "👤 Profil",
                profileTitle: "👤 Profil & Statistiken",
                profileStatsHead: "📊 Statistiken",
                profileBadgesHead: "🏆 Badges & Trophäen",
                profileClose: "Schließen",
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
                itemMoon: "Mond",
                itemClover: "Kleeblatt",
                itemTarget: "Zielscheibe",
                itemPizza: "Pizza",
                itemGamepad: "Controller",
                itemRocket: "Rakete",
                itemDragon: "Drache",
                itemIcecream: "Eis",
                itemTrophy: "Pokal",
                profileEmotesHead: "🙂 Profil-Emojis",
                profileEmotesDesc: "Kaufe Emojis und wähle sie im Profil als dein Avatar-Emoji – nicht als Dekoration!",
                jokersHead: "🃏 Joker",
                jokersDesc: "Kaufe Joker, um Aufgaben zu überspringen oder andere Spieler auszusetzen. Verbrauchsgut – nach Nutzung weg!",
                jokerSkipName: "Skip-Joker",
                jokerSkipDesc: "Eigene Aufgabe überspringen",
                jokerForceName: "Force-Skip-Joker",
                jokerForceDesc: "Aktuellen Spieler aussetzen",
                jokerSkipPackName: "Skip-Pack",
                jokerSkipPackDesc: "3 Skip-Joker (günstiger)",
                jokerForcePackName: "Force-Pack",
                jokerForcePackDesc: "2 Force-Skip-Joker",
                jokerSkipBtnText: "Aufgabe überspringen",
                jokerForceBtnText: "Spieler aussetzen",
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
                lbTitle: "🏆 Rangliste",
                lbDesc: "Die Spieler mit den meisten Coins:",
                lbGlobalTitle: "🌍 Gesamtwertung – alle Coins",
                lbMonthlyTitle: "📅 Monatswertung – Coins diesen Monat",
                lbCoins: "Coins",
                lbLoading: "Rangliste wird geladen …",
                lbError: "Die Rangliste konnte nicht geladen werden.",
                btnLogout: "Logout",
                btnDeleteAccount: "Konto löschen",
                alertDeleteOwnConfirm: "Möchtest du dein Konto wirklich unwiderruflich löschen?\n\nAlle deine Daten (XP, Coins, Badges, Freunde, …) werden gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.",
                alertDeleteOwnSuccess: "Dein Konto wurde erfolgreich gelöscht.",
                alertDeleteOwnError: "Fehler beim Löschen des Kontos. Bitte versuche es später erneut.",
                alertDeleteAdminConfirm: "Diesen Benutzer wirklich löschen?",
                btnClose: "Schließen",
                hudStreakText: "Streak",
                hudCoinsText: "Coins",
                btnShop: "🛒 Shop",
                btnAdmin: "🛡️ Admin",
                btnLeaderboard: "🏆 Rangliste",
                btnFriends: "👥 Freunde",
                btnPlayers: "🌐 Spieler",
                btnFeedback: "📝 Feedback",
                opTitle: "🌐 Online Spieler & Einladungen",
                opDesc: "Sieh, wer online ist, und lade Spieler in deine Lobby ein!",
                opClose: "Schließen",
                friendsTitle: "👥 Freunde",
                friendsListTab: "Freundesliste",
                friendsReqTab: "Anfragen",
                friendsAddTab: "Hinzufügen",
                friendsListDesc: "Deine Freunde – online Status & Lobby-Einladung",
                friendsReqDesc: "Eingehende Freundschaftsanfragen",
                friendsAddDesc: "Freund per E-Mail oder Name suchen",
                friendSearchPlaceholder: "E-Mail oder Anzeigename...",
                friendSearchBtn: "Suchen & Anfrage senden",
                friendsCloseBtn: "Schließen",
                privateLobbyHint: "🔑 Teile den Lobby-Code mit deinen Freunden oder lade sie direkt ein.",
                hostBtnPrivate: "Lobby erstellen (Host) 🏠",
                lbTabGlobal: "🌍 Global",
                lbTabFriends: "👥 Freunde",
                lbMetricTotal: "💰 Gesamt",
                lbMetricMonthly: "📅 Monat",
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
                wheelReady: "Rad bereit!",
                spinBtn: "Glücksrad jetzt drehen 🎡",
                nextRoundBtn: "➡ Weiter zur nächsten Runde!",
                chatPlaceholder: "Schreibe eine Nachricht...",
                chatSend: "Senden",
                chatToLabel: "An:",
                chatToAll: "🌐 Alle (öffentlich)",
                chatPrivateTo: "🔒 Privat an",
                chatPrivateFrom: "🔒 Privat von",
                chatPrivateSelf: "🔒 Du →",
                emergencyDesc: "Wer einknickt oder leakt, hat sofort verloren!",
                leakBtn: "🚨 Ich habe geleakt / musste pinkeln (Verloren!)",
                adminKickBtn: "🛡️ Spieler kicken (Admin)",
                fbTitle: "📝 Bug melden & Feedback",
                fbDesc: "Hast du einen Bug gefunden oder eine Idee? Sende es direkt an die Admins!",
                fbTypeLabel: "Art des Feedbacks:",
                fbOptBug: "🐛 Bug / technischer Fehler",
                fbOptImp: "💡 Verbesserung / Feature-Wunsch",
                fbMsgLabel: "Deine Nachricht:",
                fbPlaceholder: "Beschreibe den Bug oder deine Idee...",
                fbSendBtn: "Feedback absenden",
                fbCloseBtn: "Schließen",
                inviteTitle: "📬 Spiel-Einladung!",
                inviteAcceptBtn: "Annehmen ✅",
                inviteRejectBtn: "Ablehnen ❌",
                adminTitle: "🛡️ Admin Panel",
                adminDesc: "Verwalte Benutzer und Feedback.",
                adminUsersHead: "👥 Benutzer:",
                adminFbHead: "📥 Feedback:",
                adminCloseBtn: "Schließen",
                footerImprint: "Impressum",
                footerPrivacy: "Datenschutz",
                alertEmailNamePass: "Bitte E-Mail, Benutzername und Passwort eingeben!",
                alertRegistered: "Erfolgreich registriert!",
                alertAccountExists: "Dieses Konto existiert bereits! Bitte einloggen.",
                alertNoAccount: "Falsche Anmeldedaten oder Konto nicht gefunden!",
                alertNameCode: "Bitte Lobby-Code eingeben!",
                alertTask: "Bitte eine Aufgabe eingeben!",
                alertAnswer: "Bitte antworte auf die Frage!",
                alertFeedbackEmpty: "Bitte gib eine Nachricht ein!",
                alertFeedbackSuccess: "Feedback wurde erfolgreich gesendet!",
                alertNoPermission: "Keine Berechtigung!",
                alertNeedLobbyHost: "Du musst zuerst eine Lobby erstellen (Host), um jemanden einzuladen!",
                alertInviteSent: "Einladung gesendet! 🚀",
                alertInviteError: "Fehler beim Senden der Einladung.",
                spectateBtn: "Als Zuschauer beitreten (Admin/Master) 👁️",
                spectatorBadge: "👁️ ZUSCHAUER",
                spectator: "Zuschauer",
                lastOnline: "Zuletzt online: ",
                onlineNow: "Jetzt online",
                neverOnline: "Noch nie online",
                justNow: "Gerade eben",
                statusPanelTitle: "📊 Spieler-Status",
                statusSettingsBtn: "⚙️ Status einstellen",
                statusSettingsTitle: "⚙️ Mein Status einstellen",
                statusSettingsDesc: "Stelle deine aktuellen Werte ein – sie werden live an die Lobby gesendet.",
                statusSettingsClose: "Schließen",
                toiletLabel: "🚻 Klo-Dringlichkeit",
                hornyLabel: "🔥 Horny-Level",
                alcoholLabel: "🍺 Alkohol-Pegel",
                thirstLabel: "💧 Durst",
                energyLabel: "😴 Müdigkeit",
                toiletShort: "Klo",
                hornyShort: "Horny",
                alcoholShort: "Alkohol",
                thirstShort: "Durst",
                energyShort: "Müdigkeit",
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
                authUsernamePlaceholder: "Your Player Name",
                authPasswordPlaceholder: "Your secure password",
                btnRegister: "Register",
                btnLogin: "Log In",
                shopHead: "🛒 Vibe Shop",
                coinsText: "Coins",
                badgesHead: "🏆 Your Badges & Trophies",
                statsHead: "📊 Your Statistics",
                statLevel: "Level",
                statXp: "XP",
                statCoins: "Coins",
                statMonthly: "This month",
                statStreak: "Streak",
                statTruth: "Truths",
                statDare: "Dares",
                statTotal: "Total tasks",
                statBadges: "Badges",
                statItems: "Items",
                statThemes: "Themes",
                btnProfile: "👤 Profile",
                profileTitle: "👤 Profile & Statistics",
                profileStatsHead: "📊 Statistics",
                profileBadgesHead: "🏆 Badges & Trophies",
                profileClose: "Close",
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
                itemMoon: "Moon",
                itemClover: "Clover",
                itemTarget: "Target",
                itemPizza: "Pizza",
                itemGamepad: "Controller",
                itemRocket: "Rocket",
                itemDragon: "Dragon",
                itemIcecream: "Ice Cream",
                itemTrophy: "Trophy",
                profileEmotesHead: "🙂 Profile Emojis",
                profileEmotesDesc: "Buy emojis and select them as your profile avatar emoji – not as decoration!",
                jokersHead: "🃏 Jokers",
                jokersDesc: "Buy jokers to skip tasks or force other players to skip. Consumable – used up after one use!",
                jokerSkipName: "Skip Joker",
                jokerSkipDesc: "Skip your own task",
                jokerForceName: "Force-Skip Joker",
                jokerForceDesc: "Force the current player to skip",
                jokerSkipPackName: "Skip Pack",
                jokerSkipPackDesc: "3 Skip Jokers (cheaper)",
                jokerForcePackName: "Force Pack",
                jokerForcePackDesc: "2 Force-Skip Jokers",
                jokerSkipBtnText: "Skip task",
                jokerForceBtnText: "Force player skip",
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
                lbTitle: "🏆 Ranking",
                lbDesc: "Players with the most coins:",
                lbGlobalTitle: "🌍 All-time ranking – total coins",
                lbMonthlyTitle: "📅 Monthly ranking – coins this month",
                lbCoins: "Coins",
                lbLoading: "Loading leaderboard …",
                lbError: "Could not load the leaderboard.",
                btnLogout: "Logout",
                btnDeleteAccount: "Delete Account",
                alertDeleteOwnConfirm: "Do you really want to permanently delete your account?\n\nAll your data (XP, coins, badges, friends, …) will be deleted. This action cannot be undone.",
                alertDeleteOwnSuccess: "Your account has been successfully deleted.",
                alertDeleteOwnError: "Error deleting the account. Please try again later.",
                alertDeleteAdminConfirm: "Really delete this user?",
                btnClose: "Close",
                hudStreakText: "Streak",
                hudCoinsText: "Coins",
                btnShop: "🛒 Shop",
                btnAdmin: "🛡️ Admin",
                btnLeaderboard: "🏆 Ranking",
                btnFriends: "👥 Friends",
                btnPlayers: "🌐 Players",
                btnFeedback: "📝 Feedback",
                opTitle: "🌐 Online Players & Invites",
                opDesc: "See who is online and invite players to your lobby!",
                opClose: "Close",
                friendsTitle: "👥 Friends",
                friendsListTab: "Friend List",
                friendsReqTab: "Requests",
                friendsAddTab: "Add Friend",
                friendsListDesc: "Your friends – online status & lobby invite",
                friendsReqDesc: "Incoming friend requests",
                friendsAddDesc: "Search friend by email or name",
                friendSearchPlaceholder: "Email or display name...",
                friendSearchBtn: "Search & Send Request",
                friendsCloseBtn: "Close",
                privateLobbyHint: "🔑 Share the lobby code with your friends or invite them directly.",
                hostBtnPrivate: "Create Lobby (Host) 🏠",
                lbTabGlobal: "🌍 Global",
                lbTabFriends: "👥 Friends",
                lbMetricTotal: "💰 Total",
                lbMetricMonthly: "📅 Month",
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
                waitingOther: "Waiting for other players to confirm...",
                waitingOtherRound: "Waiting for confirmations from other players...",
                wheelHead: "🎡 WHEEL MODE: Everyone acts!",
                wheelDesc: "Everyone played truth or dare. Now the wheel spins for everyone!",
                wheelReady: "Wheel ready!",
                spinBtn: "Spin the wheel now 🎡",
                nextRoundBtn: "➡️ Next Round!",
                chatPlaceholder: "Type a message...",
                chatSend: "Send",
                chatToLabel: "To:",
                chatToAll: "🌐 Everyone (public)",
                chatPrivateTo: "🔒 Private to",
                chatPrivateFrom: "🔒 Private from",
                chatPrivateSelf: "🔒 You →",
                emergencyDesc: "Anyone who caves or leaks loses immediately!",
                leakBtn: "🚨 I leaked / had to pee (Lost!)",
                adminKickBtn: "🛡️ Kick player (Admin)",
                fbTitle: "📝 Report Bug & Feedback",
                fbDesc: "Found a bug or have an improvement suggestion? Send it directly!",
                fbTypeLabel: "Feedback Type:",
                fbOptBug: "🐛 Bug / Technical Issue",
                fbOptImp: "💡 Improvement / Feature Request",
                fbMsgLabel: "Your Message:",
                fbPlaceholder: "Describe the bug or your idea...",
                fbSendBtn: "Send Feedback",
                fbCloseBtn: "Close",
                inviteTitle: "📬 Game Invite!",
                inviteAcceptBtn: "Accept ✅",
                inviteRejectBtn: "Decline ❌",
                adminTitle: "🛡️ Admin Panel",
                adminDesc: "Manage users and feedback.",
                adminUsersHead: "👥 Users:",
                adminFbHead: "📥 Feedback:",
                adminCloseBtn: "Close",
                footerImprint: "Imprint",
                footerPrivacy: "Privacy Policy",
                alertEmailNamePass: "Please enter email, username and password!",
                alertRegistered: "Successfully registered!",
                alertAccountExists: "This account already exists! Please login.",
                alertNoAccount: "Incorrect login details or account not found!",
                alertNameCode: "Please enter lobby code!",
                alertTask: "Please enter a task!",
                alertAnswer: "Please answer the question!",
                alertFeedbackEmpty: "Please enter a message!",
                alertFeedbackSuccess: "Feedback successfully sent!",
                alertNoPermission: "Access denied / Not authorized!",
                alertNeedLobbyHost: "You must first create a lobby (Host) to invite someone!",
                alertInviteSent: "Invite sent! 🚀",
                alertInviteError: "Error sending invite.",
                spectateBtn: "Join as Spectator (Admin/Master) 👁️",
                spectatorBadge: "👁️ SPECTATOR",
                spectator: "Spectator",
                lastOnline: "Last online: ",
                onlineNow: "Online now",
                neverOnline: "Never online",
                justNow: "Just now",
                statusPanelTitle: "📊 Player Status",
                statusSettingsBtn: "⚙️ Set Status",
                statusSettingsTitle: "⚙️ Set my status",
                statusSettingsDesc: "Adjust your current values – they are sent live to the lobby.",
                statusSettingsClose: "Close",
                toiletLabel: "🚻 Restroom Urgency",
                hornyLabel: "🔥 Horny Level",
                alcoholLabel: "🍺 Alcohol Level",
                thirstLabel: "💧 Thirst",
                energyLabel: "😴 Tiredness",
                toiletShort: "Restroom",
                hornyShort: "Horny",
                alcoholShort: "Alcohol",
                thirstShort: "Thirst",
                energyShort: "Tiredness",
                wheelSectors: [
                    { title: "🍻 500ml CHUG!", desc: "Every player must immediately drink half a liter!" },
                    { title: "🚫 3 Rounds Restroom Ban!", desc: "No restroom for the next 3 rounds!" },
                    { title: "💧 Water Plunge", desc: "Everyone must chug a full glass of tap water!" },
                    { title: "🤫 Silence Duty", desc: "No one speaks for the next 2 rounds." },
                    { title: "🔄 Double Sip", desc: "Everyone gives 2 sips to someone." },
                    { title: "⚡ Bladder Dance", desc: "Hop in place for 30 seconds!" },
                    { title: "🍻 Everyone Drinks!", desc: "Everyone takes a big sip!" },
                    { title: "💧 Water Duty", desc: "Chug water if you have no drink!" },
                    { title: "🤫 Mute Duty", desc: "No noise for 2 rounds." },
                    { title: "🏋️‍♂️ Squat Alarm", desc: "Do 15 deep squats!" },
                    { title: "🚾 Pelvic Floor Test", desc: "Balance on right leg for 2 rounds!" },
                    { title: "⏱️ Plank of Truth", desc: "Plank for 45 seconds!" },
                    { title: "💧 Water Test", desc: "Chug a large glass of water!" }
                ]
            }
        };

        function changeLanguage(forcedLang) {
            const authSelect = document.getElementById("auth-lang-select");
            const appSelect = document.getElementById("lang-select");
            
            if (forcedLang === "de" || forcedLang === "en") {
                currentLang = forcedLang;
            } else if (authSelect && document.activeElement === authSelect) {
                currentLang = authSelect.value;
            } else if (appSelect && document.activeElement === appSelect) {
                currentLang = appSelect.value;
            }

            if (authSelect) authSelect.value = currentLang;
            if (appSelect) appSelect.value = currentLang;

            try {
                localStorage.setItem("lang", currentLang);
                localStorage.setItem("wop_lang", currentLang);
            } catch (e) {}

            document.documentElement.lang = currentLang;
            document.title = currentLang === "de"
                ? "Wahrheit oder Pflicht Partyspiel 🍻🚻"
                : "Truth or Dare Party Game 🍻🚻";
            const t = translations[currentLang] || translations.de;
            
            // Auth Modal
            const authTitle = document.getElementById("ui-auth-title"); if (authTitle) authTitle.innerText = t.authTitle;
            const authDesc = document.getElementById("ui-auth-desc"); if (authDesc) authDesc.innerText = t.authDesc;
            const labelEmail = document.getElementById("ui-label-email"); if (labelEmail) labelEmail.innerText = t.labelEmail;
            const labelUser = document.getElementById("ui-label-username"); if (labelUser) labelUser.innerText = t.labelUsername;
            const labelPass = document.getElementById("ui-label-pass"); if (labelPass) labelPass.innerText = t.labelPass;
            const authUserInp = document.getElementById("auth-username"); if (authUserInp) authUserInp.placeholder = t.authUsernamePlaceholder;
            const authPassInp = document.getElementById("auth-password"); if (authPassInp) authPassInp.placeholder = t.authPasswordPlaceholder;
            const btnReg = document.getElementById("ui-btn-register"); if (btnReg) btnReg.innerText = t.btnRegister;
            const btnLog = document.getElementById("ui-btn-login"); if (btnLog) btnLog.innerText = t.btnLogin;

            // Shop / Profil Modal
            const shopHead = document.getElementById("ui-shop-head"); if (shopHead) shopHead.innerText = t.shopHead;
            const coinsTxt = document.getElementById("ui-coins-text"); if (coinsTxt) coinsTxt.innerText = t.coinsText;
            const badgesHead = document.getElementById("ui-badges-head"); if (badgesHead) badgesHead.innerText = t.badgesHead;
            const accHead = document.getElementById("ui-accessories-head"); if (accHead) accHead.innerText = t.accessoriesHead;
            // Profil-Modal Texte
            const profileTitle = document.getElementById("ui-profile-title"); if (profileTitle) profileTitle.innerText = t.profileTitle || (currentLang === "de" ? "👤 Profil & Statistiken" : "👤 Profile & Statistics");
            const profileStatsHead = document.getElementById("ui-profile-stats-head"); if (profileStatsHead) profileStatsHead.innerText = t.profileStatsHead || (currentLang === "de" ? "📊 Statistiken" : "📊 Statistics");
            const profileBadgesHead = document.getElementById("ui-profile-badges-head"); if (profileBadgesHead) profileBadgesHead.innerText = t.profileBadgesHead || (currentLang === "de" ? "🏆 Badges & Trophäen" : "🏆 Badges & Trophies");
            const profileClose = document.getElementById("ui-profile-close-btn"); if (profileClose) profileClose.innerText = t.profileClose || t.btnClose || (currentLang === "de" ? "Schließen" : "Close");
            const btnProfile = document.getElementById("ui-btn-profile"); if (btnProfile) btnProfile.innerText = t.btnProfile || (currentLang === "de" ? "👤 Profil" : "👤 Profile");
            const statLabels = {
                "ui-stat-level-label": t.statLevel || "Level",
                "ui-stat-xp-label": t.statXp || "XP",
                "ui-stat-coins-label": t.statCoins || "Coins",
                "ui-stat-monthly-label": t.statMonthly || (currentLang === "de" ? "Diesen Monat" : "This month"),
                "ui-stat-streak-label": t.statStreak || "Streak",
                "ui-stat-truth-label": t.statTruth || (currentLang === "de" ? "Wahrheiten" : "Truths"),
                "ui-stat-dare-label": t.statDare || (currentLang === "de" ? "Pflichten" : "Dares"),
                "ui-stat-total-label": t.statTotal || (currentLang === "de" ? "Aufgaben gesamt" : "Total tasks"),
                "ui-stat-badges-label": t.statBadges || "Badges",
                "ui-stat-items-label": t.statItems || "Items",
                "ui-stat-themes-label": t.statThemes || "Themes"
            };
            Object.entries(statLabels).forEach(([id, label]) => {
                const el = document.getElementById(id);
                if (el) el.innerText = label;
            });
            const itemCrown = document.getElementById("ui-item-crown"); if (itemCrown) itemCrown.innerText = t.itemCrown;
            const itemGlasses = document.getElementById("ui-item-glasses"); if (itemGlasses) itemGlasses.innerText = t.itemGlasses;
            const itemHat = document.getElementById("ui-item-hat"); if (itemHat) itemHat.innerText = t.itemHat;
            const itemBeard = document.getElementById("ui-item-beard"); if (itemBeard) itemBeard.innerText = t.itemBeard;
            const itemSparkles = document.getElementById("ui-item-sparkles"); if (itemSparkles) itemSparkles.innerText = t.itemSparkles;
            const itemHeadphones = document.getElementById("ui-item-headphones"); if (itemHeadphones) itemHeadphones.innerText = t.itemHeadphones;
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
            Object.entries(extraItemIds).forEach(([id, label]) => {
                const el = document.getElementById(id);
                if (el && label) el.innerText = label;
            });
            // Profil-Emoji-Shop
            const peHead = document.getElementById("ui-profile-emotes-head");
            if (peHead) peHead.innerText = t.profileEmotesHead || (currentLang === "de" ? "🙂 Profil-Emojis" : "🙂 Profile Emojis");
            const peDesc = document.getElementById("ui-profile-emotes-desc");
            if (peDesc) peDesc.innerText = t.profileEmotesDesc || (currentLang === "de"
                ? "Kaufe Emojis und wähle sie im Profil als dein Avatar-Emoji – nicht als Dekoration!"
                : "Buy emojis and select them as your profile avatar emoji – not as decoration!");
            const emoteShopIds = {
                "ui-emote-shop-moon": t.itemMoon,
                "ui-emote-shop-clover": t.itemClover,
                "ui-emote-shop-target": t.itemTarget,
                "ui-emote-shop-pizza": t.itemPizza,
                "ui-emote-shop-gamepad": t.itemGamepad,
                "ui-emote-shop-rocket": t.itemRocket,
                "ui-emote-shop-dragon": t.itemDragon,
                "ui-emote-shop-icecream": t.itemIcecream,
                "ui-emote-shop-trophy": t.itemTrophy
            };
            Object.entries(emoteShopIds).forEach(([id, label]) => {
                const el = document.getElementById(id);
                if (el && label) el.innerText = label;
            });
            document.querySelectorAll(".emote-action-btn").forEach(el => {
                // Text wird von updateShopEmoteButtons gesetzt
            });
            try { updateShopEmoteButtons(); } catch (e) {}
            try { refreshEmoteSelect(); } catch (e) {}
            // Joker-Shop & Buttons
            const jokersHead = document.getElementById("ui-jokers-head"); if (jokersHead) jokersHead.innerText = t.jokersHead || "🃏 Joker";
            const jokersDesc = document.getElementById("ui-jokers-desc"); if (jokersDesc) jokersDesc.innerText = t.jokersDesc || "";
            const jsName = document.getElementById("ui-joker-skip-name"); if (jsName) jsName.innerText = t.jokerSkipName || "Skip-Joker";
            const jsDesc = document.getElementById("ui-joker-skip-desc"); if (jsDesc) jsDesc.innerText = t.jokerSkipDesc || "";
            const jfName = document.getElementById("ui-joker-force-name"); if (jfName) jfName.innerText = t.jokerForceName || "Force-Skip";
            const jfDesc = document.getElementById("ui-joker-force-desc"); if (jfDesc) jfDesc.innerText = t.jokerForceDesc || "";
            const jspName = document.getElementById("ui-joker-skip-pack-name"); if (jspName) jspName.innerText = t.jokerSkipPackName || "Skip-Pack";
            const jspDesc = document.getElementById("ui-joker-skip-pack-desc"); if (jspDesc) jspDesc.innerText = t.jokerSkipPackDesc || "";
            const jfpName = document.getElementById("ui-joker-force-pack-name"); if (jfpName) jfpName.innerText = t.jokerForcePackName || "Force-Pack";
            const jfpDesc = document.getElementById("ui-joker-force-pack-desc"); if (jfpDesc) jfpDesc.innerText = t.jokerForcePackDesc || "";
            const jsBtn = document.getElementById("ui-joker-skip-btn-text"); if (jsBtn) jsBtn.innerText = t.jokerSkipBtnText || "Aufgabe überspringen";
            const jfBtn = document.getElementById("ui-joker-force-btn-text"); if (jfBtn) jfBtn.innerText = t.jokerForceBtnText || "Spieler aussetzen";
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
            Object.entries(themeIds).forEach(([id, label]) => {
                const el = document.getElementById(id);
                if (el && label) el.innerText = label;
            });
            const emoteLabel = document.getElementById("ui-avatar-emote-label");
            if (emoteLabel) emoteLabel.innerText = t.avatarEmoteLabel;
            const emoteLabels = {
                "ui-emote-happy": ["😊 ", t.emoteHappy],
                "ui-emote-excited": ["🤩 ", t.emoteExcited], "ui-emote-party": ["🥳 ", t.emoteParty],
                "ui-emote-cheeky": ["😈 ", t.emoteCheeky], "ui-emote-robot": ["🤖 ", t.emoteRobot],
                "ui-emote-ghost": ["👻 ", t.emoteGhost], "ui-emote-cat": ["🐱 ", t.emoteCat],
                "ui-emote-fox": ["🦊 ", t.emoteFox], "ui-emote-frog": ["🐸 ", t.emoteFrog],
                "ui-emote-skull": ["💀 ", t.emoteSkull], "ui-emote-fire": ["🔥 ", t.emoteFire]
            };
            Object.entries(emoteLabels).forEach(([id, parts]) => {
                const el = document.getElementById(id);
                if (el) el.textContent = parts[0] + parts[1];
            });
            document.querySelectorAll(".shop-action-btn").forEach(el => el.innerText = t.buyEquipBtn);
            const themesHead = document.getElementById("ui-themes-head"); if (themesHead) themesHead.innerText = t.themesHead;
            document.querySelectorAll(".theme-action-btn").forEach(el => el.innerText = t.unlockBtn);
            const btnLogout = document.getElementById("ui-btn-logout"); if (btnLogout) btnLogout.innerText = t.btnLogout;
            const btnDeleteAccount = document.getElementById("ui-btn-delete-account"); if (btnDeleteAccount) btnDeleteAccount.innerText = t.btnDeleteAccount;
            const btnClose = document.getElementById("ui-btn-close"); if (btnClose) btnClose.innerText = t.btnClose;

            // Feedback Modal
            const fbTitle = document.getElementById("ui-fb-title"); if (fbTitle) fbTitle.innerText = t.fbTitle;
            const fbDesc = document.getElementById("ui-fb-desc"); if (fbDesc) fbDesc.innerText = t.fbDesc;
            const fbTypeLabel = document.getElementById("ui-fb-type-label"); if (fbTypeLabel) fbTypeLabel.innerText = t.fbTypeLabel;
            const fbOptBug = document.getElementById("ui-fb-opt-bug"); if (fbOptBug) fbOptBug.innerText = t.fbOptBug;
            const fbOptImp = document.getElementById("ui-fb-opt-imp"); if (fbOptImp) fbOptImp.innerText = t.fbOptImp;
            const fbMsgLabel = document.getElementById("ui-fb-msg-label"); if (fbMsgLabel) fbMsgLabel.innerText = t.fbMsgLabel;
            const fbTextInp = document.getElementById("feedback-text-input"); if (fbTextInp) fbTextInp.placeholder = t.fbPlaceholder;
            const fbSendBtn = document.getElementById("ui-fb-send-btn"); if (fbSendBtn) fbSendBtn.innerText = t.fbSendBtn;
            const fbCloseBtn = document.getElementById("ui-fb-close-btn"); if (fbCloseBtn) fbCloseBtn.innerText = t.fbCloseBtn;

            // Leaderboard Modal
            const lbTitle = document.getElementById("ui-lb-title"); if (lbTitle) lbTitle.innerText = t.lbTitle;
            const lbDesc = document.getElementById("ui-lb-desc"); if (lbDesc) lbDesc.innerText = t.lbDesc;
            const lbCloseEl = document.getElementById("ui-lb-close-btn"); if (lbCloseEl) lbCloseEl.innerText = t.lbClose;
            const lbTabGlob = document.getElementById("lb-tab-global"); if (lbTabGlob) lbTabGlob.innerText = t.lbTabGlobal;
            const lbTabFr = document.getElementById("lb-tab-friends"); if (lbTabFr) lbTabFr.innerText = t.lbTabFriends;
            const lbMetricTotal = document.getElementById("lb-metric-total"); if (lbMetricTotal) lbMetricTotal.innerText = t.lbMetricTotal || (currentLang === "de" ? "💰 Gesamt" : "💰 Total");
            const lbMetricMonthly = document.getElementById("lb-metric-monthly"); if (lbMetricMonthly) lbMetricMonthly.innerText = t.lbMetricMonthly || (currentLang === "de" ? "📅 Monat" : "📅 Month");

            // Online Players Modal
            const opTitleEl = document.getElementById("ui-op-title"); if (opTitleEl) opTitleEl.innerText = t.opTitle;
            const opDescEl = document.getElementById("ui-op-desc"); if (opDescEl) opDescEl.innerText = t.opDesc;
            const opCloseEl = document.getElementById("ui-op-close-btn"); if (opCloseEl) opCloseEl.innerText = t.opClose;

            // Invite Modal
            const invTitle = document.getElementById("ui-invite-title"); if (invTitle) invTitle.innerText = t.inviteTitle;
            const invAccept = document.getElementById("ui-invite-accept-btn"); if (invAccept) invAccept.innerText = t.inviteAcceptBtn;
            const invReject = document.getElementById("ui-invite-reject-btn"); if (invReject) invReject.innerText = t.inviteRejectBtn;

            // Admin Modal
            const admTitle = document.getElementById("ui-admin-title"); if (admTitle) admTitle.innerText = t.adminTitle;
            const admDesc = document.getElementById("ui-admin-desc"); if (admDesc) admDesc.innerText = t.adminDesc;
            const admUsers = document.getElementById("ui-admin-users-head"); if (admUsers) admUsers.innerText = t.adminUsersHead;
            const admFb = document.getElementById("ui-admin-fb-head"); if (admFb) admFb.innerText = t.adminFbHead;
            const admClose = document.getElementById("ui-admin-close-btn"); if (admClose) admClose.innerText = t.adminCloseBtn;

            // Friends Modal
            const frTitle = document.getElementById("ui-friends-title"); if (frTitle) frTitle.innerText = t.friendsTitle;
            const frTabListText = document.getElementById("ui-friends-tab-list-text"); if (frTabListText) frTabListText.innerText = t.friendsListTab;
            const frTabReqText = document.getElementById("ui-friends-tab-req-text"); if (frTabReqText) frTabReqText.innerText = t.friendsReqTab;
            const frTabAddText = document.getElementById("ui-friends-tab-add-text"); if (frTabAddText) frTabAddText.innerText = t.friendsAddTab;
            const frListDesc = document.getElementById("ui-friends-list-desc"); if (frListDesc) frListDesc.innerText = t.friendsListDesc;
            const frReqDesc = document.getElementById("ui-friends-req-desc"); if (frReqDesc) frReqDesc.innerText = t.friendsReqDesc;
            const frAddDesc = document.getElementById("ui-friends-add-desc"); if (frAddDesc) frAddDesc.innerText = t.friendsAddDesc;
            const frSearchInp = document.getElementById("friend-search-input"); if (frSearchInp) frSearchInp.placeholder = t.friendSearchPlaceholder;
            const frSearchBtn = document.getElementById("ui-friend-search-btn"); if (frSearchBtn) frSearchBtn.innerText = t.friendSearchBtn;
            const frCloseBtn = document.getElementById("ui-friends-close-btn"); if (frCloseBtn) frCloseBtn.innerText = t.friendsCloseBtn;

            // HUD & Navigation
            const hudStreak = document.getElementById("ui-hud-streak-text"); if (hudStreak) hudStreak.innerText = t.hudStreakText;
            const hudCoins = document.getElementById("ui-hud-coins-text"); if (hudCoins) hudCoins.innerText = t.hudCoinsText;
            const adminBtn = document.getElementById("btn-admin-panel"); if (adminBtn) adminBtn.innerText = t.btnAdmin;
            const lbBtn = document.getElementById("ui-btn-leaderboard"); if (lbBtn) lbBtn.innerText = t.btnLeaderboard;
            const frBtn = document.getElementById("ui-btn-friends"); if (frBtn) frBtn.innerText = t.btnFriends;
            const playersBtn = document.getElementById("ui-btn-players"); if (playersBtn) playersBtn.innerText = t.btnPlayers;
            const fbBtn = document.getElementById("ui-btn-feedback"); if (fbBtn) fbBtn.innerText = t.btnFeedback;
            const shopBtn = document.getElementById("ui-btn-shop"); if (shopBtn) shopBtn.innerText = t.btnShop;
            const leaveBtn = document.getElementById("leave-lobby-btn"); if (leaveBtn) leaveBtn.innerText = t.leaveBtn;
            const langLabel = document.getElementById("ui-lang-label-text"); if (langLabel) langLabel.innerText = t.langLabelText;

            // Setup / Lobby
            const mainTitle = document.getElementById("ui-title"); if (mainTitle) mainTitle.innerText = t.title;
            const mainSub = document.getElementById("ui-subtitle"); if (mainSub) mainSub.innerText = t.subtitle;
            const setupHead = document.getElementById("ui-setup-head"); if (setupHead) setupHead.innerText = t.setupHead;
            const privHint = document.getElementById("ui-private-lobby-hint"); if (privHint) privHint.innerText = t.privateLobbyHint;
            const hostBtn = document.getElementById("ui-host-btn"); if (hostBtn) hostBtn.innerText = t.hostBtn;
            const lobbyInp = document.getElementById("lobby-code-input"); if (lobbyInp) lobbyInp.placeholder = t.lobbyCodeInputPlaceholder;
            const joinBtn = document.getElementById("ui-join-btn"); if (joinBtn) joinBtn.innerText = t.joinBtn;
            const spectateBtn = document.getElementById("ui-spectate-btn"); if (spectateBtn) spectateBtn.innerText = t.spectateBtn;
            const specBadge = document.getElementById("hud-spectator-badge"); if (specBadge) specBadge.innerText = t.spectatorBadge;

            // Lobby Wartesaal
            const lobbyCodeTitle = document.getElementById("ui-lobby-code-title");
            if (lobbyCodeTitle) {
                const dispCode = (activeLobbyCode || "").toUpperCase();
                lobbyCodeTitle.innerHTML = t.lobbyCodeTitle + `<span id="display-code" style="color: #ffcc00; font-size: 18px;">${dispCode}</span>`;
            }
            const shareCode = document.getElementById("ui-share-code"); if (shareCode) shareCode.innerText = t.shareCode;
            const startBtn = document.getElementById("start-btn"); if (startBtn) startBtn.innerText = t.startBtn;
            const clientWait = document.getElementById("client-wait-msg"); if (clientWait) clientWait.innerText = t.clientWaitMsg;

            // Wahrheit / Pflicht
            const turnTitleEl = document.getElementById("wop-turn-title");
            if (turnTitleEl && players[currentPlayerIndex]) {
                const curName = getUserDisplayName(players[currentPlayerIndex], "Spieler");
                turnTitleEl.innerHTML = t.turnTitle + `<span style="color: var(--primary-color);">${curName}</span>`;
            }
            const choiceLabel = document.getElementById("ui-choice-label"); if (choiceLabel) choiceLabel.innerText = t.choiceLabel;
            const optTruth = document.getElementById("ui-opt-truth"); if (optTruth) optTruth.innerText = t.optTruth;
            const optDare = document.getElementById("ui-opt-dare"); if (optDare) optDare.innerText = t.optDare;
            const selectBtn = document.getElementById("ui-select-btn"); if (selectBtn) selectBtn.innerText = t.selectBtn;
            const sendTaskBtn = document.getElementById("ui-send-task-btn"); if (sendTaskBtn) sendTaskBtn.innerText = t.sendTaskBtn;
            const customTaskInp = document.getElementById("custom-task-input"); if (customTaskInp) customTaskInp.placeholder = t.taskInputPlaceholder;
            const ansLabel = document.getElementById("ui-answer-label"); if (ansLabel) ansLabel.innerText = t.answerLabel;
            const ansInp = document.getElementById("player-answer-input"); if (ansInp) ansInp.placeholder = t.answerPlaceholder;
            const submitAnsBtn = document.getElementById("ui-submit-answer-btn"); if (submitAnsBtn) submitAnsBtn.innerText = t.submitAnswerBtn;
            const dareDoneBtn = document.getElementById("ui-dare-done-btn"); if (dareDoneBtn) dareDoneBtn.innerText = t.dareDoneBtn;
            const doneHead = document.getElementById("ui-done-head"); if (doneHead) doneHead.innerText = t.doneHead;
            const nextTurnBtn = document.getElementById("next-turn-btn"); if (nextTurnBtn) nextTurnBtn.innerText = t.nextTurnBtn;
            const waitOther = document.getElementById("ui-waiting-other"); if (waitOther) waitOther.innerText = t.waitingOther;

            // Rad / Chat / Notfall
            const wheelHead = document.getElementById("ui-wheel-head"); if (wheelHead) wheelHead.innerText = t.wheelHead;
            const wheelDesc = document.getElementById("ui-wheel-desc"); if (wheelDesc) wheelDesc.innerText = t.wheelDesc;
            const wheelCont = document.getElementById("wheel-container");
            if (wheelCont && (wheelCont.innerText === "Rad bereit!" || wheelCont.innerText === "Wheel ready!")) {
                wheelCont.innerText = t.wheelReady;
            }
            const spinBtn = document.getElementById("spin-btn"); if (spinBtn) spinBtn.innerText = t.spinBtn;
            const nextRoundBtn = document.getElementById("next-round-btn"); if (nextRoundBtn) nextRoundBtn.innerText = t.nextRoundBtn;
            const waitOtherRound = document.getElementById("ui-waiting-other-round"); if (waitOtherRound) waitOtherRound.innerText = t.waitingOtherRound;
            const chatInp = document.getElementById("chat-input"); if (chatInp) chatInp.placeholder = t.chatPlaceholder;
            const chatSend = document.getElementById("ui-chat-send"); if (chatSend) chatSend.innerText = t.chatSend;
            const chatToLabel = document.getElementById("ui-chat-to-label"); if (chatToLabel) chatToLabel.innerText = t.chatToLabel || (currentLang === "de" ? "An:" : "To:");
            const chatToAll = document.getElementById("ui-chat-to-all"); if (chatToAll) chatToAll.innerText = t.chatToAll || (currentLang === "de" ? "🌐 Alle (öffentlich)" : "🌐 Everyone (public)");
            refreshChatRecipientSelect();
            const emDesc = document.getElementById("ui-emergency-desc"); if (emDesc) emDesc.innerText = t.emergencyDesc;
            const leakBtn = document.getElementById("ui-leak-btn"); if (leakBtn) leakBtn.innerText = t.leakBtn;
            const adminKickBtn = document.getElementById("ui-admin-kick-btn"); if (adminKickBtn) adminKickBtn.innerText = t.adminKickBtn || (currentLang === "de" ? "🛡️ Spieler kicken (Admin)" : "🛡️ Kick player (Admin)");

            // Spieler-Status Panel + Einstellungs-Modal
            const statusTitle = document.getElementById("status-panel-title");
            if (statusTitle) statusTitle.innerText = t.statusPanelTitle || (currentLang === "de" ? "📊 Spieler-Status" : "📊 Player Status");
            const statusBtn = document.getElementById("ui-btn-status-settings");
            if (statusBtn) statusBtn.innerText = t.statusSettingsBtn || (currentLang === "de" ? "⚙️ Status einstellen" : "⚙️ Set Status");
            const statusSetTitle = document.getElementById("ui-status-settings-title");
            if (statusSetTitle) statusSetTitle.innerText = t.statusSettingsTitle || (currentLang === "de" ? "⚙️ Mein Status einstellen" : "⚙️ Set my status");
            const statusSetDesc = document.getElementById("ui-status-settings-desc");
            if (statusSetDesc) statusSetDesc.innerText = t.statusSettingsDesc || (currentLang === "de" ? "Stelle deine aktuellen Werte ein – sie werden live an die Lobby gesendet." : "Adjust your current values – they are sent live to the lobby.");
            const statusSetClose = document.getElementById("ui-status-settings-close");
            if (statusSetClose) statusSetClose.innerText = t.statusSettingsClose || (currentLang === "de" ? "Schließen" : "Close");
            const statusLabelMap = [
                { id: "ui-toilet-label", valueId: "toilet-level-value", key: "toiletLabel", fallbackDe: "🚻 Klo-Dringlichkeit", fallbackEn: "🚻 Restroom Urgency" },
                { id: "ui-horny-label", valueId: "horny-level-value", key: "hornyLabel", fallbackDe: "🔥 Horny-Level", fallbackEn: "🔥 Horny Level" },
                { id: "ui-alcohol-label", valueId: "alcohol-level-value", key: "alcoholLabel", fallbackDe: "🍺 Alkohol-Pegel", fallbackEn: "🍺 Alcohol Level" },
                { id: "ui-thirst-label", valueId: "thirst-level-value", key: "thirstLabel", fallbackDe: "💧 Durst", fallbackEn: "💧 Thirst" },
                { id: "ui-energy-label", valueId: "energy-level-value", key: "energyLabel", fallbackDe: "😴 Müdigkeit", fallbackEn: "😴 Tiredness" }
            ];
            statusLabelMap.forEach(({ id, valueId, key, fallbackDe, fallbackEn }) => {
                const lbl = document.getElementById(id);
                if (!lbl) return;
                const val = document.getElementById(valueId);
                const pct = val ? val.textContent : "0%";
                const text = t[key] || (currentLang === "de" ? fallbackDe : fallbackEn);
                lbl.innerHTML = `${text}: <span id="${valueId}">${pct}</span>`;
            });

            // Footer
            const footerImp = document.getElementById("ui-footer-imprint"); if (footerImp) footerImp.innerText = t.footerImprint;
            const footerPriv = document.getElementById("ui-footer-privacy"); if (footerPriv) footerPriv.innerText = t.footerPrivacy;

            if (myName) {
                try { updateProfileModal(); } catch (e) {}
            }
            if (currentSharedResult && !document.getElementById("result-feedback-area").classList.contains("hidden")) {
                const fbPlayer = document.getElementById("feedback-player-name");
                if (fbPlayer) {
                    fbPlayer.innerText = currentLang === 'de'
                        ? `${currentSharedResult.targetPlayer} hat abgeschlossen!`
                        : `${currentSharedResult.targetPlayer} finished!`;
                }
                const fbTask = document.getElementById("feedback-task-info");
                if (fbTask) {
                    fbTask.innerText = currentLang === 'de'
                        ? `Aufgabe: "${currentSharedResult.taskText}"`
                        : `Task: "${currentSharedResult.taskText}"`;
                }
            }

            updatePlayerList();
        }

        function changeLanguageFromApp(forcedLang) {
            changeLanguage(forcedLang);
        }

// ==============================================================================
// 4. SPIELER-STATUS & LOKALE ZUSTANDSVARIABLEN
// ==============================================================================
        // --- ZENTRALES & FIREBASE PERSISTENTES SYSTEM ---
        let myName = "";
        let myEmail = "";
        let myRole = "user";
        // Fester Master-Account – Rolle darf nie auf etwas anderes als "master" fallen.
        const MASTER_EMAIL = "master@vibe.party";
        function isMasterAccount(email) {
            return String(email || "").trim().toLowerCase() === MASTER_EMAIL;
        }
        function resolveRole(email, storedRole) {
            if (isMasterAccount(email)) return "master";
            return storedRole || "user";
        }
        let userXP = 0;
        let userCoins = 50;
        let monthlyCoins = 0;
        let monthlyCoinsMonth = "";
        let userStreak = 0;
        let userLevel = 1;
        let equippedAccessory = "";
        let avatarEmote = "😊";
        let unlockedItems = [];
        let unlockedThemes = [];
        let unlockedBadges = [];
        /** Freigeschaltete Profil-Emojis (Shop) – speichern das Emoji-Zeichen selbst */
        let unlockedEmotes = [];
        let truthCount = 0;
        let dareCount = 0;
        /** Verbrauchbare Joker (müssen im Shop gekauft werden) */
        let jokerSkipCount = 0;   // eigene Aufgabe überspringen
        let jokerForceCount = 0;  // anderen Spieler aussetzen
        let isSpectator = false;
        let currentTaskCreator = "";

        /** Kostenpflichtige Profil-Emojis (Emoji → Anzeigename DE/EN über Translations) */
        const PREMIUM_EMOTES = [
            { emoji: "🌙", key: "moon", cost: 70 },
            { emoji: "🍀", key: "clover", cost: 55 },
            { emoji: "🎯", key: "target", cost: 90 },
            { emoji: "🍕", key: "pizza", cost: 60 },
            { emoji: "🎮", key: "gamepad", cost: 100 },
            { emoji: "🚀", key: "rocket", cost: 125 },
            { emoji: "🐉", key: "dragon", cost: 180 },
            { emoji: "🍦", key: "icecream", cost: 50 },
            { emoji: "🏆", key: "trophy", cost: 160 }
        ];
        const FREE_EMOTES = ["😊", "🤩", "🥳", "😈", "🤖", "👻", "🐱", "🦊", "🐸", "💀", "🔥"];

        // --- IN-MEMORY CACHES ZUR PERFORMANCE-STEIGERUNG & FIREBASE-ENTLASTUNG ---
        let leaderboardCache = null;
        let leaderboardCacheTime = 0;
        const LEADERBOARD_CACHE_TTL = 45000; // 45s Cache

        let adminUserListCache = null;
        let adminUserListCacheTime = 0;
        const ADMIN_USER_CACHE_TTL = 30000; // 30s Cache

        let friendsListCache = null;
        let friendsListCacheTime = 0;
        const FRIENDS_CACHE_TTL = 20000; // 20s Cache

        function getLastActiveMillis(timestamp) {
            if (!timestamp) return 0;
            if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
            if (typeof timestamp.toDate === "function") return timestamp.toDate().getTime();
            if (timestamp instanceof Date) return timestamp.getTime();
            if (typeof timestamp === "number") return timestamp;
            if (typeof timestamp.seconds === "number") return timestamp.seconds * 1000;
            return 0;
        }

        function formatLastOnline(lastActive, isOnlineFlag) {
            const ms = getLastActiveMillis(lastActive);
            const now = Date.now();
            const isOnline = !!isOnlineFlag && ms > 0 && (now - ms < ONLINE_TIMEOUT_MS);
            
            if (isOnline) {
                return {
                    isOnline: true,
                    text: currentLang === "de" ? "Jetzt online" : "Online now",
                    color: "#28a745"
                };
            }
            
            if (!ms) {
                return {
                    isOnline: false,
                    text: currentLang === "de" ? "Noch nie online" : "Never online",
                    color: "#888888"
                };
            }
            
            const diffSec = Math.floor((now - ms) / 1000);
            const diffMin = Math.floor(diffSec / 60);
            const diffHours = Math.floor(diffMin / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            let timeStr = "";
            if (diffMin < 1) {
                timeStr = currentLang === "de" ? "Gerade eben" : "Just now";
            } else if (diffMin < 60) {
                timeStr = currentLang === "de" ? `vor ${diffMin} Min.` : `${diffMin}m ago`;
            } else if (diffHours < 24) {
                timeStr = currentLang === "de" ? `vor ${diffHours} Std.` : `${diffHours}h ago`;
            } else if (diffDays === 1) {
                const d = new Date(ms);
                const t = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                timeStr = currentLang === "de" ? `gestern um ${t}` : `yesterday at ${t}`;
            } else if (diffDays < 7) {
                timeStr = currentLang === "de" ? `vor ${diffDays} Tagen` : `${diffDays}d ago`;
            } else {
                const d = new Date(ms);
                const dateStr = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth()+1).padStart(2, "0")}.${d.getFullYear()}`;
                timeStr = currentLang === "de" ? `am ${dateStr}` : `on ${dateStr}`;
            }
            
            return {
                isOnline: false,
                text: (currentLang === "de" ? "Zuletzt online: " : "Last online: ") + timeStr,
                color: "#aaaaaa"
            };
        }

// ==============================================================================
// 5. CLOUD-SYNCHRONISATION & ONLINE-STATUS (HEARTBEAT)
// ==============================================================================
        async function loadUserDataFromCloud() {
            if (!myEmail) return;
            try {
                let docRef = db.collection("users").doc(myEmail);
                let doc = await docRef.get();
                if (doc.exists) {
                    let data = doc.data();
                    myName = getUserDisplayName(data, myName || "Spieler");
                    // Master-Rolle ist fest an die Master-E-Mail gebunden und kann
                    // nicht durch veraltete/überschriebene Cloud-Daten verloren gehen.
                    myRole = resolveRole(myEmail, data.role);

                    // Falls die Rolle in der Cloud falsch ist (z. B. nach Race/Bug),
                    // sofort wieder auf "master" korrigieren.
                    if (isMasterAccount(myEmail) && data.role !== "master") {
                        try {
                            await docRef.set({ role: "master" }, { merge: true });
                        } catch (e) {}
                    }

                    // Alte Accounts ohne "name" werden beim nächsten Laden repariert.
                    if ((!data.name || typeof data.name !== "string" || !data.name.trim()) &&
                        myName && myName !== "Spieler") {
                        try {
                            await docRef.set({ name: myName }, { merge: true });
                        } catch (e) {}
                    }
                    userXP = data.xp || 0;
                    userCoins = data.coins || 50;
                    monthlyCoins = Number(data.monthlyCoins) || 0;
                    monthlyCoinsMonth = data.monthlyCoinsMonth || getCurrentMonthKey(); 
                    userStreak = data.streak || 0;
                    equippedAccessory = data.accessory || "";
                    avatarEmote = data.avatarEmote || "😊";
                    unlockedItems = data.items || [];
                    unlockedThemes = data.themes || [];
                    unlockedBadges = data.badges || [];
                    unlockedEmotes = Array.isArray(data.emotes) ? data.emotes.filter(Boolean) : [];
                    truthCount = data.truthCount || 0;
                    dareCount = data.dareCount || 0;
                    jokerSkipCount = Number(data.jokerSkip) || 0;
                    jokerForceCount = Number(data.jokerForce) || 0;
                    {
                        const raw = Array.isArray(data.friends) ? data.friends : [];
                        myFriends = [...new Set(raw.map(e => String(e || "").trim().toLowerCase()).filter(Boolean))];
                    }
                    if (data.theme) setTheme(data.theme);
                } else {
                    console.warn("Benutzerdaten nicht gefunden - Logout.");
                    logoutUser();
                    return;
                }
                calculateLevel();
                checkBadges();
                updateHUD();
                updateProfileModal();
                // Neu freigeschaltete Badges (z. B. durch erweiterte Badge-Logik) speichern
                saveUserDataToCloud();
                checkAdminPermissions();
                updateOnlineStatus(true);
                startOnlineHeartbeat();
            } catch (e) {
                console.error("Fehler beim Laden aus Cloud:", e);
            }
        }

        function getCurrentMonthKey() {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}`;
        }

        function ensureMonthlyCoinReset() {
            const current = getCurrentMonthKey();
            if (monthlyCoinsMonth !== current) {
                monthlyCoins = 0;
                monthlyCoinsMonth = current;
                return true;
            }
            return false;
        }

        function addMonthlyCoins(amount) {
            ensureMonthlyCoinReset();
            monthlyCoins += Math.max(0, Number(amount) || 0);
        }
        
        // Prüft regelmäßig den Monatswechsel. Am 1. des neuen Monats wird
        // die Monatsrangliste automatisch auf 0 gesetzt. Falls die Seite
        // beim Monatswechsel geschlossen war, passiert der Reset beim nächsten Öffnen.
        let monthlyResetTimer = null;
        function startMonthlyResetWatcher() {
            if (monthlyResetTimer) clearInterval(monthlyResetTimer);
            monthlyResetTimer = setInterval(async () => {
                const changed = ensureMonthlyCoinReset();
                if (changed && myEmail) {
                    await saveUserDataToCloud();
                    updateHUD();
                }
            }, 30000);
        }

        async function saveUserDataToCloud() {
            if (!myEmail) return;
            try {
                // WICHTIG: "friends" wird hier bewusst NICHT geschrieben!
                // Die Freundesliste wird nur über acceptFriendRequest / removeFriend
                // atomar per arrayUnion / arrayRemove aktualisiert. Ein vollständiges
                // Überschreiben hier würde parallele Annehmen-Vorgänge wieder löschen.
                // Master-Rolle wird immer erzwungen, damit sie nie verloren geht.
                const roleToSave = resolveRole(myEmail, myRole);
                myRole = roleToSave;
                await db.collection("users").doc(myEmail).set({
                    name: myName,
                    role: roleToSave,
                    xp: userXP,
                    coins: userCoins,
                    monthlyCoins: monthlyCoins,
                    monthlyCoinsMonth: monthlyCoinsMonth || getCurrentMonthKey(),
                    streak: userStreak,
                    accessory: equippedAccessory,
                    avatarEmote: avatarEmote,
                    items: unlockedItems,
                    themes: unlockedThemes,
                    badges: unlockedBadges,
                    emotes: unlockedEmotes,
                    truthCount: truthCount,
                    dareCount: dareCount,
                    jokerSkip: jokerSkipCount,
                    jokerForce: jokerForceCount,
                    theme: document.body.className,
                    lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                    isOnline: true,
                    currentLobby: activeLobbyCode || ""
                }, { merge: true });
            } catch (e) {
                console.error("Fehler beim Speichern in Cloud:", e);
            }
        }
     
        async function updateOnlineStatus(status) {
            if (!myEmail) return;
            try {
                await db.collection("users").doc(myEmail).set({
                    isOnline: status,
                    lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                    currentLobby: activeLobbyCode || ""
                }, { merge: true });
            } catch(e) {}
        }

        // Online-Status mit Heartbeat: Ein Spieler bleibt nicht dauerhaft
        // als online markiert, wenn die Seite geschlossen oder beendet wurde.
        // Das hat keinen Einfluss auf die Lobby-Session oder den Reconnect.
        const ONLINE_HEARTBEAT_MS = 60000;
        const ONLINE_TIMEOUT_MS = 150000;
        let onlineHeartbeatTimer = null;
        let lobbyJoinTimeout = null;

        function startOnlineHeartbeat() {
            if (onlineHeartbeatTimer) clearInterval(onlineHeartbeatTimer);
            onlineHeartbeatTimer = setInterval(() => {
                if (myEmail && !document.hidden) {
                    updateOnlineStatus(true);
                }
            }, ONLINE_HEARTBEAT_MS);
        }

        // Bei Rückkehr zum Tab sofort Status auffrischen
        if (typeof document !== "undefined") {
            document.addEventListener("visibilitychange", () => {
                if (!document.hidden && myEmail) {
                    updateOnlineStatus(true);
                }
            });
        }

        function stopOnlineHeartbeat() {
            if (onlineHeartbeatTimer) {
                clearInterval(onlineHeartbeatTimer);
                onlineHeartbeatTimer = null;
            }
        }

        // --- COIN-RANGLISTE (LEADERBOARD) ---
        async function openLeaderboard() {
            const container = document.getElementById("leaderboard-list");
            const t = translations[currentLang];
            ensureMonthlyCoinReset();
            container.innerHTML = t.lbLoading || "Lade Ranglisten...";
            document.getElementById("leaderboard-modal").classList.remove("hidden");

            // Tab styling
            const globalBtn = document.getElementById("lb-tab-global");
            const friendsBtn = document.getElementById("lb-tab-friends");
            if (globalBtn) globalBtn.className = currentLbTab === "global" ? "btn-green" : "btn-blue";
            if (friendsBtn) friendsBtn.className = currentLbTab === "friends" ? "btn-green" : "btn-blue";
            const metricTotalBtn = document.getElementById("lb-metric-total");
            const metricMonthlyBtn = document.getElementById("lb-metric-monthly");
            if (metricTotalBtn) metricTotalBtn.className = currentLbMetric === "total" ? "btn-green" : "btn-blue";
            if (metricMonthlyBtn) metricMonthlyBtn.className = currentLbMetric === "monthly" ? "btn-green" : "btn-blue";

            try {
                let users = [];
                if (leaderboardCache && (Date.now() - leaderboardCacheTime < LEADERBOARD_CACHE_TTL)) {
                    users = leaderboardCache;
                } else {
                    const snapshot = await db.collection("users").get();
                    snapshot.forEach(doc => {
                        const data = doc.data() || {};
                        let m = Number(data.monthlyCoins) || 0;
                        const mm = data.monthlyCoinsMonth || "";
                        if (mm !== getCurrentMonthKey()) m = 0;
                        users.push({
                            email: doc.id,
                            name: (typeof data.name === "string" && data.name.trim()) ? data.name.trim() : (currentLang === "de" ? "Party-Spieler" : "Party Player"),
                            accessory: data.accessory || "",
                            coins: Number(data.coins) || 0,
                            monthlyCoins: m
                        });
                    });
                    leaderboardCache = users;
                    leaderboardCacheTime = Date.now();
                }

                // Filter for friends tab
                if (currentLbTab === "friends") {
                    if (!myFriends.length) {
                        container.innerHTML = `<span style="font-size:13px;color:#888;">${currentLang === "de" ? "Noch keine Freunde in der Liste. Füge Freunde hinzu, um ihre Rangliste zu sehen!" : "No friends yet. Add friends to see their ranking!"}</span>`;
                        return;
                    }
                    users = users.filter(u => myFriends.includes(u.email) || u.email === myEmail);
                }

                const render = (title, key, icon) => {
                    const arr = users.slice().sort((a,b)=>b[key]-a[key]).slice(0,15);
                    const section = document.createElement("div");
                    section.style.marginBottom = "14px";
                    const h = document.createElement("h3");
                    h.textContent = title;
                    h.style.cssText = "margin:8px 0;color:#ffcc00;font-size:15px;";
                    section.appendChild(h);
                    if (!arr.length) {
                        const empty = document.createElement("span");
                        empty.style.cssText = "font-size:12px;color:#888;";
                        empty.textContent = currentLang === "de" ? "Keine Einträge." : "No entries.";
                        section.appendChild(empty);
                    }
                    arr.forEach((data, i) => {
                        const row = document.createElement("div");
                        row.style.cssText = "display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.05);padding:8px;border-radius:6px;margin-bottom:5px;font-size:13px;";
                        const isMe = data.email === myEmail;
                        const name = document.createElement("b");
                        name.textContent = `${i+1}. ${i===0?'👑 ':i===1?'🥈 ':i===2?'🥉 ':''}${data.name}${isMe ? (currentLang === "de" ? " (Du)" : " (You)") : ""}`;
                        if (isMe) name.style.color = "var(--primary-color)";
                        const left = document.createElement("div");
                        left.appendChild(name);
                        if (data.accessory) {
                            const a = document.createElement("span");
                            a.style.cssText = "font-size:11px;color:#aaa";
                            a.textContent = ` (${data.accessory})`;
                            left.appendChild(a);
                        }
                        const val = document.createElement("div");
                        val.style.cssText = "color:#ffcc00;font-weight:bold";
                        val.textContent = `${icon} ${data[key]} ${t.lbCoins || 'Coins'}`;
                        row.append(left, val);
                        section.appendChild(row);
                    });
                    container.appendChild(section);
                };

                container.innerHTML = "";
                const prefix = currentLbTab === "friends"
                    ? (currentLang === "de" ? "👥 Freunde – " : "👥 Friends – ")
                    : (currentLang === "de" ? "🌍 " : "🌍 ");
                // Nur eine Liste: Gesamt ODER Monat – auswählbar, kein doppeltes Scrollen
                if (currentLbMetric === "monthly") {
                    render(prefix + (t.lbMonthlyTitle || (currentLang === "de" ? "Monatliche Coin-Rangliste" : "Monthly coin ranking")), "monthlyCoins", "🪙");
                } else {
                    render(prefix + (t.lbGlobalTitle || (currentLang === "de" ? "Allgemeine Coin-Rangliste" : "All-time coin ranking")), "coins", "💰");
                }
            } catch(e) {
                console.error(e);
                container.innerHTML = t.lbError || "Fehler beim Laden der Ranglisten.";
            }
        }


        async function openOnlinePlayersModal() {
            let container = document.getElementById("online-players-list");
            container.innerHTML = currentLang === "de" ? "Suche online Spieler..." : "Searching online players...";
            document.getElementById("online-players-modal").classList.remove("hidden");

            try {
                // Wir holen weiterhin nur isOnline=true, prüfen aber zusätzlich
                // lastActive. Dadurch erscheinen Nutzer nicht dauerhaft online,
                // nur weil sie irgendwann einmal online waren.
                let snapshot = await db.collection("users").where("isOnline", "==", true).get();
                const now = Date.now();
                container.innerHTML = "";
                let found = false;

                snapshot.forEach(doc => {
                    let data = doc.data() || {};
                    const playerName = getUserDisplayName(data);
                    const lastActiveMs = data.lastActive && typeof data.lastActive.toMillis === "function"
                        ? data.lastActive.toMillis()
                        : 0;
                    const isRecentlyOnline = lastActiveMs > 0 && (now - lastActiveMs) <= ONLINE_TIMEOUT_MS;

                    if (playerName !== myName && isRecentlyOnline) {
                        found = true;
                        let lobbyInfo = data.currentLobby ? `(Lobby: ${String(data.currentLobby).toUpperCase()})` : (currentLang === "de" ? "(Bereit)" : "(Ready)");
                        const safeEmail = String(doc.id).replace(/'/g, "\\'");
                        const safeName = playerName.replace(/'/g, "\\'");
                        const safeDisplayName = playerName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
                        const safeAccessory = String(data.accessory || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
                        const spectateBtnHtml = (data.currentLobby && (myRole === "master" || myRole === "admin"))
                            ? `<button class="btn-purple" style="padding:4px 6px; font-size:10px; margin:0; width:auto; background:#6200ea;" onclick="joinLobbyAsSpectator('${data.currentLobby}')" title="${currentLang === 'de' ? 'Als Zuschauer beitreten' : 'Join as Spectator'}">👁️</button>`
                            : "";
                        container.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; margin-bottom:6px; font-size:12px;">
                            <div><b>${safeAccessory} ${safeDisplayName}</b> <br><span style="color:#28a745; font-size:10px;">${lobbyInfo}</span></div>
                            <div style="display:flex;gap:3px;">
                                ${spectateBtnHtml}
                                <button class="btn-blue" style="padding:4px 6px; font-size:10px; margin:0; width:auto;" onclick="sendFriendRequest('${safeEmail}', '${safeName}')">👥</button>
                                <button class="btn-green" style="padding:4px 8px; font-size:11px; margin:0; width:auto;" onclick="sendGameInvite('${safeEmail}', '${safeName}')">${currentLang === "de" ? "Einladen 📨" : "Invite 📨"}</button>
                            </div>
                        </div>`;
                    }
                });

                if (!found) {
                    container.innerHTML = `<span style="font-size:12px; color:#888;">${currentLang === "de" ? "Keine anderen Spieler online." : "No other players online."}</span>`;
                }
            } catch(e) {
                container.innerHTML = currentLang === "de" ? "Fehler beim Laden der Spieler." : "Error loading players.";
            }
        }

        async function sendGameInvite(targetEmail, targetName) {
            if (!activeLobbyCode) {
                alert(translations[currentLang]?.alertNeedLobbyHost || (currentLang === "de" ? "Du musst zuerst eine Lobby erstellen (Host), um jemanden einzuladen!" : "You must first create a lobby (Host) to invite someone!"));
                return;
            }
            try {
                await db.collection("invites").add({
                    toEmail: targetEmail,
                    fromName: myName,
                    lobbyCode: activeLobbyCode,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert(currentLang === "de" ? `Einladung an ${targetName} gesendet! 🚀` : `Invite sent to ${targetName}! 🚀`);
                document.getElementById("online-players-modal").classList.add("hidden");
            } catch(e) {
                alert(translations[currentLang]?.alertInviteError || (currentLang === "de" ? "Fehler beim Senden der Einladung." : "Error sending invite."));
            }
        }

        let incomingInviteLobby = "";
        let incomingInviteId = "";
        let inviteUnsubscribe = null;
        function listenForInvitations() {
            if (!myEmail) return;

            if (inviteUnsubscribe) {
                inviteUnsubscribe();
                inviteUnsubscribe = null;
            }

            inviteUnsubscribe = db.collection("invites")
                .where("toEmail", "==", myEmail)
                .onSnapshot(snapshot => {
                    snapshot.docChanges().forEach(change => {
                        if (change.type === "added") {
                            const data = change.doc.data();
                            incomingInviteId = change.doc.id;
                            incomingInviteLobby = data.lobbyCode || "";

                            const msg = document.getElementById("invite-msg-text");
                            if (msg) {
                                msg.innerText = currentLang === "de"
                                    ? `${data.fromName || "Spieler"} hat dich in die Lobby ${String(incomingInviteLobby).toUpperCase()} eingeladen!`
                                    : `${data.fromName || "Player"} invited you to lobby ${String(incomingInviteLobby).toUpperCase()}!`;
                            }
                            document.getElementById("invite-modal").classList.remove("hidden");
                        }
                    });
                }, error => {
                    console.error("Fehler beim Überwachen von Einladungen:", error);
                });
        }

        async function acceptInvitation() {
            document.getElementById("invite-modal").classList.add("hidden");

            const lobby = incomingInviteLobby;
            const inviteId = incomingInviteId;
            incomingInviteLobby = "";
            incomingInviteId = "";

            if (inviteId) {
                try { await db.collection("invites").doc(inviteId).delete(); } catch (e) {
                    console.warn("Einladung konnte nicht gelöscht werden:", e);
                }
            }

            if (lobby) {
                document.getElementById("lobby-code-input").value = lobby;
                joinGame();
            }
        }

        async function rejectInvitation() {
            document.getElementById("invite-modal").classList.add("hidden");

            const inviteId = incomingInviteId;
            incomingInviteLobby = "";
            incomingInviteId = "";

            if (inviteId) {
                try { await db.collection("invites").doc(inviteId).delete(); } catch (e) {
                    console.warn("Einladung konnte nicht gelöscht werden:", e);
                }
            }
        }

// ==============================================================================
// 7. LEVEL-BERECHNUNG, HUD & PROFIL-MODAL
// ==============================================================================
        function calculateLevel() {
            userLevel = Math.floor(userXP / 100) + 1;
        }

        function updateHUD() {
            document.getElementById("hud-streak").innerText = userStreak;
            document.getElementById("hud-xp").innerText = userXP;
            document.getElementById("hud-coins").innerText = userCoins;
            const jokersEl = document.getElementById("hud-jokers");
            if (jokersEl) jokersEl.innerText = `${jokerSkipCount}/${jokerForceCount}`;
            const shopSkip = document.getElementById("shop-joker-skip-count");
            if (shopSkip) shopSkip.innerText = String(jokerSkipCount);
            const shopForce = document.getElementById("shop-joker-force-count");
            if (shopForce) shopForce.innerText = String(jokerForceCount);
            const btnSkipCnt = document.getElementById("joker-skip-btn-count");
            if (btnSkipCnt) btnSkipCnt.innerText = String(jokerSkipCount);
            const btnForceCnt = document.getElementById("joker-force-btn-count");
            if (btnForceCnt) btnForceCnt.innerText = String(jokerForceCount);
            const badge = document.getElementById("hud-spectator-badge");
            if (badge) {
                badge.classList.toggle("hidden", !isSpectator);
                badge.innerText = currentLang === "de" ? "👁️ ZUSCHAUER" : "👁️ SPECTATOR";
            }
        }

        function checkAdminPermissions() {
            let adminBtn = document.getElementById("btn-admin-panel");
            if (myRole === "master" || myRole === "admin" || myRole === "moderator") {
                adminBtn.classList.remove("hidden");
            } else {
                adminBtn.classList.add("hidden");
            }
            let spectateBtn = document.getElementById("ui-spectate-btn");
            if (spectateBtn) {
                if (myRole === "master" || myRole === "admin") {
                    spectateBtn.classList.remove("hidden");
                } else {
                    spectateBtn.classList.add("hidden");
                }
            }
            // Admin-Kick-Button (auch im Zuschauermodus sichtbar für Admin/Master)
            const kickBtn = document.getElementById("ui-admin-kick-btn");
            if (kickBtn) {
                if (myRole === "master" || myRole === "admin") {
                    kickBtn.classList.remove("hidden");
                } else {
                    kickBtn.classList.add("hidden");
                }
            }
        }

        function updateProfileModal() {
            // Shop: nur Coins anzeigen (Profil-Inhalte liegen im Profil-Modal)
            const coinsEl = document.getElementById("acc-display-coins");
            if (coinsEl) coinsEl.innerText = userCoins;

            refreshEmoteSelect();
            updateShopEmoteButtons();
            applyAccessoryStyle(equippedAccessory);

            // Profil-Modal mit aktualisieren, falls offen oder für Konsistenz
            fillProfileStats();
        }

        function fillProfileStats() {
            const setStat = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.innerText = String(val);
            };
            setStat("stat-level", userLevel);
            setStat("stat-xp", userXP);
            setStat("stat-coins", userCoins);
            setStat("stat-monthly", monthlyCoins);
            setStat("stat-streak", userStreak);
            setStat("stat-truth", truthCount);
            setStat("stat-dare", dareCount);
            setStat("stat-total", (Number(truthCount) || 0) + (Number(dareCount) || 0));
            setStat("stat-badges", (unlockedBadges || []).length);
            setStat("stat-items", (unlockedItems || []).length);
            setStat("stat-themes", (unlockedThemes || []).length);

            const nameEl = document.getElementById("profile-display-name");
            if (nameEl) nameEl.innerText = myName || "";
            const roleEl = document.getElementById("profile-display-role");
            if (roleEl) {
                roleEl.innerText = (myRole || "user").toUpperCase();
                if (myRole === "master") roleEl.style.background = "#ff0055";
                else if (myRole === "admin") roleEl.style.background = "#ff3300";
                else if (myRole === "moderator") roleEl.style.background = "#00bfff";
                else roleEl.style.background = "#666";
            }
            const levelEl = document.getElementById("profile-display-level");
            if (levelEl) {
                levelEl.innerText = currentLang === "de"
                    ? `Partystufe ${userLevel} (${userXP} XP)`
                    : `Party Level ${userLevel} (${userXP} XP)`;
            }
            const pCoins = document.getElementById("profile-display-coins");
            if (pCoins) pCoins.innerText = userCoins;
            const pCoinsTxt = document.getElementById("ui-profile-coins-text");
            if (pCoinsTxt) pCoinsTxt.innerText = (translations[currentLang] || translations.de).coinsText || "Coins";
            const emoteSel = document.getElementById("avatar-emote-select");
            if (emoteSel) emoteSel.value = avatarEmote || "😊";
            const avatarEl = document.getElementById("profile-avatar-display");
            if (avatarEl) {
                if (avatarEl.childNodes[0] && avatarEl.childNodes[0].nodeType === 3) {
                    avatarEl.childNodes[0].textContent = avatarEmote || "😊";
                } else {
                    avatarEl.insertBefore(document.createTextNode(avatarEmote || "😊"), avatarEl.firstChild);
                }
            }
            applyAccessoryStyle(equippedAccessory);
            const badgeBox = document.getElementById("profile-badge-container");
            if (badgeBox) {
                badgeBox.innerHTML = unlockedBadges.length > 0
                    ? ""
                    : `<span style='font-size:11px; color:#888;'>${currentLang === "de" ? "Noch keine Badges freigeschaltet." : "No badges unlocked yet."}</span>`;
                unlockedBadges.forEach(b => {
                    badgeBox.innerHTML += `<span class="badge-tag">${getBadgeDisplayName(b)}</span>`;
                });
            }
        }

        function openProfileModal() {
            fillProfileStats();
            const modal = document.getElementById("profile-modal");
            if (modal) modal.classList.remove("hidden");
        }

        function closeProfileModal() {
            const modal = document.getElementById("profile-modal");
            if (modal) modal.classList.add("hidden");
        }

        function getBadgeDisplayName(badge) {
            if (currentLang === "en") {
                const map = {
                    "🔥 10 Pflichten": "🔥 10 Dares",
                    "🔥 25 Pflichten": "🔥 25 Dares",
                    "🔥 50 Pflichten": "🔥 50 Dares",
                    "💡 10 Wahrheiten": "💡 10 Truths",
                    "💡 25 Wahrheiten": "💡 25 Truths",
                    "⚡ Streak-Monster": "⚡ Streak Monster",
                    "⚡ Streak-Legende": "⚡ Streak Legend",
                    "⚡ Unstoppable": "⚡ Unstoppable",
                    "🎯 25 Aufgaben": "🎯 25 Tasks",
                    "🎯 50 Aufgaben": "🎯 50 Tasks",
                    "🎯 100 Aufgaben": "🎯 100 Tasks",
                    "🏆 Partystufe 10": "🏆 Party Level 10",
                    "🏆 Partystufe 25": "🏆 Party Level 25",
                    "🏆 Partystufe 50": "🏆 Party Level 50",
                    "💰 Coin-Sammler": "💰 Coin Collector",
                    "💰 Coin-König": "💰 Coin King",
                    "🌟 Erste Schritte": "🌟 First Steps",
                    "🍻 Party-Animal": "🍻 Party Animal"
                };
                return map[badge] || badge;
            }
            return badge;
        }

// ==============================================================================
// 8. BELOHNUNGEN, BADGES, AVATARE & VIBE-SHOP
// ==============================================================================
        function addRewards(isDare) {
            let mult = userStreak >= 5 ? 2 : 1;
            let xpGain = isDare ? 20 : 10;
            let coinGain = (isDare ? 8 : 4) * mult;

            userXP += xpGain;
            userCoins += coinGain;
            addMonthlyCoins(coinGain);
            userStreak++;
            
            if(isDare) dareCount++;
            else truthCount++;

            calculateLevel();
            checkBadges();
            updateHUD();
            saveUserDataToCloud();
        }

        function checkBadges() {
            const totalTasks = truthCount + dareCount;
            const addBadge = (id) => {
                if (!unlockedBadges.includes(id)) unlockedBadges.push(id);
            };

            // Erste Schritte
            if (totalTasks >= 1) addBadge("🌟 Erste Schritte");

            // Pflichten (Dares)
            if (dareCount >= 10) addBadge("🔥 10 Pflichten");
            if (dareCount >= 25) addBadge("🔥 25 Pflichten");
            if (dareCount >= 50) addBadge("🔥 50 Pflichten");

            // Wahrheiten (Truths)
            if (truthCount >= 10) addBadge("💡 10 Wahrheiten");
            if (truthCount >= 25) addBadge("💡 25 Wahrheiten");

            // Streaks
            if (userStreak >= 5) addBadge("⚡ Streak-Monster");
            if (userStreak >= 15) addBadge("⚡ Streak-Legende");
            if (userStreak >= 30) addBadge("⚡ Unstoppable");

            // Gesamt-Aufgaben
            if (totalTasks >= 25) addBadge("🎯 25 Aufgaben");
            if (totalTasks >= 50) addBadge("🎯 50 Aufgaben");
            if (totalTasks >= 100) addBadge("🎯 100 Aufgaben");

            // Level / Partystufe
            if (userLevel >= 10) addBadge("🏆 Partystufe 10");
            if (userLevel >= 25) addBadge("🏆 Partystufe 25");
            if (userLevel >= 50) addBadge("🏆 Partystufe 50");

            // Coins
            if (userCoins >= 200) addBadge("💰 Coin-Sammler");
            if (userCoins >= 500) addBadge("💰 Coin-König");

            // Party-Animal (viele Aufgaben + guter Streak)
            if (totalTasks >= 30 && userStreak >= 10) addBadge("🍻 Party-Animal");
        }

        async function setAvatarEmote(emote) {
            emote = emote || "😊";
            // Premium-Emojis nur nutzen, wenn freigeschaltet
            const isFree = FREE_EMOTES.includes(emote);
            const isUnlocked = unlockedEmotes.includes(emote);
            if (!isFree && !isUnlocked) {
                alert(currentLang === "de"
                    ? "Dieses Profil-Emoji ist noch nicht freigeschaltet. Kaufe es im Shop!"
                    : "This profile emoji is not unlocked yet. Buy it in the shop!");
                refreshEmoteSelect();
                return;
            }
            avatarEmote = emote;
            updateProfileModal();
            await saveUserDataToCloud();
        }

        /** Premium-Profil-Emoji im Shop freischalten und optional sofort auswählen */
        async function buyProfileEmote(emoji, cost) {
            if (!emoji) return;
            if (unlockedEmotes.includes(emoji)) {
                // Bereits freigeschaltet → direkt als Profil-Emoji setzen
                avatarEmote = emoji;
                alert(currentLang === "de"
                    ? "Emoji bereits freigeschaltet – jetzt als Profil-Emoji gesetzt!"
                    : "Emoji already unlocked – set as your profile emoji!");
                refreshEmoteSelect();
                updateProfileModal();
                await saveUserDataToCloud();
                return;
            }
            cost = Number(cost) || 0;
            if (userCoins < cost) {
                alert(currentLang === "de" ? "Nicht genug Coins!" : "Not enough coins!");
                return;
            }
            userCoins -= cost;
            unlockedEmotes.push(emoji);
            avatarEmote = emoji;
            alert(currentLang === "de"
                ? "Profil-Emoji freigeschaltet und ausgewählt!"
                : "Profile emoji unlocked and selected!");
            refreshEmoteSelect();
            updateShopEmoteButtons();
            updateHUD();
            updateProfileModal();
            await saveUserDataToCloud();
        }

        /** Dropdown im Profil mit Basis- + freigeschalteten Premium-Emojis füllen */
        function refreshEmoteSelect() {
            const sel = document.getElementById("avatar-emote-select");
            if (!sel) return;
            const t = translations[currentLang] || translations.de;
            const freeLabels = {
                "😊": t.emoteHappy || "Fröhlich",
                "🤩": t.emoteExcited || "Begeistert",
                "🥳": t.emoteParty || "Party",
                "😈": t.emoteCheeky || "Frech",
                "🤖": t.emoteRobot || "Roboter",
                "👻": t.emoteGhost || "Geist",
                "🐱": t.emoteCat || "Katze",
                "🦊": t.emoteFox || "Fuchs",
                "🐸": t.emoteFrog || "Frosch",
                "💀": t.emoteSkull || "Totenkopf",
                "🔥": t.emoteFire || "Feuer"
            };
            const premiumLabels = {
                "🌙": t.itemMoon || "Mond",
                "🍀": t.itemClover || "Kleeblatt",
                "🎯": t.itemTarget || "Zielscheibe",
                "🍕": t.itemPizza || "Pizza",
                "🎮": t.itemGamepad || "Controller",
                "🚀": t.itemRocket || "Rakete",
                "🐉": t.itemDragon || "Drache",
                "🍦": t.itemIcecream || "Eis",
                "🏆": t.itemTrophy || "Pokal"
            };

            const current = avatarEmote || "😊";
            sel.innerHTML = "";

            FREE_EMOTES.forEach(em => {
                const opt = document.createElement("option");
                opt.value = em;
                opt.textContent = `${em} ${freeLabels[em] || ""}`;
                if (em === "😊") opt.id = "ui-emote-happy";
                sel.appendChild(opt);
            });

            unlockedEmotes.forEach(em => {
                if (FREE_EMOTES.includes(em)) return;
                const opt = document.createElement("option");
                opt.value = em;
                opt.textContent = `${em} ${premiumLabels[em] || em}`;
                sel.appendChild(opt);
            });

            // Falls aktuelles Emote nicht in Liste (sollte nicht vorkommen), trotzdem behalten
            if (current && ![...FREE_EMOTES, ...unlockedEmotes].includes(current)) {
                const opt = document.createElement("option");
                opt.value = current;
                opt.textContent = current;
                sel.appendChild(opt);
            }
            sel.value = current;
        }

        /** Shop-Buttons für Profil-Emojis aktualisieren (Freischalten / Auswählen) */
        function updateShopEmoteButtons() {
            const t = translations[currentLang] || translations.de;
            const unlockLabel = t.unlockBtn || (currentLang === "de" ? "Freischalten" : "Unlock");
            const selectLabel = currentLang === "de" ? "Auswählen" : "Select";
            PREMIUM_EMOTES.forEach(({ emoji }) => {
                // Button per onclick-Attribut finden
                document.querySelectorAll(".emote-action-btn").forEach(btn => {
                    const onclick = btn.getAttribute("onclick") || "";
                    if (onclick.includes(`'${emoji}'`) || onclick.includes(`"${emoji}"`)) {
                        if (unlockedEmotes.includes(emoji)) {
                            btn.innerText = selectLabel;
                            btn.classList.remove("btn-green");
                            btn.classList.add("btn-blue");
                        } else {
                            btn.innerText = unlockLabel;
                            btn.classList.add("btn-green");
                            btn.classList.remove("btn-blue");
                        }
                    }
                });
            });
        }

        function applyAccessoryStyle(symbol) {
            const targets = [
                document.getElementById("equipped-accessory"),
                document.getElementById("profile-equipped-accessory")
            ].filter(Boolean);

            const headItems = ["👑", "🎩", "🧢", "🦄"];
            const glassesItems = ["🕶️", "👓"];
            const headphonesItems = ["🎧"];
            const beardItems = ["🧔"];
            const maskItems = ["🎭"];
            const sideItems = ["🦋", "✨", "⭐", "💎", "🌸"];
            const decorItems = ["🔥", "🌈"];

            let cls = "acc-default";
            if (symbol) {
                if (headphonesItems.includes(symbol)) cls = "acc-headphones";
                else if (headItems.includes(symbol)) cls = "acc-head";
                else if (glassesItems.includes(symbol)) cls = "acc-glasses";
                else if (beardItems.includes(symbol)) cls = "acc-beard";
                else if (maskItems.includes(symbol)) cls = "acc-mask";
                else if (sideItems.includes(symbol)) cls = "acc-side";
                else if (decorItems.includes(symbol)) cls = "acc-decor";
                else cls = "acc-default";
            }

            targets.forEach(el => {
                el.className = cls;
                el.innerText = symbol || "";
            });
        }

        async function buyItem(itemKey, cost, symbol) {
            if (unlockedItems.includes(itemKey)) {
                equippedAccessory = (equippedAccessory === symbol) ? "" : symbol;
            } else {
                if (userCoins >= cost) {
                    userCoins -= cost;
                    unlockedItems.push(itemKey);
                    equippedAccessory = symbol;
                    alert(currentLang === 'de' ? "Erfolgreich gekauft und ausgerüstet!" : "Successfully purchased and equipped!");
                } else {
                    alert(currentLang === 'de' ? "Nicht genug Coins!" : "Not enough coins!");
                }
            }
            await saveUserDataToCloud();
            updateProfileModal();
        }

        /**
         * Joker im Shop kaufen (Verbrauchsgut).
         * @param {"skip"|"force"} kind
         * @param {number} cost
         * @param {number} [amount=1]
         */
        async function buyJoker(kind, cost, amount = 1) {
            amount = Math.max(1, Number(amount) || 1);
            cost = Number(cost) || 0;
            if (userCoins < cost) {
                alert(currentLang === "de" ? "Nicht genug Coins!" : "Not enough coins!");
                return;
            }
            userCoins -= cost;
            if (kind === "force") {
                jokerForceCount += amount;
            } else {
                jokerSkipCount += amount;
            }
            alert(
                currentLang === "de"
                    ? `Joker gekauft! (+${amount} ${kind === "force" ? "Force-Skip" : "Skip"})`
                    : `Joker purchased! (+${amount} ${kind === "force" ? "Force-Skip" : "Skip"})`
            );
            await saveUserDataToCloud();
            updateHUD();
            updateProfileModal();
        }

        /** Eigene Aufgabe mit Skip-Joker überspringen (keine Belohnung). */
        function useSkipJoker() {
            if (isSpectator || taskCompleted) return;
            if (jokerSkipCount <= 0) {
                alert(currentLang === "de"
                    ? "Keine Skip-Joker mehr! Kaufe welche im Shop."
                    : "No Skip Jokers left! Buy some in the shop.");
                return;
            }
            const currentP = players[currentPlayerIndex];
            if (!currentP || !namesEqual(currentP, myName)) return;
            if (!pendingChoice) return;

            if (!confirm(currentLang === "de"
                ? "Skip-Joker verwenden und diese Aufgabe überspringen? (keine XP/Coins)"
                : "Use Skip Joker and skip this task? (no XP/Coins)")) {
                return;
            }

            jokerSkipCount--;
            taskCompleted = true;
            updateHUD();
            saveUserDataToCloud();

            const resultData = {
                type: "SHOW_RESULT",
                targetPlayer: getUserDisplayName(currentP),
                choice: pendingChoice,
                taskText: currentTaskText,
                resultText: currentLang === "de"
                    ? "🃏 Mit Skip-Joker übersprungen!"
                    : "🃏 Skipped with Skip Joker!"
            };

            handleIncomingData(resultData);
            if (!isHost) {
                sendClientLobbyData(resultData);
            } else {
                broadcastLobbyData(resultData);
                scheduleSaveGameState();
            }

            // Joker-Buttons ausblenden
            document.getElementById("joker-skip-box")?.classList.add("hidden");
        }

        /**
         * Force-Skip: den aktuell dran seienden Spieler aussetzen.
         * Nur nutzbar, wenn man selbst nicht der aktuelle Spieler ist und eine Aufgabe läuft.
         */
        function useForceSkipJoker() {
            if (isSpectator) return;
            if (jokerForceCount <= 0) {
                alert(currentLang === "de"
                    ? "Keine Force-Skip-Joker mehr! Kaufe welche im Shop."
                    : "No Force-Skip Jokers left! Buy some in the shop.");
                return;
            }
            const currentP = players[currentPlayerIndex];
            if (!currentP || currentP.eliminated || currentP.isSpectator) return;
            const targetName = getUserDisplayName(currentP);
            if (namesEqual(targetName, myName)) {
                alert(currentLang === "de"
                    ? "Du kannst dich nicht selbst aussetzen – nutze den Skip-Joker."
                    : "You cannot force-skip yourself – use the Skip Joker.");
                return;
            }
            // Nur sinnvoll, wenn eine Aufgabe aktiv ist oder der Spieler gewählt hat
            if (!pendingChoice && !currentTaskText) {
                alert(currentLang === "de"
                    ? "Aktuell läuft keine Aufgabe zum Aussetzen."
                    : "No active task to force-skip right now.");
                return;
            }

            if (!confirm(currentLang === "de"
                ? `Force-Skip-Joker auf ${targetName} anwenden? Die Aufgabe wird übersprungen.`
                : `Apply Force-Skip Joker on ${targetName}? The task will be skipped.`)) {
                return;
            }

            jokerForceCount--;
            updateHUD();
            saveUserDataToCloud();

            const forceData = {
                type: "FORCE_SKIP",
                byPlayer: myName,
                targetPlayer: targetName,
                choice: pendingChoice || "",
                taskText: currentTaskText || ""
            };

            if (!isHost) {
                // An Host senden – der Host verarbeitet & broadcastet SHOW_RESULT
                sendClientLobbyData(forceData);
            } else {
                // Host: FORCE_SKIP verarbeiten (zeigt Ergebnis + broadcastet SHOW_RESULT)
                handleIncomingData(forceData);
            }
        }

        async function buyTheme(themeName, cost) {
            const alreadyUnlocked = unlockedThemes.includes(themeName);

            if (!alreadyUnlocked) {
                if (userCoins < cost) {
                    alert(currentLang === 'de' ? "Nicht genug Coins!" : "Not enough coins!");
                    return;
                }

                userCoins -= cost;
                unlockedThemes.push(themeName);
                alert(currentLang === 'de' ? "Theme freigeschaltet!" : "Theme unlocked!");
            }

            setTheme(themeName);
            await saveUserDataToCloud();
            updateHUD();
            updateProfileModal();
        }

        function setTheme(className) {
            document.body.className = className;
        }

        window.addEventListener("DOMContentLoaded", async () => {
            startMonthlyResetWatcher();

            const savedEmail = localStorage.getItem("wop_user_email_v6");
            const savedName = localStorage.getItem("wop_user_name_v6");

            if (savedEmail && savedName) {
                myEmail = savedEmail;
                myName = savedName;
                await loadUserDataFromCloud();
                showLoggedInState();
                startOnlineHeartbeat();
                listenForInvitations();
                loadFriendsData();
                listenForFriendRequests();

                // Nach einem Reload automatisch in die vorhandene Lobby zurück.
                const savedLobby = getSavedLobbySession();
                if (savedLobby && savedLobby.code) {
                    activeLobbyCode = String(savedLobby.code).toLowerCase();
                    isHost = savedLobby.role === "host";

                    if (isHost) {
                        players = loadLobbyPlayers();
                        if (!players.some(p => p.name === myName)) {
                            players.unshift({
                                name: myName,
                                accessory: equippedAccessory,
                                eliminated: false
                            });
                        }
                    }

                    restoringLobby = true;
                    setTimeout(() => reconnectLobby(), 250);
                }
            }

            changeLanguage(currentLang);
        });

        // Kein beforeunload mehr!
        // Reload, Tab-Wechsel oder Wechsel zu einer anderen App bedeutet
        // NICHT "Lobby verlassen".
        window.addEventListener("online", () => {
            if (myEmail && !onlineHeartbeatTimer) startOnlineHeartbeat();
            if (!leavingLobbyManually && activeLobbyCode) {
                updateOnlineStatus(true);
                scheduleLobbyReconnect();
            }
        });

        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) {
                if (myEmail) updateOnlineStatus(true);
                if (myEmail && !onlineHeartbeatTimer) startOnlineHeartbeat();
            }

            if (!document.hidden && !leavingLobbyManually && activeLobbyCode) {
                updateOnlineStatus(true);

                if (isHost) {
                    if (!peer || peer.destroyed || peer.disconnected) {
                        reconnectLobby();
                    }
                } else if (!hostConnection || !hostConnection.open) {
                    scheduleLobbyReconnect();
                }
            }
        });

// ==============================================================================
// 9. BENUTZER-AUTHENTIFIZIERUNG (REGISTER / LOGIN / LOGOUT)
// ==============================================================================
        async function registerUser() {
            const email = document.getElementById("auth-email").value.trim().toLowerCase();
            const username = document.getElementById("auth-username").value.trim();
            const password = document.getElementById("auth-password").value.trim();
     
            if (!email || !username || !password) {
                alert(translations[currentLang]?.alertEmailNamePass || "Bitte alle Felder ausfüllen!");
                return;
            }

            try {
                let docRef = db.collection("users").doc(email);
                let doc = await docRef.get();
                if (doc.exists) {
                    alert(translations[currentLang]?.alertAccountExists || "Ein Account mit dieser E-Mail existiert bereits. Bitte einloggen!");
                    return;
                }

                let hashedPass = await hashPassword(password);

                myEmail = email;
                myName = username;
                myRole = resolveRole(email, "user");

                await docRef.set({
                    name: username,
                    passHash: hashedPass,
                    role: myRole,
                    xp: 0,
                    coins: 50,
                    monthlyCoins: 0,
                    monthlyCoinsMonth: getCurrentMonthKey(),
                    streak: 0,
                    accessory: "",
                    items: [],
                    badges: [],
                    friends: [],
                    truthCount: 0,
                    dareCount: 0,
                    theme: "theme-default",
                    isOnline: true,
                    currentLobby: ""
                });

                localStorage.setItem("wop_user_email_v6", myEmail);
                localStorage.setItem("wop_user_name_v6", myName);

                await loadUserDataFromCloud();
                alert(translations[currentLang]?.alertRegistered || "Erfolgreich registriert!");
                showLoggedInState();
                startOnlineHeartbeat();
                listenForInvitations();
                loadFriendsData();
                listenForFriendRequests();
            } catch (e) {
                console.error("Registrierungsfehler:", e);
                alert((currentLang === "de" ? "Fehler bei der Registrierung: " : "Registration error: ") + e.message);
            }
        }

        async function loginUser() {
            const email = document.getElementById("auth-email").value.trim().toLowerCase();
            const password = document.getElementById("auth-password").value.trim();
            
            if (!email || !password) { 
                alert(translations[currentLang]?.alertEmailNamePass || "Bitte E-Mail und Passwort eingeben!"); 
                return; 
            }

            try {
                let docRef = db.collection("users").doc(email);
                let doc = await docRef.get();
                if (doc.exists) {
                    let data = doc.data();
                    let hashedInputPass = await hashPassword(password);

                    const passwordMatches = (data.passHash && data.passHash === hashedInputPass) ||
                                            (data.pass && data.pass === password);

                    if (passwordMatches) {
                        // Migration: Falls noch ein altes Klartext-Passwort existiert, sofort hashen und Klartext löschen!
                        if (data.pass) {
                            try {
                                await docRef.update({
                                    passHash: hashedInputPass,
                                    pass: firebase.firestore.FieldValue.delete()
                                });
                            } catch (migErr) {
                                console.warn("Passwort-Migration zu Hash fehlgeschlagen:", migErr);
                            }
                        }

                        myEmail = email;
                        myName = getUserDisplayName(data, localStorage.getItem("wop_user_name_v6") || "Spieler");
                        myRole = resolveRole(email, data.role);

                        // Master-Rolle in der Cloud absichern, falls sie jemals überschrieben wurde
                        if (isMasterAccount(email) && data.role !== "master") {
                            try {
                                await docRef.set({ role: "master" }, { merge: true });
                            } catch (e) {}
                        }

                        localStorage.setItem("wop_user_email_v6", myEmail);
                        localStorage.setItem("wop_user_name_v6", myName);
                        await loadUserDataFromCloud();
                        showLoggedInState();
                        startOnlineHeartbeat();
                        listenForInvitations();
                        loadFriendsData();
                        listenForFriendRequests();
                    } else {
                        alert(translations[currentLang]?.alertNoAccount || "Falsche Anmeldedaten oder Konto nicht gefunden!");
                    }
                } else {
                    alert(translations[currentLang]?.alertNoAccount || "Falsche Anmeldedaten oder Konto nicht gefunden!");
                }
            } catch (e) {
                console.error("Login-Fehler:", e);
                alert((currentLang === "de" ? "Fehler beim Login: " : "Login error: ") + e.message);
            }
        }

        async function logoutUser() {
            stopOnlineHeartbeat();
            await updateOnlineStatus(false);
            if (inviteUnsubscribe) {
                inviteUnsubscribe();
                inviteUnsubscribe = null;
            }
            incomingInviteLobby = "";
            incomingInviteId = "";
            localStorage.removeItem("wop_user_email_v6");
            localStorage.removeItem("wop_user_name_v6");
            myEmail = ""; myName = ""; myRole = "user";
            document.getElementById("account-modal")?.classList.add("hidden");
            document.getElementById("profile-modal")?.classList.add("hidden");
            document.getElementById("auth-modal").classList.remove("hidden");
            document.getElementById("setup").classList.add("hidden");
        }

        function showLoggedInState() {
            document.getElementById("auth-modal").classList.add("hidden");
            document.getElementById("account-modal")?.classList.add("hidden");
            document.getElementById("profile-modal")?.classList.add("hidden");
            document.getElementById("setup").classList.remove("hidden");
        }

        function openAccountModal() {
            updateProfileModal();
            updateHUD();
            document.getElementById("account-modal").classList.remove("hidden");
        }
        function closeAccountModal() {
            document.getElementById("account-modal").classList.add("hidden");
        }

        function openFeedbackModal() {
            document.getElementById("feedback-text-input").value = "";
            document.getElementById("feedback-modal").classList.remove("hidden");
        }

        async function submitFeedback() {
            let type = document.getElementById("feedback-type").value;
            let text = document.getElementById("feedback-text-input").value.trim();
            if (!text) { alert(translations[currentLang].alertFeedbackEmpty); return; }

            try {
                await db.collection("feedback").add({
                    author: myName,
                    emailMasked: maskEmail(myEmail),
                    type: type,
                    text: text,
                    date: new Date().toLocaleString()
                });
                document.getElementById("feedback-modal").classList.add("hidden");
                alert(translations[currentLang].alertFeedbackSuccess);
            } catch (e) {
                console.error("Fehler beim Senden des Feedbacks:", e);
            }
        }

// ==============================================================================
// 10. ADMIN-BEREICH (USER-VERWALTUNG & FEEDBACK)
// ==============================================================================
        function openAdminModal() {
            if (myRole !== "master" && myRole !== "admin" && myRole !== "moderator") {
                alert(currentLang === "de" ? "Keine Berechtigung!" : "Access denied / Not authorized!");
                return;
            }
            renderAdminUserList();
            renderAdminFeedbackList();
            document.getElementById("admin-modal").classList.remove("hidden");
        }

        async function renderAdminUserList() {
            let container = document.getElementById("admin-user-list");
            container.innerHTML = currentLang === "de" ? "Lade Benutzer..." : "Loading users...";
            try {
                let users = [];
                if (adminUserListCache && (Date.now() - adminUserListCacheTime < ADMIN_USER_CACHE_TTL)) {
                    users = adminUserListCache;
                } else {
                    let snapshot = await db.collection("users").get();
                    snapshot.forEach(doc => {
                        users.push({ id: doc.id, ...doc.data() });
                    });
                    adminUserListCache = users;
                    adminUserListCacheTime = Date.now();
                }

                container.innerHTML = "";
                users.forEach(u => {
                    let email = u.id;
                    let isMaster = isMasterAccount(email) || u.role === "master";
                    let maskedMail = maskEmail(email);
                    const displayRole = isMasterAccount(email) ? "master" : (u.role || "user");
                    const roleLabel = currentLang === "de" ? "Rolle: " : "Role: ";
                    const statusInfo = formatLastOnline(u.lastActive, u.isOnline);
                    const lobbyCode = u.currentLobby ? String(u.currentLobby).toUpperCase() : "";
                    const lobbyText = lobbyCode ? ` · Lobby ${lobbyCode}` : "";
                    const statusHtml = statusInfo.isOnline
                        ? `<span style="color:#28a745; font-size:11px; font-weight:bold;">● ${statusInfo.text}${lobbyText}</span>`
                        : `<span style="color:#888; font-size:11px;">○ ${statusInfo.text}</span>`;

                    let spectateBtnHtml = "";
                    if (lobbyCode && (myRole === "master" || myRole === "admin")) {
                        spectateBtnHtml = `<button class="btn-purple" style="padding:2px 6px; font-size:10px; margin-left:6px; background:#6200ea;" onclick="joinLobbyAsSpectator('${u.currentLobby}')">👁️ ${currentLang === 'de' ? 'Zuschauen' : 'Spectate'}</button>`;
                    }

                    let html = `<div style="background:rgba(255,255,255,0.05); padding:6px; border-radius:6px; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                        <div>
                            <b>${u.name || 'Spieler'}</b> (${maskedMail}) ${spectateBtnHtml}<br>
                            <span style="color:#00bfff;">${roleLabel}${displayRole}</span> · ${statusHtml}
                        </div>`;
                    
                    let canModify = (myRole === "master" || (myRole === "admin" && !isMaster && u.role !== "admin"));

                    if (canModify && !isMaster) {
                        html += `<div>
                            <select onchange="changeUserRole('${email}', this.value)" style="padding:3px; font-size:11px; width:auto; margin:0;">
                                <option value="user" ${displayRole==='user'?'selected':''}>User</option>
                                <option value="moderator" ${displayRole==='moderator'?'selected':''}>Mod</option>
                                <option value="admin" ${displayRole==='admin'?'selected':''}>Admin</option>
                            </select>
                            <button class="btn-danger" style="padding:3px 6px; font-size:10px; margin:0;" onclick="deleteUser('${email}')">X</button>
                        </div>`;
                    } else if (isMaster) {
                        html += `<span style="color:#ff0055; font-weight:bold;">👑</span>`;
                    } else {
                        html += `<span style="color:#888; font-size:10px;">-</span>`;
                    }

                    html += `</div>`;
                    container.innerHTML += html;
                });
            } catch (e) {
                console.error("Fehler beim Abrufen der Benutzer:", e);
            }
        }

        async function renderAdminFeedbackList() {
            let container = document.getElementById("admin-feedback-list");
            container.innerHTML = currentLang === "de" ? "Lade Feedback..." : "Loading feedback...";
            try {
                let snapshot = await db.collection("feedback").get();
                container.innerHTML = "";
                if (snapshot.empty) {
                    container.innerHTML = `<span style="font-size:11px; color:#888;">${currentLang === "de" ? "Kein Feedback vorhanden." : "No feedback available."}</span>`;
                    return;
                }
                snapshot.forEach(doc => {
                    let fb = doc.data();
                    let docId = doc.id;
                    let typeColor = fb.type === 'bug' ? '#ff3300' : '#00bfff';
                    let displayMail = fb.emailMasked || maskEmail(fb.email || "");
                    const deleteBtnText = currentLang === "de" ? "Löschen" : "Delete";
                    container.innerHTML += `<div style="background:rgba(255,255,255,0.05); padding:6px; border-radius:6px; margin-bottom:5px; font-size:12px; border-left:4px solid ${typeColor};">
                        <div><b>${fb.author}</b> (${displayMail}) - <span style="color:${typeColor}; font-weight:bold;">${fb.type.toUpperCase()}</span></div>
                        <div style="margin-top:2px; color:#fff;">${fb.text}</div>
                        ${myRole === 'master' || myRole === 'admin' ? `<button class="btn-danger" style="padding:2px 5px; font-size:9px; margin-top:3px;" onclick="deleteFeedback('${docId}')">${deleteBtnText}</button>` : ''}
                    </div>`;
                });
            } catch (e) {
                console.error("Fehler beim Laden von Feedback:", e);
            }
        }

        async function changeUserRole(email, newRole) {
            if (myRole !== "master" && myRole !== "admin") return;
            // Master-Account-Rolle ist unveränderlich
            if (isMasterAccount(email)) return;
            if (newRole === "master") return; // master-Rolle kann nicht vergeben werden
            adminUserListCache = null;
            await db.collection("users").doc(email).update({ role: newRole });
            renderAdminUserList();
        }

        async function deleteUser(email) {
            if (myRole !== "master" && myRole !== "admin") return;
            if (isMasterAccount(email)) return;
            const confirmMsg = translations[currentLang]?.alertDeleteAdminConfirm || (currentLang === "de" ? "Diesen Benutzer wirklich löschen?" : "Really delete this user?");
            if (!confirm(confirmMsg)) return;
            adminUserListCache = null;
            try {
                await db.collection("users").doc(email).delete();
                renderAdminUserList();
            } catch (e) {
                console.error("deleteUser:", e);
                alert(currentLang === "de" ? "Fehler beim Löschen." : "Error while deleting.");
            }
        }

        /** Eigenes Konto löschen – nur der eingeloggte User selbst, mit Bestätigung */
        async function deleteOwnAccount() {
            if (!myEmail) {
                alert(currentLang === "de" ? "Nicht eingeloggt." : "Not logged in.");
                return;
            }
            // Master-Account darf sich nicht selbst löschen (Sicherheit)
            if (isMasterAccount(myEmail)) {
                alert(currentLang === "de"
                    ? "Der Master-Account kann nicht gelöscht werden."
                    : "The master account cannot be deleted.");
                return;
            }
            const confirmMsg = translations[currentLang]?.alertDeleteOwnConfirm
                || (currentLang === "de"
                    ? "Möchtest du dein Konto wirklich unwiderruflich löschen?\n\nAlle deine Daten werden gelöscht. Diese Aktion kann nicht rückgängig gemacht werden."
                    : "Do you really want to permanently delete your account?\n\nAll your data will be deleted. This action cannot be undone.");
            if (!confirm(confirmMsg)) return;

            // Zweite Bestätigung für zusätzliche Sicherheit
            const confirm2 = currentLang === "de"
                ? "Letzte Bestätigung: Konto endgültig löschen?"
                : "Final confirmation: permanently delete account?";
            if (!confirm(confirm2)) return;

            try {
                // Online-Status beenden & Listener stoppen
                stopOnlineHeartbeat();
                await updateOnlineStatus(false);
                if (inviteUnsubscribe) {
                    try { inviteUnsubscribe(); } catch (e) {}
                    inviteUnsubscribe = null;
                }
                if (friendReqUnsubscribe) {
                    try { friendReqUnsubscribe(); } catch (e) {}
                    friendReqUnsubscribe = null;
                }

                // Eigenes User-Dokument löschen
                await db.collection("users").doc(myEmail).delete();

                // Lokale Session bereinigen
                localStorage.removeItem("wop_user_email_v6");
                localStorage.removeItem("wop_user_name_v6");
                myEmail = "";
                myName = "";
                myRole = "user";
                userXP = 0;
                userCoins = 50;
                userStreak = 0;
                userLevel = 1;
                equippedAccessory = "";
                unlockedItems = [];
                unlockedThemes = [];
                unlockedBadges = [];
                unlockedEmotes = [];
                truthCount = 0;
                dareCount = 0;
                jokerSkipCount = 0;
                jokerForceCount = 0;
                avatarEmote = "😊";

                document.getElementById("account-modal")?.classList.add("hidden");
                document.getElementById("profile-modal")?.classList.add("hidden");
                document.getElementById("auth-modal")?.classList.remove("hidden");
                document.getElementById("setup")?.classList.add("hidden");

                alert(translations[currentLang]?.alertDeleteOwnSuccess
                    || (currentLang === "de" ? "Dein Konto wurde erfolgreich gelöscht." : "Your account has been successfully deleted."));
            } catch (e) {
                console.error("deleteOwnAccount:", e);
                alert(translations[currentLang]?.alertDeleteOwnError
                    || (currentLang === "de" ? "Fehler beim Löschen des Kontos." : "Error deleting the account."));
            }
        }

        async function deleteFeedback(docId) {
            await db.collection("feedback").doc(docId).delete();
            renderAdminFeedbackList();
        }

        
// ==============================================================================
// 11. FREUNDESLISTE & FREUNDSCHAFTSANFRAGEN
// ==============================================================================
        let myFriends = [];          // Array of friend emails
        let myFriendRequests = [];   // Incoming: [{fromEmail, fromName, id}]
        let currentLbTab = "global";
        let currentLbMetric = "total"; // "total" | "monthly"
        let friendReqUnsubscribe = null;

        async function loadFriendsData() {
            if (!myEmail) return;
            try {
                const doc = await db.collection("users").doc(myEmail).get();
                if (doc.exists) {
                    const data = doc.data() || {};
                    // E-Mails normalisieren (lowercase), damit Vergleiche und Lookups stabil sind
                    const raw = Array.isArray(data.friends) ? data.friends : [];
                    myFriends = [...new Set(raw.map(e => String(e || "").trim().toLowerCase()).filter(Boolean))];
                }
                await loadFriendRequests();
                updateFriendRequestBadge();
            } catch (e) {
                console.error("Freunde laden fehlgeschlagen:", e);
            }
        }

        async function loadFriendRequests() {
            if (!myEmail) return;
            try {
                const snap = await db.collection("friendRequests")
                    .where("toEmail", "==", myEmail)
                    .get();
                myFriendRequests = [];
                snap.forEach(doc => {
                    const d = doc.data() || {};
                    myFriendRequests.push({
                        id: doc.id,
                        fromEmail: d.fromEmail || "",
                        fromName: d.fromName || "Spieler"
                    });
                });
                updateFriendRequestBadge();
            } catch (e) {
                console.error("Anfragen laden:", e);
            }
        }

        function updateFriendRequestBadge() {
            const n = myFriendRequests.length;
            // Badge im Freunde-Modal (Tab „Anfragen“)
            const badge = document.getElementById("friend-req-badge");
            if (badge) {
                if (n > 0) {
                    badge.style.display = "inline";
                    badge.innerText = String(n);
                } else {
                    badge.style.display = "none";
                }
            }
            // Badge am HUD-Button „Freunde“ (sichtbar bevor man den Modal öffnet)
            const hudBadge = document.getElementById("hud-friend-req-badge");
            if (hudBadge) {
                if (n > 0) {
                    hudBadge.style.display = "inline";
                    hudBadge.innerText = String(n);
                } else {
                    hudBadge.style.display = "none";
                }
            }
        }

        function listenForFriendRequests() {
            if (!myEmail) return;
            if (friendReqUnsubscribe) {
                try { friendReqUnsubscribe(); } catch(e) {}
                friendReqUnsubscribe = null;
            }
            friendReqUnsubscribe = db.collection("friendRequests")
                .where("toEmail", "==", myEmail)
                .onSnapshot(snap => {
                    myFriendRequests = [];
                    snap.forEach(doc => {
                        const d = doc.data() || {};
                        myFriendRequests.push({
                            id: doc.id,
                            fromEmail: d.fromEmail || "",
                            fromName: d.fromName || "Spieler"
                        });
                    });
                    updateFriendRequestBadge();
                    // refresh panel if open
                    const panel = document.getElementById("friends-requests-panel");
                    if (panel && !panel.classList.contains("hidden")) {
                        renderFriendRequests();
                    }
                }, err => console.error("Friend request listener:", err));
        }

        function openFriendsModal() {
            if (!myEmail) {
                alert(currentLang === "de" ? "Bitte zuerst einloggen." : "Please log in first.");
                return;
            }
            showFriendsTab("list");
            document.getElementById("friends-modal").classList.remove("hidden");
            // Immer frisch aus der Cloud laden, damit atomare arrayUnion-Updates
            // (z. B. wenn der andere Spieler die Anfrage angenommen hat) sichtbar werden.
            loadFriendsData().then(() => {
                renderFriendsList();
                renderFriendRequests();
            });
        }

        function showFriendsTab(tab) {
            document.getElementById("friends-list-panel").classList.toggle("hidden", tab !== "list");
            document.getElementById("friends-requests-panel").classList.toggle("hidden", tab !== "requests");
            document.getElementById("friends-add-panel").classList.toggle("hidden", tab !== "add");
            if (tab === "list") renderFriendsList();
            if (tab === "requests") renderFriendRequests();
            if (tab === "add") {
                document.getElementById("friend-search-results").innerHTML = "";
                document.getElementById("friend-search-input").value = "";
            }
        }

        async function renderFriendsList() {
            const container = document.getElementById("friends-list");
            if (!container) return;
            container.innerHTML = currentLang === "de" ? "Lade Freunde..." : "Loading friends...";

            if (!myFriends.length) {
                container.innerHTML = `<span style="font-size:12px;color:#888;">${currentLang === "de" ? "Noch keine Freunde. Sende eine Anfrage!" : "No friends yet. Send a request!"}</span>`;
                return;
            }

            try {
                let friendsData = [];
                if (friendsListCache && (Date.now() - friendsListCacheTime < FRIENDS_CACHE_TTL)) {
                    friendsData = friendsListCache;
                } else {
                    const docs = await Promise.all(myFriends.map(email => 
                        db.collection("users").doc(email).get().catch(() => null)
                    ));
                    friendsData = docs.filter(doc => doc && doc.exists).map(doc => ({
                        email: doc.id,
                        data: doc.data() || {}
                    }));
                    friendsListCache = friendsData;
                    friendsListCacheTime = Date.now();
                }

                let html = "";
                for (const item of friendsData) {
                    const email = item.email;
                    const d = item.data;
                    const name = getUserDisplayName(d, "Spieler");
                    const accessory = d.accessory || "";
                    const statusInfo = formatLastOnline(d.lastActive, d.isOnline);
                    const lobby = d.currentLobby ? String(d.currentLobby).toUpperCase() : "";
                    
                    const statusHtml = statusInfo.isOnline
                        ? `<span style="color:#28a745;font-size:10px;font-weight:bold;">● ${lobby ? `Online · Lobby ${lobby}` : (currentLang === "de" ? "Online · Bereit" : "Online · Ready")}</span>`
                        : `<span style="color:#888;font-size:10px;">○ ${statusInfo.text}</span>`;
                    
                    const safeEmail = email.replace(/'/g, "\\'");
                    const safeName = name.replace(/'/g, "\\'").replace(/"/g, "&quot;");

                    let spectateBtn = "";
                    if (lobby && (myRole === "master" || myRole === "admin")) {
                        spectateBtn = `<button class="btn-purple" style="padding:3px 6px;font-size:10px;width:auto;margin:0;background:#6200ea;" onclick="joinLobbyAsSpectator('${lobby}')" title="${currentLang === 'de' ? 'Als Zuschauer beitreten' : 'Join as Spectator'}">👁️</button>`;
                    }

                    html += `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;margin-bottom:6px;font-size:12px;">
                        <div>
                            <b>${accessory} ${name.replace(/</g,"&lt;")}</b><br>
                            ${statusHtml}
                        </div>
                        <div style="display:flex;gap:4px;">
                            ${spectateBtn}
                            ${statusInfo.isOnline && activeLobbyCode && isHost ? `<button class="btn-green" style="padding:3px 6px;font-size:10px;width:auto;margin:0;" onclick="sendGameInvite('${safeEmail}', '${safeName}')">${currentLang === "de" ? "Einladen" : "Invite"}</button>` : ""}
                            <button class="btn-danger" style="padding:3px 6px;font-size:10px;width:auto;margin:0;" onclick="removeFriend('${safeEmail}')">✕</button>
                        </div>
                    </div>`;
                }
                container.innerHTML = html || `<span style="font-size:12px;color:#888;">${currentLang === "de" ? "Keine Freunde gefunden." : "No friends found."}</span>`;
            } catch (e) {
                container.innerHTML = currentLang === "de" ? "Fehler beim Laden." : "Error loading.";
            }
        }

        function renderFriendRequests() {
            const container = document.getElementById("friend-requests-list");
            if (!container) return;
            if (!myFriendRequests.length) {
                container.innerHTML = `<span style="font-size:12px;color:#888;">${currentLang === "de" ? "Keine offenen Anfragen." : "No pending requests."}</span>`;
                return;
            }
            let html = "";
            myFriendRequests.forEach(req => {
                const safeId = req.id.replace(/'/g, "\\'");
                const safeEmail = (req.fromEmail || "").replace(/'/g, "\\'");
                html += `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;margin-bottom:6px;font-size:12px;">
                    <div><b>${(req.fromName || "Spieler").replace(/</g,"&lt;")}</b></div>
                    <div style="display:flex;gap:4px;">
                        <button class="btn-green" style="padding:3px 8px;font-size:11px;width:auto;margin:0;" onclick="acceptFriendRequest('${safeId}', '${safeEmail}', '${(req.fromName||'').replace(/'/g,"\\'")}')">✓</button>
                        <button class="btn-danger" style="padding:3px 8px;font-size:11px;width:auto;margin:0;" onclick="rejectFriendRequest('${safeId}')">✕</button>
                    </div>
                </div>`;
            });
            container.innerHTML = html;
        }

        async function searchAndAddFriend() {
            const q = (document.getElementById("friend-search-input").value || "").trim().toLowerCase();
            const results = document.getElementById("friend-search-results");
            if (!q) {
                alert(currentLang === "de" ? "Bitte E-Mail oder Namen eingeben." : "Please enter email or name.");
                return;
            }
            results.innerHTML = currentLang === "de" ? "Suche..." : "Searching...";
            try {
                let html = "";
                let found = false;

                if (q.includes("@")) {
                    const doc = await db.collection("users").doc(q).get();
                    if (doc.exists && doc.id !== myEmail) {
                        found = true;
                        const d = doc.data() || {};
                        const email = doc.id;
                        const displayName = getUserDisplayName(d, "Spieler");
                        const alreadyFriend = myFriends.includes(email);
                        const safeEmail = email.replace(/'/g, "\\'");
                        const safeName = displayName.replace(/'/g, "\\'");
                        html += `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;margin-bottom:6px;font-size:12px;">
                            <div><b>${displayName.replace(/</g,"&lt;")}</b><br><span style="font-size:10px;color:#888;">${maskEmail(email)}</span></div>
                            ${alreadyFriend
                                ? `<span style="color:#28a745;font-size:11px;">${currentLang === "de" ? "✓ Freund" : "✓ Friend"}</span>`
                                : `<button class="btn-green" style="padding:4px 8px;font-size:11px;width:auto;margin:0;" onclick="sendFriendRequest('${safeEmail}', '${safeName}')">${currentLang === "de" ? "Anfrage" : "Request"}</button>`}
                        </div>`;
                    }
                }

                if (!found) {
                    const snap = await db.collection("users").limit(30).get();
                    snap.forEach(doc => {
                        const email = doc.id;
                        if (email === myEmail) return;
                        const d = doc.data() || {};
                        const name = (d.name || "").toLowerCase();
                        if (email === q || name.includes(q) || email.includes(q)) {
                            found = true;
                            const displayName = getUserDisplayName(d, "Spieler");
                            const alreadyFriend = myFriends.includes(email);
                            const safeEmail = email.replace(/'/g, "\\'");
                            const safeName = displayName.replace(/'/g, "\\'");
                            html += `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;margin-bottom:6px;font-size:12px;">
                                <div><b>${displayName.replace(/</g,"&lt;")}</b><br><span style="font-size:10px;color:#888;">${maskEmail(email)}</span></div>
                                ${alreadyFriend
                                    ? `<span style="color:#28a745;font-size:11px;">${currentLang === "de" ? "✓ Freund" : "✓ Friend"}</span>`
                                    : `<button class="btn-green" style="padding:4px 8px;font-size:11px;width:auto;margin:0;" onclick="sendFriendRequest('${safeEmail}', '${safeName}')">${currentLang === "de" ? "Anfrage" : "Request"}</button>`}
                            </div>`;
                        }
                    });
                }
                results.innerHTML = found ? html : `<span style="font-size:12px;color:#888;">${currentLang === "de" ? "Niemand gefunden." : "Nobody found."}</span>`;
            } catch (e) {
                results.innerHTML = currentLang === "de" ? "Fehler bei der Suche." : "Error searching.";
            }
        }

        async function sendFriendRequest(targetEmail, targetName) {
            const toEmail = String(targetEmail || "").trim().toLowerCase();
            if (!myEmail || !toEmail || toEmail === myEmail) return;
            if (myFriends.includes(toEmail)) {
                alert(currentLang === "de" ? "Ihr seid bereits Freunde!" : "You are already friends!");
                return;
            }
            try {
                // Check existing request
                const existing = await db.collection("friendRequests")
                    .where("fromEmail", "==", myEmail)
                    .where("toEmail", "==", toEmail)
                    .get();
                if (!existing.empty) {
                    alert(currentLang === "de" ? "Anfrage bereits gesendet!" : "Request already sent!");
                    return;
                }
                // Check reverse request → auto-accept
                const reverse = await db.collection("friendRequests")
                    .where("fromEmail", "==", toEmail)
                    .where("toEmail", "==", myEmail)
                    .get();
                if (!reverse.empty) {
                    const doc = reverse.docs[0];
                    await acceptFriendRequest(doc.id, toEmail, targetName);
                    return;
                }
                await db.collection("friendRequests").add({
                    fromEmail: myEmail,
                    fromName: myName,
                    toEmail: toEmail,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert(currentLang === "de" ? `Freundschaftsanfrage an ${targetName} gesendet! 👥` : `Friend request sent to ${targetName}! 👥`);
            } catch (e) {
                console.error(e);
                alert(currentLang === "de" ? "Fehler beim Senden der Anfrage." : "Error sending request.");
            }
        }

        async function acceptFriendRequest(reqId, fromEmail, fromName) {
            if (!myEmail || !fromEmail) return;
            const friendEmail = String(fromEmail).trim().toLowerCase();
            if (!friendEmail || friendEmail === myEmail) return;

            try {
                // Atomare Updates: arrayUnion verhindert Race-Conditions mit
                // parallelen saveUserDataToCloud-Aufrufen und doppelten Einträgen.
                await db.collection("users").doc(myEmail).set({
                    friends: firebase.firestore.FieldValue.arrayUnion(friendEmail)
                }, { merge: true });

                await db.collection("users").doc(friendEmail).set({
                    friends: firebase.firestore.FieldValue.arrayUnion(myEmail)
                }, { merge: true });

                if (!myFriends.includes(friendEmail)) {
                    myFriends.push(friendEmail);
                }

                if (reqId) {
                    try { await db.collection("friendRequests").doc(reqId).delete(); } catch (e) {}
                }
                myFriendRequests = myFriendRequests.filter(r => r.id !== reqId);
                updateFriendRequestBadge();
                renderFriendRequests();
                renderFriendsList();
                alert(currentLang === "de" ? `Du bist jetzt mit ${fromName || "Spieler"} befreundet! 🎉` : `You are now friends with ${fromName || "player"}! 🎉`);
            } catch (e) {
                console.error(e);
                alert(currentLang === "de" ? "Fehler beim Annehmen." : "Error accepting request.");
            }
        }

        async function rejectFriendRequest(reqId) {
            try {
                await db.collection("friendRequests").doc(reqId).delete();
                myFriendRequests = myFriendRequests.filter(r => r.id !== reqId);
                updateFriendRequestBadge();
                renderFriendRequests();
            } catch (e) {
                console.error(e);
            }
        }

        async function removeFriend(friendEmail) {
            if (!confirm(currentLang === "de" ? "Freund wirklich entfernen?" : "Really remove this friend?")) return;
            const email = String(friendEmail || "").trim().toLowerCase();
            if (!email) return;
            try {
                // Atomar entfernen – kein vollständiges Array-Überschreiben
                await db.collection("users").doc(myEmail).set({
                    friends: firebase.firestore.FieldValue.arrayRemove(email)
                }, { merge: true });
                await db.collection("users").doc(email).set({
                    friends: firebase.firestore.FieldValue.arrayRemove(myEmail)
                }, { merge: true });

                myFriends = myFriends.filter(e => e !== email);
                renderFriendsList();
            } catch (e) {
                console.error(e);
            }
        }

        // --- Leaderboard with Friends tab ---
        function switchLeaderboardTab(tab) {
            currentLbTab = tab;
            const globalBtn = document.getElementById("lb-tab-global");
            const friendsBtn = document.getElementById("lb-tab-friends");
            if (globalBtn) globalBtn.className = tab === "global" ? "btn-green" : "btn-blue";
            if (friendsBtn) friendsBtn.className = tab === "friends" ? "btn-green" : "btn-blue";
            openLeaderboard();
        }

        function switchLeaderboardMetric(metric) {
            currentLbMetric = (metric === "monthly") ? "monthly" : "total";
            const metricTotalBtn = document.getElementById("lb-metric-total");
            const metricMonthlyBtn = document.getElementById("lb-metric-monthly");
            if (metricTotalBtn) metricTotalBtn.className = currentLbMetric === "total" ? "btn-green" : "btn-blue";
            if (metricMonthlyBtn) metricMonthlyBtn.className = currentLbMetric === "monthly" ? "btn-green" : "btn-blue";
            openLeaderboard();
        }


        // --- NETZWERK & PEERJS SPIEL-LOGIK ---
        let peer = null;
        let hostConnection = null;
        let clientConnections = [];
        let isHost = false;
        let players = [];
        let currentPlayerIndex = 0;
        let pendingChoice = "";
        let currentTaskText = "";
        let currentRotation = 0;
        let nextTurnVotedPlayers = [];
        let nextRoundVotedPlayers = [];
        let currentSharedResult = null;
        let currentSharedResultKey = "";
        // Spieler-Status wird innerhalb der Lobby synchronisiert.
        let playerStatuses = {};
        let recentTaskCreators = [];

        let taskCompleted = false;
        let activeLobbyCode = "";
        // Spielphase: "lobby" | "wop" | "wheel" – wird in Firebase gespeichert,
        // damit Reload und Mid-Game-Joins den aktuellen Stand wiederherstellen.
        let gamePhase = "lobby";
        let gameStarted = false;
        let lobbyStateUnsubscribe = null;
        let lastSavedStateHash = "";
        let saveStateTimer = null;

// ==============================================================================
// 12. MULTIPLAYER LOBBY-TRANSPORT & SESSION-CACHING
// ==============================================================================
        // STABILE LOBBY-SESSION
        // Die Lobby endet nur noch über "Lobby verlassen".
        // Reload/App-Wechsel/kurze Netzwerkunterbrechungen führen
        // nicht mehr automatisch zum Verlassen der Lobby.
        // Session wird in localStorage + Cookie gehalten; der volle Spielstand
        // liegt in Firebase (lobbies/{code}), damit Host und Clients nach Reload
        // und Mid-Game-Joins denselben Zustand sehen – ohne lokalen Host-Speicher.
        // ==========================================================
        const LOBBY_STORAGE_KEY = "wop_active_lobby_v8";
        const LOBBY_COOKIE_NAME = "wop_lobby_session_v8";
        const RECONNECT_DELAY = 1500;
        let reconnectTimer = null;
        let leavingLobbyManually = false;
        let restoringLobby = false;
        let reconnectAttempts = 0;

        // Firebase-Lobby-Transport: zuverlässiger als direkte WebRTC-Verbindungen
        // zwischen unterschiedlichen Netzwerken. Die vorhandene Firebase-Verbindung
        // wird als Lobby-Signalisierung und Spiel-Datenkanal verwendet.
        let lobbyUserUnsubscribe = null;
        let lobbyHostUnsubscribe = null;
        let lobbyHostEmail = "";
        let lobbyMessageSeq = 0;
        let lobbyLastHostSeq = 0;
        const lobbyProcessedClientSeq = {};

        function stopFirestoreLobbyTransport() {
            try { if (lobbyUserUnsubscribe) lobbyUserUnsubscribe(); } catch (e) {}
            try { if (lobbyHostUnsubscribe) lobbyHostUnsubscribe(); } catch (e) {}
            lobbyUserUnsubscribe = null;
            lobbyHostUnsubscribe = null;
            lobbyHostEmail = "";
            lobbyLastHostSeq = 0;
            Object.keys(lobbyProcessedClientSeq).forEach(k => delete lobbyProcessedClientSeq[k]);
        }

        async function setLobbyPresence(fields = {}) {
            if (!myEmail || !activeLobbyCode) return;
            const role = isHost ? "host" : (isSpectator ? "spectator" : "client");
            await db.collection("users").doc(myEmail).set({
                currentLobby: activeLobbyCode,
                lobbyRole: role,
                isSpectator: !!isSpectator,
                lobbyHostEmail: isHost ? myEmail : (lobbyHostEmail || ""),
                lobbyPrivate: false,
                ...fields,
                lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                isOnline: true
            }, { merge: true });
        }

        async function clearLobbyPresence() {
            if (!myEmail) return;
            try {
                await db.collection("users").doc(myEmail).set({
                    currentLobby: "",
                    lobbyRole: "",
                    isSpectator: false,
                    lobbyHostEmail: "",
                    lobbyMessage: firebase.firestore.FieldValue.delete(),
                    hostMessage: firebase.firestore.FieldValue.delete()
                }, { merge: true });
            } catch (e) {}
        }

        function startHostFirestoreLobby() {
            stopFirestoreLobbyTransport();
            lobbyHostEmail = myEmail;

            lobbyUserUnsubscribe = db.collection("users")
                .where("currentLobby", "==", activeLobbyCode)
                .onSnapshot(snapshot => {
                    if (!isHost || leavingLobbyManually) return;

                    const nextPlayers = [];
                    snapshot.forEach(doc => {
                        const d = doc.data() || {};
                        const name = getUserDisplayName(d, "Spieler");

                        if (d.currentLobby === activeLobbyCode && name) {
                            const oldPlayer = players.find(p => p.name === name);
                            const playerIsSpec = !!d.isSpectator || d.lobbyRole === "spectator";
                            nextPlayers.push({
                                name,
                                accessory: d.accessory || "",
                                eliminated: !!oldPlayer?.eliminated,
                                isSpectator: playerIsSpec
                            });

                            if (doc.id !== myEmail) {
                                const msg = d.lobbyMessage;
                                const seq = Number(msg && msg.seq) || 0;
                                const lastSeq = lobbyProcessedClientSeq[doc.id] || 0;

                                if (seq > lastSeq) {
                                    lobbyProcessedClientSeq[doc.id] = seq;
                                    const queue = [];
                                    if (Array.isArray(msg.recent) && msg.recent.length) {
                                        const sorted = [...msg.recent].sort((a, b) => (a.seq || 0) - (b.seq || 0));
                                        sorted.forEach(m => {
                                            if (m && m.seq > lastSeq && m.seq <= seq && m.data) {
                                                queue.push(m.data);
                                            }
                                        });
                                    } else if (msg && msg.data) {
                                        queue.push(msg.data);
                                    }

                                    queue.forEach(itemData => {
                                        handleIncomingData(itemData);
                                        broadcastLobbyData(itemData);
                                    });
                                }
                            }
                        }
                    });

                    const changed = JSON.stringify(players) !== JSON.stringify(nextPlayers);
                    players = nextPlayers;

                    if (changed) {
                        updatePlayerList();
                        saveLobbyPlayers();
                        broadcastLobbyData({ type: "UPDATE_PLAYERS", players });
                        // Mid-Game-Join: neuer Spieler wird in Firebase-State übernommen
                        scheduleSaveGameState();
                    } else {
                        updatePlayerList();
                    }
                }, () => {
                    if (!leavingLobbyManually) scheduleLobbyReconnect();
                });
        }

        function startClientFirestoreLobby(hostEmail) {
            stopFirestoreLobbyTransport();
            lobbyHostEmail = hostEmail;

            lobbyHostUnsubscribe = db.collection("users").doc(hostEmail)
                .onSnapshot(doc => {
                    if (!doc.exists || leavingLobbyManually || isHost) return;

                    const d = doc.data() || {};
                    if (d.currentLobby !== activeLobbyCode) return;

                    const msg = d.hostMessage;
                    const seq = Number(msg && msg.seq) || 0;
                    const prevSeq = lobbyLastHostSeq;

                    if (seq > prevSeq) {
                        lobbyLastHostSeq = seq;
                        const queue = [];
                        if (Array.isArray(msg.recent) && msg.recent.length) {
                            const sorted = [...msg.recent].sort((a, b) => (a.seq || 0) - (b.seq || 0));
                            sorted.forEach(m => {
                                if (m && m.seq > prevSeq && m.seq <= seq && m.data) {
                                    queue.push(m.data);
                                }
                            });
                        } else if (msg && msg.data) {
                            queue.push(msg.data);
                        }

                        queue.forEach(itemData => {
                            handleIncomingData(itemData);
                        });
                    }
                }, () => {
                    if (!leavingLobbyManually) scheduleLobbyReconnect();
                });
        }

        let hostMessageBuffer = [];
        async function broadcastLobbyData(data) {
            if (!myEmail || !activeLobbyCode || !isHost) return;

            lobbyMessageSeq++;
            const item = { seq: lobbyMessageSeq, data, sentAt: Date.now() };
            hostMessageBuffer.push(item);
            if (hostMessageBuffer.length > 8) hostMessageBuffer.shift();

            try {
                await db.collection("users").doc(myEmail).set({
                    hostMessage: {
                        seq: lobbyMessageSeq,
                        data,
                        recent: hostMessageBuffer,
                        sentAt: Date.now()
                    },
                    currentLobby: activeLobbyCode,
                    lobbyRole: "host",
                    lobbyHostEmail: myEmail,
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } catch (e) {}
        }

        let clientMessageBuffer = [];
        async function sendClientLobbyData(data) {
            if (!myEmail || !activeLobbyCode || isHost) return;

            lobbyMessageSeq++;
            const item = { seq: lobbyMessageSeq, data, sentAt: Date.now() };
            clientMessageBuffer.push(item);
            if (clientMessageBuffer.length > 8) clientMessageBuffer.shift();

            try {
                await db.collection("users").doc(myEmail).set({
                    lobbyMessage: {
                        seq: lobbyMessageSeq,
                        data,
                        recent: clientMessageBuffer,
                        sentAt: Date.now()
                    },
                    currentLobby: activeLobbyCode,
                    lobbyRole: isSpectator ? "spectator" : "client",
                    isSpectator: !!isSpectator,
                    lobbyHostEmail: lobbyHostEmail,
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } catch (e) {}
        }


        // --- Cookie-Helfer (Session überlebt Seiten-Neustart / Browser-Restart) ---
        function setLobbyCookie(value, maxAgeSeconds = 3 * 60 * 60) {
            try {
                const secure = (typeof location !== "undefined" && location.protocol === "https:") ? "; Secure" : "";
                document.cookie = `${LOBBY_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
            } catch (e) {}
        }

        function getLobbyCookie() {
            try {
                const match = document.cookie.match(new RegExp("(?:^|; )" + LOBBY_COOKIE_NAME.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)"));
                return match ? decodeURIComponent(match[1]) : null;
            } catch (e) {
                return null;
            }
        }

        function clearLobbyCookie() {
            try {
                document.cookie = `${LOBBY_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
            } catch (e) {}
        }

        function saveLobbySession() {
            if (!activeLobbyCode || leavingLobbyManually) return;
            const payload = {
                code: activeLobbyCode,
                role: isHost ? "host" : (isSpectator ? "spectator" : "client"),
                isSpectator: !!isSpectator,
                name: myName,
                savedAt: Date.now()
            };
            try {
                localStorage.setItem(LOBBY_STORAGE_KEY, JSON.stringify(payload));
            } catch (e) {
                console.warn("Lobby-Session konnte nicht in localStorage gespeichert werden:", e);
            }
            // Cookie als Fallback / Browser-übergreifende Session
            try {
                setLobbyCookie(JSON.stringify(payload));
            } catch (e) {}
        }

        function getSavedLobbySession() {
            // Zuerst localStorage, dann Cookie
            let data = null;
            try {
                const raw = localStorage.getItem(LOBBY_STORAGE_KEY);
                if (raw) data = JSON.parse(raw);
            } catch (e) {}
            if (!data || !data.code || !data.role) {
                try {
                    const cookieRaw = getLobbyCookie();
                    if (cookieRaw) data = JSON.parse(cookieRaw);
                } catch (e) {}
            }
            if (!data || !data.code || !data.role) return null;
            // Veraltete Sessions (> 3 Stunden) automatisch verwerfen
            if (data.savedAt && (Date.now() - data.savedAt > 3 * 60 * 60 * 1000)) {
                clearSavedLobbySession();
                return null;
            }
            return data;
        }

        function clearSavedLobbySession() {
            try {
                localStorage.removeItem(LOBBY_STORAGE_KEY);
                localStorage.removeItem(LOBBY_STORAGE_KEY + "_players");
            } catch (e) {}
            clearLobbyCookie();
        }

        function saveLobbyPlayers() {
            // Nur noch als leichter Cache; der echte Stand liegt in Firebase lobbies/{code}
            if (!isHost || !activeLobbyCode) return;
            try {
                localStorage.setItem(
                    LOBBY_STORAGE_KEY + "_players",
                    JSON.stringify(Array.isArray(players) ? players : [])
                );
            } catch (e) {}
        }

        function loadLobbyPlayers() {
            try {
                const raw = localStorage.getItem(LOBBY_STORAGE_KEY + "_players");
                if (!raw) return [];
                const data = JSON.parse(raw);
                return Array.isArray(data) ? data : [];
            } catch (e) {
                return [];
            }
        }

        // --- Firebase-Spielzustand (automatisch, debounced, kein manuelles Host-Speichern) ---
        function buildGameStatePayload() {
            return {
                hostEmail: isHost ? myEmail : (lobbyHostEmail || ""),
                players: Array.isArray(players) ? players : [],
                phase: gamePhase || "lobby",
                gameStarted: !!gameStarted,
                currentPlayerIndex: Number(currentPlayerIndex) || 0,
                pendingChoice: pendingChoice || "",
                currentTaskText: currentTaskText || "",
                currentTaskCreator: currentTaskCreator || "",
                currentRotation: Number(currentRotation) || 0,
                nextTurnVotedPlayers: Array.isArray(nextTurnVotedPlayers) ? nextTurnVotedPlayers : [],
                nextRoundVotedPlayers: Array.isArray(nextRoundVotedPlayers) ? nextRoundVotedPlayers : [],
                currentSharedResult: currentSharedResult || null,
                playerStatuses: playerStatuses || {},
                recentTaskCreators: Array.isArray(recentTaskCreators) ? recentTaskCreators : [],
                updatedAt: Date.now()
            };
        }

        function scheduleSaveGameState() {
            if (!isHost || !activeLobbyCode || leavingLobbyManually) return;
            if (saveStateTimer) clearTimeout(saveStateTimer);
            // Debounce ~400ms, damit schnelle Updates keine Lags erzeugen
            saveStateTimer = setTimeout(() => {
                saveStateTimer = null;
                saveGameStateToFirebase();
            }, 400);
        }

        async function saveGameStateToFirebase() {
            if (!isHost || !activeLobbyCode || leavingLobbyManually) return;
            const payload = buildGameStatePayload();
            const hash = JSON.stringify({
                players: payload.players,
                phase: payload.phase,
                gameStarted: payload.gameStarted,
                currentPlayerIndex: payload.currentPlayerIndex,
                pendingChoice: payload.pendingChoice,
                currentTaskText: payload.currentTaskText,
                currentTaskCreator: payload.currentTaskCreator,
                nextTurnVotedPlayers: payload.nextTurnVotedPlayers,
                nextRoundVotedPlayers: payload.nextRoundVotedPlayers,
                currentSharedResult: payload.currentSharedResult,
                playerStatuses: payload.playerStatuses
            });
            if (hash === lastSavedStateHash) return;
            lastSavedStateHash = hash;
            try {
                await db.collection("lobbies").doc(activeLobbyCode).set(payload, { merge: true });
            } catch (e) {
                console.warn("Spielzustand konnte nicht in Firebase gespeichert werden:", e);
            }
        }

        function stopLobbyStateListener() {
            try { if (lobbyStateUnsubscribe) lobbyStateUnsubscribe(); } catch (e) {}
            lobbyStateUnsubscribe = null;
        }

        function startLobbyStateListener() {
            if (!activeLobbyCode) return;
            stopLobbyStateListener();
            lobbyStateUnsubscribe = db.collection("lobbies").doc(activeLobbyCode)
                .onSnapshot(doc => {
                    if (leavingLobbyManually) return;
                    if (!doc.exists) return;
                    const data = doc.data() || {};
                    // Host schreibt selbst – bei eigenem Write nicht erneut anwenden
                    if (isHost && data.hostEmail === myEmail && !restoringLobby) {
                        // Nur players-Liste von Presence kann sich unabhängig ändern;
                        // Phase etc. kommt vom Host selbst.
                        return;
                    }
                    applyGameStateFromFirebase(data);
                }, () => {
                    if (!leavingLobbyManually) scheduleLobbyReconnect();
                });
        }

        function applyGameStateFromFirebase(data) {
            if (!data || typeof data !== "object") return;

            const prevPhase = gamePhase;
            const prevIndex = currentPlayerIndex;
            const prevPendingChoice = pendingChoice;
            const prevTaskText = currentTaskText;
            const prevCreator = currentTaskCreator;
            const prevSharedKey = currentSharedResultKey;
            const prevStarted = gameStarted;

            if (Array.isArray(data.players) && data.players.length) {
                players = data.players;
                updatePlayerList();
            }
            if (data.playerStatuses && typeof data.playerStatuses === "object") {
                playerStatuses = data.playerStatuses;
                renderPlayerStatuses();
            }
            if (Array.isArray(data.recentTaskCreators)) {
                recentTaskCreators = data.recentTaskCreators;
            }
            if (Array.isArray(data.nextTurnVotedPlayers)) {
                nextTurnVotedPlayers = data.nextTurnVotedPlayers;
            }
            if (Array.isArray(data.nextRoundVotedPlayers)) {
                nextRoundVotedPlayers = data.nextRoundVotedPlayers;
            }

            const phase = data.phase || "lobby";
            const started = !!data.gameStarted;
            currentPlayerIndex = Number(data.currentPlayerIndex) || 0;
            pendingChoice = data.pendingChoice || "";
            currentTaskText = data.currentTaskText || "";
            currentTaskCreator = data.currentTaskCreator || "";
            currentRotation = Number(data.currentRotation) || 0;
            currentSharedResult = data.currentSharedResult || null;
            if (currentSharedResult) {
                currentSharedResultKey = [
                    String(currentSharedResult.targetPlayer || ""),
                    String(currentSharedResult.choice || ""),
                    String(currentSharedResult.taskText || ""),
                    String(currentSharedResult.resultText || "")
                ].join("|");
            } else {
                currentSharedResultKey = "";
            }

            gamePhase = phase;
            gameStarted = started;

            const turnStateChanged = (prevPhase !== phase)
                || (prevIndex !== currentPlayerIndex)
                || (prevPendingChoice !== pendingChoice)
                || (prevTaskText !== currentTaskText)
                || (prevCreator !== currentTaskCreator)
                || (prevSharedKey !== currentSharedResultKey)
                || (prevStarted !== started);

            if (started && (phase === "wop" || phase === "wheel")) {
                // UI in die laufende Runde bringen (auch nach Reload / Mid-Game-Join)
                document.getElementById("setup")?.classList.add("hidden");
                document.getElementById("lobby-wait-box")?.classList.add("hidden");
                document.getElementById("leave-lobby-btn")?.classList.remove("hidden");
                document.getElementById("chat-box-container")?.classList.remove("hidden");
                document.getElementById("emergency-box")?.classList.remove("hidden");
                document.getElementById("player-status-panel")?.classList.remove("hidden");

                if (phase === "wop") {
                    document.getElementById("woP-phase")?.classList.remove("hidden");
                    document.getElementById("wheel-phase")?.classList.add("hidden");
                    if (turnStateChanged) {
                        updateWopTurn();
                    }
                } else if (phase === "wheel") {
                    document.getElementById("woP-phase")?.classList.add("hidden");
                    document.getElementById("wheel-phase")?.classList.remove("hidden");
                    const spinBtn = document.getElementById("spin-btn");
                    if (spinBtn) spinBtn.disabled = isSpectator ? true : false;
                }
            } else if (!started) {
                // Noch Lobby-Wartezustand
                showLobbyUI(activeLobbyCode, !isHost);
            }
            saveLobbySession();
        }

        async function ensureLobbyDoc() {
            if (!isHost || !activeLobbyCode) return;
            try {
                await db.collection("lobbies").doc(activeLobbyCode).set({
                    hostEmail: myEmail,
                    players: players,
                    phase: gamePhase || "lobby",
                    gameStarted: !!gameStarted,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: Date.now()
                }, { merge: true });
            } catch (e) {}
        }

        function showLobbyUI(code, client = false) {
            document.getElementById("setup").classList.add("hidden");
            document.getElementById("lobby-wait-box").classList.remove("hidden");
            document.getElementById("leave-lobby-btn").classList.remove("hidden");
            document.getElementById("display-code").innerText = String(code).toUpperCase();
            document.getElementById("client-wait-msg").classList.toggle("hidden", !client);
            saveLobbySession();
            updateOnlineStatus(true);
        }

        function stopReconnectTimer() {
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
        }

        function scheduleLobbyReconnect() {
            if (leavingLobbyManually || !activeLobbyCode || reconnectTimer) return;

            reconnectAttempts++;
            const delay = Math.min(RECONNECT_DELAY * Math.max(1, Math.min(reconnectAttempts, 8)), 10000);

            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                reconnectLobby();
            }, delay);
        }

        function destroyPeerOnly() {
            try { if (hostConnection) hostConnection.close(); } catch (e) {}
            try { if (peer) peer.destroy(); } catch (e) {}
            hostConnection = null;
            peer = null;
            clientConnections = [];
        }

// ==============================================================================
// 13. SPIELABLAUF: LOBBY ERSTELLEN & BEITRETEN
// ==============================================================================
        async function hostGame(options = {}) {
            const restoring = !!options.restoring;
            restoringLobby = restoring;
            leavingLobbyManually = false;
            stopReconnectTimer();

            if (!myName || !myEmail) {
                if (!restoring) alert(currentLang === "de" ? "Bitte zuerst einloggen." : "Please log in first.");
                return;
            }

            isHost = true;

            if (!restoring || !activeLobbyCode) {
                activeLobbyCode = "vibe" + Math.random().toString(36).slice(2, 8);
                players = [{ name: getUserDisplayName({name: myName}, "Spieler"), accessory: equippedAccessory || "", eliminated: false }];
            } else {
                const savedPlayers = loadLobbyPlayers();
                players = Array.isArray(savedPlayers) && savedPlayers.length ? savedPlayers : [];
                if (!players.some(p => p.name === myName)) {
                    players.unshift({ name: myName, accessory: equippedAccessory || "", eliminated: false });
                }
            }

            destroyPeerOnly();
            stopFirestoreLobbyTransport();
            stopLobbyStateListener();
            if (!restoring) {
                gamePhase = "lobby";
                gameStarted = false;
                currentPlayerIndex = 0;
                currentSharedResult = null;
                nextTurnVotedPlayers = [];
                nextRoundVotedPlayers = [];
            }
            saveLobbySession();
            saveLobbyPlayers();
            updateOnlineStatus(true);

            try {
                await setLobbyPresence({
                    lobbyMessage: firebase.firestore.FieldValue.delete(),
                    hostMessage: firebase.firestore.FieldValue.delete()
                });
                await ensureLobbyDoc();
                startHostFirestoreLobby();
                startLobbyStateListener();
                // Beim Restore: bestehenden Firebase-Stand laden
                if (restoring) {
                    try {
                        const lobbyDoc = await db.collection("lobbies").doc(activeLobbyCode).get();
                        if (lobbyDoc.exists) {
                            applyGameStateFromFirebase(lobbyDoc.data() || {});
                        }
                    } catch (e) {}
                }
                if (!gameStarted) {
                    showLobbyUI(activeLobbyCode, false);
                    document.getElementById("start-btn").classList.remove("hidden");
                }
                updatePlayerList();
                scheduleSaveGameState();
                restoringLobby = false;
            } catch (e) {
                if (!restoring) {
                    alert(currentLang === "de"
                        ? "Lobby konnte nicht erstellt werden. Bitte erneut versuchen."
                        : "Could not create the lobby. Please try again.");
                }
            }
        }

        function clearLobbyJoinTimeout() {
            if (lobbyJoinTimeout) {
                clearTimeout(lobbyJoinTimeout);
                lobbyJoinTimeout = null;
            }
        }

        function normalizeLobbyCode(value) {
            return String(value || "")
                .trim()
                .replace(/\s+/g, "")
                .toLowerCase();
        }

        async function joinLobbyAsSpectator(code) {
            if (myRole !== "admin" && myRole !== "master") {
                alert(currentLang === "de"
                    ? "Nur Admins und Master können als Zuschauer beitreten."
                    : "Only Admins and Masters can join as spectators.");
                return;
            }
            if (code) {
                const input = document.getElementById("lobby-code-input");
                if (input) input.value = code;
            }
            await joinGame({ asSpectator: true });
        }

        async function joinGame(options = {}) {
            const restoring = !!options.restoring;
            const asSpectator = !!options.asSpectator;
            const input = document.getElementById("lobby-code-input");
            const rawCode = restoring ? String(activeLobbyCode || "") : (input ? input.value : "");
            const code = normalizeLobbyCode(rawCode);

            if (!code) {
                if (!restoring) alert(currentLang === "de" ? "Bitte gib einen Lobby-Code ein." : "Please enter a lobby code.");
                return;
            }

            if (!myName || !myEmail) {
                if (!restoring) alert(currentLang === "de" ? "Bitte zuerst einloggen." : "Please log in first.");
                return;
            }

            if (asSpectator) {
                if (myRole !== "admin" && myRole !== "master") {
                    if (!restoring) {
                        alert(currentLang === "de"
                            ? "Nur Admins und Master dürfen als Zuschauer beitreten."
                            : "Only Admins and Masters can join as spectators.");
                    }
                    return;
                }
                isSpectator = true;
            } else {
                isSpectator = false;
            }
            updateHUD();

            restoringLobby = restoring;
            leavingLobbyManually = false;
            stopReconnectTimer();
            activeLobbyCode = code;
            isHost = false;
            clearLobbyJoinTimeout();
            destroyPeerOnly();
            stopFirestoreLobbyTransport();

            try {
                const snap = await db.collection("users")
                    .where("currentLobby", "==", code)
                    .get();

                let hostEmail = "";
                snap.forEach(doc => {
                    const d = doc.data() || {};
                    if (!hostEmail && (d.lobbyRole === "host" || doc.id === d.lobbyHostEmail)) {
                        hostEmail = doc.id;
                    }
                });

                if (!hostEmail) {
                    if (!restoring) {
                        alert(currentLang === "de"
                            ? "Lobby nicht gefunden. Prüfe den Lobby-Code."
                            : "Lobby not found. Check the lobby code.");
                    }
                    return;
                }

                // Lobby-Beitritt auch während laufender Runde erlaubt (Mid-Game-Join).
                // Der Spielstand wird aus Firebase (lobbies/{code}) wiederhergestellt.
                lobbyHostEmail = hostEmail;

                await setLobbyPresence({
                    lobbyMessage: firebase.firestore.FieldValue.delete()
                });

                startClientFirestoreLobby(hostEmail);
                startLobbyStateListener();

                // Sofort vorhandenen Spielstand laden (auch wenn Runde schon läuft)
                try {
                    const lobbyDoc = await db.collection("lobbies").doc(code).get();
                    if (lobbyDoc.exists) {
                        const lobbyData = lobbyDoc.data() || {};
                        applyGameStateFromFirebase(lobbyData);
                        if (lobbyData.gameStarted) {
                            // Host bekommt neuen Spieler über Presence-Snapshot und speichert State
                        } else {
                            showLobbyUI(code, true);
                            document.getElementById("client-wait-msg").classList.remove("hidden");
                        }
                    } else {
                        showLobbyUI(code, true);
                        document.getElementById("client-wait-msg").classList.remove("hidden");
                    }
                } catch (e) {
                    showLobbyUI(code, true);
                    document.getElementById("client-wait-msg").classList.remove("hidden");
                }

                document.getElementById("display-code").innerText = code.toUpperCase();
                saveLobbySession();
                restoringLobby = false;
            } catch (e) {
                if (!restoring) {
                    alert(currentLang === "de"
                        ? "Lobby konnte nicht beigetreten werden. Bitte Code prüfen."
                        : "Could not join the lobby. Please check the code.");
                }
            }
        }

        function reconnectLobby() {
            if (leavingLobbyManually || !activeLobbyCode) return;

            const saved = getSavedLobbySession();
            const role = saved?.role || (isHost ? "host" : (isSpectator ? "spectator" : "client"));
            const wasSpectator = !!saved?.isSpectator || role === "spectator";

            if (role === "host") hostGame({ restoring: true });
            else joinGame({ restoring: true, asSpectator: wasSpectator });
        }

        function leaveLobby() {
            if (confirm(currentLang === 'de' ? "Möchtest du die Lobby wirklich verlassen?" : "Do you really want to leave the lobby?")) {
                leavingLobbyManually = true;
                stopReconnectTimer();

                try { sendData({ type: 'LEAVE_LOBBY', playerName: myName }); } catch (e) {}

                clearSavedLobbySession();
                cleanupAndResetLobby(true);
            }
        }

        function cleanupAndResetLobby(manual = false) {
            clearTimeout(window.__autoNextTurnTimer);
            window.__autoNextTurnTimer = null;
            if (manual) leavingLobbyManually = true;
            stopReconnectTimer();
            clearLobbyJoinTimeout();
            stopFirestoreLobbyTransport();
            stopLobbyStateListener();
            if (saveStateTimer) {
                clearTimeout(saveStateTimer);
                saveStateTimer = null;
            }
            clearLobbyPresence();

            if (peer) {
                try { peer.destroy(); } catch(e) {}
                peer = null;
            }

            hostConnection = null;
            clientConnections = [];
            isHost = false;
            isSpectator = false;
            currentTaskCreator = "";
            hostMessageBuffer = [];
            clientMessageBuffer = [];
            players = [];
            currentPlayerIndex = 0;
            activeLobbyCode = "";
            gamePhase = "lobby";
            gameStarted = false;
            currentSharedResult = null;
            currentSharedResultKey = "";
            nextTurnVotedPlayers = [];
            nextRoundVotedPlayers = [];
            playerStatuses = {};
            lastSavedStateHash = "";

            if (manual) clearSavedLobbySession();

            updateHUD();
            updateOnlineStatus(true);

            document.getElementById("lobby-wait-box").classList.add("hidden");
            document.getElementById("woP-phase").classList.add("hidden");
            document.getElementById("wheel-phase").classList.add("hidden");
            document.getElementById("emergency-box").classList.add("hidden");
            document.getElementById("chat-box-container").classList.add("hidden");
            document.getElementById("player-status-panel")?.classList.add("hidden");
            document.getElementById("leave-lobby-btn").classList.add("hidden");
            document.getElementById("start-btn").classList.add("hidden");
            document.getElementById("client-wait-msg").classList.add("hidden");
            document.getElementById("setup").classList.remove("hidden");
            document.getElementById("chat-messages").innerHTML = "";
        }

        function sendData(data) {
            if (!data) return;

            if (isHost) {
                handleIncomingData(data);
                broadcastLobbyData(data);
            } else {
                sendClientLobbyData(data);
            }
        }

        // Legacy PeerJS hooks bleiben als No-Op erhalten.
        function setupHostConnectionEvents(c) {}
        function setupClientConnectionEvents(c) {}

        function handlePlayerLeaving(leftName) {
            players = players.filter(p => p.name !== leftName);
            updatePlayerList();
            saveLobbyPlayers();
            appendChat("System", currentLang === 'de' ? `${leftName} hat die Lobby verlassen.` : `${leftName} has left the lobby.`);

            if (isHost) {
                broadcastLobbyData({ type: 'UPDATE_PLAYERS', players: players });
            }
        }

        function handleIncomingData(data) {
            if (data.type === 'UPDATE_PLAYERS') {
                players = data.players;
                updatePlayerList();
            } else if (data.type === 'LEAVE_LOBBY') {
                handlePlayerLeaving(data.playerName);
            } else if (data.type === 'START_GAME') {
                players = data.players;
                startGameUI();
            } else if (data.type === 'SUBMIT_CHOICE') {
                pendingChoice = data.choice;
                if (isHost) {
                    assignTaskCreator(data.playerName, data.choice);
                }
            } else if (data.type === 'ASSIGN_CREATOR') {
                currentTaskCreator = data.creatorName;
                pendingChoice = data.choice;
                setupCreatorUI(data.targetPlayer, data.choice, data.creatorName);
            } else if (data.type === 'SHOW_TASK') {
                currentTaskText = data.taskText;
                displayTaskScreen(data.targetPlayer, data.choice, data.taskText, data.creator);
            } else if (data.type === 'SHOW_RESULT') {
                currentSharedResult = {
                    targetPlayer: data.targetPlayer,
                    choice: data.choice,
                    taskText: data.taskText,
                    resultText: data.resultText
                };
                showFeedbackScreen(
                    data.targetPlayer,
                    data.choice,
                    data.taskText,
                    data.resultText
                );
            } else if (data.type === 'FORCE_SKIP') {
                // Jemand hat einen Force-Skip-Joker auf den aktuellen Spieler gespielt
                const targetName = data.targetPlayer || "";
                const byName = data.byPlayer || "";
                taskCompleted = true;
                const resultData = {
                    type: "SHOW_RESULT",
                    targetPlayer: targetName,
                    choice: data.choice || pendingChoice || "",
                    taskText: data.taskText || currentTaskText || "",
                    resultText: currentLang === "de"
                        ? `🚫 Von ${byName} mit Force-Skip-Joker ausgesetzt!`
                        : `🚫 Force-skipped by ${byName}!`
                };
                // Lokal anzeigen
                handleIncomingData(resultData);
                // Host verteilt das Ergebnis an alle Clients
                if (isHost) {
                    broadcastLobbyData(resultData);
                    scheduleSaveGameState();
                }
            } else if (data.type === 'VOTE_NEXT_TURN') {
                handleNextTurnVote(data.playerName);
            } else if (data.type === 'EXECUTE_NEXT_TURN') {
                executeProceedToNextTurn();
            } else if (data.type === 'START_WHEEL') {
                gamePhase = "wheel";
                document.getElementById("woP-phase").classList.add("hidden");
                document.getElementById("wheel-phase").classList.remove("hidden");
                const spinBtn = document.getElementById("spin-btn");
                if (spinBtn) spinBtn.disabled = isSpectator ? true : false;
                const wheelResult = document.getElementById("wheel-result-box");
                if (wheelResult) wheelResult.classList.add("hidden");
                if (isHost) scheduleSaveGameState();
            } else if (data.type === 'SPIN_WHEEL') {
                runWheelAnimation(data.sector, data.rotation);
            } else if (data.type === 'VOTE_NEXT_ROUND') {
                handleNextRoundVote(data.playerName);
            } else if (data.type === 'NEXT_ROUND') {
                nextRound();
            } else if (data.type === 'ELIMINATE') {
                players = Array.isArray(data.players) ? data.players : players;
                updatePlayerList();
                applyEliminationSideEffects(data.eliminatedName || null);
                if (isHost) scheduleSaveGameState();
            } else if (data.type === 'PLAYER_STATUS') {
                if (data.playerName && data.playerName !== 'undefined') {
                    const clamp = v => Math.max(0, Math.min(100, Number(v) || 0));
                    playerStatuses[data.playerName] = {
                        toilet: clamp(data.toilet),
                        horny: clamp(data.horny),
                        alcohol: clamp(data.alcohol),
                        thirst: clamp(data.thirst),
                        energy: clamp(data.energy)
                    };
                    renderPlayerStatuses();
                    if (isHost) scheduleSaveGameState();
                }
            } else if (data.type === 'CHAT_MSG') {
                // Eigene Nachricht wird beim Absenden sofort lokal angezeigt.
                // Bei weitergeleiteten Nachrichten nur anzeigen, wenn sie von
                // einem anderen Spieler stammt, damit der Absender keine Duplikate sieht.
                if (data.sender !== myName) {
                    appendChat(data.sender, data.text);
                }
            } else if (data.type === 'PRIVATE_MSG') {
                // Privatnachricht: nur Absender und Empfänger sehen sie in der UI.
                // (Übertragung läuft weiterhin über den Host – Filter ist clientseitig.)
                const toName = data.to || "";
                const fromName = data.sender || "";
                if (namesEqual(fromName, myName)) {
                    // Eigene PN wurde schon lokal angezeigt – keine Duplikate.
                    return;
                }
                if (namesEqual(toName, myName)) {
                    appendPrivateChat(fromName, toName, data.text, false);
                }
            }
        }

        function updatePlayerList() {
            const list = document.getElementById("player-list");
            if (!list) return;
            list.innerHTML = "";
            let nonSpectatorCount = 0;
            players.forEach((p, index) => {
                const playerName = getUserDisplayName(p);
                const accessory = String(p.accessory || "");
                const isSpec = !!p.isSpectator;
                if (!isSpec) nonSpectatorCount++;
                const specBadge = isSpec ? ` <span style="font-size:10px;color:#b388ff;font-weight:normal;">[${currentLang === "de" ? "Zuschauer" : "Spectator"}]</span>` : "";
                list.innerHTML += `<li><b>${index + 1}.</b> ${accessory} ${playerName} ${p.eliminated ? '❌' : ''}${specBadge}</li>`;
            });
            if (isHost && nonSpectatorCount >= 1) {
                document.getElementById("start-btn").classList.remove("hidden");
            } else if (isHost) {
                document.getElementById("start-btn").classList.add("hidden");
            }
            renderPlayerStatuses();
            refreshChatRecipientSelect();
        }

        /** Dropdown „An:“ im Chat mit aktuellen Mitspielern füllen (ohne sich selbst). */
        function refreshChatRecipientSelect() {
            const sel = document.getElementById("chat-recipient");
            if (!sel) return;
            const prev = sel.value || "all";
            const t = translations[currentLang] || translations.de;
            const allLabel = t.chatToAll || (currentLang === "de" ? "🌐 Alle (öffentlich)" : "🌐 Everyone (public)");

            // Bestehende Optionen außer „all“ entfernen
            while (sel.options.length > 1) {
                sel.remove(1);
            }
            const allOpt = sel.options[0];
            if (allOpt) {
                allOpt.value = "all";
                allOpt.id = "ui-chat-to-all";
                allOpt.textContent = allLabel;
            }

            (players || []).forEach(p => {
                const name = getUserDisplayName(p);
                if (!name || namesEqual(name, myName)) return;
                const opt = document.createElement("option");
                opt.value = name;
                const elim = p.eliminated ? " ❌" : "";
                const spec = p.isSpectator ? (currentLang === "de" ? " [Zuschauer]" : " [Spectator]") : "";
                opt.textContent = "🔒 " + name + elim + spec;
                sel.appendChild(opt);
            });

            // Vorherige Auswahl beibehalten, falls der Spieler noch da ist
            const stillThere = Array.from(sel.options).some(o => o.value === prev);
            sel.value = stillThere ? prev : "all";
        }

        function openStatusSettingsModal() {
            // Aktuelle Werte aus playerStatuses in die Slider übernehmen
            const st = playerStatuses[myName] || {};
            ["toilet", "horny", "alcohol", "thirst", "energy"].forEach(kind => {
                const input = document.getElementById(kind + "-level");
                if (input) {
                    input.value = Math.max(0, Math.min(100, Number(st[kind]) || 0));
                }
            });
            updateOwnStatusPreview();
            document.getElementById("status-settings-modal")?.classList.remove("hidden");
        }

        function closeStatusSettingsModal() {
            document.getElementById("status-settings-modal")?.classList.add("hidden");
        }

        function updateOwnStatusPreview() {
            ["toilet", "horny", "alcohol", "thirst", "energy"].forEach(kind => {
                const input = document.getElementById(kind + "-level");
                const label = document.getElementById(kind + "-level-value");
                if (input && label) label.textContent = input.value + "%";
            });
        }

        let publishStatusDebounceTimer = null;
        function publishOwnStatus() {
            const read = id => Number(document.getElementById(id)?.value || 0);
            const toilet = read("toilet-level");
            const horny = read("horny-level");
            const alcohol = read("alcohol-level");
            const thirst = read("thirst-level");
            const energy = read("energy-level");
            playerStatuses[myName] = { toilet, horny, alcohol, thirst, energy };
            renderPlayerStatuses();

            if (publishStatusDebounceTimer) clearTimeout(publishStatusDebounceTimer);
            publishStatusDebounceTimer = setTimeout(() => {
                publishStatusDebounceTimer = null;
                sendData({ type: "PLAYER_STATUS", playerName: myName, toilet, horny, alcohol, thirst, energy });
            }, 250);
        }

        function renderPlayerStatuses() {
            const container = document.getElementById("player-status-list");
            if (!container) return;
            const safe = value => Math.max(0, Math.min(100, Number(value) || 0));
            container.innerHTML = "";
            const t = translations[currentLang] || translations.de;
            const bars = [
                { key: "toilet", icon: "🚻", short: t.toiletShort || (currentLang === "de" ? "Klo" : "Restroom"), color: "#35b8ff" },
                { key: "horny", icon: "🔥", short: t.hornyShort || (currentLang === "de" ? "Horny" : "Horny"), color: "#ff5b9b" },
                { key: "alcohol", icon: "🍺", short: t.alcoholShort || (currentLang === "de" ? "Alkohol" : "Alcohol"), color: "#f0a500" },
                { key: "thirst", icon: "💧", short: t.thirstShort || (currentLang === "de" ? "Durst" : "Thirst"), color: "#4fc3f7" },
                { key: "energy", icon: "😴", short: t.energyShort || (currentLang === "de" ? "Müdigkeit" : "Tiredness"), color: "#9b59b6" }
            ];
            players.forEach(p => {
                const name = getUserDisplayName(p);
                const status = playerStatuses[name] || {};
                const row = document.createElement("div");
                row.style.cssText = "padding:7px;border-radius:8px;background:rgba(255,255,255,.06)";
                let html = `<strong></strong>`;
                bars.forEach(b => {
                    const val = safe(status[b.key]);
                    html += `<div style="font-size:11px;margin-top:5px">${b.icon} ${b.short} ${val}%</div><div style="height:6px;background:#333;border-radius:8px;overflow:hidden"><div style="height:100%;width:${val}%;background:${b.color}"></div></div>`;
                });
                row.innerHTML = html;
                row.querySelector("strong").textContent = name;
                container.appendChild(row);
            });
        }

        function startOnlineGame() {
            if (!isHost) return;
            gameStarted = true;
            gamePhase = "wop";
            currentPlayerIndex = 0;
            currentSharedResult = null;
            nextTurnVotedPlayers = [];
            nextRoundVotedPlayers = [];
            sendData({ type: 'START_GAME', players: players });
            startGameUI();
            scheduleSaveGameState();
        }

        function startGameUI() {
            gameStarted = true;
            gamePhase = gamePhase === "wheel" ? "wheel" : "wop";
            document.getElementById("auth-modal").classList.add("hidden");
            document.getElementById("account-modal").classList.add("hidden");
            document.getElementById("setup").classList.add("hidden");
            document.getElementById("lobby-wait-box").classList.add("hidden");
            document.getElementById("woP-phase").classList.remove("hidden");
            document.getElementById("emergency-box").classList.remove("hidden");
            document.getElementById("chat-box-container").classList.remove("hidden");
            document.getElementById("player-status-panel")?.classList.remove("hidden");
            document.getElementById("leave-lobby-btn").classList.remove("hidden");
            updateWopTurn();
            if (isHost) scheduleSaveGameState();
        }

// ==============================================================================
// 14. SPIELABLAUF: WAHRHEIT ODER PFLICHT RUNDENLOGIK
// ==============================================================================
        function updateWopTurn() {
            if (currentSharedResult) {
                showFeedbackScreen(
                    currentSharedResult.targetPlayer,
                    currentSharedResult.choice,
                    currentSharedResult.taskText,
                    currentSharedResult.resultText
                );
                return;
            }

            // Skip eliminated players and spectators for turns!
            while (currentPlayerIndex < players.length && (players[currentPlayerIndex].eliminated || players[currentPlayerIndex].isSpectator)) {
                currentPlayerIndex++;
            }
            if (currentPlayerIndex >= players.length) {
                if (isHost) {
                    gamePhase = "wheel";
                    sendData({ type: 'START_WHEEL' });
                    document.getElementById("woP-phase").classList.add("hidden");
                    document.getElementById("wheel-phase").classList.remove("hidden");
                    scheduleSaveGameState();
                }
                return;
            }

            let currentP = players[currentPlayerIndex];
            const currentPlayerName = getUserDisplayName(currentP, "Spieler");
            document.getElementById("wop-turn-title").innerHTML = translations[currentLang].turnTitle + `<span style="color: var(--primary-color);">${currentPlayerName}</span>`;
            
            document.getElementById("wop-choice-area").classList.add("hidden");
            document.getElementById("creator-input-area").classList.add("hidden");
            document.getElementById("active-task-area").classList.add("hidden");
            document.getElementById("result-feedback-area").classList.add("hidden");
            document.getElementById("waiting-for-player-box").classList.add("hidden");

            // Zwischenzustand: Aufgabe bereits zugewiesen → Task-Screen wiederherstellen
            if (currentTaskText && pendingChoice) {
                displayTaskScreen(currentPlayerName, pendingChoice, currentTaskText, currentTaskCreator || "");
                return;
            }

            // Zwischenzustand: Wahl bereits getroffen, Creator erstellt noch die Aufgabe
            if (pendingChoice) {
                if (currentTaskCreator && namesEqual(currentTaskCreator, myName) && !isSpectator) {
                    setupCreatorUI(currentPlayerName, pendingChoice, currentTaskCreator);
                    return;
                }
                document.getElementById("waiting-for-player-box").classList.remove("hidden");
                const creatorHint = currentTaskCreator ? ` (${currentTaskCreator})` : "";
                document.getElementById("waiting-info-text").innerText = currentLang === "de"
                    ? (isSpectator
                        ? `[Zuschauer] Warte auf Aufgabe für ${currentPlayerName}${creatorHint}…`
                        : (namesEqual(currentPlayerName, myName)
                            ? `Warte auf die Aufgabe von ${currentTaskCreator || "einem Mitspieler"}…`
                            : `Warte, bis die Aufgabe für ${currentPlayerName} erstellt wird…`))
                    : (isSpectator
                        ? `[Spectating] Waiting for task for ${currentPlayerName}${creatorHint}…`
                        : (namesEqual(currentPlayerName, myName)
                            ? `Waiting for a task from ${currentTaskCreator || "another player"}…`
                            : `Waiting for a task to be created for ${currentPlayerName}…`));
                return;
            }

            // Frischer Zug: Wahrheits-/Pflicht-Auswahl
            if (isSpectator) {
                document.getElementById("waiting-for-player-box").classList.remove("hidden");
                document.getElementById("waiting-info-text").innerText = (currentLang === 'de'
                    ? `[Zuschauer] Warte, bis ${currentPlayerName} wählt...`
                    : `[Spectating] Waiting for ${currentPlayerName} to choose...`);
            } else if (namesEqual(currentPlayerName, myName)) {
                const selectBtn = document.getElementById("ui-select-btn");
                if (selectBtn) selectBtn.disabled = false;
                document.getElementById("wop-choice-area").classList.remove("hidden");
            } else {
                document.getElementById("waiting-for-player-box").classList.remove("hidden");
                document.getElementById("waiting-info-text").innerText = (currentLang === 'de' ? `Warte, bis ${currentPlayerName} wählt...` : `Waiting for ${currentPlayerName} to choose...`);
            }
        }

        function submitWopChoice() {
            if (isSpectator) return;
            const currentP = players[currentPlayerIndex];
            if (!currentP || !namesEqual(currentP, myName)) return;

            const button = document.getElementById("ui-select-btn");
            if (button && button.disabled) return;

            const choice = document.getElementById("wop-choice").value;
            if (choice !== "truth" && choice !== "dare") return;

            pendingChoice = choice;
            if (button) button.disabled = true;
            // Sofort lokal warten, damit kein Doppelklick / kein erneutes Anzeigen der Auswahl
            document.getElementById("wop-choice-area")?.classList.add("hidden");
            document.getElementById("waiting-for-player-box")?.classList.remove("hidden");
            document.getElementById("waiting-info-text").innerText = currentLang === "de"
                ? "Warte auf die Aufgabe von einem Mitspieler…"
                : "Waiting for a task from another player…";

            sendData({ type: 'SUBMIT_CHOICE', playerName: myName, choice: choice });
            if (isHost) scheduleSaveGameState();
        }

        function assignTaskCreator(targetName, choice) {
            let activeOthers = players.filter(p => !p.eliminated && !p.isSpectator && !namesEqual(p, targetName));
            let eligible = activeOthers;
            // Wenn 3 oder mehr Kandidaten da sind, schließen wir nur den allerletzten Ersteller aus,
            // damit nicht 2x hintereinander dieselbe Person drankommt, aber echte Zufallsauswahl bleibt!
            if (activeOthers.length >= 3 && recentTaskCreators.length > 0) {
                const lastCreator = recentTaskCreators[recentTaskCreators.length - 1];
                eligible = activeOthers.filter(p => !namesEqual(p, lastCreator));
                if (!eligible.length) eligible = activeOthers;
            }
            const chosenPlayer = eligible.length
                ? eligible[Math.floor(Math.random() * eligible.length)]
                : (activeOthers.length ? activeOthers[0] : null);

            const creatorName = chosenPlayer
                ? getUserDisplayName(chosenPlayer)
                : getUserDisplayName({ name: targetName }, targetName);

            currentTaskCreator = creatorName;
            pendingChoice = choice;

            if (activeOthers.length > 1) {
                recentTaskCreators.push(creatorName);
                if (recentTaskCreators.length > 10) recentTaskCreators.shift();
            }

            sendData({ type: 'ASSIGN_CREATOR', targetPlayer: targetName, choice: choice, creatorName: creatorName });
            if (isHost) scheduleSaveGameState();
        }

        function setupCreatorUI(targetPlayer, choice, creatorName) {
            currentTaskCreator = creatorName;
            pendingChoice = choice;
            targetPlayer = getUserDisplayName({ name: targetPlayer }, "Spieler");
            creatorName = getUserDisplayName({ name: creatorName }, "Spieler");
            const isTruth = choice === "truth";
            const instruction = currentLang === 'de'
                ? (isTruth ? `Wähle eine Wahrheitsfrage für ${targetPlayer}:` : `Wähle eine Pflicht-Aufgabe für ${targetPlayer}:`)
                : (isTruth ? `Choose a truth question for ${targetPlayer}:` : `Choose a dare for ${targetPlayer}:`);

            document.getElementById("wop-choice-area").classList.add("hidden");
            document.getElementById("waiting-for-player-box").classList.add("hidden");
            document.getElementById("creator-input-area").classList.add("hidden");
            document.getElementById("creator-instruction-title").innerText = instruction;
            document.getElementById("creator-target-info").innerText = currentLang === 'de'
                ? `${isTruth ? "Wahrheit" : "Pflicht"} für ${targetPlayer}`
                : `${isTruth ? "Truth" : "Dare"} for ${targetPlayer}`;

            if (namesEqual(creatorName, myName) && !isSpectator) {
                document.getElementById("creator-input-area").classList.remove("hidden");
                document.getElementById("custom-task-input").placeholder = currentLang === 'de'
                    ? (isTruth ? `Wahrheitsfrage für ${targetPlayer} eingeben...` : `Pflicht-Aufgabe für ${targetPlayer} eingeben...`)
                    : (isTruth ? `Enter a truth question for ${targetPlayer}...` : `Enter a dare for ${targetPlayer}...`);
            } else {
                document.getElementById("waiting-for-player-box").classList.remove("hidden");
                document.getElementById("waiting-info-text").innerText = (currentLang === 'de'
                    ? (isSpectator ? `[Zuschauer] Warte auf ${creatorName}...` : `Warte auf ${creatorName}...`)
                    : (isSpectator ? `[Spectating] Waiting for ${creatorName}...` : `Waiting for ${creatorName}...`));
            }
        }

        function sendCustomTask() {
            if (isSpectator) return;
            let taskText = document.getElementById("custom-task-input").value.trim();
            if (!taskText) { alert(translations[currentLang].alertTask); return; }
            const currentP = players[currentPlayerIndex];
            if (!currentP) return;
            let targetPlayer = getUserDisplayName(currentP);
            currentTaskText = taskText;
            document.getElementById("creator-input-area").classList.add("hidden");
            document.getElementById("custom-task-input").value = "";
            sendData({ type: 'SHOW_TASK', targetPlayer: targetPlayer, choice: pendingChoice, taskText: taskText, creator: myName });
            if (isHost) scheduleSaveGameState();
        }

        function displayTaskScreen(targetPlayer, choice, taskText, creator) {
            pendingChoice = choice || pendingChoice || "";
            currentTaskText = taskText || currentTaskText || "";
            currentTaskCreator = creator || currentTaskCreator || "";
            taskCompleted = false;

            const ansBtn = document.getElementById("ui-submit-answer-btn");
            const dareBtn = document.getElementById("ui-dare-done-btn");
            if (ansBtn) ansBtn.disabled = isSpectator;
            if (dareBtn) dareBtn.disabled = isSpectator;

            document.getElementById("wop-choice-area").classList.add("hidden");
            document.getElementById("creator-input-area").classList.add("hidden");
            document.getElementById("waiting-for-player-box").classList.add("hidden");
            document.getElementById("result-feedback-area")?.classList.add("hidden");

            if (namesEqual(targetPlayer, myName) && !isSpectator) {
                document.getElementById("active-task-area").classList.remove("hidden");
                document.getElementById("task-title-text").innerText = choice === "truth" ? (currentLang === 'de' ? "💡 WAHRHEIT" : "💡 TRUTH") : (currentLang === 'de' ? "🔥 PFLICHT" : "🔥 DARE");
                document.getElementById("task-assigner-info").innerText = creator
                    ? ((currentLang === 'de' ? "Von: " : "From: ") + creator)
                    : "";
                document.getElementById("task-content-desc").innerText = taskText;
                
                if (choice === "truth") {
                    document.getElementById("answer-box").classList.remove("hidden");
                    document.getElementById("dare-box").classList.add("hidden");
                    const ansInp = document.getElementById("player-answer-input");
                    if (ansInp) ansInp.value = "";
                } else {
                    document.getElementById("answer-box").classList.add("hidden");
                    document.getElementById("dare-box").classList.remove("hidden");
                }

                // Skip-Joker-Button anzeigen, wenn Joker vorhanden
                const skipBox = document.getElementById("joker-skip-box");
                if (skipBox) {
                    if (jokerSkipCount > 0) {
                        skipBox.classList.remove("hidden");
                        const cnt = document.getElementById("joker-skip-btn-count");
                        if (cnt) cnt.innerText = String(jokerSkipCount);
                    } else {
                        skipBox.classList.add("hidden");
                    }
                }
                document.getElementById("joker-force-box")?.classList.add("hidden");
            } else {
                document.getElementById("active-task-area").classList.add("hidden");
                document.getElementById("waiting-for-player-box").classList.remove("hidden");
                const tp = getUserDisplayName({ name: targetPlayer }, targetPlayer);
                const rolePrefix = isSpectator ? "[Zuschauer] " : "";
                document.getElementById("waiting-info-text").innerText = currentLang === 'de'
                    ? `${rolePrefix}${tp} führt aus: „${taskText}“`
                    : `${rolePrefix}${tp}'s task: "${taskText}"`;

                // Force-Skip-Button für andere Spieler (nicht Zuschauer, Joker vorhanden)
                const forceBox = document.getElementById("joker-force-box");
                if (forceBox) {
                    if (!isSpectator && jokerForceCount > 0 && !namesEqual(targetPlayer, myName)) {
                        forceBox.classList.remove("hidden");
                        const cnt = document.getElementById("joker-force-btn-count");
                        if (cnt) cnt.innerText = String(jokerForceCount);
                    } else {
                        forceBox.classList.add("hidden");
                    }
                }
                document.getElementById("joker-skip-box")?.classList.add("hidden");
            }
        }

        function submitAnswer() {
            if (isSpectator || taskCompleted) return;
            const currentP = players[currentPlayerIndex];
            if (!currentP || !namesEqual(currentP, myName)) return;
            if (!pendingChoice || pendingChoice !== "truth") return;

            const ans = document.getElementById("player-answer-input").value.trim();
            if (!ans) { alert(translations[currentLang].alertAnswer); return; }

            taskCompleted = true;
            const ansBtn = document.getElementById("ui-submit-answer-btn");
            const dareBtn = document.getElementById("ui-dare-done-btn");
            if (ansBtn) ansBtn.disabled = true;
            if (dareBtn) dareBtn.disabled = true;

            finishTaskAndReward(pendingChoice);

            const resultData = {
                type: 'SHOW_RESULT',
                targetPlayer: getUserDisplayName(currentP),
                choice: pendingChoice,
                taskText: currentTaskText,
                resultText: (currentLang === 'de' ? `Antwort: "${ans}"` : `Answer: "${ans}"`)
            };

            // Der Antwortende sieht sein eigenes Ergebnis SOFORT.
            handleIncomingData(resultData);

            // Danach wird es über den Host an alle anderen verteilt.
            if (!isHost) {
                sendClientLobbyData(resultData);
            } else {
                broadcastLobbyData(resultData);
                scheduleSaveGameState();
            }
        }

        function submitDareDone() {
            if (isSpectator || taskCompleted) return;
            const currentP = players[currentPlayerIndex];
            if (!currentP || !namesEqual(currentP, myName)) return;
            if (!pendingChoice || pendingChoice !== "dare") return;

            taskCompleted = true;
            const ansBtn = document.getElementById("ui-submit-answer-btn");
            const dareBtn = document.getElementById("ui-dare-done-btn");
            if (ansBtn) ansBtn.disabled = true;
            if (dareBtn) dareBtn.disabled = true;

            finishTaskAndReward(pendingChoice);

            const resultData = {
                type: 'SHOW_RESULT',
                targetPlayer: getUserDisplayName(currentP),
                choice: pendingChoice,
                taskText: currentTaskText,
                resultText: (currentLang === 'de' ? "Erfolgreich erfüllt! ✅" : "Successfully completed! ✅")
            };

            // Auch der Spieler, der die Pflicht bestätigt, sieht das Ergebnis selbst.
            handleIncomingData(resultData);

            if (!isHost) {
                sendClientLobbyData(resultData);
            } else {
                broadcastLobbyData(resultData);
                scheduleSaveGameState();
            }
        }

        function finishTaskAndReward(choice) {
            const currentPlayer = players[currentPlayerIndex];
            if (!currentPlayer || !namesEqual(currentPlayer, myName)) return;

            addRewards(choice === "dare");
        }

        function showFeedbackScreen(targetPlayer, choice, taskText, resultText) {
            const resultKey = [
                String(targetPlayer || ""),
                String(choice || ""),
                String(taskText || ""),
                String(resultText || "")
            ].join("|");

            const isNewResult = resultKey !== currentSharedResultKey;
            currentSharedResult = {
                targetPlayer,
                choice,
                taskText,
                resultText
            };
            currentSharedResultKey = resultKey;

            document.getElementById("active-task-area").classList.add("hidden");
            document.getElementById("creator-input-area").classList.add("hidden");
            document.getElementById("wop-choice-area").classList.add("hidden");
            document.getElementById("waiting-for-player-box").classList.add("hidden");
            document.getElementById("joker-skip-box")?.classList.add("hidden");
            document.getElementById("joker-force-box")?.classList.add("hidden");
            document.getElementById("result-feedback-area").classList.remove("hidden");

            if (isNewResult) {
                nextTurnVotedPlayers = [];
            }

            document.getElementById("feedback-player-name").innerText =
                currentLang === 'de'
                    ? `${targetPlayer} hat abgeschlossen!`
                    : `${targetPlayer} finished!`;

            document.getElementById("feedback-task-info").innerText =
                currentLang === 'de'
                    ? `Aufgabe: "${taskText}"`
                    : `Task: "${taskText}"`;

            document.getElementById("feedback-result-box").innerText = resultText;

            const nextBtn = document.getElementById("next-turn-btn");
            if (isSpectator) {
                if (nextBtn) {
                    nextBtn.disabled = true;
                    nextBtn.innerText = currentLang === 'de' ? "👁️ [Zuschauer]" : "👁️ [Spectator]";
                }
            } else {
                if (nextBtn) {
                    nextBtn.disabled = nextTurnVotedPlayers.some(n => namesEqual(n, myName));
                    nextBtn.innerText = currentLang === 'de' ? "Weiter" : "Next";
                }
            }

            const activeCount = players.filter(p => !p.eliminated && !p.isSpectator).length;
            document.getElementById("next-votes-count").innerText = String(nextTurnVotedPlayers.length);
            document.getElementById("next-votes-total").innerText = String(activeCount);
        }

        function voteNextTurn() {
            if (isSpectator) return;
            if (!currentSharedResult) return;

            const me = players.find(p => namesEqual(p, myName));
            if (!me || me.eliminated || me.isSpectator) return;
            if (nextTurnVotedPlayers.some(n => namesEqual(n, myName))) return;

            document.getElementById("next-turn-btn").disabled = true;

            const voteData = { type: 'VOTE_NEXT_TURN', playerName: myName };

            // Eigene Bestätigung sofort lokal registrieren.
            handleIncomingData(voteData);

            // Host verarbeitet/broadcastet sie; Client sendet sie nur an den Host.
            if (!isHost) {
                sendClientLobbyData(voteData);
            } else {
                broadcastLobbyData(voteData);
            }
        }

        function handleNextTurnVote(pName) {
            const activePlayers = players.filter(p => !p.eliminated && !p.isSpectator);
            const activeNames = activePlayers.map(p => getUserDisplayName(p));
            if (!activeNames.some(n => namesEqual(n, pName))) return;
            if (!nextTurnVotedPlayers.some(n => namesEqual(n, pName))) {
                nextTurnVotedPlayers.push(getUserDisplayName({ name: pName }, pName));
            }

            document.getElementById("next-votes-count").innerText = nextTurnVotedPlayers.length;
            document.getElementById("next-votes-total").innerText = activePlayers.length;

            if (namesEqual(pName, myName)) {
                const nb = document.getElementById("next-turn-btn");
                if (nb) nb.disabled = true;
            }

            // Erst wenn wirklich jeder aktive Spieler bestätigt hat, geht es weiter.
            if (isHost && activePlayers.length > 0 && nextTurnVotedPlayers.length >= activePlayers.length) {
                const nextData = { type: 'EXECUTE_NEXT_TURN' };

                // Auf dem Host sofort weiter.
                handleIncomingData(nextData);

                // Danach an alle Clients.
                broadcastLobbyData(nextData);

                // executeProceedToNextTurn() setzt den Vote-Status wieder zurück.
            }
        }

        function executeProceedToNextTurn() {
            currentSharedResult = null;
            currentSharedResultKey = "";
            pendingChoice = "";
            currentTaskText = "";
            taskCompleted = false;
            document.getElementById("result-feedback-area").classList.add("hidden");
            document.getElementById("active-task-area").classList.add("hidden");
            document.getElementById("creator-input-area").classList.add("hidden");
            document.getElementById("waiting-for-player-box").classList.add("hidden");
            document.getElementById("wop-choice-area")?.classList.add("hidden");
            const nextBtn = document.getElementById("next-turn-btn");
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.innerText = currentLang === 'de' ? "Weiter" : "Next";
            }
            const selectBtn = document.getElementById("ui-select-btn");
            if (selectBtn) selectBtn.disabled = false;
            nextTurnVotedPlayers = [];
            currentPlayerIndex++;
            updateWopTurn();
            if (isHost) scheduleSaveGameState();
        }

// ==============================================================================
// 15. GLÜCKSRAD-PHASE (ANIMATION & ABSTIMMUNG)
// ==============================================================================
        function spinWheel() {
            if (isSpectator) return;
            const button = document.getElementById("spin-btn");
            if (button.disabled) return;

            let sectors = translations[currentLang].wheelSectors;
            let idx = Math.floor(Math.random() * sectors.length);
            currentRotation += 1800 + (idx * (360 / sectors.length));
            button.disabled = true;
            sendData({ type: 'SPIN_WHEEL', sector: idx, rotation: currentRotation });
        }

        function runWheelAnimation(sectorIndex, rotationVal) {
            document.getElementById("spin-btn").disabled = true;
            let wheel = document.getElementById("wheel-container");
            wheel.style.transform = `rotate(-${rotationVal}deg)`;
            setTimeout(() => {
                document.getElementById("spin-btn").disabled = isSpectator ? true : false;
                let selected = translations[currentLang].wheelSectors[sectorIndex];
                wheel.innerText = (currentLang === 'de' ? "ERGEBNIS!" : "RESULT!");
                document.getElementById("wheel-action-title").innerText = selected.title;
                document.getElementById("wheel-action-desc").innerText = selected.desc;
                document.getElementById("wheel-result-box").classList.remove("hidden");
                const nextRoundBtn = document.getElementById("next-round-btn");
                if (nextRoundBtn) nextRoundBtn.disabled = isSpectator ? true : false;
                if (!isSpectator) {
                    userXP += 25;
                    userCoins += 12;
                    addMonthlyCoins(12);
                    calculateLevel();
                    updateHUD();
                    updateProfileModal();
                    saveUserDataToCloud();
                }
            }, 3000);
        }

        function voteNextRound() {
            if (isSpectator) return;
            document.getElementById("next-round-btn").disabled = true;
            sendData({ type: 'VOTE_NEXT_ROUND', playerName: myName });
        }

        function handleNextRoundVote(pName) {
            const activePlayers = players.filter(p => !p.eliminated && !p.isSpectator);
            const activeNames = activePlayers.map(p => getUserDisplayName(p));
            if (!activeNames.some(n => namesEqual(n, pName))) return;
            if (!nextRoundVotedPlayers.some(n => namesEqual(n, pName))) nextRoundVotedPlayers.push(pName);
            let activeCount = activePlayers.length;
            
            const countEl = document.getElementById("round-votes-count");
            const totalEl = document.getElementById("round-votes-total");
            if (countEl) countEl.innerText = nextRoundVotedPlayers.length;
            if (totalEl) totalEl.innerText = activeCount;

            if (isHost && activeCount > 0 && nextRoundVotedPlayers.length >= activeCount) {
                sendData({ type: 'NEXT_ROUND' });
            }
        }

        function nextRound() {
            currentPlayerIndex = 0;
            nextRoundVotedPlayers = [];
            pendingChoice = "";
            currentTaskText = "";
            currentSharedResult = null;
            currentSharedResultKey = "";
            taskCompleted = false;
            gamePhase = "wop";
            document.getElementById("wheel-result-box").classList.add("hidden");
            document.getElementById("wheel-phase").classList.add("hidden");
            document.getElementById("woP-phase").classList.remove("hidden");
            const selectBtn = document.getElementById("ui-select-btn");
            if (selectBtn) selectBtn.disabled = false;
            updateWopTurn();
            if (isHost) scheduleSaveGameState();
        }

        function findPlayerByNameInput(input) {
            const q = String(input || "").trim().toLowerCase();
            if (!q) return null;
            // 1) Exakter Match (ohne Groß/Klein)
            let target = players.find(p => String(p.name || "").trim().toLowerCase() === q);
            if (target) return target;
            // 2) Enthält-Match (wenn eindeutig)
            const partial = players.filter(p => String(p.name || "").trim().toLowerCase().includes(q));
            if (partial.length === 1) return partial[0];
            return null;
        }

        let lastEliminatedChatKey = "";

        function applyEliminationSideEffects(eliminatedName) {
            const name = eliminatedName || null;
            // Chat-Hinweis (nicht doppelt bei lokal + Broadcast)
            if (name) {
                const chatKey = name + "|" + (currentPlayerIndex || 0);
                if (chatKey !== lastEliminatedChatKey) {
                    lastEliminatedChatKey = chatKey;
                    appendChat(
                        "System",
                        currentLang === "de"
                            ? `${name} ist raus (Leak / aufgegeben). ❌`
                            : `${name} is out (leaked / gave up). ❌`
                    );
                }
            }

            // Votes des Ausgeschiedenen entfernen, damit die Runde nicht blockiert
            if (name) {
                nextTurnVotedPlayers = nextTurnVotedPlayers.filter(n => n !== name);
                nextRoundVotedPlayers = nextRoundVotedPlayers.filter(n => n !== name);
            }

            // Wenn die laufende Runde den ausgeschiedenen Spieler betrifft → weiter
            const current = players[currentPlayerIndex];
            const currentName = current ? getUserDisplayName(current) : "";
            if (name && currentName === name) {
                currentSharedResult = null;
                currentSharedResultKey = "";
                document.getElementById("result-feedback-area")?.classList.add("hidden");
                document.getElementById("active-task-area")?.classList.add("hidden");
                document.getElementById("creator-input-area")?.classList.add("hidden");
                document.getElementById("wop-choice-area")?.classList.add("hidden");
                currentPlayerIndex++;
            }

            // Andere Spieler: Runde fortsetzen
            if (!(name && name === myName)) {
                if (gameStarted && gamePhase === "wop") {
                    updateWopTurn();
                } else if (gameStarted && gamePhase === "wheel") {
                    const activeCount = players.filter(p => !p.eliminated && !p.isSpectator).length;
                    const countEl = document.getElementById("round-votes-count");
                    const totalEl = document.getElementById("round-vote-total");
                    if (countEl) countEl.innerText = String(nextRoundVotedPlayers.length);
                    if (totalEl) totalEl.innerText = String(activeCount);
                    if (isHost && activeCount > 0 && nextRoundVotedPlayers.length >= activeCount) {
                        sendData({ type: "NEXT_ROUND" });
                    }
                }
                if (gameStarted && gamePhase === "wop" && isHost) {
                    const activePlayers = players.filter(p => !p.eliminated && !p.isSpectator);
                    if (currentSharedResult && nextTurnVotedPlayers.length >= activePlayers.length && activePlayers.length > 0) {
                        const nextData = { type: "EXECUTE_NEXT_TURN" };
                        handleIncomingData(nextData);
                        broadcastLobbyData(nextData);
                    }
                }
            }

            // Der ausgeschiedene Spieler selbst → zurück zum Lobby-Setup (Erstellen / Code eingeben)
            if (name && name === myName) {
                setTimeout(() => kickEliminatedPlayerToSetup(), 300);
            }
        }

        /** Nach Leak/Klo: eigenen Client aus der Lobby werfen und Setup-Screen zeigen */
        function kickEliminatedPlayerToSetup() {
            try {
                // Mitspieler informieren, dass wir die Lobby verlassen
                try {
                    sendData({ type: "LEAVE_LOBBY", playerName: myName });
                } catch (e) {}

                leavingLobbyManually = true;
                stopReconnectTimer();
                clearLobbyJoinTimeout();
                stopFirestoreLobbyTransport();
                stopLobbyStateListener();
                if (saveStateTimer) {
                    clearTimeout(saveStateTimer);
                    saveStateTimer = null;
                }
                clearLobbyPresence();
                clearSavedLobbySession();

                if (peer) {
                    try { peer.destroy(); } catch (e) {}
                    peer = null;
                }
                hostConnection = null;
                clientConnections = [];
                isHost = false;
                players = [];
                currentPlayerIndex = 0;
                activeLobbyCode = "";
                gamePhase = "lobby";
                gameStarted = false;
                currentSharedResult = null;
                currentSharedResultKey = "";
                nextTurnVotedPlayers = [];
                nextRoundVotedPlayers = [];
                playerStatuses = {};
                lastSavedStateHash = "";
                pendingChoice = "";
                currentTaskText = "";
                taskCompleted = false;

                // Alle Spiel-Phasen ausblenden, Setup (Lobby erstellen / Code) einblenden
                document.getElementById("lobby-wait-box")?.classList.add("hidden");
                document.getElementById("woP-phase")?.classList.add("hidden");
                document.getElementById("wheel-phase")?.classList.add("hidden");
                document.getElementById("emergency-box")?.classList.add("hidden");
                document.getElementById("chat-box-container")?.classList.add("hidden");
                document.getElementById("player-status-panel")?.classList.add("hidden");
                document.getElementById("leave-lobby-btn")?.classList.add("hidden");
                document.getElementById("start-btn")?.classList.add("hidden");
                document.getElementById("client-wait-msg")?.classList.add("hidden");
                document.getElementById("setup")?.classList.remove("hidden");
                const chatMsgs = document.getElementById("chat-messages");
                if (chatMsgs) chatMsgs.innerHTML = "";

                updateOnlineStatus(true);

                alert(
                    currentLang === "de"
                        ? "Du bist ausgeschieden (Leak / Klo) und wurdest aus der Runde entfernt.\nDu kannst eine neue Lobby erstellen oder einem Code beitreten."
                        : "You are eliminated (leak / restroom) and were removed from the round.\nYou can create a new lobby or join with a code."
                );

                // Kurzer Moment, dann wieder normale Leave-Logik erlauben
                setTimeout(() => {
                    leavingLobbyManually = false;
                }, 500);
            } catch (e) {
                console.error("kickEliminatedPlayerToSetup:", e);
                // Fallback: zumindest Setup zeigen
                document.getElementById("woP-phase")?.classList.add("hidden");
                document.getElementById("wheel-phase")?.classList.add("hidden");
                document.getElementById("emergency-box")?.classList.add("hidden");
                document.getElementById("chat-box-container")?.classList.add("hidden");
                document.getElementById("player-status-panel")?.classList.add("hidden");
                document.getElementById("lobby-wait-box")?.classList.add("hidden");
                document.getElementById("setup")?.classList.remove("hidden");
            }
        }

        async function triggerLeak() {
            // Zuschauer dürfen normalerweise nicht eliminieren – Ausnahme: Admin/Master
            if (isSpectator && myRole !== "admin" && myRole !== "master") return;
            await performPlayerElimination({ reason: "leak" });
        }

        /** Admin/Master-Kick (auch im Zuschauermodus nutzbar) */
        async function adminKickPlayer() {
            if (myRole !== "admin" && myRole !== "master") {
                alert(currentLang === "de" ? "Keine Berechtigung!" : "Access denied / Not authorized!");
                return;
            }
            await performPlayerElimination({ reason: "kick" });
        }

        /**
         * Gemeinsame Eliminierungs-Logik für Leak und Admin-Kick.
         * @param {{ reason: "leak" | "kick" }} options
         */
        async function performPlayerElimination(options = {}) {
            const reason = options.reason || "leak";
            const activeNames = players
                .filter(p => !p.eliminated && !p.isSpectator)
                .map(p => getUserDisplayName(p))
                .filter(Boolean);

            if (!activeNames.length) {
                alert(currentLang === "de" ? "Keine aktiven Spieler mehr." : "No active players left.");
                return;
            }

            const promptMsg = reason === "kick"
                ? (currentLang === "de"
                    ? `Welchen Spieler möchtest du kicken?\n\nAktive Spieler:\n• ${activeNames.join("\n• ")}\n\nGenauen Namen eingeben:`
                    : `Which player do you want to kick?\n\nActive players:\n• ${activeNames.join("\n• ")}\n\nEnter exact name:`)
                : (currentLang === "de"
                    ? `Wer hat geleakt / aufgegeben?\n\nAktive Spieler:\n• ${activeNames.join("\n• ")}\n\nGenauen Namen eingeben:`
                    : `Who leaked / gave up?\n\nActive players:\n• ${activeNames.join("\n• ")}\n\nEnter exact name:`);

            const targetName = prompt(promptMsg);
            if (targetName === null) return; // Abbrechen

            const target = findPlayerByNameInput(targetName);
            if (!target) {
                alert(
                    currentLang === "de"
                        ? `Spieler „${String(targetName || "").trim()}“ nicht gefunden.\nBitte den genauen Namen aus der Liste eingeben.`
                        : `Player "${String(targetName || "").trim()}" not found.\nPlease enter the exact name from the list.`
                );
                return;
            }

            if (target.eliminated) {
                alert(
                    currentLang === "de"
                        ? `${getUserDisplayName(target)} ist bereits ausgeschieden.`
                        : `${getUserDisplayName(target)} is already eliminated.`
                );
                return;
            }

            // Admin/Master dürfen sich nicht selbst per Kick entfernen (nur über Leak-Flow)
            if (reason === "kick" && namesEqual(target, myName)) {
                alert(currentLang === "de"
                    ? "Du kannst dich nicht selbst kicken."
                    : "You cannot kick yourself.");
                return;
            }

            target.eliminated = true;
            const eliminatedName = getUserDisplayName(target);

            // Nur der tatsächlich ausgeschiedene Spieler verliert seinen Streak.
            if (eliminatedName === myName || target.name === myName) {
                userStreak = 0;
                try {
                    await saveUserDataToCloud();
                } catch (e) {}
                updateHUD();
                updateProfileModal();
            }

            // An alle senden. Host verarbeitet sofort über sendData → handleIncomingData;
            // Clients wenden den Effekt an, sobald der Host ELIMINATE broadcastet.
            // Für den auslösenden Client lokal schon UI anpassen, damit es ohne Verzögerung wirkt.
            updatePlayerList();
            applyEliminationSideEffects(eliminatedName);

            sendData({
                type: "ELIMINATE",
                players: players.map(p => ({
                    name: p.name,
                    accessory: p.accessory || "",
                    eliminated: !!p.eliminated
                })),
                eliminatedName: eliminatedName
            });

            if (isHost) scheduleSaveGameState();
        }

        function appendChat(sender, text) {
            let box = document.getElementById("chat-messages");
            if (!box) return;
            const safeSender = String(sender || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeText = String(text || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            box.innerHTML += `<div class="chat-msg"><b>${safeSender}:</b> ${safeText}</div>`;
            box.scrollTop = box.scrollHeight;
        }

        /**
         * Private Nachricht im Chat anzeigen (nur für Absender / Empfänger).
         * @param {string} fromName
         * @param {string} toName
         * @param {string} text
         * @param {boolean} isOwn – true = ich habe gesendet
         */
        function appendPrivateChat(fromName, toName, text, isOwn) {
            const box = document.getElementById("chat-messages");
            if (!box) return;
            const t = translations[currentLang] || translations.de;
            const safeFrom = String(fromName || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeTo = String(toName || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeText = String(text || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            let label;
            if (isOwn) {
                label = `${t.chatPrivateSelf || "🔒 Du →"} ${safeTo}`;
            } else {
                label = `${t.chatPrivateFrom || "🔒 Privat von"} ${safeFrom}`;
            }
            box.innerHTML += `<div class="chat-msg-private"><span class="pm-lock"></span><b>${label}:</b> ${safeText}</div>`;
            box.scrollTop = box.scrollHeight;
        }

        function sendChatMessage() {
            const input = document.getElementById("chat-input");
            if (!input) return;
            const text = input.value.trim();
            if (!text) return;

            const sel = document.getElementById("chat-recipient");
            const recipient = sel ? (sel.value || "all") : "all";

            if (recipient === "all") {
                // Öffentlicher Chat – wie bisher
                appendChat(myName, text);
                sendData({ type: "CHAT_MSG", sender: myName, text: text });
            } else {
                // Privatnachricht an einen Mitspieler
                if (namesEqual(recipient, myName)) {
                    alert(currentLang === "de"
                        ? "Du kannst dir keine private Nachricht an dich selbst schicken."
                        : "You cannot send a private message to yourself.");
                    return;
                }
                const targetExists = (players || []).some(p => namesEqual(p, recipient));
                if (!targetExists) {
                    alert(currentLang === "de"
                        ? "Dieser Spieler ist nicht mehr in der Lobby."
                        : "That player is no longer in the lobby.");
                    refreshChatRecipientSelect();
                    return;
                }
                // Sofort lokal anzeigen (nur bei mir)
                appendPrivateChat(myName, recipient, text, true);
                sendData({
                    type: "PRIVATE_MSG",
                    sender: myName,
                    to: recipient,
                    text: text
                });
            }
            input.value = "";
        }
