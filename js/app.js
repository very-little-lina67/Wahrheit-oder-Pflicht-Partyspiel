/**
 * ==============================================================================
 * WAHRHEIT ODER PFLICHT / TRUTH OR DARE - MULTIPLAYER PARTYSPIEL / PARTY GAME
 * ==============================================================================
 * Architektur & Features / Architecture & Features:
 * - Firebase Firestore für Echtzeit-Lobby-Synchronisation & Benutzerprofile
 *   / for real-time lobby sync & user profiles
 * - Sichere Passwort-Verschlüsselung (SHA-256 mit WebCrypto & Fallback)
 *   / Secure password encryption (SHA-256 with WebCrypto & fallback)
 * - Level-, XP-, Streak-, Badges- und Coin-System mit In-Game Shop
 *   / Level, XP, streak, badges and coin system with in-game shop
 * - Echtzeit-Lobby: Host-Client Kommunikation, Aufgaben-Erstellung, Rad-Phase
 *   / Real-time lobby: host-client communication, task creation, wheel phase
 * - Freundesliste, Ranglisten, Feedback-System und Admin-Bereich
 *   / Friends list, leaderboards, feedback system and admin area
 * - Vollständig statisch hostbar auf Vercel (Client-Side Vanilla JS)
 *   / Fully statically hostable on Vercel (client-side vanilla JS)
 * ==============================================================================
 */

// ==========================================
        // FIREBASE INITIALISIERUNG / FIREBASE INITIALIZATION
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

        // --- SICHERHEITS-HELFER: HASHING (SHA-256) / SECURITY HELPER: HASHING (SHA-256) ---
        
