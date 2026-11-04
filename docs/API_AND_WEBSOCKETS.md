# API & WebSocket Dokumentation: Wahrheit oder Pflicht

## 1. Umgebungsvariablen (`.env`)

| Variable | Standardwert | Beschreibung |
|---|---|---|
| `PORT` | `3002` | Lokaler HTTP-/WebSocket-Port des Node.js-Dienstes |
| `NODE_ENV` | `production` | Laufzeitumgebung (`development` / `production`) |
| `CORS_ORIGIN` | `https://www.wop.omoflow.de` | Erlaubte CORS-Origins (kommagetrennt) |
| `DATABASE_PATH` | `./wop.sqlite` | Pfad zur SQLite-Datenbankdatei |
| `MASTER_EMAIL` | `christian.heinrich@omoflow.de` | Feste Superadmin-/Master-Account E-Mail |

---

## 2. WebSocket Events (Socket.io)

Der Socket.io-Namespace `/` wickelt die gesamte Echtzeit-Kommunikation ab.

### 2.1 Authentifizierung & Anwesenheit
- **`auth:identify`** (Client → Server)
  - Payload: `{ email: string, name: string }`
  - Verknüpft die Socket-ID mit der E-Mail des Nutzers, setzt den Nutzer auf `online` und benachrichtigt befreundete Sockets via `social:presence`.
- **`disconnect`** (Intern)
  - Erkennt Verbindungsabbruch, setzt ggf. Offline-Status nach kurzem Grace-Period und benachrichtigt verbundene Lobbies/Freunde.

### 2.2 Lobby & Spielbetrieb
- **`lobby:create`** (Client → Server)
  - Payload: `{ code: string, settings: object, hostPlayer: object }`
  - Antwort: `{ success: boolean, code: string, lobby: object }`
  - Erstellt Raum `lobby:<code.toLowerCase()>`, hostet den Spieler.
- **`lobby:join`** (Client → Server)
  - Payload: `{ code: string, player: object, isSpectator: boolean }`
  - Antwort: `{ success: boolean, lobby?: object, error?: string }`
  - Tritt dem Raum bei, sendet `lobby:player_joined` an alle im Raum.
- **`lobby:leave`** (Client → Server)
  - Payload: `{ code: string, playerName: string }`
  - Informiert den Raum (`lobby:player_left`) und verlässt den Socket-Room.
- **`lobby:data`** (Client → Server → Room)
  - Payload: `{ code: string, data: object, targetEmail?: string }`
  - Sendet Spielaktionen (z. B. `SUBMIT_CHOICE`, `SPIN_WHEEL`, `UPDATE_PLAYERS`, `CHAT_MESSAGE`, `JOKER_ACTION`) latenzfrei an alle Mitspieler oder zielgerichtet an einen bestimmten Spieler.
- **`lobby:state_sync`** (Host → Server → Room)
  - Payload: `{ code: string, state: object }`
  - Persistiert den Zustand (Lobby-Einstellungen, Spielerliste, aktueller Turn) im Arbeitsspeicher und asynchron in SQLite.
- **`lobby:kick`** (Host/Admin → Server)
  - Payload: `{ code: string, targetName: string }`
  - Kickt den Spieler aus dem Raum.

### 2.3 Freunde & Einladungen
- **`social:invite_player`** (Client → Server)
  - Payload: `{ toEmail: string, lobbyCode: string, fromName: string }`
  - Erzeugt Invite-Eintrag in DB und sendet `social:invite_received` sofort per WebSocket an den Empfänger, falls online.
- **`social:friend_request`** (Client → Server)
  - Payload: `{ toEmail: string }`
  - Sendet Freundschaftsanfrage; benachrichtigt Ziel-Socket via `social:friend_request_received`.
- **`social:friend_accept`** (Client → Server)
  - Payload: `{ reqId: number, friendEmail: string }`
  - Bestätigt Anfrage, aktualisiert Freundesliste bei beiden Spielern in Echtzeit.
- **`social:friend_decline`** (Client → Server)
  - Payload: `{ reqId: number }`

### 2.4 Direktnachrichten (1-on-1 Chat)
- **`dm:send`** (Client → Server)
  - Payload: `{ toEmail: string, text: string }`
  - Speichert die Nachricht in `direct_messages`, sendet Bestätigung an Absender und `dm:incoming` in Echtzeit an den Empfänger.
- **`dm:mark_read`** (Client → Server)
  - Payload: `{ withEmail: string }`
  - Markiert eingehende Nachrichten als gelesen.

---

## 3. REST API Endpunkte

Alle REST-Endpunkte laufen unter dem Präfix `/api`.

### 3.1 Authentifizierung & Benutzer
- **`POST /api/auth/register`**
  - Body: `{ email, username, password }`
  - Legt neuen Account an (Passwort-Hash via SHA-256 / PBKDF2).
- **`POST /api/auth/login`**
  - Body: `{ email, password }`
  - Validiert Zugangsdaten, migriert ggf. alte Klartext-Passwörter.
- **`GET /api/user/profile?email=:email`**
  - Liefert Profildaten (XP, Coins, Badges, Items, Themes, Stats).
- **`PUT /api/user/profile`**
  - Aktualisiert Nutzerdaten (Fortschritt, gekaufte Items, etc.).
- **`GET /api/users/online`**
  - Liefert Liste der aktuell via WebSocket verbundenen Nutzer.
- **`GET /api/users/search?q=:query`**
  - Sucht Spieler nach Name oder E-Mail.

### 3.2 Soziales & Chat
- **`GET /api/social/friends?email=:email`**
  - Ruft Freundesliste mit Online-Status ab.
- **`GET /api/social/requests?email=:email`**
  - Ruft offene Freundschaftsanfragen ab.
- **`GET /api/social/invites?email=:email`**
  - Ruft aktive Spieleinladungen ab.
- **`DELETE /api/social/invite/:id`**
  - Löscht eine Einladung.
- **`GET /api/dm/history?me=:myEmail&other=:otherEmail`**
  - Lädt den Chat-Verlauf zwischen zwei Spielern.
- **`GET /api/dm/unread-count?email=:email`**
  - Anzahl ungelesener Direktnachrichten.

### 3.3 Administration & Feedback
- **`POST /api/feedback`**
  - Speichert Bug-Reports & Feedback.
- **`GET /api/admin/users`** (Nur Admin / Master)
  - Ruft vollständige Nutzerliste ab.
- **`PUT /api/admin/user/role`** (Nur Admin / Master)
  - Ändert die Rolle eines Nutzers.
- **`DELETE /api/admin/user`** (Nur Master)
  - Löscht ein Benutzerkonto dauerhaft.
- **`GET /api/admin/feedback`** (Nur Admin / Master)
  - Liest alle Feedback-Einträge.
- **`DELETE /api/admin/feedback/:id`** (Nur Admin / Master)
  - Löscht Feedback-Eintrag.

### 3.4 System
- **`GET /api/health`**
  - Statusprüfung für Monitoring, Nginx und System-Healthchecks.

