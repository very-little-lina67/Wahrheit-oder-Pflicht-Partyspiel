# Changelog: Wahrheit oder Pflicht

Alle wesentlichen Änderungen am Projekt werden in dieser Datei präzise und technisch dokumentiert.

---

## [2.0.30] - 2026-11-06

### Bug Fixes
- **Pixel-perfekte vertikale Zentrierung & kompaktes Pill-Layout für Sileo Toasts auf Android & Mobile (`src/sileo-entry.js`, `js/sileo-bundle.js`):**
  - Problem behoben, bei dem der Inhalt der Toast-Benachrichtigung auf Android nach unten verschoben angezeigt wurde und oben eine störende Lücke ("Forehead-Gap") aufwies.
  - Sileo Toaster auf 42px Höhe, `autopilot: false` und nahtlose Ein-Zeilen-Pill umgestellt: Vermeidet unvollständige oder verformte 90px-Accordion-Zustände.
  - Der Toast kombiniert nun links ein elegantes lila Icon-Badge (`💬` oder `🎮`), in der Mitte Absendername in Weiß und Nachrichten-Vorschau in hellem Schiefergrau sowie rechts einen gut sichtbaren, abgerundeten „Antworten ➔“-Pill-Button.
  - Verdecktes Standard-Badge von Sileo (`[data-sileo-badge] { display: none !important; }`), wodurch das blaue Pfeil-Icon und Konflikte mit dem Text vollständig eliminiert wurden.
  - Reines Tiefschwarz (`#000000`) für Hintergrund und SVG-Canvas mit dezentem Schatten und Border (`rgba(255, 255, 255, 0.15)`).
- **Unterdrückung doppelter System-Benachrichtigungen auf iOS bei geöffneter App (`server.js`, `sw.js`, `js/app.js`):**
  - Problem behoben, bei dem auf iOS Safari / PWA beim Empfang einer Nachricht sowohl der In-App-Toast als auch ein iOS-System-Banner angezeigt wurden.
  - **Server-seitige WebPush-Sperre (`server.js`):** `isUserActiveInApp` prüft, ob für den Empfänger mindestens ein Socket aktiv und verbunden ist. Ist der Nutzer in der App aktiv, wird die WebPush-Zustellung unterdrückt, da die Nachricht latenzfrei per WebSocket (`dm:incoming`) als In-App-Toast ausgeliefert wird.
  - **Client-zu-Service-Worker Synchronisation (`js/app.js`, `sw.js`):** Kontinuierlicher Sichtbarkeits-Heartbeat via `BroadcastChannel("wop_visibility_channel")` und `postMessage`. `sw.js` unterdrückt eingehende Push-Events verlässlich, wenn der Client innerhalb der letzten 15 Sekunden aktiv war oder `clients.matchAll` sichtbare Fenster meldet.
  - Service-Worker-Cache auf `wop-party-v7` angehoben.

### Misc
- Versionsnummer auf **2.0.30** angehoben und alle Cache-Busting-Parameter aktualisiert.

---

## [2.0.29] - 2026-11-06

### New Features
- **Persistenter Seiten-State & automatische View-Wiederherstellung bei Neuladen (`js/app.js`, `index.html`):**
  - Wurde eine Unterseite (z. B. Freunde, Shop, Profil, Chat-Postfach, 1:1 Privatnachricht, Rangliste, Feedback oder Admin-Panel) geöffnet und die Seite neu geladen, wird ab sofort exakt diese Seite inklusive Unter-Tabs und Chat-Partner wiederhergestellt, anstatt immer zur Startseite zurückzufallen.
  - Dedizierter Page-State-Manager (`wop_active_page_v2` in `sessionStorage` und `localStorage`) trackt aktive Screens (`home`, `friends`, `shop`, `profile`, `messages`, `chat`, `leaderboard`, `feedback`, `admin`) sowie aktive Tabs (`tab: "online"`, `tab: "jokers"`, etc.) und Chat-Partner (`targetEmail`).
  - Schließen eines Modals oder Rückkehr per Zurück-Pfeil (`←`) setzt den Zustand sauber auf die übergeordnete Ansicht bzw. Startseite zurück.
  - Nahtlose Koexistenz mit laufenden Lobbies: Befindet sich der Nutzer in einer aktiven Spielrunde, reconnectet die Lobby im Hintergrund, während die aktive Seite im Vordergrund angezeigt bleibt.

### Misc
- Versionsnummer auf **2.0.29** angehoben und alle Cache-Busting-Parameter aktualisiert.

---

## [2.0.28] - 2026-11-06

### New Features
- **Autonomes Drehen des Glücksrads & Re-Spin-Sperre (`js/app.js`):**
  - Beim Phasenwechsel zu `wheel` dreht der Host das Glücksrad nach kurzer Übergangsverzögerung (500 ms) automatisch für alle Spieler.
  - Der Drehen-Button (`#spin-btn`) wird dauerhaft deaktiviert und signalisiert den automatischen Drehstatus (`"🎡 Glücksrad dreht sich automatisch..."`), sodass kein Spieler das Rad manuell oder mehrfach hintereinander auslösen kann.

### Bug Fixes
- **Balancierte Aufgabensteller-Zufallslogik bei mehr als 3 Spielern (`js/app.js`):**
  - Problem behoben, bei dem für Wahrheit und Pflicht häufig immer dieselben Spieler als Aufgabensteller zugewiesen wurden.
  - Einführung eines gewichteten, historienbasierten Zuweisungsverfahrens:
    - Ausschluss des vorherigen Erstellers für denselben Zielspieler (`lastCreatorForTarget`) und für dieselbe Aufgabenart (`lastCreatorByTargetAndChoice`).
    - Ausschluss des unmittelbar vorherigen globalen Erstellers (`recentTaskCreators`).
    - Gleichmäßige Aufgabenverteilung über `creatorCounts`: Bei mehreren wählbaren Spielern werden stets die Mitspieler mit den bisher wenigsten zugewiesenen Aufgaben bevorzugt (bei Gleichstand Zufallsauswahl).
    - Synchronisation des Creator-Zustands (`creatorCounts`, `lastCreatorByTargetAndChoice`) im Lobby-State-Payload.
- **Lobby-Verbleib & Reconnect-Stabilität bei App-Wechsel / Hintergrundmodus (`server.js`, `database.js`, `js/wop-socket-client.js`, `js/app.js`):**
  - Kritisches Problem behoben, bei dem Spieler beim Minimieren der App, Sperren des Bildschirms oder Wechsel zu einer anderen App aus der Lobby flogen und nicht mehr beitreten konnten.
  - `pagehide`-Beacon unterdrückt: Wenn ein Spieler sich in einer aktiven Lobby befindet (`window.activeLobbyCode`), sendet `pagehide` keinen hart trennenden `/api/user/offline`-Request.
  - `/api/user/offline` im Backend sichert aktive Lobby-Mitglieder ab: Keine Trennung via `s.disconnect(true)` und kein Zurücksetzen von `currentLobby`, wenn der Nutzer sich in einer aktiven Lobby befindet.
  - `database.js`: `setOnlineStatus` überschreibt `currentLobby` nicht mehr mit einem leeren String, wenn kein expliziter Lobby-Parameter übergeben wurde.
  - Automatischer Socket-Reconnect bei `io server disconnect` und Reconnect-Trigger bei `visibilitychange`, `pageshow` und `focus`.
