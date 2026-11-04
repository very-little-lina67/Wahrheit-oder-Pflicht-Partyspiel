# Architektur: Wahrheit oder Pflicht (WOP) WebSocket- & Server-Migration

## 1. Übersicht & Zielsetzung

Die Anwendung „Wahrheit oder Pflicht Partyspiel“ wurde von einem Serverless-Setup (Vercel Frontend + Firebase Firestore Backend) auf ein dediziertes Node.js-Backend mit **WebSockets (Socket.io)** und lokaler **SQLite-Datenbank (WAL-Modus)** migriert.

### Vorteile der neuen Architektur:
- **Latenzreduktion:** Von 1.000–3.000 ms (Firestore-Polling/Document-Listener) auf unter 15 ms (Socket.io Memory-Rooms).
- **Keine Cloud-Quotas & Kosten:** Volle Datenhoheit auf dem eigenen Linux-Server.
- **Echte Echtzeit-Präsenz:** Kein fehleranfälliges Polling von `isOnline`-Flags; Online-Status ist direkt an aktive Socket-Verbindungen gekoppelt.
- **Transaktionale Persistenz:** Lokale SQLite-Datenbank (`wop.sqlite`) im performanten WAL-Modus für Benutzerkonten, Statistiken, Freundschaften, Chat-Historien und Feedback.

---

## 2. Systemarchitektur

```
Browser / Client (PWA)
   │
   │  HTTPS / WSS (Port 443)
   ▼
Nginx Reverse Proxy (www.wop.omoflow.de)
   │
   ├─► Static Files / Caching (optional oder via Express)
   │
   │  HTTP / WebSocket (Upgrade)
   ▼
Node.js Application Server (Port 3002) [Managed via PM2]
   │
   ├─► Express 5 (REST API für Auth, Profile, Admin, Feedback)
   ├─► Socket.io Server (Echtzeit-Lobbies, Game-Sync, DMs, Invites)
   │     └─► In-Memory Lobby Registry (Ultraschnelle Raum-Events)
   │
   └─► SQLite Database (wop.sqlite)
         └─► PRAGMA journal_mode = WAL;
         └─► PRAGMA synchronous = NORMAL;
         └─► PRAGMA busy_timeout = 10000;
```

---

## 3. Datenbank-Schema (`wop.sqlite`)

Alle Tabellen werden beim Start per `CREATE TABLE IF NOT EXISTS` automatisch initialisiert.

### `users`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `email` | TEXT PRIMARY KEY | E-Mail-Adresse (eindeutiger Identifier, lowercase) |
| `name` | TEXT NOT NULL | Anzeigename |
| `passHash` | TEXT NOT NULL | Passwort-Hash (SHA-256 / PBKDF2) |
| `role` | TEXT DEFAULT 'user' | Rolle (`user`, `admin`, `master`) |
| `xp` | INTEGER DEFAULT 0 | Erfahrungspunkte |
| `coins` | INTEGER DEFAULT 50 | Münzstand |
| `monthlyCoins` | INTEGER DEFAULT 0 | Monatliche Münzen |
| `monthlyCoinsMonth` | TEXT | Monatsschlüssel (z. B. `2026-11`) |
| `streak` | INTEGER DEFAULT 0 | Tägliche Login-Serie |
| `gameStreak` | INTEGER DEFAULT 0 | Gespielte Runden-Serie |
| `accessory` | TEXT DEFAULT '' | Ausgerüstetes Accessoire |
| `avatarEmote` | TEXT DEFAULT '😊' | Profil-Emote |
| `items` | TEXT DEFAULT '[]' | JSON-Array freigeschalteter Shop-Items |
| `themes` | TEXT DEFAULT '[]' | JSON-Array freigeschalteter Themes |
| `badges` | TEXT DEFAULT '[]' | JSON-Array freigeschalteter Abzeichen |
| `emotes` | TEXT DEFAULT '[]' | JSON-Array freigeschalteter Emotes |
| `truthCount` | INTEGER DEFAULT 0 | Anzahl beantworteter Wahrheiten |
| `dareCount` | INTEGER DEFAULT 0 | Anzahl erfüllter Pflichten |
| `jokerSkip` | INTEGER DEFAULT 0 | Vorrat Skip-Joker |
| `jokerForce` | INTEGER DEFAULT 0 | Vorrat Force-Joker |
| `jokersUsedSkip` | INTEGER DEFAULT 0 | Verwendete Skip-Joker |
| `jokersUsedForce` | INTEGER DEFAULT 0 | Verwendete Force-Joker |
| `lastLoginDate` | TEXT DEFAULT '' | Datum des letzten Logins (JJJJ-MM-TT) |
| `theme` | TEXT DEFAULT 'theme-default' | Gewähltes Farb-Theme |
| `createdAt` | DATETIME DEFAULT CURRENT_TIMESTAMP | Erstellungszeitpunkt |
| `updatedAt` | DATETIME DEFAULT CURRENT_TIMESTAMP | Letztes Update |

### `friends`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `userEmail` | TEXT NOT NULL | E-Mail des Nutzers |
| `friendEmail` | TEXT NOT NULL | E-Mail des Freundes |
| *PK* | `(userEmail, friendEmail)` | Verhindert Duplikate |

### `friend_requests`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Eindeutige ID |
| `fromEmail` | TEXT NOT NULL | Absender |
| `fromName` | TEXT | Name des Absenders |
| `toEmail` | TEXT NOT NULL | Empfänger |
| `createdAt` | DATETIME DEFAULT CURRENT_TIMESTAMP | Sendezeitpunkt |

### `direct_messages`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Eindeutige ID |
| `fromEmail` | TEXT NOT NULL | Absender |
| `fromName` | TEXT | Absender-Name |
| `toEmail` | TEXT NOT NULL | Empfänger |
| `text` | TEXT NOT NULL | Nachrichtentext |
| `read` | INTEGER DEFAULT 0 | 0 = ungelesen, 1 = gelesen |
| `createdAt` | DATETIME DEFAULT CURRENT_TIMESTAMP | Zeitstempel |

### `invites`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Eindeutige ID |
| `fromEmail` | TEXT NOT NULL | Einladender Spieler |
| `fromName` | TEXT | Name des Einladenden |
| `toEmail` | TEXT NOT NULL | Eingeladener Freund |
| `lobbyCode` | TEXT NOT NULL | 4-stelliger Lobby-Code |
| `createdAt` | DATETIME DEFAULT CURRENT_TIMESTAMP | Zeitstempel |

### `feedback`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Eindeutige ID |
| `email` | TEXT NOT NULL | Nutzer-E-Mail |
| `name` | TEXT | Nutzername |
| `type` | TEXT NOT NULL | `bug` oder `improvement` |
| `text` | TEXT NOT NULL | Feedback-Nachricht |
| `createdAt` | DATETIME DEFAULT CURRENT_TIMESTAMP | Zeitstempel |

### `lobbies`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `code` | TEXT PRIMARY KEY | Lobby-Code (z. B. `ABCD`) |
| `hostEmail` | TEXT NOT NULL | E-Mail des Spielleiters |
| `settings` | TEXT | JSON mit Spieleinstellungen |
| `state` | TEXT | JSON mit aktuellem Spielzustand (Turn, Task, Players) |
| `updatedAt` | DATETIME DEFAULT CURRENT_TIMESTAMP | Letztes Update |

