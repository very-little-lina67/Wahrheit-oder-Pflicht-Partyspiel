# Changelog: Wahrheit oder Pflicht

Alle wesentlichen Änderungen am Projekt werden in dieser Datei präzise und technisch dokumentiert.

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