- **Zuverlässige Chat-Wiederherstellung bei Neuladen (`js/app.js`):**
  - `applyGameStateFromFirebase` stellt den Chat-Verlauf (`restoreLobbyChat`) nun auch bei laufenden Runden (`wop` und `wheel`) und Mid-Game-Joins unmittelbar wieder her.
  - Initialer Restore beim Laden der Seite (`DOMContentLoaded`) und bei `joinGame`.
- **Behebung von Button-Verschiebungen & verschwindenden Aufgaben/Status bei Orientierungswechsel und Scrollen (`js/app.js`, `css/style.css`, `index.html`):**
  - Problem behoben, bei dem beim Drehen des Smartphones (Portrait <-> Landscape) oder beim Scrollen der Status oder die aktuelle Frage/Pflicht verschwand und die Aktionsbuttons in die Mitte des Bildschirms rutschten.
  - Ursache: `applyGameStateFromFirebase` rief `updateWopTurn()` bisher nur auf, wenn `turnStateChanged` wahr war. Nach Reconnects oder State-Updates blieb der Aufgabenbereich daher unsichtbar (Höhe 0px), wodurch der Container kollabierte und Buttons nach oben in die Bildschirmmitte zogen.
  - `applyGameStateFromFirebase` ruft `updateWopTurn()` in der `wop`-Phase nun verlässlich auf und stellt die Sichtbarkeit des aktiven Tasks (`#active-task-area`), Eingabebereichs oder Wartebereichs sicher.
  - `setupCreatorUI`: Kein unbegründetes Leeren von `custom-task-input.value` bei Re-Renders.
  - CSS & Viewport: `min-height: 100dvh` auf `body`, Viewport-Meta mit `viewport-fit=cover` ergänzt.

### Misc
- Versionsnummer auf **2.0.28** angehoben und alle Cache-Busting-Parameter aktualisiert.

---

## [2.0.27] - 2026-11-05

### Bug Fixes
- **Lobby-Chat-Persistenz bei Neuladen der Seite (`server.js`, `js/app.js`, `js/wop-socket-client.js`):**
  - Chatnachrichten (öffentlich sowie privat) werden nun parallel in `sessionStorage` und `localStorage` unter `wop_lobby_chat_v1_<code.toLowerCase()>` zwischengespeichert und beim Reload (`showLobbyUI`, `startGameUI`) sofort wiederhergestellt.
  - Serverseitige Chat-Historie: `activeLobbies` speichert die letzten 100 Nachrichten und sendet sie beim Beitreten oder Reconnecten via `lobby:chat_history` automatisch an den Client.
  - Beim manuellen Verlassen der Lobby wird der lokale Chat-Speicher für diesen Raum sauber gelöscht.
- **Sofortige Offline-Erkennung & Bereinigung von Geister-Online-Status (`server.js`, `database.js`, `js/app.js`, `js/wop-socket-client.js`):**
  - Beendete Apps (Taskmanager-Kill / Schließen): Socket.io Heartbeat-Intervalle auf `pingInterval: 8000` und `pingTimeout: 5000` optimiert, sodass tote Sockets innerhalb von 8–13 Sekunden verlässlich getrennt werden.
  - `pagehide`-Offline-Beacon: Beim Schließen des Tabs oder App-Wechsel wird via `navigator.sendBeacon('/api/user/offline')` ein sofortiger Offline-Status gemeldet.
  - Kritischer Fehler in `/api/user/profile` behoben: Der statische Datenbank-Wert `Boolean(user.isOnline)` wurde zuvor fälschlicherweise geleakt (`userSockets.has(user.email) || Boolean(...)`). Der Status spiegelt nun strikt die tatsächliche Live-Verbindung wider.
  - `formatLastOnline`-Korrektur in `js/app.js`: Offline-Nutzer wurden zuvor durch `ONLINE_TIMEOUT_MS` (2,5 Min.) fälschlicherweise als "Jetzt online" gerendert. Wenn das Online-Flag false ist, wird der Nutzer nun sofort als offline mit genauer Verweildauer ("Zuletzt online: vor X Min.") dargestellt.
  - Periodischer Server-Sweep (alle 15 Sek.) bereinigt zombifizierte Sockets und sendet `social:presence`-Broadcasts.
  - Server-Startup-Reset: Bei Initialisierung der SQLite-Datenbank werden alle Nutzer auf `isOnline = 0, currentLobby = ''` zurückgesetzt.

### Misc
- Versionsnummer auf **2.0.27** angehoben und alle Cache-Busting-Parameter aktualisiert.

---

## [2.0.26] - 2026-11-05

### New Features
- **Strikt alternierende Aufgabenstellung bei 3 Spielern (`js/app.js`):**
  - In Lobbies mit 3 aktiven Spielern stellen die beiden verbleibenden Spieler die Fragen oder Pflichten für den aktuell aktiven Spieler nun streng abwechselnd: Hat in Runde N Mitspieler A für den Zielspieler die Aufgabe gestellt, ist in Runde N+1 zwingend Mitspieler B an der Reihe.
  - Niemand wird mehr durch reinen Zufallsentscheid übergangen oder mehrfach hintereinander gewählt; jeder Spieler beantwortet und stellt in jedem Durchgang genau eine Aufgabe.
  - Zustandsüberwachung via `lastCreatorForTarget`: Der Wechsel-Status wird persistent im Lobby-Payload festgehalten und über `applyGameStateFromFirebase` für alle Clients synchronisiert.

### Misc
- Versionsnummer auf **2.0.26** angehoben und alle Cache-Busting-Parameter aktualisiert.

---

## [2.0.25] - 2026-11-05

### Bug Fixes
- **ReferenceError `dbRun is not defined` bei Lobby-Operationen behoben (`server.js`, `database.js`):**
  - Fehlende Importe behoben: `dbRun`, `dbGet` und `dbAll` wurden aus `./database.js` in `server.js` importiert, wodurch der Laufzeitfehler `ReferenceError: dbRun is not defined` bei `lobby:create` (Host-Initialisierung), `lobby:join` (Mitspieler-Beitritt) und `lobby:leave` (Lobby-Verlassen/Schließen) vollständig behoben wurde.
  - Saubere Datenkapselung (DRY & Modulare Architektur): Dedizierte Datenbank-Hilfsfunktionen `setUserCurrentLobby(email, lobbyCode)` und `clearLobbyForUsers(lobbyCode)` in `database.js` implementiert und in den Socket.io-Lobby-Handlern von `server.js` angebunden.
  - Automatisierte Socket- und SQLite-Integrationstests verifizieren den fehlerfreien Lifecycle von Lobbies (Erstellen, Beitreten, Verlassen, Host-Exit).

