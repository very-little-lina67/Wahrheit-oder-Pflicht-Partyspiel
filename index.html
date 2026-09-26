<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wahrheit oder Pflicht Partyspiel / Truth or Dare Party Game</title>
    <script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js"></script>
    <style>
        :root {
            --bg-gradient: linear-gradient(135deg, #111, #2b1055, #7597de);
            --container-bg: rgba(0, 0, 0, 0.6);
            --primary-color: #ff0055;
            --primary-hover: #e6004c;
            --accent-color: #00bfff;
            --text-color: #ffffff;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--bg-gradient);
            color: var(--text-color);
            text-align: center;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
        }
        h1 { color: var(--primary-color); text-shadow: 0 0 10px rgba(255,0,85,0.6); }
        .container {
            max-width: 680px;
            margin: 0 auto;
            background: var(--container-bg);
            padding: 25px;
            border-radius: 20px;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        input, button, select, textarea {
            padding: 12px;
            font-size: 16px;
            border-radius: 8px;
            border: none;
            margin: 8px 0;
            width: 100%;
            box-sizing: border-box;
            font-family: inherit;
        }
        input, select, textarea { background: rgba(255,255,255,0.15); color: white; }
        input::placeholder, textarea::placeholder { color: #ccc; }
        button {
            background-color: var(--primary-color);
            color: white;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 15px rgba(255,0,85,0.4);
        }
        button:hover { background-color: var(--primary-hover); transform: translateY(-2px); }
        .btn-blue { background-color: var(--accent-color); color: #111; box-shadow: 0 4px 15px rgba(0,191,255,0.4); }
        .btn-blue:hover { opacity: 0.9; }
        .btn-green { background-color: #28a745; color: white; box-shadow: 0 4px 15px rgba(40,167,69,0.4); }
        .btn-green:hover { background-color: #218838; }
        .btn-danger { background-color: #ff3300; box-shadow: 0 4px 15px rgba(255,51,0,0.5); }
        .hidden { display: none !important; }
        
        #wheel-container {
            position: relative;
            width: 260px;
            height: 260px;
            margin: 20px auto;
            border-radius: 50%;
            border: 8px solid var(--accent-color);
            display: flex;
            align-items: center;
            justify-content: center;
            background: #111;
            font-weight: bold;
            font-size: 15px;
            padding: 15px;
            box-shadow: 0 0 25px rgba(0, 191, 255, 0.6);
            transition: transform 3s cubic-bezier(0.15, 0.9, 0.2, 1);
            text-align: center;
            box-sizing: border-box;
        }
        .pointer {
            width: 0; height: 0; 
            border-left: 15px solid transparent;
            border-right: 15px solid transparent;
            border-bottom: 30px solid #ffcc00;
            margin: 0 auto;
            position: relative;
            top: 10px;
            z-index: 10;
        }
        .box-section {
            background: rgba(255,255,255,0.05);
            padding: 15px;
            border-radius: 10px;
            margin-top: 15px;
            border-left: 5px solid var(--primary-color);
            text-align: left;
        }

        #chat-box-container {
            margin-top: 25px;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 10px;
            padding: 12px;
            border-top: 3px solid var(--primary-color);
            border-left: 5px solid var(--primary-color);
            border-right: 1px solid rgba(255,255,255,0.1);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            text-align: left;
        }
        #chat-messages {
            height: 110px;
            overflow-y: auto;
            font-size: 13px;
            margin-bottom: 8px;
            background: rgba(0,0,0,0.3);
            padding: 8px;
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .chat-msg { word-break: break-word; }
    </style>
</head>
<body>

    <div class="container">
        <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 10px;">
            <div>
                <label for="lang-select" style="font-size: 13px; color: #ccc;">🌐 <span id="ui-lang-label-text">Language</span>:</label>
                <select id="lang-select" onchange="changeLanguage()" style="width: auto; padding: 5px; font-size: 14px; display: inline-block;">
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                </select>
            </div>
        </div>

        <h1 id="ui-title">Wahrheit oder Pflicht Partyspiel 🍻🚻</h1>
        <p id="ui-subtitle">Spielt nacheinander Wahrheit oder Pflicht. Nach jeder vollen Runde dreht sich das Rad für alle!</p>

        <!-- SETUP (LOBBY) -->
        <div id="setup" class="box-section">
            <h3 id="ui-setup-head">Online Lobby:</h3>
            <input type="text" id="player-name-input" placeholder="Dein Name...">
            <button onclick="hostGame()" id="ui-host-btn" style="margin-top: 5px;">Lobby erstellen (Host) 🏠</button>
            <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">
            <input type="text" id="lobby-code-input" placeholder="Lobby-Code eingeben...">
            <button class="btn-blue" onclick="joinGame()" id="ui-join-btn">Lobby beitreten 🚀</button>
        </div>

        <!-- LOBBY WARTESAAL -->
        <div id="lobby-wait-box" class="hidden box-section" style="text-align: center;">
            <h3 id="ui-lobby-code-title">Lobby-Code: <span id="display-code" style="color: #ffcc00; font-size: 22px;"></span></h3>
            <p id="ui-share-code">Teile diesen Code mit deinen Mitspielern!</p>
            <ul id="player-list" style="list-style: none; padding: 0; text-align: left;"></ul>
            <button id="start-btn" class="hidden" onclick="startOnlineGame()">Spiel starten! 🔥</button>
            <div id="client-wait-msg" class="hidden" style="color: #ffcc00;">Mit Lobby verbunden! Warte darauf, dass der Host startet...</div>
        </div>

        <!-- WAHRHEIT ODER PFLICHT PHASE -->
        <div id="woP-phase" class="hidden">
            <h2 id="wop-turn-title">Am Zug: </h2>
            
            <div class="box-section" id="wop-choice-area">
                <label id="ui-choice-label">Was wählst du?</label>
                <select id="wop-choice">
                    <option value="truth" id="ui-opt-truth">Wahrheit</option>
                    <option value="dare" id="ui-opt-dare">Pflicht</option>
                </select>
                <button onclick="submitWopChoice()" id="ui-select-btn" style="width: 100%;">Auswählen 🎲</button>
            </div>

            <div class="box-section hidden" id="creator-input-area" style="border-left-color: #ffcc00;">
                <h3 id="creator-instruction-title" style="color: #ffcc00;"></h3>
                <p id="creator-target-info" style="font-size: 14px; color: #ccc;"></p>
                <input type="text" id="custom-task-input" placeholder="Tippe hier die Frage oder Aufgabe ein...">
                <button class="btn-blue" onclick="sendCustomTask()" id="ui-send-task-btn">An Spieler senden 🚀</button>
            </div>

            <div class="box-section hidden" id="active-task-area" style="border-left-color: var(--accent-color);">
                <h3 id="task-title-text" style="color: var(--accent-color);"></h3>
                <p style="font-size: 13px; color: #ffcc00;" id="task-assigner-info"></p>
                <p id="task-content-desc" style="font-size: 18px; font-weight: bold; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;"></p>
                
                <div id="answer-box" class="hidden" style="margin-top: 10px;">
                    <label id="ui-answer-label">Deine Antwort:</label>
                    <textarea id="player-answer-input" rows="2" placeholder="Tippe hier deine Antwort ein..."></textarea>
                    <button class="btn-green" onclick="submitAnswer()" style="margin-top: 10px;" id="ui-submit-answer-btn">✅ Antwort abschicken</button>
                </div>

                <div id="dare-box" class="hidden" style="margin-top: 10px;">
                    <button class="btn-green" onclick="submitDareDone()" style="margin-top: 10px;" id="ui-dare-done-btn">✅ Pflicht erfüllt & bestätigen!</button>
                </div>
            </div>

            <div class="box-section hidden" id="result-feedback-area" style="border-left-color: #28a745; text-align: center;">
                <h3 id="ui-done-head" style="color: #28a745;">🎉 Erledigt!</h3>
                <p id="feedback-player-name" style="font-weight: bold; font-size: 16px; color: #ffcc00;"></p>
                <p id="feedback-task-info" style="font-style: italic; color: #ccc;"></p>
                <div id="feedback-result-box" style="background: rgba(0,0,0,0.4); padding: 12px; border-radius: 8px; font-size: 18px; margin: 10px 0;"></div>
                
                <button class="btn-blue" id="next-turn-btn" onclick="voteNextTurn()" style="margin-top: 10px;">➡️ Weiter</button>
                <p id="waiting-next-msg" style="color: var(--accent-color); font-size: 14px; margin-top: 8px;"><span id="ui-waiting-other">Warten auf andere Spieler...</span> (<span id="next-votes-count">0</span>/<span id="next-votes-total">0</span>)</p>
            </div>

            <div class="box-section hidden" id="waiting-for-player-box" style="border-left-color: #666;">
                <p id="waiting-info-text" style="color: #ccc; font-weight: bold;"></p>
            </div>

            <div id="wop-status-info" style="margin-top: 15px; font-size: 14px; color: #ffcc00;"></div>
        </div>

        <!-- GLÜCKSRAD -->
        <div id="wheel-phase" class="hidden">
            <h2 id="ui-wheel-head" style="color: var(--accent-color);">🎡 RAD-MODUS: Alle müssen handeln!</h2>
            <p id="ui-wheel-desc">Jeder hat Wahrheit/Pflicht gespielt. Jetzt wird das Schicksals-Rad für alle gedreht!</p>
            
            <div class="pointer"></div>
            <div id="wheel-container">Rad bereit!</div>
            
            <button onclick="spinWheel()" id="spin-btn" class="btn-blue">Glücksrad jetzt drehen 🎡</button>
            
            <div id="wheel-result-box" class="box-section hidden" style="border-left-color: var(--accent-color); text-align: center;">
                <h3 id="wheel-action-title" style="color: #ffcc00;"></h3>
                <p id="wheel-action-desc"></p>
                
                <button id="next-round-btn" onclick="voteNextRound()" class="btn-blue" style="margin-top: 10px;">➡️ Weiter zur nächsten Runde!</button>
                <p id="waiting-round-msg" style="color: var(--accent-color); font-size: 14px; margin-top: 8px;"><span id="ui-waiting-other-round">Warten auf andere Spieler...</span> (<span id="round-votes-count">0</span>/<span id="round-votes-total">0</span>)</p>
            </div>
        </div>

        <!-- LIVE CHAT BEREICH -->
        <div id="chat-box-container" class="hidden">
            <div id="chat-messages"></div>
            <div style="display: flex; gap: 5px;">
                <input type="text" id="chat-input" placeholder="Schreibe eine Nachricht..." style="margin:0;" onkeydown="if(event.key === 'Enter') sendChatMessage()">
                <button class="btn-blue" style="width: 80px; margin:0; padding:8px;" onclick="sendChatMessage()" id="ui-chat-send">Senden</button>
            </div>
        </div>

        <!-- NOTFALL BUTTON -->
        <div id="emergency-box" class="hidden" style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 15px;">
            <p id="ui-emergency-desc" style="font-size: 13px; color: #ff9999;">Wer einknickt oder leakt, hat sofort verloren!</p>
            <button onclick="triggerLeak()" class="btn-danger" id="ui-leak-btn">🚨 Ich habe geleakt / musste pinkeln (Verloren!)</button>
        </div>
    </div>

    <script>
        let currentLang = "de";

        const translations = {
            de: {
                langLabelText: "Sprache",
                title: "Wahrheit oder Pflicht Partyspiel 🍻🚻",
                subtitle: "Spielt nacheinander Wahrheit oder Pflicht. Nach jeder vollen Runde dreht sich das Rad für alle!",
                setupHead: "Online Lobby:",
                hostBtn: "Lobby erstellen (Host) 🏠",
                lobbyCodeInputPlaceholder: "Lobby-Code eingeben...",
                joinBtn: "Lobby beitreten 🚀",
                lobbyCodeTitle: "Lobby-Code: ",
                shareCode: "Teile diesen Code mit deinen Mitspielern!",
                startBtn: "Spiel starten! 🔥",
                clientWaitMsg: "Mit Lobby verbunden! Warte darauf, dass der Host startet...",
                turnTitle: "Am Zug: ",
                choiceLabel: "Was wählst du?",
                optTruth: "Wahrheit",
                optDare: "Pflicht",
                selectBtn: "Auswählen 🎲",
                sendTaskBtn: "An Spieler senden 🚀",
                taskInputPlaceholder: "Tippe hier die Frage oder Aufgabe ein...",
                answerLabel: "Deine Antwort:",
                answerPlaceholder: "Tippe hier deine Antwort ein...",
                submitAnswerBtn: "✅ Antwort abschicken",
                dareDoneBtn: "✅ Pflicht erfüllt & bestätigen!",
                doneHead: "🎉 Erledigt!",
                nextTurnBtn: "➡️ Weiter",
                waitingOther: "Warten auf andere Spieler...",
                wheelHead: "🎡 RAD-MODUS: Alle müssen handeln!",
                wheelDesc: "Jeder hat Wahrheit/Pflicht gespielt. Jetzt wird das Schicksals-Rad für alle gedreht!",
                spinBtn: "Glücksrad jetzt drehen 🎡",
                nextRoundBtn: "➡️ Weiter zur nächsten Runde!",
                chatPlaceholder: "Schreibe eine Nachricht...",
                chatSend: "Senden",
                emergencyDesc: "Wer einknickt oder leakt, hat sofort verloren!",
                leakBtn: "🚨 Ich habe geleakt / musste pinkeln (Verloren!)",
                alertNameCode: "Bitte Namen und Lobby-Code eingeben!",
                alertName: "Bitte gib deinen Namen ein!",
                alertTask: "Bitte eine Aufgabe eingeben!",
                alertAnswer: "Bitte antworte auf die Frage!",
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
                langLabelText: "Language",
                title: "Truth or Dare Party Game 🍻🚻",
                subtitle: "Take turns playing truth or dare. After every full round, the wheel spins for everyone!",
                setupHead: "Online Lobby:",
                hostBtn: "Create Lobby (Host) 🏠",
                lobbyCodeInputPlaceholder: "Enter lobby code...",
                joinBtn: "Join Lobby 🚀",
                lobbyCodeTitle: "Lobby Code: ",
                shareCode: "Share this code with your fellow players!",
                startBtn: "Start Game! 🔥",
                clientWaitMsg: "Connected to lobby! Waiting for host to start...",
                turnTitle: "Current Turn: ",
                choiceLabel: "What do you choose?",
                optTruth: "Truth",
                optDare: "Dare",
                selectBtn: "Select 🎲",
                sendTaskBtn: "Send to player 🚀",
                taskInputPlaceholder: "Type your question or dare here...",
                answerLabel: "Your Answer:",
                answerPlaceholder: "Type your answer here...",
                submitAnswerBtn: "✅ Submit Answer",
                dareDoneBtn: "✅ Dare completed & confirm!",
                doneHead: "🎉 Done!",
                nextTurnBtn: "➡️ Next",
                waitingOther: "Waiting for other players...",
                wheelHead: "🎡 WHEEL MODE: Everyone acts!",
                wheelDesc: "Everyone played truth or dare. Now the wheel of fate spins for everyone!",
                spinBtn: "Spin the wheel now 🎡",
                nextRoundBtn: "➡️ Next Round!",
                chatPlaceholder: "Type a message...",
                chatSend: "Send",
                emergencyDesc: "Anyone who caves or leaks loses immediately!",
                leakBtn: "🚨 I leaked / had to pee (Lost!)",
                alertNameCode: "Please enter name and lobby code!",
                alertName: "Please enter your name!",
                alertTask: "Please enter a task!",
                alertAnswer: "Please answer the question!",
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
            currentLang = document.getElementById("lang-select").value;
            const t= translations[currentLang];

            document.getElementById("ui-lang-label-text").innerText = t.langLabelText;
            document.getElementById("ui-title").innerText = t.title;
            document.getElementById("ui-subtitle").innerText = t.subtitle;
            document.getElementById("ui-setup-head").innerText = t.setupHead;
            document.getElementById("ui-host-btn").innerText = t.hostBtn;
            document.getElementById("player-name-input").placeholder = currentLang === 'de' ? "Dein Name..." : "Your name...";
            document.getElementById("lobby-code-input").placeholder = t.lobbyCodeInputPlaceholder;
            document.getElementById("ui-join-btn").innerText = t.joinBtn;
            document.getElementById("ui-lobby-code-title").innerHTML = t.lobbyCodeTitle + `<span id="display-code" style="color: #ffcc00; font-size: 22px;">${activeLobbyCode.toUpperCase()}</span>`;
            document.getElementById("ui-share-code").innerText = t.shareCode;
            document.getElementById("start-btn").innerText = t.startBtn;
            document.getElementById("client-wait-msg").innerText = t.clientWaitMsg;
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

        // --- PEERJS MULTIPLAYER GRUNDLOGIK ---
        let peer = null;
        let hostConnection = null;
        let peerConnections = {}; 
        let isHost = false;
        let myName = "";
        let myPeerId = "";
        let activeLobbyCode = "";

        let players = []; 
        let currentTurnIndex = 0;
        let gameState = 'lobby'; 
        let currentChooser = "";
        let currentTarget = "";
        let currentChoiceType = "";
        let activeTaskText = "";
        let nextTurnVotes = [];
        let nextRoundVotes = [];

        function generateCode() {
            const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
            let code = "";
            for (let i = 0; i < 4; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        }

        function hostGame() {
            myName = document.getElementById("player-name-input").value.trim();
            if (!myName) { alert(translations[currentLang].alertName); return; }

            activeLobbyCode = generateCode();
            peer = new Peer("wop_" + activeLobbyCode);

            peer.on('open', (id) => {
                myPeerId = id;
                isHost = true;
                players = [{ id: myPeerId, name: myName, score: 0 }];
                
                document.getElementById("setup").classList.add("hidden");
                document.getElementById("lobby-wait-box").classList.remove("hidden");
                document.getElementById("display-code").innerText = activeLobbyCode.toUpperCase();
                document.getElementById("start-btn").classList.remove("hidden");
                
                updatePlayerList();
            });

            peer.on('connection', (conn) => {
                conn.on('data', (data) => handleHostData(conn, data));
                conn.on('close', () => handlePlayerDisconnect(conn));
            });

            peer.on('error', (err) => {
                alert("Fehler beim Erstellen der Lobby. Versuche es erneut.");
                console.error(err);
            });
        }

        function joinGame() {
            myName = document.getElementById("player-name-input").value.trim();
            let codeInput = document.getElementById("lobby-code-input").value.trim().toLowerCase();
            if (!myName || !codeInput) { alert(translations[currentLang].alertNameCode); return; }

            activeLobbyCode = codeInput;
            peer = new Peer();

            peer.on('open', (id) => {
                myPeerId = id;
                isHost = false;
                
                hostConnection = peer.connect("wop_" + activeLobbyCode);

                hostConnection.on('open', () => {
                    hostConnection.send({ type: 'JOIN', name: myName, id: myPeerId });
                    document.getElementById("setup").classList.add("hidden");
                    document.getElementById("lobby-wait-box").classList.remove("hidden");
                    document.getElementById("display-code").innerText = activeLobbyCode.toUpperCase();
                    document.getElementById("client-wait-msg").classList.remove("hidden");
                });

                hostConnection.on('data', (data) => handleClientData(data));
                hostConnection.on('close', () => {
                    alert("Verbindung zum Host verloren!");
                    location.reload();
                });
            });

            peer.on('error', (err) => {
                alert("Lobby konnte nicht gefunden werden. Überprüfe den Code!");
                console.error(err);
            });
        }

        function sendData(data) {
            if (isHost) {
                for (let id in peerConnections) {
                    if (peerConnections[id] && peerConnections[id].open) {
                        peerConnections[id].send(data);
                    }
                }
            } else {
                if (hostConnection && hostConnection.open) {
                    hostConnection.send(data);
                }
            }
        }

        // --- HOST DATENVERARBEITUNG ---
        function handleHostData(conn, data) {
            if (data.type === 'JOIN') {
                if (gameState !== 'lobby') {
                    conn.send({ type: 'ERROR', message: 'Spiel läuft bereits!' });
                    return;
                }
                peerConnections[data.id] = conn;
                players.push({ id: data.id, name: data.name, score: 0 });
                broadcastGameState();
            } else if (data.type === 'CHOICE') {
                currentChoiceType = data.choice;
                currentChooser = data.name;
                
                if (currentChoiceType === 'truth') {
                    currentTarget = getNextPlayerName(currentChooser);
                } else {
                    let otherPlayers = players.filter(p => p.name !== currentChooser);
                    let randomTargetPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
                    currentTarget = randomTargetPlayer ? randomTargetPlayer.name : currentChooser;
                }
                broadcastGameState();
            } else if (data.type === 'CUSTOM_TASK') {
                activeTaskText = data.task;
                broadcastGameState();
            } else if (data.type === 'ANSWER_SUBMITTED' || data.type === 'DARE_DONE') {
                broadcastGameState();
            } else if (data.type === 'NEXT_VOTE') {
                if (!nextTurnVotes.includes(data.name)) {
                    nextTurnVotes.push(data.name);
                }
                if (nextTurnVotes.length >= players.length) {
                    nextTurnVotes = [];
                    currentTurnIndex = (currentTurnIndex + 1) % players.length;
                    if (currentTurnIndex === 0) {
                        gameState = 'wheel';
                    } else {
                        gameState = 'wop';
                    }
                    currentChooser = "";
                    currentTarget = "";
                    currentChoiceType = "";
                    activeTaskText = "";
                }
                broadcastGameState();
            } else if (data.type === 'ROUND_VOTE') {
                if (!nextRoundVotes.includes(data.name)) {
                    nextRoundVotes.push(data.name);
                }
                if (nextRoundVotes.length >= players.length) {
                    nextRoundVotes = [];
                    gameState = 'wop';
                    currentTurnIndex = 0;
                    currentChooser = "";
                    currentTarget = "";
                    currentChoiceType = "";
                    activeTaskText = "";
                }
                broadcastGameState();
            } else if (data.type === 'CHAT') {
                broadcastData({ type: 'CHAT', name: data.name, text: data.text });
                appendChatMessage(data.name, data.text);
            } else if (data.type === 'LEAK') {
                broadcastData({ type: 'CHAT', name: "⚠️ SYSTEM", text: `${data.name} hat geleakt/verloren!` });
                appendChatMessage("⚠️ SYSTEM", `${data.name} hat geleakt/verloren!`);
            }
        }

        function handlePlayerDisconnect(conn) {
            let disconnectedId = "";
            for (let id in peerConnections) {
                if (peerConnections[id] === conn) {
                    disconnectedId = id;
                    break;
                }
            }
            if (disconnectedId) {
                delete peerConnections[disconnectedId];
                players = players.filter(p => p.id !== disconnectedId);
                broadcastGameState();
            }
        }

        function broadcastGameState() {
            let state = {
                type: 'STATE_UPDATE',
                players: players,
                gameState: gameState,
                currentTurnIndex: currentTurnIndex,
                currentChooser: currentChooser,
                currentTarget: currentTarget,
                currentChoiceType: currentChoiceType,
                activeTaskText: activeTaskText,
                nextTurnVotes: nextTurnVotes.length,
                nextRoundVotes: nextRoundVotes.length
            };
            sendData(state);
            updateUI(state);
        }

        function broadcastData(data) {
            sendData(data);
        }

        // --- CLIENT DATENVERARBEITUNG ---
        function handleClientData(data) {
            if (data.type === 'STATE_UPDATE') {
                updateUI(data);
            } else if (data.type === 'CHAT') {
                appendChatMessage(data.name, data.text);
            } else if (data.type === 'ERROR') {
                alert(data.message);
                location.reload();
            }
        }

        function startOnlineGame() {
            if (players.length < 1) {
                alert("Mindestens 1 Spieler erforderlich!");
                return;
            }
            gameState = 'wop';
            currentTurnIndex = 0;
            broadcastGameState();
        }

        function getNextPlayerName(currName) {
            let idx = players.findIndex(p => p.name === currName);
            let nextIdx = (idx + 1) % players.length;
            return players[nextIdx].name;
        }

        // --- SPIEL AKTIONEN ---
        function submitWopChoice() {
            let choice = document.getElementById("wop-choice").value;
            if (isHost) {
                currentChoiceType = choice;
                currentChooser = myName;
                if (currentChoiceType === 'truth') {
                    currentTarget = getNextPlayerName(currentChooser);
                } else {
                    let otherPlayers = players.filter(p => p.name !== currentChooser);
                    let randomTargetPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
                    currentTarget = randomTargetPlayer ? randomTargetPlayer.name : currentChooser;
                }
                broadcastGameState();
            } else {
                hostConnection.send({ type: 'CHOICE', choice: choice, name: myName });
            }
        }

        function sendCustomTask() {
            let task = document.getElementById("custom-task-input").value.trim();
            if (!task) { alert(translations[currentLang].alertTask); return; }

            if (isHost) {
                activeTaskText = task;
                broadcastGameState();
            } else {
                hostConnection.send({ type: 'CUSTOM_TASK', task: task });
            }
            document.getElementById("custom-task-input").value = "";
        }

        function submitAnswer() {
            let ans = document.getElementById("player-answer-input").value.trim();
            if (!ans) { alert(translations[currentLang].alertAnswer); return; }
            
            activeTaskText = `Antwort: "${ans}"`;
            if (isHost) {
                broadcastGameState();
            } else {
                hostConnection.send({ type: 'ANSWER_SUBMITTED', text: activeTaskText });
            }
            document.getElementById("player-answer-input").value = "";
        }

        function submitDareDone() {
            activeTaskText = currentLang === 'de' ? "Pflicht erfolgreich absolviert!" : "Dare successfully completed!";
            if (isHost) {
                broadcastGameState();
            } else {
                hostConnection.send({ type: 'DARE_DONE' });
            }
        }

        function voteNextTurn() {
            if (isHost) {
                if (!nextTurnVotes.includes(myName)) nextTurnVotes.push(myName);
                if (nextTurnVotes.length >= players.length) {
                    nextTurnVotes = [];
                    currentTurnIndex = (currentTurnIndex + 1) % players.length;
                    if (currentTurnIndex === 0) {
                        gameState = 'wheel';
                    } else {
                        gameState = 'wop';
                    }
                    currentChooser = "";
                    currentTarget = "";
                    currentChoiceType = "";
                    activeTaskText = "";
                }
                broadcastGameState();
            } else {
                hostConnection.send({ type: 'NEXT_VOTE', name: myName });
            }
        }

        function spinWheel() {
            let wheel = document.getElementById("wheel-container");
            let randomDeg = 1440 + Math.floor(Math.random() * 360);
            wheel.style.transform = `rotate(${randomDeg}deg)`;

            setTimeout(() => {
                let sectors = translations[currentLang].wheelSectors;
                let sector = sectors[Math.floor(Math.random() * sectors.length)];
                
                document.getElementById("wheel-action-title").innerText = sector.title;
                document.getElementById("wheel-action-desc").innerText = sector.desc;
                document.getElementById("wheel-result-box").classList.remove("hidden");
            }, 3000);
        }

        function voteNextRound() {
            if (isHost) {
                if (!nextRoundVotes.includes(myName)) nextRoundVotes.push(myName);
                if (nextRoundVotes.length >= players.length) {
                    nextRoundVotes = [];
                    gameState = 'wop';
                    currentTurnIndex = 0;
                    currentChooser = "";
                    currentTarget = "";
                    currentChoiceType = "";
                    activeTaskText = "";
                }
                broadcastGameState();
            } else {
                hostConnection.send({ type: 'ROUND_VOTE', name: myName });
            }
        }

        function triggerLeak() {
            if (isHost) {
                broadcastData({ type: 'CHAT', name: "⚠️ SYSTEM", text: `${myName} hat geleakt/verloren!` });
                appendChatMessage("⚠️ SYSTEM", `${myName} hat geleakt/verloren!`);
            } else {
                hostConnection.send({ type: 'LEAK', name: myName });
            }
        }

        function sendChatMessage() {
            let input = document.getElementById("chat-input");
            let text = input.value.trim();
            if (!text) return;

            if (isHost) {
                broadcastData({ type: 'CHAT', name: myName, text: text });
                appendChatMessage(myName, text);
            } else {
                hostConnection.send({ type: 'CHAT', name: myName, text: text });
            }
            input.value = "";
        }

        function appendChatMessage(sender, text) {
            let box = document.getElementById("chat-messages");
            box.innerHTML += `<div class="chat-msg"><b>${sender}:</b> ${text}</div>`;
            box.scrollTop = box.scrollHeight;
        }

        // --- UI AKTUALISIERUNG ---
        function updatePlayerList() {
            let list = document.getElementById("player-list");
            list.innerHTML = "";
            players.forEach(p => {
                list.innerHTML += `<li style="padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">👤 ${p.name} ${p.id === myPeerId ? '(Du)' : ''}</li>`;
            });
        }

        function updateUI(state) {
            players = state.players;
            gameState = state.gameState;
            currentTurnIndex = state.currentTurnIndex;
            currentChooser= state.currentChooser;
            currentTarget = state.currentTarget;
            currentChoiceType = state.currentChoiceType;
            activeTaskText = state.activeTaskText;

            updatePlayerList();

            document.getElementById("lobby-wait-box").classList.add("hidden");
            document.getElementById("woP-phase").classList.add("hidden");
            document.getElementById("wheel-phase").classList.add("hidden");
            document.getElementById("chat-box-container").classList.add("hidden");
            document.getElementById("emergency-box").classList.add("hidden");

            if (gameState === 'lobby') {
                document.getElementById("lobby-wait-box").classList.remove("hidden");
                if (!isHost) {
                    document.getElementById("client-wait-msg").classList.remove("hidden");
                }
            } else if (gameState === 'wop') {
                document.getElementById("woP-phase").classList.remove("hidden");
                document.getElementById("chat-box-container").classList.remove("hidden");
                document.getElementById("emergency-box").classList.remove("hidden");

                let activePlayer = players[currentTurnIndex];
                if (!activePlayer) return;

                document.getElementById("wop-turn-title").innerText = (currentLang === 'de' ? "Am Zug: " : "Current Turn: ") + activePlayer.name;

                let isMyTurn = (activePlayer.name === myName);
                let choiceArea = document.getElementById("wop-choice-area");
                let creatorArea = document.getElementById("creator-input-area");
                let activeTaskArea = document.getElementById("active-task-area");
                let resultArea = document.getElementById("result-feedback-area");
                let waitingPlayerBox = document.getElementById("waiting-for-player-box");

                choiceArea.classList.add("hidden");
                creatorArea.classList.add("hidden");
                activeTaskArea.classList.add("hidden");
                resultArea.classList.add("hidden");
                waitingPlayerBox.classList.add("hidden");

                if (!currentChoiceType) {
                    if (isMyTurn) {
                        choiceArea.classList.remove("hidden");
                    } else {
                        waitingPlayerBox.classList.remove("hidden");
                        document.getElementById("waiting-info-text").innerText = (currentLang === 'de' ? `${activePlayer.name} wählt gerade zwischen Wahrheit oder Pflicht...` : `${activePlayer.name} is choosing truth or dare...`);
                    }
                } else if (!activeTaskText) {
                    let isCreator = false;
                    let creatorName = "";

                    if (currentChoiceType === 'truth') {
                        isCreator = (currentTarget === myName);
                        creatorName = currentTarget;
                    } else {
                        isCreator = (activePlayer.name !== myName && players.some(p => p.name === myName));
                        creatorName = activePlayer.name;
                    }

                    if (isCreator) {
                        creatorArea.classList.remove("hidden");
                        document.getElementById("creator-instruction-title").innerText = currentChoiceType === 'truth' ? (currentLang === 'de' ? `Stelle ${activePlayer.name} eine Wahrheits-Frage!` : `Ask ${activePlayer.name} a truth question!`) : (currentLang === 'de' ? `Erfinde eine Pflicht für ${activePlayer.name}!` : `Create a dare for ${activePlayer.name}!`);
                        document.getElementById("creator-target-info").innerText = currentLang === 'de' ? `Zielperson: ${activePlayer.name}` : `Target: ${activePlayer.name}`;
                    } else {
                        waitingPlayerBox.classList.remove("hidden");
                        let waitingForWho = currentChoiceType === 'truth' ? currentTarget : "ein anderer Spieler";
                        document.getElementById("waiting-info-text").innerText = currentLang === 'de' ? `Warte, bis ${waitingForWho} die Aufgabe/Frage eingibt...` : `Waiting for task input...`;
                    }
                } else if (activeTaskText && !activeTaskText.startsWith("Antwort:") && activeTaskText !== "Pflicht erfolgreich absolviert!" && activeTaskText !== "Dare successfully completed!") {
                    let isTaskTarget = (currentChoiceType === 'truth' ? currentTarget === myName : activePlayer.name === myName);

                    if (isTaskTarget) {
                        activeTaskArea.classList.remove("hidden");
                        document.getElementById("task-title-text").innerText = currentChoiceType === 'truth' ? (currentLang === 'de' ? "💡 Deine Wahrheits-Frage:" : "💡 Your Truth Question:") : (currentLang === 'de' ? "🔥 Deine Pflicht-Aufgabe:" : "🔥 Your Dare Task:");
                        document.getElementById("task-assigner-info").innerText = currentLang === 'de' ? `Von: ${currentChoiceType === 'truth' ? currentTarget : activePlayer.name}` : `From: ${activePlayer.name}`;
                        document.getElementById("task-content-desc").innerText = activeTaskText;

                        if (currentChoiceType === 'truth') {
                            document.getElementById("answer-box").classList.remove("hidden");
                            document.getElementById("dare-box").classList.add("hidden");
                        } else {
                            document.getElementById("answer-box").classList.add("hidden");
                            document.getElementById("dare-box").classList.remove("hidden");
                        }
                    } else {
                        waitingPlayerBox.classList.remove("hidden");
                        let targetName = currentChoiceType === 'truth' ? currentTarget : activePlayer.name;
                        document.getElementById("waiting-info-text").innerText = currentLang === 'de' ? `${targetName} bearbeitet gerade die Aufgabe...` : `${targetName} is working on the task...`;
                    }
                } else {
                    resultArea.classList.remove("hidden");
                    document.getElementById("feedback-player-name").innerText = activePlayer.name;
                    document.getElementById("feedback-task-info").innerText = currentChoiceType === 'truth' ? (currentLang === 'de' ? "Wahrheit beantwortet" : "Truth answered") : (currentLang === 'de' ? "Pflicht erfüllt" : "Dare completed");
                    document.getElementById("feedback-result-box").innerText = activeTaskText;
                    document.getElementById("next-votes-count").innerText = state.nextTurnVotes;
                    document.getElementById("next-votes-total").innerText = players.length;
                }
            } else if (gameState === 'wheel') {
                document.getElementById("wheel-phase").classList.remove("hidden");
                document.getElementById("chat-box-container").classList.remove("hidden");
                document.getElementById("wheel-result-box").classList.add("hidden");
                document.getElementById("round-votes-count").innerText = state.nextRoundVotes;
                document.getElementById("round-votes-total").innerText = players.length;
            }
        }
    </script>
</body>
</html>
