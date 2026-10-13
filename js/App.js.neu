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
                0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc2b2ae8a, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
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
                lbTitle: "🏆 Rangliste",
                lbDesc: "Die Spieler mit den meisten Coins:",
                lbGlobalTitle: "🌍 Gesamtwertung – alle Coins",
                lbMonthlyTitle: "📅 Monatswertung – Coins diesen Monat",
                lbCoins: "Coins",
                lbLoading: "Rangliste wird geladen …",
                lbError: "Die Rangliste konnte nicht geladen werden.",
                btnLogout: "Logout",
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
                friendsCloseBtn: "Schließen",                privateLobbyHint: "🔑 Teile den Lobby-Code mit deinen Freunden oder lade sie direkt ein.",
                hostBtnPrivate: "Lobby erstellen (Host) 🏠",
                lbTabGlobal: "🌍 Global",
                lbTabFriends: "👥 Freunde",
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
                emergencyDesc: "Wer einknickt oder leakt, hat sofort verloren!",
                leakBtn: "🚨 Ich habe geleakt / musste pinkeln (Verloren!)",
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
                lbTitle: "🏆 Ranking",
                lbDesc: "Players with the most coins:",
                lbGlobalTitle: "🌍 All-time ranking – total coins",
                lbMonthlyTitle: "📅 Monthly ranking – coins this month",
                lbCoins: "Coins",
                lbLoading: "Loading leaderboard …",
                lbError: "Could not load the leaderboard.",
                btnLogout: "Logout",
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
                emergencyDesc: "Anyone who caves or leaks loses immediately!",
                leakBtn: "🚨 I leaked / had to pee (Lost!)",
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
            const lang = forcedLang || (appSelect ? appSelect.value : null) || (authSelect ? authSelect.value : null) || "de";
            currentLang = lang;
            localStorage.setItem("lang", lang);
            document.documentElement.lang = lang;
            document.querySelectorAll("[data-i18n]").forEach(el => {
                const key = el.getAttribute("data-i18n");
                if (translations[lang] && translations[lang][key]) {
                    el.textContent = translations[lang][key];
                }
            });
            document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
                const key = el.getAttribute("data-i18n-placeholder");
                if (translations[lang] && translations[lang][key]) {
                    el.placeholder = translations[lang][key];
                }
            });
            const titleEl = document.getElementById("app-title");
            if (titleEl && translations[lang] && translations[lang].title) {
                titleEl.textContent = translations[lang].title;
            }
            document.querySelectorAll("[data-i18n-html]").forEach(el => {
                const key = el.getAttribute("data-i18n-html");
                if (translations[lang] && translations[lang][key]) {
                    el.innerHTML = translations[lang][key];
                }
            });
            if (typeof renderFriendsList === "function") renderFriendsList();
            if (typeof renderOnlinePlayers === "function") renderOnlinePlayers();
                  }            if (forcedLang === "de" || forcedLang === "en") {
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
            const emDesc = document.getElementById("ui-emergency-desc"); if (emDesc) emDesc.innerText = t.emergencyDesc;
            const leakBtn = document.getElementById("ui-leak-btn"); if (leakBtn) leakBtn.innerText = t.leakBtn;

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
        let truthCount = 0;
        let dareCount = 0;

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
                    truthCount = data.truthCount || 0;
                    dareCount = data.dareCount || 0;
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
                updateHUD();
                updateProfileModal();
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
                    truthCount: truthCount,
                    dareCount: dareCount,
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
        const ONLINE_HEARTBEAT_MS = 30000;
        const ONLINE_TIMEOUT_MS = 90000;
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

            try {
                const snapshot = await db.collection("users").get();
                let users = [];
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
                    ? (currentLang === "de" ? "👥 Freunde – " : "👥 Friends – ")                    : (currentLang === "de" ? "🌍 " : "🌍 ");
                render(prefix + (t.lbGlobalTitle || "Allgemeine Coin-Rangliste"), "coins", "💰");
                render(prefix + (t.lbMonthlyTitle || "Monatliche Coin-Rangliste"), "monthlyCoins", "🪙");
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
                        container.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; margin-bottom:6px; font-size:12px;">
                            <div><b>${safeAccessory} ${safeDisplayName}</b> <br><span style="color:#28a745; font-size:10px;">${lobbyInfo}</span></div>
                            <div style="display:flex;gap:3px;">
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
        }

        function checkAdminPermissions() {
            let adminBtn = document.getElementById("btn-admin-panel");
            if (myRole === "master" || myRole === "admin" || myRole === "moderator") {
                adminBtn.classList.remove("hidden");
            } else {
                adminBtn.classList.add("hidden");
            }
        }

        function updateProfileModal() {
            document.getElementById("acc-display-name").innerText = myName;
            let roleBadge = document.getElementById("acc-display-role");
            roleBadge.innerText = myRole.toUpperCase();
            if(myRole === "master") roleBadge.style.background = "#ff0055";
            else if(myRole === "admin") roleBadge.style.background = "#ff3300";
            else if(myRole === "moderator") roleBadge.style.background = "#00bfff";
            else roleBadge.style.background = "#666";

            document.getElementById("acc-display-level").innerText = (currentLang === 'de' ? `Partystufe ${userLevel} (${userXP} XP)` : `Party Level ${userLevel} (${userXP} XP)`);
            document.getElementById("acc-display-coins").innerText = userCoins;
            const avatarDisplay = document.getElementById("avatar-display");
            avatarDisplay.childNodes[0].textContent = avatarEmote || "😊";
            document.getElementById("avatar-emote-select").value = avatarEmote || "😊";
            applyAccessoryStyle(equippedAccessory);

            let badgeBox = document.getElementById("badge-container");
            badgeBox.innerHTML = unlockedBadges.length > 0 ? "" : `<span style='font-size:11px; color:#888;'>${currentLang === 'de' ? 'Noch keine Badges freigeschaltet.' : 'No badges unlocked yet.'}</span>`;
            unlockedBadges.forEach(b => {
                badgeBox.innerHTML += `<span class="badge-tag">${getBadgeDisplayName(b)}</span>`;
            });
        }

        function getBadgeDisplayName(badge) {
            if (currentLang === "en") {
                if (badge === "🔥 10 Pflichten") return "🔥 10 Dares";
                if (badge === "⚡ Streak-Monster") return "⚡ Streak Monster";
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

            checkBadges();
            calculateLevel();
            updateHUD();
            saveUserDataToCloud();
        }

        function checkBadges() {
            if (dareCount >= 10 && !unlockedBadges.includes("🔥 10 Pflichten")) {
                unlockedBadges.push("🔥 10 Pflichten");
            }
            if (userStreak >= 5 && !unlockedBadges.includes("⚡ Streak-Monster")) {
                unlockedBadges.push("⚡ Streak-Monster");
            }
        }

        async function setAvatarEmote(emote) {
            avatarEmote = emote || "😊";
            updateProfileModal();
            await saveUserDataToCloud();
        }

        function applyAccessoryStyle(symbol) {
            const el = document.getElementById("equipped-accessory");
            if (!el) return;

            el.className = "";
            el.innerText = symbol || "";

            if (!symbol) {
                el.classList.add("acc-default");
                return;
            }

            const headItems = ["👑", "🎩", "🧢", "🦄"];
            const glassesItems = ["🕶️", "👓"];
            const headphonesItems = ["🎧"];
            const beardItems = ["🧔"];
            const maskItems = ["🎭"];
            const sideItems = ["🦋", "✨", "⭐", "💎", "🌸"];
            const decorItems = ["🔥", "🌈"];

            if (headphonesItems.includes(symbol)) {
                el.classList.add("acc-headphones");
            } else if (headItems.includes(symbol)) {
                el.classList.add("acc-head");
            } else if (glassesItems.includes(symbol)) {
                el.classList.add("acc-glasses");            } else if (beardItems.includes(symbol)) {
                el.classList.add("acc-beard");
            } else if (maskItems.includes(symbol)) {
                el.classList.add("acc-mask");
            } else if (sideItems.includes(symbol)) {
                el.classList.add("acc-side");
            } else if (decorItems.includes(symbol)) {
                el.classList.add("acc-decor");
            } else {
                el.classList.add("acc-default");
            }
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
                // Tab-Wechsel darf die Spieloberfläche NICHT neu initialisieren.
                // Firestore-Listener bleiben aktiv; nur fehlende Listener neu verbinden.
                updateOnlineStatus(true);
                if (isHost && !lobbyUserUnsubscribe) reconnectLobby();
                else if (!isHost && !lobbyHostUnsubscribe) scheduleLobbyReconnect();
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
            document.getElementById("account-modal").classList.add("hidden");            document.getElementById("auth-modal").classList.remove("hidden");
            document.getElementById("setup").classList.add("hidden");
        }

        function showLoggedInState() {
            document.getElementById("auth-modal").classList.add("hidden");
            document.getElementById("account-modal").classList.add("hidden");
            document.getElementById("setup").classList.remove("hidden");
        }

        function openAccountModal() {
            updateProfileModal();
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
                let snapshot = await db.collection("users").get();
                container.innerHTML = "";
                snapshot.forEach(doc => {
                    let email = doc.id;
                    let u = doc.data();
                    let isMaster = isMasterAccount(email) || u.role === "master";
                    let maskedMail = maskEmail(email);
                    // Anzeige-Rolle: Master-Account immer als master anzeigen
                    const displayRole = isMasterAccount(email) ? "master" : (u.role || "user");
                    const roleLabel = currentLang === "de" ? "Rolle: " : "Role: ";

                    let html = `<div style="background:rgba(255,255,255,0.05); padding:6px; border-radius:6px; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                        <div><b>${u.name}</b> (${maskedMail}) <br><span style="color:#00bfff;">${roleLabel}${displayRole}</span></div>`;

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
            await db.collection("users").doc(email).update({ role: newRole });
            renderAdminUserList();
        }

        async function deleteUser(email) {
            if (myRole !== "master" && myRole !== "admin") return;
            if (isMasterAccount(email)) return;
            await db.collection("users").doc(email).delete();
            renderAdminUserList();
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
            const badge = document.getElementById("friend-req-badge");
            if (!badge) return;
            const n = myFriendRequests.length;
            if (n > 0) {
                badge.style.display = "inline";
                badge.innerText = String(n);
            } else {
                badge.style.display = "none";
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