### Misc
- Versionsnummer auf **2.0.25** angehoben und alle Cache-Busting-Parameter aktualisiert.

---

## [2.0.24] - 2026-11-05

### Bug Fixes
- **Sileo Toast vertikale Ausrichtung auf Android & iOS behoben (`src/sileo-entry.js`, `js/sileo-bundle.js`, `js/sileo-bundle.css`):**
  - Vertikaler Versatz nach unten ("Forehead Gap") auf Android-Geräten restlos beseitigt: Durch strikte CSS-Regeln (`height: var(--sileo-height, 40px) !important; top: 0 !important; bottom: auto !important; line-height: 1 !important; display: flex !important; align-items: center !important`) sind Header, Badge und Titel mathematisch exakt auf der Y=20px Mittellinie des SVG-Pills zentriert.
  - SVG-Baseline-Descent Shift behoben: `[data-sileo-canvas]` mit `line-height: 0` und `<svg data-sileo-svg>` mit `display: block; vertical-align: top` verhindern Browser-Baseline-Verschiebungen in Chromium- und WebKit-Engines.
  - Integrierter "Antworten"-Button (`.sileo-reply-pill`): Der Antworten-Button wird als abgerundetes violettes Pill-Badge direkt im Header neben dem Namen gerendert und berechnet dynamisch die Toast-Pill-Breite mit.
  - Tiefschwarzer Hintergrund (`#000000`) für alle Shapes beibehalten mit edlem Drop-Shadow.
  - Universeller Klick-Handler: Klicks auf den Antworten-Button oder den gesamten Toast öffnen sofort den privaten Chat mit dem Absender.
- **Unterdrückung doppelter System-Benachrichtigungen auf iOS (`server.js`, `sw.js`, `js/wop-socket-client.js`):**
  - Serverseitiger Aktivitäts-Check in `isUserActiveInApp` verifiziert via Socket-Instanz (`io.sockets.sockets.get(sId)?.connected`), ob der Empfänger die App im Vordergrund geöffnet hat.
  - Ist der Empfänger in der App aktiv, wird der Web-Push via Apple APNs vollständig unterdrückt, sodass ausschließlich der flüssige Sileo-In-App-Toast angezeigt wird und kein störendes OS-System-Banner über der App erscheint.
  - Automatischer Heartbeat im WebSocket-Client (`user:heartbeat` alle 25 Sekunden) stellt sicher, dass der Aktivitätsstatus des Nutzers auf dem Server unterbrechungsfrei aktuell bleibt.

### Misc
- Versionsnummer auf **2.0.24** angehoben und alle Cache-Busting-Parameter aktualisiert.

---

## [2.0.23] - 2026-11-05

### Bug Fixes
- **Lobby-Beitritt & Host-Sync stabilisiert (`js/app.js`, `server.js`):**
  - Kritischen Bug in `showLobbyUI` behoben: Beitretende Clients sendeten beim Öffnen der Lobby fälschlicherweise `lobby:create`, wodurch bestehende Lobbies auf dem Server überschrieben und Spieler sofort wieder herausgeworfen wurden. `lobby:create` wird nun strikt nur noch vom Host ausgeführt.
  - Case-Insensitive Lobby-Code-Prüfung (`normalizeLobbyCode`) in `startHostFirestoreLobby` und `startClientFirestoreLobby` implementiert, um Abweichungen durch Groß-/Kleinschreibung zu eliminieren.
  - Spieler-Preservation: `startHostFirestoreLobby` behält bereits beigetretene Spieler auch im Pre-Game-Zustand (`!gameStarted`) bei und droppt sie nicht mehr bei asynchronen Firestore-Snapshots.
- **Automatisches Schließen von Lobbies beim Verlassen des Hosts (`server.js`, `js/app.js`, `js/wop-socket-client.js`):**
  - Wenn der Host eine Lobby verlässt (`lobby:leave` mit `isHost: true` oder Host-E-Mail), wird die gesamte Lobby geschlossen, mit `lobby:closed` an alle Teilnehmer signalisiert und aus dem Arbeitsspeicher sowie SQLite bereinigt.
  - Verbleibende Clients erhalten einen Hinweis und werden sauber zur Spielauswahl zurückgeführt.
- **Flackern der Freundesliste behoben (`js/app.js`):**
  - `renderFriendsList` überschreibt `container.innerHTML` bei Re-Renders nicht mehr vorab mit `"Lade Freunde..."`, sondern tauscht die DOM-Knoten erst aus, wenn die Daten vorliegen.
  - Nutzung des optimierten Backend-Endpoints `/api/social/friends?email=...` (Single-Query mit Socket-Presence) statt N sequentieller `getUserProfile`-Aufrufe.
  - Debouncing für Live-Presence-Events (`wop:presence`) hinzugefügt.
- **Echtzeit-Synchronisation der Lobby-Anzeige im Admin-Panel (`server.js`, `js/app.js`):**
  - Neuer Server-Helper `findLiveLobbyForUser` gleicht die aktive Lobby direkt mit der In-Memory-Map `activeLobbies` ab, sodass der im Admin-Panel angezeigte Lobby-Code immer absolut synchron mit dem tatsächlichen Spielzustand ist.
  - Bei `wop:presence` wird die Admin-Benutzerliste bei geöffnetem Modal automatisch debounced und flackerfrei aktualisiert.

### Misc
- Versionsnummer und Cache-Busting-Query-Parameter auf **2.0.23** angehoben.

---

## [2.0.22] - 2026-11-05

### Bug Fixes
- **Kontolöschung für Administratoren und Master wiederhergestellt (`server.js`, `js/app.js`, `js/wop-socket-client.js`, `database.js`):**
  - Autorisierungslogik in `DELETE /api/admin/user` grundlegend korrigiert: Vorher blockierte ein zu strikter Check (`!isMasterEmail(requester)`) ausnahmslos alle Administratoren sowie Master-Accounts, deren E-Mail nicht in der statischen `MASTER_EMAILS`-Liste stand.
  - Rollenhierarchie implementiert: Master-Accounts dürfen alle Konten (außer unveränderliche feste Master-Accounts) löschen; Administratoren dürfen reguläre Nutzer und Moderatoren löschen (jedoch keine anderen Admins oder Master).
  - Eigenkontolöschung (`deleteOwnAccount`) freigegeben: Authentifizierte Nutzer dürfen ihr eigenes Konto über die API eigenständig löschen.
  - Vollständige Kaskadierung in `database.js`: Beim Löschen eines Nutzers werden nun auch `push_subscriptions` und gehostete Lobbies (`lobbies`) rückstandslos bereinigt.
  - Sofortiger Sitzungsabbruch: Aktive WebSocket-Verbindungen des gelöschten Benutzers werden mit dem Event `auth:deleted` sofort serverseitig getrennt und sein Präsenzstatus aktualisiert.
  - Client-Fehlerbehandlung: `DocumentReference.prototype.delete` und `deleteUser` prüfen nun HTTP-Statuscodes und melden Fehler transparent im Frontend zurück.