// ==============================================================================
// 2. KRYPTO-, SICHERHEITS- & DATENSCHUTZ-HELFER / CRYPTO, SECURITY & PRIVACY HELPERS
// ==============================================================================
        // --- HELFER: BENUTZERNAME SICHER LESEN / HELPER: READ USERNAME SAFELY ---
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

        // --- PURE JS SHA-256 IMPLEMENTATION (Funktioniert überall, auch offline, HTTP & Webview) / Works everywhere, even offline, HTTP & Webview ---
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
                btnLogout: "Logout",
                btnClose: "Schließen",
                hudStreakText: "Streak",
                hudCoinsText: "Coins",
                btnShop: "🛒 Shop",
                btnAdmin: "🛡️ Admin",
                btnLeaderboard: "🏆 Rangliste",
                btnPlayers: "🌐 Spieler",
                btnFeedback: "📝 Feedback",
                opTitle: "🌐 Online Spieler & Einladungen",
                opDesc: "Sieh, wer online ist, lade ein oder füge Freunde hinzu!",
                friendsTitle: "👥 Freunde",
                friendsListTab: "Freundesliste",
                friendsReqTab: "Anfragen",
                friendsAddTab: "Hinzufügen",
                privateLobbyHint: "🔑 Teile den Lobby-Code mit deinen Freunden oder lade sie direkt ein.",
                hostBtnPrivate: "Lobby erstellen (Host) 🏠",
                lbTabGlobal: "🌍 Global",
                lbTabFriends: "👥 Freunde",
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
                waitingOther: "Warten auf andere Spieler...",
                wheelHead: "🎡 RAD-MODUS: Alle müssen handeln!",
                wheelDesc: "Jeder hat Wahrheit/Pflicht gespielt. Jetzt wird das Schicksals-Rad für alle gedreht!",
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
                fbSendBtn: "Feedback absenden",
                fbCloseBtn: "Schließen",
                alertEmailNamePass: "Bitte E-Mail, Benutzername und Passwort eingeben!",
                alertRegistered: "Erfolgreich registriert!",
                alertAccountExists: "Dieses Konto existiert bereits! Bitte einloggen.",
                alertNoAccount: "Falsche Anmeldedaten oder Konto nicht gefunden!",
                alertNameCode: "Bitte Lobby-Code eingeben!",
                alertTask: "Bitte eine Aufgabe eingeben!",
                alertAnswer: "Bitte antworte auf die Frage!",
                alertFeedbackEmpty: "Bitte gib eine Nachricht ein!",
                alertFeedbackSuccess: "Feedback wurde erfolgreich gesendet!",
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
                btnLogout: "Logout",
                btnClose: "Close",
                hudStreakText: "Streak",
                hudCoinsText: "Coins",
                btnShop: "🛒 Shop",
                btnAdmin: "🛡️ Admin",
                btnLeaderboard: "🏆 Ranking",
                btnPlayers: "🌐 Players",
                btnFeedback: "📝 Feedback",
                opTitle: "🌐 Online Players & Invites",
                opDesc: "See who is online and invite players to your lobby!",
                friendsTitle: "👥 Friends",
                friendsListTab: "Friend List",
                friendsReqTab: "Requests",
                friendsAddTab: "Add",
                privateLobbyHint: "🔑 Share the lobby code with your friends or invite them directly.",
                hostBtnPrivate: "Create Lobby (Host) 🏠",
                lbTabGlobal: "🌍 Global",
                lbTabFriends: "👥 Friends",,
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
                selectBtn: "Select 🚀",
                sendTaskBtn: "Send to player 🚀",
                taskInputPlaceholder: "Type your question or dare here...",
                answerLabel: "Your Answer:",
                answerPlaceholder: "Type your answer here...",
                submitAnswerBtn: "✅ Submit Answer",
                dareDoneBtn: "✅ Dare completed & confirm!",
                doneHead: "🎉 Done!",
                nextTurnBtn: "✅ I confirm",
                waitingOther: "Waiting for other players...",
                wheelHead: "🎡 WHEEL MODE: Everyone acts!",
                wheelDesc: "Everyone played truth or dare. Now the wheel of fate spins for everyone!",
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
                fbSendBtn: "Send Feedback",
                fbCloseBtn: "Close",
                alertEmailNamePass: "Please enter email, username and password!",
                alertRegistered: "Successfully registered!",
                alertAccountExists: "This account already exists! Please login.",
                alertNoAccount: "Incorrect login details or account not found!",
                alertNameCode: "Please enter lobby code!",
                alertTask: "Please enter a task!",
                alertAnswer: "Please answer the question!",
                alertFeedbackEmpty: "Please enter a message!",
                alertFeedbackSuccess: "Feedback successfully sent!",
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

        function changeLanguage() {
            const authSelect = document.getElementById("auth-lang-select");
            const appSelect = document.getElementById("lang-select");
            
            if (authSelect && document.getElementById("auth-modal").classList.contains("hidden") === false) {
                currentLang = authSelect.value;
                if (appSelect) appSelect.value = currentLang;
            } else if (appSelect) {
                currentLang = appSelect.value;
                if (authSelect) authSelect.value = currentLang;
            }

            const t = translations[currentLang];
            
            document.getElementById("ui-auth-title").innerText = t.authTitle;
            document.getElementById("ui-auth-desc").innerText = t.authDesc;
            document.getElementById("ui-label-email").innerText = t.labelEmail;
            document.getElementById("ui-label-username").innerText = t.labelUsername;
            document.getElementById("ui-label-pass").innerText = t.labelPass;
            document.getElementById("ui-btn-register").innerText = t.btnRegister;
            document.getElementById("ui-btn-login").innerText = t.btnLogin;

            document.getElementById("ui-shop-head").innerText = t.shopHead;
            document.getElementById("ui-coins-text").innerText = t.coinsText;
            document.getElementById("ui-badges-head").innerText = t.badgesHead;
            document.getElementById("ui-accessories-head").innerText = t.accessoriesHead;
            document.getElementById("ui-item-crown").innerText = t.itemCrown;
            document.getElementById("ui-item-glasses").innerText = t.itemGlasses;
            document.getElementById("ui-item-hat").innerText = t.itemHat;
            document.getElementById("ui-item-beard").innerText = t.itemBeard;
            document.getElementById("ui-item-sparkles").innerText = t.itemSparkles;
            document.getElementById("ui-item-headphones").innerText = t.itemHeadphones;
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
                if (el) el.innerText = label;
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
                if (el) el.innerText = label;
            });
            document.getElementById("ui-avatar-emote-label").innerText = t.avatarEmoteLabel;
            const emoteLabels = {
                "ui-emote-happy": ["😊 ", t.emoteHappy],
                "ui-emote-excited": ["🤩 ", t.emoteExcited], "ui-emote-party": ["🥳 ", t.emoteParty],
                "ui-emote-cheeky": ["😈 ", t.emoteCheeky], "ui-emote-robot": ["🤖 ", t.emoteRobot],
                "ui-emote-ghost": ["👻 ", t.emoteGhost], "ui-emote-cat": ["🐱 ", t.emoteCat],
                "ui-emote-fox": ["🦊 ", t.emoteFox], "ui-emote-frog": ["🐸 ", t.emoteFrog],
                "ui-emote-skull": ["💀 ", t.emoteSkull], "ui-emote-fire": ["🔥 ", t.emoteFire]
            };
            Object.entries(emoteLabels).forEach(([id, parts]) => {
                document.getElementById(id).textContent = parts[0] + parts[1];
            });
            document.querySelectorAll(".shop-action-btn").forEach(el => el.innerText = t.buyEquipBtn);
            document.getElementById("ui-themes-head").innerText = t.themesHead;
            document.querySelectorAll(".theme-action-btn").forEach(el => el.innerText = t.unlockBtn);
            document.getElementById("ui-btn-logout").innerText = t.btnLogout;
            document.getElementById("ui-btn-close").innerText = t.btnClose;

            document.getElementById("ui-fb-title").innerText = t.fbTitle;
            document.getElementById("ui-fb-desc").innerText = t.fbDesc;
            document.getElementById("ui-fb-type-label").innerText = t.fbTypeLabel;
            document.getElementById("ui-fb-opt-bug").innerText = t.fbOptBug;
            document.getElementById("ui-fb-opt-imp").innerText = t.fbOptImp;
            document.getElementById("ui-fb-msg-label").innerText = t.fbMsgLabel;
            document.getElementById("ui-fb-send-btn").innerText = t.fbSendBtn;
            document.getElementById("ui-fb-close-btn").innerText = t.fbCloseBtn;
            document.getElementById("ui-lb-title").innerText = t.lbTitle;
            document.getElementById("ui-lb-desc").innerText = t.lbDesc;
            const opTitleEl = document.getElementById("ui-op-title");
            if (opTitleEl && t.opTitle) opTitleEl.innerText = t.opTitle;
            const opDescEl = document.getElementById("ui-op-desc");
            if (opDescEl && t.opDesc) opDescEl.innerText = t.opDesc;
            const lbCloseEl = document.getElementById("ui-lb-close-btn");
            if (lbCloseEl && t.lbClose) lbCloseEl.innerText = t.lbClose;
            const opCloseEl = document.getElementById("ui-op-close-btn");
            if (opCloseEl && t.opClose) opCloseEl.innerText = t.opClose;

            document.getElementById("ui-hud-streak-text").innerText = t.hudStreakText;
            document.getElementById("ui-hud-coins-text").innerText = t.hudCoinsText;
            document.getElementById("ui-btn-shop").innerText = t.btnShop;
            const adminBtn = document.getElementById("btn-admin-panel");
            if (adminBtn && t.btnAdmin) adminBtn.innerText = t.btnAdmin;
            const lbBtn = document.getElementById("ui-btn-leaderboard");
            if (lbBtn && t.btnLeaderboard) lbBtn.innerText = t.btnLeaderboard;
            const playersBtn = document.getElementById("ui-btn-players");
            if (playersBtn && t.btnPlayers) playersBtn.innerText = t.btnPlayers;
            const fbBtn = document.getElementById("ui-btn-feedback");
            if (fbBtn && t.btnFeedback) fbBtn.innerText = t.btnFeedback;
            document.getElementById("ui-lang-label-text").innerText = t.langLabelText;
            document.getElementById("ui-title").innerText = t.title;
            document.getElementById("ui-subtitle").innerText = t.subtitle;
            document.getElementById("ui-setup-head").innerText = t.setupHead;
            document.getElementById("ui-host-btn").innerText = t.hostBtn;
            document.getElementById("lobby-code-input").placeholder = t.lobbyCodeInputPlaceholder;
            document.getElementById("ui-join-btn").innerText = t.joinBtn;
            document.getElementById("ui-lobby-code-title").innerHTML = t.lobbyCodeTitle + `<span id="display-code" style="color: #ffcc00; font-size: 18px;">${activeLobbyCode.toUpperCase()}</span>`;
            document.getElementById("ui-share-code").innerText = t.shareCode;
            document.getElementById("start-btn").innerText = t.startBtn;
            document.getElementById("client-wait-msg").innerText = t.clientWaitMsg;
            document.getElementById("leave-lobby-btn").innerText = t.leaveBtn;
            document.getElementById("ui-choice-label").innerText = t.choiceLabel;
            document.getElementById("ui-opt-truth").innerText = t.optTruth;
            document.getElementById("ui-opt-dare").innerText = t.optDare;
            document.getElementById("ui-select-btn").innerText = t.selectBtn;
            document.getElementById("ui-send-task-btn").innerText = t.sendTaskBtn;
            document.getElementById("custom-task-input").placeholder = t.taskInputPlaceholder;
            document.getElementById("ui-answer-label").innerText = t.answerLabel;
            document.getElementById("player-answer-input").placeholder = t.answerPlaceholder;
            document.getElementById("ui-submit-answer-btn").innerText = t.submitAnswerBtn;
            document.getElementById("ui-dare-done-btn").innerText = t.dareDoneBtn;
            document.getElementById("ui-done-head").innerText = t.doneHead;
            document.getElementById("next-turn-btn").innerText = t.nextTurnBtn;
            document.getElementById("ui-waiting-other").innerText = t.waitingOther;
            document.getElementById("ui-wheel-head").innerText = t.wheelHead;
            document.getElementById("ui-wheel-desc").innerText = t.wheelDesc;
            document.getElementById("spin-btn").innerText = t.spinBtn;
            document.getElementById("next-round-btn").innerText = t.nextRoundBtn;
            document.getElementById("chat-input").placeholder = t.chatPlaceholder;
            document.getElementById("ui-chat-send").innerText = t.chatSend;
            document.getElementById("ui-emergency-desc").innerText = t.emergencyDesc;
            document.getElementById("ui-leak-btn").innerText = t.leakBtn;
            
            updatePlayerList();
        }

        function changeLanguageFromApp() {
            changeLanguage();
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
                    // sofort wieder auf "master" korrigieren. / immediately correct back to "master".
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
                        name: (typeof data.name === "string" && data.name.trim()) ? data.name.trim() : "Party-Spieler",
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
                        name.textContent = `${i+1}. ${i===0?'👑 ':i===1?'🥈 ':i===2?'🥉 ':''}${data.name}${isMe ? ' (Du)' : ''}`;
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
                render(prefix + (t.lbGlobalTitle || "Allgemeine Coin-Rangliste"), "coins", "💰");
                render(prefix + (t.lbMonthlyTitle || "Monatliche Coin-Rangliste"), "monthlyCoins", "🪙");
            } catch(e) {
                console.error(e);
                container.innerHTML = t.lbError || "Fehler beim Laden der Ranglisten.";
            }
        }


        async function openOnlinePlayersModal() {
            let container = document.getElementById("online-players-list");
            container.innerHTML = "Suche online Spieler...";
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
                        let lobbyInfo = data.currentLobby ? `(Lobby: ${String(data.currentLobby).toUpperCase()})` : "(Bereit)";
                        const safeEmail = String(doc.id).replace(/'/g, "\\'");
                        const safeName = playerName.replace(/'/g, "\\'");
                        const safeDisplayName = playerName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
                        const safeAccessory = String(data.accessory || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
                        container.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; margin-bottom:6px; font-size:12px;">
                            <div><b>${safeAccessory} ${safeDisplayName}</b> <br><span style="color:#28a745; font-size:10px;">${lobbyInfo}</span></div>
                            <div style="display:flex;gap:3px;">
                                <button class="btn-blue" style="padding:4px 6px; font-size:10px; margin:0; width:auto;" onclick="sendFriendRequest('${safeEmail}', '${safeName}')">👥</button>
                                <button class="btn-green" style="padding:4px 8px; font-size:11px; margin:0; width:auto;" onclick="sendGameInvite('${safeEmail}', '${safeName}')">Einladen 📨</button>
                            </div>
                        </div>`;
                    }
                });

                if (!found) {
                    container.innerHTML = `<span style="font-size:12px; color:#888;">Keine anderen Spieler online.</span>`;
                }
            } catch(e) {
                container.innerHTML = "Fehler beim Laden der Spieler.";
            }
        }

        async function sendGameInvite(targetEmail, targetName) {
            if (!activeLobbyCode) {
                alert("Du musst zuerst eine Lobby erstellen (Host), um jemanden einzuladen!");
                return;
            }
            try {
                await db.collection("invites").add({
                    toEmail: targetEmail,
                    fromName: myName,
                    lobbyCode: activeLobbyCode,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert(`Einladung an ${targetName} gesendet! 🚀`);
                document.getElementById("online-players-modal").classList.add("hidden");
            } catch(e) {
                alert("Fehler beim Senden der Einladung.");
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
                                msg.innerText = `${data.fromName || "Spieler"} hat dich in die Lobby ${String(incomingInviteLobby).toUpperCase()} eingeladen!`;
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
                badgeBox.innerHTML += `<span class="badge-tag">${b}</span>`;
            });
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
                el.classList.add("acc-glasses");
            } else if (beardItems.includes(symbol)) {
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

            changeLanguage();
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
                alert("Fehler bei der Registrierung: " + e.message);
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
                        // Migration: Falls noch ein altes Klartext-Passwort existiert, sofort hashen und Klartext löschen! / Migration: If an old plain-text password still exists, hash it immediately and delete plain text!
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
                alert("Fehler beim Login: " + e.message);
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
            document.getElementById("account-modal").classList.add("hidden");
            document.getElementById("auth-modal").classList.remove("hidden");
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
                alert("Keine Berechtigung!");
                return;
            }
            renderAdminUserList();
            renderAdminFeedbackList();
            document.getElementById("admin-modal").classList.remove("hidden");
        }

        async function renderAdminUserList() {
            let container = document.getElementById("admin-user-list");
            container.innerHTML = "Lade Benutzer...";
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
                    
                    let html = `<div style="background:rgba(255,255,255,0.05); padding:6px; border-radius:6px; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                        <div><b>${u.name}</b> (${maskedMail}) <br><span style="color:#00bfff;">Rolle: ${displayRole}</span></div>`;
                    
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
            container.innerHTML = "Lade Feedback...";
            try {
                let snapshot = await db.collection("feedback").get();
                container.innerHTML = "";
                if (snapshot.empty) {
                    container.innerHTML = `<span style="font-size:11px; color:#888;">Kein Feedback vorhanden.</span>`;
                    return;
                }
                snapshot.forEach(doc => {
                    let fb = doc.data();
                    let docId = doc.id;
                    let typeColor = fb.type === 'bug' ? '#ff3300' : '#00bfff';
                    let displayMail = fb.emailMasked || maskEmail(fb.email || "");
                    container.innerHTML += `<div style="background:rgba(255,255,255,0.05); padding:6px; border-radius:6px; margin-bottom:5px; font-size:12px; border-left:4px solid ${typeColor};">
                        <div><b>${fb.author}</b> (${displayMail}) - <span style="color:${typeColor}; font-weight:bold;">${fb.type.toUpperCase()}</span></div>
                        <div style="margin-top:2px; color:#fff;">${fb.text}</div>
                        ${myRole === 'master' || myRole === 'admin' ? `<button class="btn-danger" style="padding:2px 5px; font-size:9px; margin-top:3px;" onclick="deleteFeedback('${docId}')">Löschen</button>` : ''}
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

        async function renderFriendsList() {
            const container = document.getElementById("friends-list");
            if (!container) return;
            container.innerHTML = currentLang === "de" ? "Lade Freunde..." : "Loading friends...";

            if (!myFriends.length) {
                container.innerHTML = `<span style="font-size:12px;color:#888;">${currentLang === "de" ? "Noch keine Freunde. Sende eine Anfrage!" : "No friends yet. Send a request!"}</span>`;
                return;
            }

            try {
                const now = Date.now();
                let html = "";
                // Batch get friends (Firestore limit ~10 for getAll, so sequential for simplicity)
                for (const email of myFriends) {
                    try {
                        const doc = await db.collection("users").doc(email).get();
                        if (!doc.exists) continue;
                        const d = doc.data() || {};
                        const name = getUserDisplayName(d, "Spieler");
                        const accessory = d.accessory || "";
                        const isOnline = !!d.isOnline && d.lastActive &&
                            (d.lastActive.toMillis ? (now - d.lastActive.toMillis() < ONLINE_TIMEOUT_MS) : true);
                        const lobby = d.currentLobby ? String(d.currentLobby).toUpperCase() : "";
                        const statusColor = isOnline ? "#28a745" : "#888";
                        const statusText = isOnline
                            ? (lobby ? `Online · Lobby ${lobby}` : (currentLang === "de" ? "Online · Bereit" : "Online · Ready"))
                            : (currentLang === "de" ? "Offline" : "Offline");
                        const safeEmail = email.replace(/'/g, "\\'");
                        const safeName = name.replace(/'/g, "\\'").replace(/"/g, "&quot;");

                        html += `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;margin-bottom:6px;font-size:12px;">
                            <div>
                                <b>${accessory} ${name.replace(/</g,"&lt;")}</b><br>
                                <span style="color:${statusColor};font-size:10px;">● ${statusText}</span>
                            </div>
                            <div style="display:flex;gap:4px;">
                                ${isOnline && activeLobbyCode && isHost ? `<button class="btn-green" style="padding:3px 6px;font-size:10px;width:auto;margin:0;" onclick="sendGameInvite('${safeEmail}', '${safeName}')">Einladen</button>` : ""}
                                <button class="btn-danger" style="padding:3px 6px;font-size:10px;width:auto;margin:0;" onclick="removeFriend('${safeEmail}')">✕</button>
                            </div>
                        </div>`;
                    } catch (e) {}
                }
                container.innerHTML = html || `<span style="font-size:12px;color:#888;">${currentLang === "de" ? "Keine Freunde gefunden." : "No friends found."}</span>`;
            } catch (e) {
                container.innerHTML = "Fehler beim Laden.";
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
                const snap = await db.collection("users").get();
                let found = false;
                let html = "";
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
                                ? `<span style="color:#28a745;font-size:11px;">✓ Freund</span>`
                                : `<button class="btn-green" style="padding:4px 8px;font-size:11px;width:auto;margin:0;" onclick="sendFriendRequest('${safeEmail}', '${safeName}')">Anfrage</button>`}
                        </div>`;
                    }
                });
                results.innerHTML = found ? html : `<span style="font-size:12px;color:#888;">${currentLang === "de" ? "Niemand gefunden." : "Nobody found."}</span>`;
            } catch (e) {
                results.innerHTML = "Fehler bei der Suche.";
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
        let taskCompleted = false;
        let activeLobbyCode = "";

// ==============================================================================
// 12. MULTIPLAYER LOBBY-TRANSPORT & SESSION-CACHING
// ==============================================================================
        // STABILE LOBBY-SESSION
        // Die Lobby endet nur noch über "Lobby verlassen".
        // Reload/App-Wechsel/kurze Netzwerkunterbrechungen führen
        // nicht mehr automatisch zum Verlassen der Lobby.
        // ==========================================================
        const LOBBY_STORAGE_KEY = "wop_active_lobby_v7";
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
            await db.collection("users").doc(myEmail).set({
                currentLobby: activeLobbyCode,
                lobbyRole: isHost ? "host" : "client",
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
                            nextPlayers.push({
                                name,
                                accessory: d.accessory || "",
                                eliminated: !!oldPlayer?.eliminated
                            });

                            if (doc.id !== myEmail) {
                                const msg = d.lobbyMessage;
                                const seq = Number(msg && msg.seq) || 0;

                                if (seq > (lobbyProcessedClientSeq[doc.id] || 0)) {
                                    lobbyProcessedClientSeq[doc.id] = seq;
                                    if (msg && msg.data) {
                                        handleIncomingData(msg.data);

                                        // Client-Nachrichten werden nach der Verarbeitung
                                        // vom Host an ALLE Spieler weitergeleitet.
                                        broadcastLobbyData(msg.data);
                                    }
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

                    if (seq > lobbyLastHostSeq) {
                        lobbyLastHostSeq = seq;
                        if (msg && msg.data) handleIncomingData(msg.data);
                    }
                }, () => {
                    if (!leavingLobbyManually) scheduleLobbyReconnect();
                });
        }

        async function broadcastLobbyData(data) {
            if (!myEmail || !activeLobbyCode || !isHost) return;

            lobbyMessageSeq++;
            try {
                await db.collection("users").doc(myEmail).set({
                    hostMessage: { seq: lobbyMessageSeq, data, sentAt: Date.now() },
                    currentLobby: activeLobbyCode,
                    lobbyRole: "host",
                    lobbyHostEmail: myEmail,
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } catch (e) {}
        }

        async function sendClientLobbyData(data) {
            if (!myEmail || !activeLobbyCode || isHost) return;

            lobbyMessageSeq++;
            try {
                await db.collection("users").doc(myEmail).set({
                    lobbyMessage: { seq: lobbyMessageSeq, data, sentAt: Date.now() },
                    currentLobby: activeLobbyCode,
                    lobbyRole: "client",
                    lobbyHostEmail: lobbyHostEmail,
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } catch (e) {}
        }


        function saveLobbySession() {
            if (!activeLobbyCode || leavingLobbyManually) return;
            try {
                localStorage.setItem(LOBBY_STORAGE_KEY, JSON.stringify({
                    code: activeLobbyCode,
                    role: isHost ? "host" : "client",
                    name: myName,
                    savedAt: Date.now()
                }));
            } catch (e) {
                console.warn("Lobby-Session konnte nicht gespeichert werden:", e);
            }
        }

        function getSavedLobbySession() {
            try {
                const raw = localStorage.getItem(LOBBY_STORAGE_KEY);
                if (!raw) return null;
                const data = JSON.parse(raw);
                if (!data || !data.code || !data.role) return null;
                // Veraltete Sessions (> 3 Stunden) automatisch verwerfen
                if (data.savedAt && (Date.now() - data.savedAt > 3 * 60 * 60 * 1000)) {
                    clearSavedLobbySession();
                    return null;
                }
                return data;
            } catch (e) {
                clearSavedLobbySession();
                return null;
            }
        }

        function clearSavedLobbySession() {
            try {
                localStorage.removeItem(LOBBY_STORAGE_KEY);
                localStorage.removeItem(LOBBY_STORAGE_KEY + "_players");
            } catch (e) {}
        }

        function saveLobbyPlayers() {
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
            saveLobbySession();
            saveLobbyPlayers();
            updateOnlineStatus(true);

            try {
                await setLobbyPresence({
                    lobbyMessage: firebase.firestore.FieldValue.delete(),
                    hostMessage: firebase.firestore.FieldValue.delete()
                });
                startHostFirestoreLobby();
                showLobbyUI(activeLobbyCode, false);
                document.getElementById("start-btn").classList.remove("hidden");
                updatePlayerList();
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

        async function joinGame(options = {}) {
            const restoring = !!options.restoring;
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

                // Lobby-Beitritt: Mit gültigem Code beitreten
                lobbyHostEmail = hostEmail;

                await setLobbyPresence({
                    lobbyMessage: firebase.firestore.FieldValue.delete()
                });

                startClientFirestoreLobby(hostEmail);
                showLobbyUI(code, true);
                document.getElementById("display-code").innerText = code.toUpperCase();
                document.getElementById("client-wait-msg").classList.remove("hidden");
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
            const role = saved?.role || (isHost ? "host" : "client");

            if (role === "host") hostGame({ restoring: true });
            else joinGame({ restoring: true });
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
            clearLobbyPresence();

            if (peer) {
                try { peer.destroy(); } catch(e) {}
                peer = null;
            }

            hostConnection = null;
            clientConnections = [];
            isHost = false;
            players = [];
            currentPlayerIndex = 0;
            activeLobbyCode = "";

            if (manual) clearSavedLobbySession();

            updateOnlineStatus(true);

            document.getElementById("lobby-wait-box").classList.add("hidden");
            document.getElementById("woP-phase").classList.add("hidden");
            document.getElementById("wheel-phase").classList.add("hidden");
            document.getElementById("emergency-box").classList.add("hidden");
            document.getElementById("chat-box-container").classList.add("hidden");
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
                assignTaskCreator(data.playerName, data.choice);
            } else if (data.type === 'ASSIGN_CREATOR') {
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
            } else if (data.type === 'VOTE_NEXT_TURN') {
                handleNextTurnVote(data.playerName);
            } else if (data.type === 'EXECUTE_NEXT_TURN') {
                executeProceedToNextTurn();
            } else if (data.type === 'START_WHEEL') {
                document.getElementById("woP-phase").classList.add("hidden");
                document.getElementById("wheel-phase").classList.remove("hidden");
                const spinBtn = document.getElementById("spin-btn");
                if (spinBtn) spinBtn.disabled = false;
                const wheelResult = document.getElementById("wheel-result-box");
                if (wheelResult) wheelResult.classList.add("hidden");
            } else if (data.type === 'SPIN_WHEEL') {
                runWheelAnimation(data.sector, data.rotation);
            } else if (data.type === 'VOTE_NEXT_ROUND') {
                handleNextRoundVote(data.playerName);
            } else if (data.type === 'NEXT_ROUND') {
                nextRound();
            } else if (data.type === 'ELIMINATE') {
                players = data.players;
                updatePlayerList();
            } else if (data.type === 'CHAT_MSG') {
                // Eigene Nachricht wird beim Absenden sofort lokal angezeigt. / Own message is shown locally immediately when sent.
                // Bei weitergeleiteten Nachrichten nur anzeigen, wenn sie von
                // einem anderen Spieler stammt, damit der Absender keine Duplikate sieht.
                if (data.sender !== myName) {
                    appendChat(data.sender, data.text);
                }
            }
        }

        function updatePlayerList() {
            const list = document.getElementById("player-list");
            if (!list) return;
            list.innerHTML = "";
            players.forEach((p, index) => {
                const playerName = getUserDisplayName(p);
                const accessory = String(p.accessory || "");
                list.innerHTML += `<li><b>${index + 1}.</b> ${accessory} ${playerName} ${p.eliminated ? '❌' : ''}</li>`;
            });
            if (isHost && players.length >= 1) {
                document.getElementById("start-btn").classList.remove("hidden");
            }
        }

        function startOnlineGame() {
            if (!isHost) return;
            sendData({ type: 'START_GAME', players: players });
            startGameUI();
        }

        function startGameUI() {
            document.getElementById("auth-modal").classList.add("hidden");
            document.getElementById("account-modal").classList.add("hidden");
            document.getElementById("setup").classList.add("hidden");
            document.getElementById("lobby-wait-box").classList.add("hidden");
            document.getElementById("woP-phase").classList.remove("hidden");
            document.getElementById("emergency-box").classList.remove("hidden");
            document.getElementById("chat-box-container").classList.remove("hidden");
            document.getElementById("leave-lobby-btn").classList.remove("hidden");
            updateWopTurn();
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

            while (currentPlayerIndex < players.length && players[currentPlayerIndex].eliminated) {
                currentPlayerIndex++;
            }
            if (currentPlayerIndex >= players.length) {
                if (isHost) {
                    sendData({ type: 'START_WHEEL' });
                    document.getElementById("woP-phase").classList.add("hidden");
                    document.getElementById("wheel-phase").classList.remove("hidden");
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

            if (currentPlayerName === myName) {
                document.getElementById("ui-select-btn").disabled = false;
                document.getElementById("wop-choice-area").classList.remove("hidden");
            } else {
                document.getElementById("waiting-for-player-box").classList.remove("hidden");
                document.getElementById("waiting-info-text").innerText = (currentLang === 'de' ? `Warte, bis ${currentPlayerName} wählt...` : `Waiting for ${currentPlayerName} to choose...`);
            }
        }

        function submitWopChoice() {
            if (players[currentPlayerIndex]?.name !== myName) return;

            const button = document.getElementById("ui-select-btn");
            if (button.disabled) return;

            const choice = document.getElementById("wop-choice").value;
            pendingChoice = choice;
            button.disabled = true;
            sendData({ type: 'SUBMIT_CHOICE', playerName: myName, choice: choice });
        }

        function assignTaskCreator(targetName, choice) {
            let activeOthers = players.filter(p => !p.eliminated && p.name !== targetName);
            let creatorName = activeOthers.length > 0 ? activeOthers[Math.floor(Math.random() * activeOthers.length)].name : targetName;
            sendData({ type: 'ASSIGN_CREATOR', targetPlayer: targetName, choice: choice, creatorName: creatorName });
        }

        function setupCreatorUI(targetPlayer, choice, creatorName) {
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

            if (creatorName === myName) {
                document.getElementById("creator-input-area").classList.remove("hidden");
                document.getElementById("custom-task-input").placeholder = currentLang === 'de'
                    ? (isTruth ? `Wahrheitsfrage für ${targetPlayer} eingeben...` : `Pflicht-Aufgabe für ${targetPlayer} eingeben...`)
                    : (isTruth ? `Enter a truth question for ${targetPlayer}...` : `Enter a dare for ${targetPlayer}...`);
            } else {
                document.getElementById("waiting-for-player-box").classList.add("hidden");
                document.getElementById("waiting-for-player-box").classList.remove("hidden");
                document.getElementById("waiting-info-text").innerText = (currentLang === 'de' ? `Warte auf ${creatorName}...` : `Waiting for ${creatorName}...`);
            }
        }

        function sendCustomTask() {
            let taskText = document.getElementById("custom-task-input").value.trim();
            if (!taskText) { alert(translations[currentLang].alertTask); return; }
            let targetPlayer = players[currentPlayerIndex].name;
            currentTaskText = taskText;
            document.getElementById("creator-input-area").classList.add("hidden");
            document.getElementById("custom-task-input").value = "";
            sendData({ type: 'SHOW_TASK', targetPlayer: targetPlayer, choice: pendingChoice, taskText: taskText, creator: myName });
        }

        function displayTaskScreen(targetPlayer, choice, taskText, creator) {
            pendingChoice = choice;
            currentTaskText = taskText;
            taskCompleted = false;

            document.getElementById("ui-submit-answer-btn").disabled = false;
            document.getElementById("ui-dare-done-btn").disabled = false;
            document.getElementById("wop-choice-area").classList.add("hidden");
            document.getElementById("creator-input-area").classList.add("hidden");
            document.getElementById("waiting-for-player-box").classList.add("hidden");

            if (targetPlayer === myName) {
                document.getElementById("active-task-area").classList.remove("hidden");
                document.getElementById("task-title-text").innerText = choice === "truth" ? (currentLang === 'de' ? "💡 WAHRHEIT" : "💡 TRUTH") : (currentLang === 'de' ? "🔥 PFLICHT" : "🔥 DARE");
                document.getElementById("task-assigner-info").innerText = (currentLang === 'de' ? "Von: " : "From: ") + creator;
                document.getElementById("task-content-desc").innerText = taskText;
                
                if (choice === "truth") {
                    document.getElementById("answer-box").classList.remove("hidden");
                    document.getElementById("dare-box").classList.add("hidden");
                    document.getElementById("player-answer-input").value = "";
                } else {
                    document.getElementById("answer-box").classList.add("hidden");
                    document.getElementById("dare-box").classList.remove("hidden");
                }
            } else {
                document.getElementById("waiting-for-player-box").classList.remove("hidden");
                document.getElementById("waiting-info-text").innerText = (currentLang === 'de' ? `${targetPlayer} ist dran...` : `${targetPlayer}'s turn...`);
            }
        }

        function submitAnswer() {
            if (taskCompleted) return;

            const ans = document.getElementById("player-answer-input").value.trim();
            if (!ans) { alert(translations[currentLang].alertAnswer); return; }

            taskCompleted = true;
            document.getElementById("ui-submit-answer-btn").disabled = true;
            document.getElementById("ui-dare-done-btn").disabled = true;

            finishTaskAndReward(pendingChoice);

            const resultData = {
                type: 'SHOW_RESULT',
                targetPlayer: players[currentPlayerIndex].name,
                choice: pendingChoice,
                taskText: currentTaskText,
                resultText: (currentLang === 'de' ? `Antwort: "${ans}"` : `Answer: "${ans}"`)
            };

            // Der Antwortende sieht sein eigenes Ergebnis SOFORT. / The answering player sees their own result IMMEDIATELY.
            handleIncomingData(resultData);

            // Danach wird es über den Host an alle anderen verteilt.
            if (!isHost) {
                sendClientLobbyData(resultData);
            } else {
                broadcastLobbyData(resultData);
            }
        }

        function submitDareDone() {
            if (taskCompleted) return;

            taskCompleted = true;
            document.getElementById("ui-submit-answer-btn").disabled = true;
            document.getElementById("ui-dare-done-btn").disabled = true;

            finishTaskAndReward(pendingChoice);

            const resultData = {
                type: 'SHOW_RESULT',
                targetPlayer: players[currentPlayerIndex].name,
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
            }
        }

        function finishTaskAndReward(choice) {
            const currentPlayer = players[currentPlayerIndex];
            if (!currentPlayer || currentPlayer.name !== myName) return;

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
            document.getElementById("result-feedback-area").classList.remove("hidden");

            if (isNewResult) {
                nextTurnVotedPlayers = [];
            }

            const nextBtn = document.getElementById("next-turn-btn");
            nextBtn.disabled = nextTurnVotedPlayers.includes(myName);

            document.getElementById("feedback-player-name").innerText =
                currentLang === 'de'
                    ? `${targetPlayer} hat abgeschlossen!`
                    : `${targetPlayer} finished!`;

            document.getElementById("feedback-task-info").innerText =
                currentLang === 'de'
                    ? `Aufgabe: "${taskText}"`
                    : `Task: "${taskText}"`;

            document.getElementById("feedback-result-box").innerText = resultText;

            const activeCount = players.filter(p => !p.eliminated).length;
            document.getElementById("next-votes-count").innerText = String(nextTurnVotedPlayers.length);
            document.getElementById("next-votes-total").innerText = String(activeCount);
        }

        function voteNextTurn() {
            if (!currentSharedResult) return;

            const me = players.find(p => p.name === myName);
            if (!me || me.eliminated) return;
            if (nextTurnVotedPlayers.includes(myName)) return;

            document.getElementById("next-turn-btn").disabled = true;

            const voteData = { type: 'VOTE_NEXT_TURN', playerName: myName };

            // Eigene Bestätigung sofort lokal registrieren. / Register own confirmation locally immediately.
            handleIncomingData(voteData);

            // Host verarbeitet/broadcastet sie; Client sendet sie nur an den Host.
            if (!isHost) {
                sendClientLobbyData(voteData);
            } else {
                broadcastLobbyData(voteData);
            }
        }

        function handleNextTurnVote(pName) {
            const activePlayers = players.filter(p => !p.eliminated);
            const activeNames = activePlayers.map(p => p.name);
            if (!activeNames.includes(pName)) return;
            if (!nextTurnVotedPlayers.includes(pName)) {
                nextTurnVotedPlayers.push(pName);
            }

            document.getElementById("next-votes-count").innerText = nextTurnVotedPlayers.length;
            document.getElementById("next-votes-total").innerText = activePlayers.length;

            if (pName === myName) {
                document.getElementById("next-turn-btn").disabled = true;
            }

            // Erst wenn wirklich jeder aktive Spieler bestätigt hat, geht es weiter. / Only when every active player has confirmed, we continue.
            if (isHost && nextTurnVotedPlayers.length >= activePlayers.length) {
                const nextData = { type: 'EXECUTE_NEXT_TURN' };

                // Auf dem Host sofort weiter. / On the host, continue immediately.
                handleIncomingData(nextData);

                // Danach an alle Clients. / Then broadcast to all clients.
                broadcastLobbyData(nextData);

                // executeProceedToNextTurn() setzt den Vote-Status wieder zurück. / executeProceedToNextTurn() resets the vote status.
            }
        }

        function executeProceedToNextTurn() {
            currentSharedResult = null;
            currentSharedResultKey = "";
            document.getElementById("result-feedback-area").classList.add("hidden");
            document.getElementById("active-task-area").classList.add("hidden");
            document.getElementById("creator-input-area").classList.add("hidden");
            document.getElementById("waiting-for-player-box").classList.add("hidden");
            document.getElementById("next-turn-btn").disabled = false;
            nextTurnVotedPlayers = [];
            currentPlayerIndex++;
            updateWopTurn();
        }

// ==============================================================================
// 15. GLÜCKSRAD-PHASE (ANIMATION & ABSTIMMUNG) / WHEEL OF FORTUNE PHASE (ANIMATION & VOTING)
// ==============================================================================
        function spinWheel() {
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
                document.getElementById("spin-btn").disabled = false;
                let selected = translations[currentLang].wheelSectors[sectorIndex];
                wheel.innerText = (currentLang === 'de' ? "ERGEBNIS!" : "RESULT!");
                document.getElementById("wheel-action-title").innerText = selected.title;
                document.getElementById("wheel-action-desc").innerText = selected.desc;
                document.getElementById("wheel-result-box").classList.remove("hidden");
                document.getElementById("next-round-btn").disabled = false;
                userXP += 25;
                userCoins += 12;
                addMonthlyCoins(12);
                calculateLevel();
                updateHUD();
                updateProfileModal();
                saveUserDataToCloud();
            }, 3000);
        }

        function voteNextRound() {
            document.getElementById("next-round-btn").disabled = true;
            sendData({ type: 'VOTE_NEXT_ROUND', playerName: myName });
        }

        function handleNextRoundVote(pName) {
            if (!nextRoundVotedPlayers.includes(pName)) nextRoundVotedPlayers.push(pName);
            let activeCount = players.filter(p => !p.eliminated).length;
            
            const countEl = document.getElementById("round-votes-count");
            const totalEl = document.getElementById("round-votes-total");
            if (countEl) countEl.innerText = nextRoundVotedPlayers.length;
            if (totalEl) totalEl.innerText = activeCount;

            if (isHost && nextRoundVotedPlayers.length >= activeCount) {
                sendData({ type: 'NEXT_ROUND' });
            }
        }

        function nextRound() {
            currentPlayerIndex = 0;
            nextRoundVotedPlayers = [];
            document.getElementById("wheel-result-box").classList.add("hidden");
            document.getElementById("wheel-phase").classList.add("hidden");
            document.getElementById("woP-phase").classList.remove("hidden");
            updateWopTurn();
        }

        async function triggerLeak() {
            const targetName = prompt(currentLang === 'de' ? "Wer hat geleakt / aufgegeben?" : "Who leaked / gave up?");
            const normalized = targetName?.trim().toLowerCase();
            const target = players.find(p => p.name.toLowerCase() === normalized);

            if (!target) return;

            target.eliminated = true;

            // Nur der tatsächlich ausgeschiedene Spieler verliert seinen Streak. / Only the actually eliminated player loses their streak.
            if (target.name === myName) {
                userStreak = 0;
                await saveUserDataToCloud();
                updateHUD();
                updateProfileModal();
            }

            sendData({ type: 'ELIMINATE', players: players });
        }

        function appendChat(sender, text) {
            let box = document.getElementById("chat-messages");
            box.innerHTML += `<div class="chat-msg"><b>${sender}:</b> ${text}</div>`;
            box.scrollTop = box.scrollHeight;
        }

        function sendChatMessage() {
            let input = document.getElementById("chat-input");
            let text = input.value.trim();
            if(!text) return;
            // Sofort lokal anzeigen, damit wirklich jeder seine eigenen / Show locally immediately so everyone sees their own
            // gesendeten Nachrichten sieht (Host und normale Spieler). / sent messages (host and regular players).
            appendChat(myName, text);
            sendData({ type: 'CHAT_MSG', sender: myName, text: text });
            input.value = "";
        }
