# Changelog: Wahrheit oder Pflicht

Alle wesentlichen Änderungen am Projekt werden in dieser Datei präzise und technisch dokumentiert.

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