### Misc
- Versionsnummer und Cache-Busting-Query-Parameter auf **2.0.22** angehoben.

---

## [2.0.21] - 2026-11-05

### Bug Fixes
- **Robuster E-Mail-Versand mit Direct-TLS SMTPS Fallback (`server.js`):**
  - Implementierung eines nativen Node.js `tls`-SMTP-Clients auf Port 465, der vollkommen ohne externe npm-Pakete auskommt.
  - Automatischer Fallback auf Direct-TLS, falls `nodemailer` auf dem Server nicht in `node_modules` installiert ist.
  - Auto-Korrektur für Bash-Variablen-Ersetzung: Verhindert Authentifizierungsfehler, falls beim Erstellen der `.env` das Zeichen `$6` als leere Shell-Variable interpretiert wurde (`F44l6ee` → `F44l$66ee`).
  - `.env`-Pfade werden nun absolut zur Server-Datei aufgelöst, um PM2-Startprobleme bei abweichendem Arbeitsverzeichnis zu verhindern.
  - Anleitung für Lina um `npm install` ergänzt.

### Misc
- Versionsnummer und Cache-Busting-Query-Parameter auf **2.0.21** angehoben.

---

## [2.0.20] - 2026-11-05

### Bug Fixes
- **Automatischer Online-Status beim App-Start (`server.js`, `js/app.js`, `js/wop-socket-client.js`):**
  - Beim Trennen einer Verbindung (z. B. Standby/Schließen) wird `presenceStatus` in SQLite nicht mehr mit `offline` überschrieben. Dadurch bleibt die Nutzer-Präferenz erhalten.
  - Beim Öffnen der App bzw. beim WebSocket-Connect (`auth:identify`) setzt sich der Status automatisch auf `online` (außer bei explizit gewähltem `dnd`).
  - `loadUserDataFromCloud()` und `wop:presence` überschreiben den lokalen Status nicht mehr fälschlicherweise auf `offline`, wenn die App aktiv im Vordergrund läuft.
- **Verhinderung doppelter Chat-Nachrichten in der Lobby (`js/wop-socket-client.js`, `js/app.js`):**
  - Doppelte Event-Verarbeitung behoben: `socket.on("lobby:data")` leitet nun exklusiv an `window.handleIncomingData` weiter und triggert nicht mehr parallel den Snapshot-Listener `listeners.lobbyHost`.
  - Nachrichten-Deduplizierung per eindeutiger ID (`chatSeenIds`) und case-insensitivem Namensabgleich (`namesEqual`) verhindert jegliches doppeltes Rendern.
- **Schutz vor unbeabsichtigtem Rausfliegen von Spielern (`server.js`, `js/app.js`, `js/wop-socket-client.js`):**
  - `startHostFirestoreLobby` behält während einer laufenden Runde (`gameStarted === true`) alle bestehenden Mitspieler im Zustand und droppt diese nicht mehr bei temporären Snapshot-Lücken.
  - Veralteter PeerJS-Check (`!hostConnection || !hostConnection.open`) bei Sichtbarkeitswechseln entfernt, welcher zuvor bei jedem App-/Tab-Wechsel fälschlicherweise `scheduleLobbyReconnect` auslöste.
  - Beim Wiederverbinden des WebSockets (`socket.on("connect")`) tritt der Client der aktiven Lobby automatisch wieder bei (`lobby:join`).
  - Kicking/Elimination-Schutz: Ausgeschiedene oder gekickte Spieler können nicht mehr in der Lobby chatten (`sendChatMessage` und Server `lobby:data` prüfen Berechtigung), und `kickEliminatedPlayerToSetup` trennt die Socket-Lobby-Verbindung sauber via `lobby:leave`.

### Misc
- Versionsnummer und Cache-Busting-Query-Parameter auf **2.0.20** angehoben.

---

## [2.0.19] - 2026-11-05

### Bug Fixes
- **Lobby-Einladungen (`server.js`, `js/app.js`, `js/wop-socket-client.js`):**
  - Fehlende Absender-E-Mail (`fromEmail`) in `sendGameInvite` behoben, wodurch der Server-Endpoint `/api/social/invite` zuvor mit HTTP 400 abbrach.
  - Client-Adapter wirft nun bei Fehlern kontrollierte Exceptions, statt ungültige Einladungs-IDs zu fingieren.
  - Server prüft nun gezielt auf den Status `dnd` (Bitte nicht stören) und blockiert Einladungen nicht mehr fälschlicherweise bei kurzzeitigen Socket-Neuverbindungen.
  - Eingehende Einladungen lösen nun sowohl das Einladungs-Modal als auch einen interaktiven Sileo-Toast mit direktem „Beitreten“-Button aus.
  - Wenn der Empfänger nicht im Vordergrund aktiv ist, wird zusätzlich ein Web-Push mit Tag `invite-{id}` ausgelöst.
- **Lobby-Beitritt per Code & Host-Ermittlung (`js/app.js`, `js/wop-socket-client.js`):**
  - Direkte Abfrage des Endpoints `/api/lobby/:code` in `joinGame` integriert, wodurch die Host-E-Mail zuverlässig aus dem Server-/SQLite-Zustand bezogen wird.
  - `CollectionReference.prototype.get` im Socket-Client unterstützt nun Filterabfragen nach `currentLobby` und liefert korrekte Dokumentenschnappschüsse für Host und Mitspieler.
  - `DocumentReference.prototype.get` für `lobbies` führt Spielzustand (`state`) und Metadaten (`hostEmail`, `players`) zusammen.
  - `socket.on("lobby:players_updated")` aktualisiert nun sofort die Spielerliste im laufenden Spiel über `handleIncomingData({ type: "UPDATE_PLAYERS" })`.
- **E-Mail-Verifikation & SMTP-Zustellung (`server.js`, `package.json`):**
  - Abhängigkeit `nodemailer` in `package.json` ergänzt und registriert.
  - Automatische SSL-Aktivierung (`secure: true`) für Port 465 implementiert.
  - Unterstützung für Netcup SMTP (`mxe8db.netcup.net:465`) mit TLS-Konfiguration und formatierter Absenderadresse.
- **Benachrichtigungen & Sileo Toast UX (`src/sileo-entry.js`, `server.js`, `js/wop-socket-client.js`):**
  - Doppelte Benachrichtigungen auf iOS behoben: Web-Push wird vom Server unterdrückt, solange eine aktive WebSocket-Verbindung für den Nutzer besteht.
  - Sileo Toast Titel-Berechnung korrigiert: String-basierte Titel verhindern das fehlerhafte Abschneiden und die Verschiebung der schwarzen Toast-Pill auf hochauflösenden Android-Displays.
  - Automatisches Öffnen des Chats beim Antippen des Sileo Toasts oder des Antwort-Buttons.

### Misc
- Versionsnummer und Cache-Busting-Query-Parameter auf **2.0.19** angehoben.

---

## [2.0.18] - 2026-11-05

