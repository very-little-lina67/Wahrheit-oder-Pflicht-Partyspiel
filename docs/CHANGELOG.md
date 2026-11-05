# Changelog: Wahrheit oder Pflicht

Alle wesentlichen Änderungen am Projekt werden in dieser Datei präzise und technisch dokumentiert.

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