### Fixes
- **Erfolge:** Wieder die klassischen, erreichbaren Namen (Erste Schritte, 10/25/50 Pflichten, Wahrheiten, Streaks, Aufgaben, Partystufe, Coins, Party-Animal). Ribbon-UI und Stufen bleiben. Ziele sind spielbar (nicht unerreichbar).

### Misc
- Versionsnummer und Cache-Busting-Query-Parameter auf **2.0.18** angehoben.

---

## [2.0.17] - 2026-11-05

### Fixes / UX
- **E-Mail-Code nur per Mail:** Bestätigungscode wird **nicht** in der App angezeigt. Nur „Code an deine E-Mail gesendet“. Erneut senden ebenfalls nur per Mail (SMTP erforderlich).
- **Online-Status im Profil:** Pill zeigt den aktuellen Status (Online / Abwesend / Bitte nicht stören / Offline), Auswahl bleibt aktiv und wird lokal gespeichert.
- **Erfolge (Ribbon-UI):** Trophäen-Grid standardmäßig eingeklappt, öffnen per Button, Klick zeigt Fortschritt bis zur Freischaltung (Bronze / Silber / Gold / Platin).

### Misc
- Versionsnummer und Cache-Busting-Query-Parameter auf **2.0.17** angehoben.

---

## [2.0.16] - 2026-11-05

### New Features
- **Erfolge / Badges mit Stufen (Bronze → Silber → Gold → Platin) (`js/app.js`, `css/style.css`):**
  - Badges haben eine Stufe und farbige Hervorhebung.
  - Klick auf einen Erfolg öffnet ein Detail-Overlay mit Fortschrittsbalken und Hinweis zur nächsten Stufe.
- **Kompakter Online-Status-Pill (`index.html`, `css/style.css`, `js/app.js`):**
  - Status-Auswahl als kleines Pill-Dropdown (Dot + Label + Chevron) statt großem 2×2-Grid.
  - Ausgewählter Status bleibt sichtbar und aktiv, bis man ihn ändert.
- **Echte E-Mail-Pflicht + Bestätigungscode (`server.js`, `database.js`, `js/app.js`):**
  - Registrierung nur mit gültiger E-Mail (Format-Check).
  - Wegwerf-/Spaß-Domains werden blockiert.
  - Domain muss existieren (MX-/DNS-Prüfung) – fiktive Adressen werden abgelehnt.
  - Neuer Account erhält 6-stelligen Bestätigungscode (30 Min. gültig); Login erst nach Bestätigung.
  - Endpoints: `POST /api/auth/verify-email`, `POST /api/auth/resend-code`.
  - Bestehende Accounts bleiben verifiziert (Migration `emailVerified DEFAULT 1`).
  - Optional SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`).

### UX
- Badge-Tiles klickbar und mit Tier-Label; Profile zeigt „Erfolge“-Gesamtzahl.
- Presence-Pill schließt sich nach Auswahl und bei Klick außerhalb.
- Verifizierungs-Overlay nach Registrierung bzw. Login ohne bestätigte E-Mail.

### Misc
- Versionsnummer und Cache-Busting-Query-Parameter auf **2.0.16** angehoben.

---

## [2.0.15] - 2026-11-05

### UX
- **Online-Status UI vollständig DE/EN (`js/app.js`):**
  - Titel, Beschreibung, Button-Labels (Online / Abwesend / Bitte nicht stören / Offline) und Hinweistexte folgen der Sprachwahl.
  - Beim Umschalten Deutsch ↔ English werden alle Presence-Texte aktualisiert (kein gemischter DE/EN-Text mehr).

### Misc
- Versionsnummer und Cache-Busting-Query-Parameter auf **2.0.15** angehoben.

---

## [2.0.14] - 2026-11-05

### New Features
- **Erweiterter Online-Status (Presence) im Profil (`index.html`, `js/app.js`, `server.js`, `database.js`):**
  - Neuer Status: **Online**, **Abwesend**, **Bitte nicht stören**, **Offline** (im Profil wählbar).
  - Status wird live per WebSocket (`social:presence` / `user:setPresence`) und `PUT /api/user/presence` verteilt.
  - Neues DB-Feld `presenceStatus` (Migration per `ALTER TABLE`).
- **Sofortiges Offline beim Disconnect (`server.js`):**
  - Beim letzten Socket-Disconnect wird der Nutzer **sofort** als offline markiert und an alle Clients gesendet (keine 5‑Sekunden-Grace-Period mehr) – analog zum Chat-Verhalten.
- **Einladungs-Regeln nach Status (`server.js`, `js/app.js`):**
  - Spieleinladungen nur an Status **Online** oder **Abwesend**.
  - Bei **Bitte nicht stören** und **Offline** werden Einladungen serverseitig und clientseitig blockiert.

### UX
- **Discord-Support-Karte Layout (`index.html`, `css/style.css`):**
  - Text „Fragen zum Spiel? Schreib mir auf Discord.“ steht oberhalb des Status-Badges (nicht mehr gequetscht daneben).
  - Status-Badge und Button klar gestapelt (`.discord-contact-card--stacked`).

### Misc
- Versionsnummer und Cache-Busting-Query-Parameter auf **2.0.14** angehoben.

---

## [2.0.13] - 2026-11-05

### Bug Fixes
- **Chat-Nachrichten bleiben nach Reload erhalten (`js/app.js`, `js/wop-socket-client.js`, `database.js`):**
  - `sendDirectMessage` speichert Nachrichten verbindlich über `POST /api/dm/send` in SQLite und prüft `res.ok` (kein stiller Erfolg mehr nur im lokalen Cache).
  - Nach dem Neuladen der App/Website lädt `loadDmThread` die Historie zuverlässig über `/api/dm/history` (bis 100 Nachrichten).
  - `getDirectMessages` holt die neuesten Nachrichten korrekt (`ORDER BY datetime(createdAt) DESC` + anschließende aufsteigende Sortierung).
  - WebSocket-Handler `dm:incoming` aktualisiert offenen Thread, Badge und Inbox; doppelte Anzeige wird über `dmSeenIds` verhindert.
  - `CollectionReference.add` für `directMessages` wirft bei API-Fehler statt eine Fake-ID zurückzugeben.

### Misc
- Versionsnummer und Cache-Busting-Query-Parameter auf **2.0.13** angehoben.

---

## [2.0.12] - 2026-11-05

### New Features
- **Vollständiger englischer Changelog (`docs/CHANGELOG.en.md`, `changelog.html`):**
  - Bei Sprachwahl **English** wird der komplette Changelog aus `docs/CHANGELOG.en.md` geladen – alle Versionen vollständig übersetzt, nicht nur eine Zusammenfassung.
  - Bei **Deutsch** weiterhin `docs/CHANGELOG.md`.
  - Umschalter und UI wie bei Regelwerk / Impressum (Titel, Footer, Ladehinweis, Versions-Badge).

### UX
- **Footer-Link „Changelog“ statt Versionszahl (`index.html`):**
  - Im Legal-Footer und im Login-Modal lautet der Link-Text **Changelog** (keine Versionsnummer mehr im Link).
  - Die aktuelle Version bleibt nur im Badge oben auf der Changelog-Seite sichtbar (z. B. „Aktuell: v2.0.12“).
  - DE/EN-Labels für den Link gemeinsam mit Regelwerk, Impressum und Datenschutz.

### Misc
- Versionsnummer und Cache-Busting-Query-Parameter auf **2.0.12** angehoben.

---

## [2.0.11] - 2026-11-05

### New Features
- **Sprachumschalter Deutsch / English auf der Changelog-Seite (`changelog.html`):**
  - Gleicher Umschalter-Stil wie bei Regelwerk und Impressum (🇩🇪 Deutsch / 🇬🇧 English).
  - UI-Texte (Titel, Untertitel, Zurück-Link, Footer-Links, Ladehinweis, Versions-Badge) werden vollständig übersetzt.
  - Englisch lädt den **kompletten** englischen Changelog aus `docs/CHANGELOG.en.md` (alle Versionen vollständig übersetzt, nicht nur eine Zusammenfassung).
  - Sprachwahl wird in `localStorage` (`wop_changelog_lang`) gespeichert und orientiert sich sonst an der App-Sprache bzw. Browser-Sprache.

### UX
- **Footer-Link zeigt „Changelog“ statt der Versionsnummer (`index.html`):**
  - Im Legal-Footer und im Login-Modal lautet der Link-Text **Changelog** (keine Versionszahl mehr im Link).
  - Die aktuelle Version bleibt nur im Versions-Badge oben auf der Changelog-Seite sichtbar (z. B. „Aktuell: v2.0.11“).
  - DE/EN-Umschaltung der Footer-/Login-Labels gemeinsam mit Regelwerk, Impressum und Datenschutz.

### Misc
- Versionsnummer und Cache-Busting-Query-Parameter auf **2.0.11** angehoben.

---

## [2.0.10] - 2026-11-05

### New Features
- **Versions-Link im Spiel-Footer (`index.html`, `changelog.html`):**
  - Im unteren Legal-Footer (neben Regelwerk · Impressum · Datenschutz) erscheint nun die klickbare Versionsnummer **2.0.10**.
  - Klick auf **2.0.10** öffnet `changelog.html`, die den Inhalt von `docs/CHANGELOG.md` im gleichen Glassmorphism-/Dark-Theme-Stil wie Regelwerk, Impressum und Datenschutz darstellt.
  - Auch im Login-/Registrierungs-Modal wurde die Versionsnummer **2.0.10** als Link ergänzt, damit der Changelog vor dem Einloggen erreichbar ist.
  - Cache-Busting-Query-Parameter auf 2.0.10 angehoben.

### UX
- **Redundanten Changelog-Link auf der Changelog-Seite entfernt (`changelog.html`):**
  - Im Footer von `changelog.html` erscheint nicht mehr der Link „Changelog“, da man sich bereits auf dieser Seite befindet.
  - Footer dort: **Spiel · Regelwerk · Impressum · Datenschutz**.

---

## [2.0.9] - 2026-11-05 (Branch: `feat/ws-server`)

### New Features
- **Master kann Master-Rollen vergeben (`js/app.js`, `server.js`):**
  - Im Admin-Panel erscheint für Accounts mit Rolle `master` im Rollen-Dropdown zusätzlich die Option **Master** (neben User, Mod und Admin).
  - `changeUserRole` erlaubt das Setzen von `role: "master"` ausschließlich, wenn der ausführende Nutzer selbst `master` ist; Admin und Moderator behalten ihre bisherigen Rechte unverändert (nur User / Mod / Admin).
  - Feste Master-Accounts aus `MASTER_EMAILS` (z. B. `master@vibe.party`, `christian.heinrich@omoflow.de`) bleiben unveränderlich und können weder herabgestuft noch gelöscht werden.
  - Vom Master vergebene Master-Rollen an andere E-Mails können vom Master später wieder geändert oder entzogen werden.

### Bug Fixes
- **Server-seitige Absicherung der Rollenvergabe (`server.js`):**
  - `PUT /api/admin/user/role` prüft nun strikt: feste Master-E-Mails sind gesperrt; nur ein Master-Requester darf `master` setzen; Admins sind auf `user` / `moderator` / `admin` beschränkt.
  - Verhindert, dass über den API-Fallback eine Master-Rolle von Nicht-Masters vergeben werden konnte.

---

## [2.0.8] - 2026-11-05 (Branch: `feat/ws-server`)

### New Features
- **Direkter Antworten-Button in der Toast-Pill (`src/sileo-entry.js`, `js/sileo-bundle.js`):**
  - Ein kompakter, violetter „Antworten“-Button (`.sileo-reply-btn`) wird nun direkt im Titel-Kopf der Pill gerendert, sodass der Empfänger sofort und ohne manuelles Aufklappen des Toasts mit einem Klick in den Chat wechseln kann.

### Bug Fixes
- **Vertikale Text- & Icon-Verschiebung auf Android / Mobile behoben (`src/sileo-entry.js`, `js/sileo-bundle.js`):**
  - Globales `box-sizing: border-box !important` und Margin-Reset auf allen Elementen innerhalb von `[data-sileo-viewport]` erzwungen.
  - Das native `padding: 0.5rem` auf `[data-sileo-header]` bei `content-box` hatte zuvor den Inhalt nach unten gegen den Pill-Rand verschoben; durch feste Zentrierung (`display: flex; align-items: center; height: var(--sileo-height); padding: 0 14px`) sitzt der gesamte Inhalt nun exakt vertikal zentriert.
  - SVG-Hintergrundform (`rect` und `path`) mit `fill: #000000 !important` tiefschwarz fixiert.
- **Vollständige Unterdrückung von iOS-System-Benachrichtigungen bei aktiver App (`server.js`, `js/wop-socket-client.js`, `js/app.js`):**
  - WebKit auf iOS führt Push-Events im Service Worker in isolierten Prozessen aus, bei denen `clients.matchAll()` stets ein leeres Array liefert und ein Apple-Zustellbanner erzwungen wird.
  - Die Unterdrückung wurde server-seitig gelöst: `js/wop-socket-client.js` meldet die App-Sichtbarkeit (`visibilitychange`) an den Server.
  - In `server.js` prüft `/api/dm/send` über `isUserActiveInApp(toEmail)`, ob der Empfänger gerade mit sichtbarer App im Vordergrund online ist. Ist dies der Fall, wird kein Web Push an APNs versendet, wodurch das System-Banner auf iOS vollständig entfällt und nur der Sileo In-App-Toast erscheint.
  - In `js/app.js` redundanten `showAppNotification`-Aufruf innerhalb von `showDmToast` entfernt.
  - Service Worker Cache auf `wop-party-v6` angehoben.

---

## [2.0.7] - 2026-11-05 (Branch: `feat/ws-server`)

### New Features
- **Sileo Toast Tiefschwarz & Antworten-Button (`src/sileo-entry.js`, `js/sileo-bundle.js`, `js/app.js`):**
  - Toast-Hintergrund auf reines Tiefschwarz (`#000000`, SVG fill `#000000`) mit abgedunkeltem Schlagschatten umgestellt.
  - Interaktiver „Antworten“-Button (`[data-sileo-button]`) mit Gradient-Styling und Hover-Effekt integriert, der direkt den jeweiligen Privatchat mit dem Absender öffnet.
  - Klick-Handler auf der gesamten Toast-Komponente (`[data-sileo-toast]`) registriert, der den Chat auch bei Antippen des Inhalts öffnet.

### Bug Fixes
- **Unterdrückung doppelter System-Benachrichtigungen bei geöffneter App (`js/app.js`, `sw.js`):**
  - In `showDmToast` (`js/app.js`) wird `showAppNotification` nur noch ausgeführt, wenn `document.visibilityState !== "visible"` ist.
  - Im Service Worker (`sw.js`) prüft der `push`-Event-Handler via `clients.matchAll({ type: "window" })`, ob mindestens ein Client `visibilityState === "visible"` aufweist. Ist die PWA im Vordergrund aktiv, wird `self.registration.showNotification` unterdrückt, sodass ausschließlich der flüssige Sileo-In-App-Toast erscheint.
  - Service Worker Cache auf `wop-party-v5` angehoben.

---

## [2.0.6] - 2026-11-05 (Branch: `feat/ws-server`)

### New Features
- **Sileo Toast (React-basierte In-App Benachrichtigungen) (`src/sileo-entry.js`, `js/sileo-bundle.js`, `js/app.js`):**
  - Vollständige Integration der fluiden React-Toast-Komponente `sileo` mit federbasierten Spring-Physics-Animationen und dunklem Glassmorphism-Design.
  - Vorkompiliertes, autarkes Bundle (`js/sileo-bundle.js` & `js/sileo-bundle.css`) ohne CDN-Latenzen für 100% Offline-Fähigkeit in der PWA.
  - Eingehende Direktnachrichten blenden bei aktiver App sofort eine interaktive Sileo-Action-Pill am oberen Bildschirmrand ein (`💬 Name: Text...`) mit direktem „Öffnen“-Button, der nahtlos in den Chat wechselt.
  - Service Worker Precache um das Sileo-Bundle erweitert.
- **Automatisiertes SQLite-Backup-Skript (`scripts/backup-db.sh`):**
  - Konsistentes Online-Backup für SQLite im WAL-Modus (`.backup` bzw. `VACUUM INTO`) mit automatischer Gzip-Komprimierung und Rotation alter Backups (> 14 Tage).

---

## [2.0.5] - 2026-11-05 (Branch: `feat/ws-server`)

### New Features
- **Echte Web-Push-Benachrichtigungen (`server.js`, `database.js`, `sw.js` & `app.js`):**
  - Vollständige Integration des standardkonformen W3C Web-Push-Protokolls mit automatischer VAPID-Schlüsselverwaltung in SQLite (`server_settings`).
  - Neue Tabelle `push_subscriptions` zur Speicherung von Browser-Endpunkten und Verschlüsselungsschlüsseln (`p256dh`, `auth`).
  - Eingehende Direktnachrichten werden über `sendWebPushNotification` nun auch dann zuverlässig auf dem Smartphone zugestellt, wenn die App komplett geschlossen ist oder das Gerät im Standby ist.
  - Klick auf die System-Push-Benachrichtigung öffnet die PWA und navigiert direkt in den betreffenden Chat.

### Bug Fixes
- **Echtzeit-Aktualisierung von Chat-Badge & Posteingang behoben (`js/wop-socket-client.js`, `js/app.js` & `server.js`):**
  - `CollectionReference` um die fehlende Methode `orderBy` ergänzt, deren Fehlen zuvor einen `TypeError` geworfen und die Registrierung des Echtzeit-Listeners verhindert hatte.
  - Direkten WebSocket-Event-Hook auf `dm:incoming` hinzugefügt, sodass das Ungelesen-Badge (`#hud-dm-badge`) und die Liste der Konversationen sofort live aktualisiert werden, ohne dass zuvor auf das Icon geklickt werden muss.
  - `socket.join('user:<email>')` auf dem Server hinzugefügt für zuverlässige Adressierung der Benutzer-Räume.

---

## [2.0.4] - 2026-11-04 (Branch: `feat/ws-server`)

### Bug Fixes
- **Chat-Badge & Ungelesen-Zähler korrigiert (`js/app.js`, `js/wop-socket-client.js`):**
  - Das Badge am Chat-Icon in der unteren Menüleiste (`#hud-dm-badge`) spiegelt nicht mehr fälschlicherweise die Gesamtzahl der offenen Chat-Konversationen wider, sondern zählt exakt die Anzahl der tatsächlich ungelesenen Nachrichten über den dedizierten `/api/dm/unread-count` Endpunkt.
  - Sobald alle Nachrichten gelesen sind (0 ungelesen), wird das Badge am Menü-Icon vollständig ausgeblendet (`display: none`).
  - In der Chat-Übersicht (`dm-inbox-list`) zeigt jede Konversation ein separates rotes Badge mit der Anzahl der ungelesenen Nachrichten dieses spezifischen Kontakts.
  - Beim Öffnen eines Chats werden Nachrichten über `POST /api/dm/mark-read` in der SQLite-Datenbank als gelesen markiert (`read = 1`), woraufhin der Zähler der Konversation und das Menü-Badge unmittelbar verschwinden.

---

## [2.0.3] - 2026-11-04 (Branch: `feat/ws-server`)

### New Features
- **Optimierter Spiel- und Bestätigungsablauf (`js/app.js`):**
  - Wer eine Wahrheits-Antwort abgeschickt hat oder eine Pflicht als erfüllt markiert hat, muss sein eigenes Ergebnis auf dem Feedback-Bildschirm nicht mehr redundant bestätigen („Ich bestätige“ / „Weiter“).
  - Der aktive Spieler wird für die Rundenbestätigung automatisch als bereits bestätigt gewertet (`nextTurnVotedPlayers = [targetPlayer]`).
  - Der Bestätigungs-Button zeigt dem aktiven Spieler direkt `✅ Erledigt (Warte auf Mitspieler…)` an und wartet ausschließlich auf die Bestätigungen der übrigen Mitspieler, die das Ergebnis einsehen.

---

## [2.0.2] - 2026-11-04 (Branch: `feat/ws-server`)

### New Features
- **Direktnachrichten-Posteingang & Chat-Übersicht (`server.js`, `database.js` & `app.js`):**
  - Implementierung von `getDmConversations(email)` und des neuen Endpunkts `/api/dm/conversations`.
  - Der Chat-Tab zeigt ab sofort alle bisherigen und neuen Konversationen sortiert nach Datum mit Profil-Avatar, Live-Online-Status, Text-Vorschau und Ungelesen-Zähler an.
  - Chats können direkt per Klick auf die Konversation oder den „Öffnen“-Button gestartet und fortgesetzt werden.

### Bug Fixes
- **Dialog-Popup im Seitenfluss behoben (`index.html`, `css/style.css` & `js/wop-socket-client.js`):**
  - Das benutzerdefinierte Dialog-Modal (`#wop-custom-dialog-overlay`) ist standardmäßig strikt auf `display: none;` gesetzt, wodurch es nicht mehr fehlerhaft am unteren Seitenende hinter der Navigationsleiste gerendert wird.
- **Datenschutz & Impressum bereinigt (`impressum.html`):**
  - Persönlicher Discord-Profil-Link von Lina aus den Kontaktangaben im deutschen und englischen Impressum entfernt.
- **Admin-Leitfaden erweitert (`docs/ADMIN_LINA_GUIDE.md`):**
  - Anleitung für die Erstellung des Linux-Benutzers `lina` mit erzwungener Passwortänderung beim Erst-Login (`sudo passwd -e lina`).
  - Sudoers-Konfiguration mit `NOPASSWD:` für `pm2 restart wop-server`, damit Lina den Dienst passwortfrei ohne Christians Kennwort steuern kann.
  - Schritt-für-Schritt-Anleitung für SSH-Zugriff auf Android-Smartphones via Termius / JuiceSSH inkl. 1-Klick-Snippet-Automatisierung.

---

## [2.0.1] - 2026-11-04 (Branch: `feat/ws-server`)

### Bug Fixes
- **Freundschaftslisten-Synchronisation behoben (`database.js` & `wop-socket-client.js`):**
  - `getUserByEmail(email)` lädt ab sofort alle bestehenden Freundschaftsbeziehungen aus der SQLite-Tabelle `friends` und hängt sie als `friends: [...]`-Array an das User-Objekt an. Dadurch initialisiert das Frontend (`app.js`) `myFriends` korrekt.
  - `DocumentReference.set` in `wop-socket-client.js` leitet `arrayUnion` und `arrayRemove`-Operationen auf Freundschaften nun unmittelbar an die REST- und WebSocket-Endpunkte weiter.
- **Bidirektionale Freundschaftsspeicherung (`scripts/migrate-from-firebase.js` & `database.js`):**
  - Migration und Freundschaftsoperationen (`addFriendPair`) speichern Freundschaften jetzt strikt bidirektional ab (`(email, friendEmail)` sowie `(friendEmail, email)`), sodass beide Beteiligten sich gegenseitig in ihren Listen sehen.
- **Präsenz- und Zeitstempel-Erkennung korrigiert ("Noch nie online" behoben, `js/app.js`):**
  - `getLastActiveMillis` unterstützte vormals nur Firestore-Timestamp-Objekte und ignorierte SQLite-ISO/DateTime-Strings (Rückgabe von `0`). Nun werden sowohl ISO-8601-Strings als auch SQLite-Datetime-Formate sauber geparst.
  - `formatLastOnline` stuft Nutzer mit aktivem Live-Flag `isOnline` oder frischer Aktivität nun zuverlässig als "Jetzt online" ein, anstatt "Noch nie online" anzuzeigen.
- **Live-Socket-Online-Status im Admin-Panel & Spielerübersicht (`server.js`):**
  - Die Endpunkte `/api/admin/users`, `/api/user/profile` und `/api/users/online` reichern Nutzerdaten jetzt in Echtzeit mit der aktiven Socket-Map (`userSockets`) an.
  - `window.wopIdentify` triggert die Socket-Identifikation sofort beim Login, bei Registrierung sowie bei Reconnects, ohne auf einen Page-Reload angewiesen zu sein.

---

## [2.0.0] - 2026-11-04 (Branch: `feat/ws-server`)

### New Features
- **Node.js & Express Backend:** Dedizierter Backend-Dienst auf Port `3002` ersetzt die bisherige serverlose Firebase-Architektur vollständig.
- **Echtzeit-WebSockets mit Socket.io:**
  - Implementierung eines In-Memory- und Raum-basierten Event-Busses (`lobby:*`, `dm:*`, `social:*`).
  - Latenzzeiten für Lobbys, Züge, Rad-Drehungen und Chat von ~1.000–3.000 ms auf unter 15 ms gesenkt.
  - Automatisches Verbindungs- und Disconnect-Handling mit nativer Online-Präsenzerkennung ohne Heartbeat-Polling.
- **SQLite Persistenzschicht (`wop.sqlite`):**
  - Etablierung einer SQLite-Datenbank im Write-Ahead-Logging-Modus (`WAL`) für maximale Schreib-/Lese-Performance und Crash-Resistenz.
  - Tabellen für `users`, `friends`, `friend_requests`, `direct_messages`, `invites`, `feedback` und `lobbies`.
  - Vollständige Absicherung gegen SQL-Injection durch parametrisierte Prepared Statements.
- **Produktions-Deployment-Konfiguration:**
  - `nginx-wop.conf`: Vollständige Nginx Reverse-Proxy-Konfiguration für `www.wop.omoflow.de` mit WebSocket-Upgrade (`$http_upgrade`) und Let's Encrypt SSL-Support.
  - `ecosystem.config.cjs`: PM2-Konfiguration im `fork`-Modus mit Memory-Limits (`450M`) und Production-Environment-Flags.
- **Custom Design Dialog Popup:**
  - Vollständiger Ersatz aller nativen Browser-Popups (`alert` & `confirm`) durch ein animiertes, hochmodernes Glassmorphism-Design-Popup mit dynamischen Kontext-Icons.
- **Rechtliche Links auf Login-Maske:**
  - Impressum, Datenschutz und Regelwerk sind ab sofort direkt im Login-/Registrierungs-Modal vor der Authentifizierung aufrufbar.
- **Server- & Admin-Leitfaden für Lina:**
  - Detaillierte Dokumentation unter `docs/ADMIN_LINA_GUIDE.md` für Benutzerverwaltung, Berechtigungen und Server-Bedienung.

### Bug Fixes
- **Beseitigung von Firestore Quota- und Latency-Lags:** Das Schreiben von Spielaktionen in Cloud-Firestore-Dokumente (`hostMessage`, `lobbyMessage`) wurde durch native Socket.io-Raum-Broadcasts ersetzt.
- **Behebung von Geister-Online-Zuständen:** Spieler bleiben nicht länger fälschlicherweise als `isOnline: true` markiert, wenn Tabs geschlossen werden oder Verbindungen abbrechen; der Server aktualisiert den Präsenzstatus direkt über Socket-Disconnect-Hooks.
- **Verstecken der unteren Menüleiste vor dem Login:** Die Hauptmenüleiste (`#app-bottom-nav`) wird für nicht eingeloggte Nutzer ausgeblendet und erscheint erst nach erfolgreicher Authentifizierung.
- **Optimierte PWA-Ressourcennutzung:** Entfernung der schweren Firebase-Client-Bibliotheken (`firebase-app-compat.js`, `firebase-firestore-compat.js`) aus dem Frontend, wodurch Ladezeiten und Bundle-Größen signifikant reduziert werden.

