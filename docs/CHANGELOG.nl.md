# Changelog: Waarheid of Durven

Alle belangrijke wijzigingen aan dit project worden in dit bestand op een precieze, technische manier gedocumenteerd.

---

## [2.0.37] - 2026-11-09

### Nieuwe functies / Verbeteringen
- **Volledige ondersteuning voor Frans (fr) en Nederlands (nl):**
  - Volledige `fr`- en `nl`-vertaalobjecten toegevoegd in `js/app.js` voor UI-teksten, shop, profiel, lobby, spelverloop, chat, feedback en radsectoren.
  - Taalselectoren (auth-modal + in-app) bieden nu 🇩🇪 Deutsch, 🇬🇧 English, 🇫🇷 Français, 🇳🇱 Nederlands.
  - Taaldetectie / persistentie accepteert `fr` en `nl`; array `SUPPORTED_LANGS` geïntroduceerd.
  - Titel, helpers (`msg`, `getUserDisplayName`) en fallbacks bijgewerkt voor vier talen zodat bij taalwissel de hele interface wordt vertaald, niet slechts de helft van de teksten.
- **Changelog- en regelwerkpagina's** voorbereid op de extra talen (taalknoppen uitgebreid).

### Overig
- Versie verhoogd naar **2.0.37**; cache-busting queryparameters bijgewerkt naar `?v=2.0.37`.

---

## [2.0.36] - 2026-11-06

### Nieuwe functies / Verbeteringen
- **Gestroomlijnde diagnostiekmelding in Feedback-modal (`index.html`, `js/app.js`):**
  - In de feedbackmodal voor gebruikers zijn technische logdumps en tellerbadges vervangen door een duidelijke, onopvallende melding dat fout- en systeemrapporten automatisch op de achtergrond worden bijgevoegd.
  - De daadwerkelijke diagnostiek (consolefouten, serverfouten, stack traces en runtime-excepties) wordt uitsluitend aan beheerders getoond in de feedback-inspectieweergave van het Admin Panel.

### Overig
- Versie verhoogd naar **2.0.36**; cache-busting bijgewerkt naar `?v=2.0.36`; service worker cache bumped to **`wop-party-v12`**.

---

## [2.0.35] - 2026-11-06

### Bugfixes
- **Bevestigingsknop van het rad springt niet meer terug naar niet-bevestigd (`js/app.js`):**
  - Oorzaak: `voteNextRound()` did not immediately register its own confirmation locally via `handleIncomingData` on non-host clients, but only sent it across the socket. Since room broadcasts exclude the sender, the user's name was missing from their local `nextRoundVotedPlayers` array. When another user confirmed, `handleNextRoundVote` re-evaluated pending votes and incorrectly re-enabled the button (`disabled = false`).
  - Lokale stembevestiging wordt nu onmiddellijk verwerkt (`handleIncomingData`), matching `voteNextTurn()`.
  - De bevestigingsknop wordt expliciet bijgewerkt naar `✅ Confirmed (Waiting for players…)` / `✅ Bestätigt (Warte auf Mitspieler…)`.
  - `applyGameStateFromFirebase` now merges local confirmed votes with incoming server state to prevent race conditions during state syncs. `runWheelAnimation` and `updateLanguage` now preserve button and counter states accurately.

### Nieuwe functies / Verbeteringen
- **Verbeterde Force-Skip Joker vóór taakselectie & in Creator-scherm (`js/app.js`, `index.html`):**
  - The Force-Skip Joker can now be applied **before** the active player selects Waarheid of Durven or while the creator is drafting the task.
  - Voorkomt dat creators een taak moeten formuleren en indienen die meteen daarna alsnog wordt overgeslagen.
  - Toegewijde Force-Skip-knop toegevoegd in het taakcreator-scherm (`#creator-joker-force-box`) and in the waiting panel for other non-controlling players.
  - Toegewijde systeemmelding en feedbackschermbericht: `Overgeslagen met Force-Skip vóór taakselectie`.
- **Uitgebreide telemetrie & foutdiagnostiek voor Feedback/Bugs (`js/app.js`, `server.js`, `index.html`, `js/wop-socket-client.js`):**
  - Automatische verzameling van consolefouten (`console.error`), HTTP/network errors (Fetch/REST/WebSocket), and server errors in a 30-item circular buffer.
  - Backend serverfoutbuffer in `server.js` (up to 50 server errors) correlates 4xx/5xx errors by user email and time window in `POST /api/feedback`.
  - Verbeterde heuristiek in `analyzeBugReport`: Classifies area and error code (`WOP-ERR-*`) using description keywords, console errors, server errors, and runtime exceptions.
  - Live diagnostiek-previewkaart in feedbackmodal (`#feedback-diagnostics-box`) with collapsible details before sending.
  - Gedetailleerde weergave van alle vastgelegde console- en serverfouten with timestamps, HTTP status codes, endpoints, error messages, and stack traces in the Admin Panel feedback inspection view (`renderAdminFeedbackList`).

### Overig
- Versie verhoogd naar **2.0.35**; cache-busting bijgewerkt naar `?v=2.0.35`; service worker cache bumped to **`wop-party-v11`**.

---

## [2.0.34] - 2026-11-06

### Bugfixes
- **Kicked players returned to the start screen (`js/app.js`):**
  - `closeRoundStatsModal` only handled `"leave"` and `"leak"` – **`"kick"`** was missing, so kicked players often stayed in the in-round UI after the stats dialog.
  - Admin/Master kicks now set `_roundStatsPendingAction = "kick"` and after “OK” on round stats call `kickEliminatedPlayerToSetup()` (setup/start screen like leak).
- **Admin/Master see all lobby players including Pass & Play (`js/app.js`):**
  - Kick/leak picker lists active players **including local seats** (with device/owner hint).
  - Name lookup strips optional `[…]` suffixes and matches display names.
  - When applying lobby state, Admin/Master (including spectators) keep known `isLocal` seats so Pass & Play names do not disappear.

### Overig
- Version **2.0.34**; cache-busting `?v=2.0.34`; Service Worker **`wop-party-v10`**.

---

## [2.0.33] - 2026-11-06

### Nieuwe functies / Verbeteringen
- **Kick copy clearly separated from leak (`js/app.js`):**
  - System chat on Admin/Master kick: removed by Admin/Master/moderation for a rule violation (not a leak).
  - Round stats and alert for the affected player: removal for a rule violation, **not** a leak elimination; daily streak stays.
  - Leak wording unchanged for the real leak flow.
- **Admin/Master spectators joining an in-progress round (`js/app.js`, `server.js`):**
  - Spectator join uses socket `lobby:join` with callback plus `/api/lobby/:code` with a consistent `hostEmail`.
  - No blanket “Lobby code not found” when the lobby is active on the server or via socket – including mid-round.
  - Host-email fallbacks (API, socket, Firestore) and a spectator-only placeholder so state can load.

### Overig
- Versie verhoogd naar **2.0.33**; cache-busting `?v=2.0.33`; Service Worker-cache **`wop-party-v9`**.

---

## [2.0.32] - 2026-11-06

### Bugfixes
- **Achievements counter still showed 19/20 instead of 26 (`js/app.js`, `index.html`, `sw.js`):**
  - Oorzaak: the catalog already listed 26 achievements (including Platinum), but clients still loaded a cached `app.js` via `?v=2.0.30` / Service Worker-cache `wop-party-v7`.
  - Raised cache-busting query strings in `index.html` to **`?v=2.0.32`** (`app.js`, `wop-socket-client.js`, `style.css`, `sileo-bundle.js/css`).
  - Bumped Service Worker-cache name from `wop-party-v7` to **`wop-party-v8`**; old caches are dropped on activate.
  - `toggleBadgeShowcase()` now always calls `renderBadgeShowcase()` (including when collapsing) so the header counter (e.g. `19 / 26`) stays in sync with the catalog instead of a stale value.

### Overig
- Versie verhoogd naar **2.0.32**.

---

## [2.0.31] - 2026-11-06

### Nieuwe functies
- **Invisible spectator mode for Admin/Master (`regelwerk.html`):**
  - Rules clarified: only accounts with role Admin or Master can join a lobby via “Join as Spectator”.
  - Spectators have no own turn, do not take part in confirmations and earn no coins/XP from turns.
  - Joining is **invisible**: other players see neither a player-list entry nor a notification. Only the Admin/Master themselves see the “👁️ SPECTATOR” badge.
  - Kick rights remain available in invisible spectator mode without revealing presence.
  - Roles table and Lobby/Elimination sections updated (DE + EN).
- **Achievements extended to Platinum (`js/app.js`, `regelwerk.html`):**
  - All progress series now go up to **Platinum** (most previously stopped at Gold).
  - New Platinum achievements:
    - 🔥 **100 Dares** / 100 Pflichten
    - 💡 **100 Truths** / 100 Wahrheiten
    - ⚡ **Streak God** / Streak-Gott (game streak 50)
    - 🎯 **250 Tasks** / 250 Aufgaben
    - 🏆 **Party Level 100** / Partystufe 100
    - 💰 **Coin Emperor** / Coin-Imperator (2500 coins)
  - One-offs unchanged: **First Steps** stays Bronze; **Party-Animal** stays Platinum.
  - Total achievements: **26** (was 20).
  - `getBadgeCatalog()` and `checkBadges()` unlock the new tiers automatically when targets are reached.
  - Rulebook tables and notes (DE + EN) updated to match; counter hint e.g. 26/26.

### Overig
- Versie verhoogd naar **2.0.31**.

---

## [2.0.30] - 2026-11-06

### Bugfixes
- **Pixel-Perfect Vertical Centering & Compact Pill Layout for Sileo Toasts on Android & Mobile (`src/sileo-entry.js`, `js/sileo-bundle.js`):**
  - Resolved visual alignment defect on Android where toast content was pushed downwards creating an empty gap ("forehead gap") above the text.
  - Refactored Sileo Toaster to a unified 42px single-row pill (`autopilot: false`), eliminating awkward 90px accordion states and deformed SVG blobs.
  - Unified toast structure into a sleek black pill containing a circular badge on the left (`💬` or `🎮`), bold sender name with preview text, and an interactive "Reply ➔" ("Antworten ➔") button on the right.
  - Suppressed Sileo's internal default action badge (`[data-sileo-badge] { display: none !important; }`) to eliminate the conflicting blue arrow circle.
  - Pure deep black background (`#000000`) with subtle outer glow and high-contrast readable typography across all screen densities.
- **Suppression of Duplicate System Push Notifications on iOS with App Open (`server.js`, `sw.js`, `js/app.js`):**
  - Resolved an issue on iOS Safari / PWA where users received both the in-app toast and an iOS system banner notification simultaneously while using the app.
  - **Backend WebPush Gatekeeper (`server.js`):** Updated `isUserActiveInApp` to check for active, connected WebSocket connections. If the user is actively connected to the server, system Web Push is bypassed since real-time WebSocket delivery (`dm:incoming`) triggers the in-app toast directly.
  - **Client-to-Worker Visibility Heartbeat (`js/app.js`, `sw.js`):** Bi-directional visibility sync via `BroadcastChannel("wop_visibility_channel")` and `postMessage`. Service Worker push event listener suppresses system notification banners whenever the web application was visible within the last 15 seconds.
  - Service Worker-cache upgraded to `wop-party-v7`.

### Overig
- Versie verhoogd naar **2.0.30** with updated cache-busting query strings across assets.

---

## [2.0.29] - 2026-11-06

### Nieuwe functies
- **Persistent Page State & Automatic View Restoration on Page Reload (`js/app.js`, `index.html`):**
  - If a subpage (e.g. Friends, Shop, Profile, Message Inbox, 1:1 Direct Message chat, Leaderboard, Feedback, or Admin Panel) was open when reloading the browser, that exact screen—including active sub-tabs and current conversation partner—is now seamlessly restored instead of resetting to the home screen.
  - Introduced a dedicated Page State Router (`wop_active_page_v2` across `sessionStorage` and `localStorage`) tracking active screens (`home`, `friends`, `shop`, `profile`, `messages`, `chat`, `leaderboard`, `feedback`, `admin`), active sub-tabs (`tab: "online"`, `tab: "jokers"`, etc.), and recipient emails (`targetEmail`).
  - Closing a modal or tapping the back button (`←`) cleanly clears or steps back the active state to the parent view or home screen.
  - Seamless coexistence with active game rooms: if the player is in an active game or lobby, background reconnection operates smoothly while keeping the foreground page view intact.

### Overig
- Versie verhoogd naar **2.0.29** with updated cache-busting query strings.

---

## [2.0.28] - 2026-11-06

### Nieuwe functies
- **Autonomous Wheel Spinning & Re-spin Lock (`js/app.js`):**
  - Upon transitioning to the `wheel` phase, the host automatically triggers the wheel spin after a short delay (500 ms) for all participants.
  - The spin button (`#spin-btn`) remains permanently disabled and displays an autonomous status (`"🎡 Glücksrad dreht sich automatisch..."`), preventing any player from manually triggering additional spins.

### Bugfixes
- **Balanced Creator Selection Algorithm for > 3 Players (`js/app.js`):**
  - Resolved an issue where the same player was repeatedly assigned truth questions or dare tasks.
  - Introduced weighted, historical creator tracking:
    - Excludes the immediate previous creator for the same target player (`lastCreatorForTarget`) and for the same choice (`lastCreatorByTargetAndChoice`).
    - Excludes the immediate previous global creator (`recentTaskCreators`).
    - Even workload distribution via `creatorCounts`: prioritizes eligible candidates with the fewest assigned tasks.
    - Synchronizes creator history and frequency counts within the lobby state payload across all clients.
- **Lobby Retention & Reconnect Stability During App Switching / Background (`server.js`, `database.js`, `js/wop-socket-client.js`, `js/app.js`):**
  - Fixed a critical issue where players were removed from active lobbies and unable to rejoin when backgrounding the app, switching apps, or locking their mobile screen.
  - `pagehide` beacon suppressed for users in active lobbies (`window.activeLobbyCode`).
  - `/api/user/offline` on the backend preserves active sockets and lobby membership for players currently in a room.
  - `database.js`: `setOnlineStatus` no longer resets `currentLobby` to empty string when not explicitly requested.
  - Automatic Socket.io reconnection on server-disconnect and reconnect triggers on `visibilitychange`, `pageshow`, and `focus`.
- **Reliable Chat History Restoration on Reload (`js/app.js`):**
  - `applyGameStateFromFirebase` now immediately restores the chat history (`restoreLobbyChat`) during active gameplay (`wop` and `wheel`) and mid-game joins.
  - Initial restoration hook on `DOMContentLoaded` and within `joinGame`.
- **Fixed Button Shifting & Missing Task/Status on Orientation and Scroll (`js/app.js`, `css/style.css`, `index.html`):**
  - Resolved layout collapse where rotating the screen or scrolling caused the active question, dare, or status to vanish, pulling buttons into the middle of the screen.
  - `applyGameStateFromFirebase` now consistently re-renders the current turn state in `wop` phase.
  - Prevented unconditional clearing of `custom-task-input.value` in `setupCreatorUI`.
  - Added `min-height: 100dvh` and `viewport-fit=cover` for mobile viewport consistency.

### Overig
- Versie verhoogd naar **2.0.28** with updated cache-busting query strings.

---

## [2.0.27] - 2026-11-05

### Bugfixes
- **Lobby Chat Persistence on Page Reload (`server.js`, `js/app.js`, `js/wop-socket-client.js`):**
  - Chat messages (both public and direct) are now cached locally in `sessionStorage` and `localStorage` under `wop_lobby_chat_v1_<code.toLowerCase()>` and immediately restored upon reload (`showLobbyUI`, `startGameUI`).
  - Server-side chat history: `activeLobbies` retains the last 100 chat messages and dispatches them on join or reconnect via `lobby:chat_history`.
  - Leaving a lobby manually cleans up the stored chat cache for that specific room.
- **Immediate Offline Detection & Phantom Online Status Cleanup (`server.js`, `database.js`, `js/app.js`, `js/wop-socket-client.js`):**
  - Force-closed / task-manager-killed apps: optimized Socket.io heartbeat to `pingInterval: 8000` and `pingTimeout: 5000` so disconnected sockets are detected in 8–13s.
  - Added `pagehide` beacon (`navigator.sendBeacon('/api/user/offline')`) to cleanly report offline state upon closing tabs or background termination.
  - Fixed `/api/user/profile` bug that leaked stale SQLite database flags (`userSockets.has(...) || Boolean(user.isOnline)`), accurately reflecting live connection status now.
  - Corrected `formatLastOnline` in `js/app.js`: offline users were previously marked "Online now" due to `ONLINE_TIMEOUT_MS` (2.5 mins). An explicit offline status is now respected instantly with accurate last-seen timestamps.
  - Server periodic sweep (every 15s) cleans zombie sockets and emits `social:presence` broadcasts.
  - Database initialization marks all users offline (`isOnline = 0, currentLobby = ''`) on server startup.

### Overig
- Versie verhoogd naar **2.0.27** with updated cache-busting query strings.

---

## [2.0.26] - 2026-11-05

### Nieuwe functies
- **Strictly Alternating Task Assignment in 3-Player Lobbies (`js/app.js`):**
  - In lobbies with 3 active players, the two remaining players strictly alternate when creating truth questions or dares for the active player: if Player A created the task for the target player in round N, Player B is strictly required to create the task in round N+1.
  - Eliminates random streak bias where players could be repeatedly skipped or selected multiple times in a row; every player gets to answer and ask exactly one task per complete rotation.
  - State tracking via `lastCreatorForTarget`: the alternating status is persistently tracked in the lobby game state payload and synchronized across all clients via `applyGameStateFromFirebase`.

### Overig
- Versie verhoogd naar **2.0.26** with updated cache-busting query strings.

---

## [2.0.25] - 2026-11-05

### Bugfixes
- **Resolved ReferenceError `dbRun is not defined` in Lobby Operations (`server.js`, `database.js`):**
  - Resolved missing imports: `dbRun`, `dbGet`, and `dbAll` are now properly imported from `./database.js` in `server.js`, resolving runtime `ReferenceError: dbRun is not defined` exceptions when handling `lobby:create` (host initialization), `lobby:join` (participant join), and `lobby:leave` (room close/leave).
  - Clean modular database encapsulation: implemented helper functions `setUserCurrentLobby(email, lobbyCode)` and `clearLobbyForUsers(lobbyCode)` in `database.js` and integrated them into Socket.io lobby handlers in `server.js`.
  - Automated socket and SQLite integration tests verify the complete lobby lifecycle without errors.

### Overig
- Versie verhoogd naar **2.0.25** with updated cache-busting query strings.

---

## [2.0.24] - 2026-11-05

### Bugfixes
- **Sileo Toast Vertical Alignment on Android & iOS Resolved (`src/sileo-entry.js`, `js/sileo-bundle.js`, `js/sileo-bundle.css`):**
  - Completely eliminated downward vertical displacement ("forehead gap") on Android devices: using strict CSS rules (`height: var(--sileo-height, 40px) !important; top: 0 !important; bottom: auto !important; line-height: 1 !important; display: flex !important; align-items: center !important`), the header, badge, and title are mathematically locked to the exact Y=20px centerline of the SVG pill.
  - Fixed SVG baseline descent shift: `[data-sileo-canvas]` with `line-height: 0` and `<svg data-sileo-svg>` with `display: block; vertical-align: top` prevent engine baseline descent on Chromium and WebKit.
  - Integrated "Reply" button pill (`.sileo-reply-pill`): reply button is rendered as a rounded violet pill badge directly within the header alongside the sender's name and is properly included in dynamic pill width measurement.
  - Retained deep black background (`#000000`) for all shapes with subtle drop-shadow styling.
  - Universal click handler: tapping the reply pill or anywhere on the toast opens the direct message conversation immediately.
- **Suppression of Duplicate iOS System Push Notifications in Foreground (`server.js`, `sw.js`, `js/wop-socket-client.js`):**
  - Server-side activity check in `isUserActiveInApp` verifies via socket connection instance (`io.sockets.sockets.get(sId)?.connected`) whether the recipient currently has the app open in foreground.
  - If active in app, Web Push via Apple APNs is skipped completely, allowing only the fluid in-app Sileo toast to display without an intrusive OS system banner on iOS.
  - Automated client heartbeat (`user:heartbeat` every 25 seconds) keeps presence state updated continuously on the server.

### Overig
- Versie verhoogd naar **2.0.24** with updated cache-busting query strings.

---

## [2.0.23] - 2026-11-05

### Bugfixes
- **Lobby Join & Host Synchronization Stabilized (`js/app.js`, `server.js`):**
  - Fixed critical bug in `showLobbyUI`: joining clients inadvertently emitted `lobby:create` upon opening the lobby UI, overwriting existing lobbies on the server and immediately dropping players. `lobby:create` is now strictly restricted to the host.
  - Implemented case-insensitive lobby code matching (`normalizeLobbyCode`) in `startHostFirestoreLobby` and `startClientFirestoreLobby` to eliminate casing mismatches.
  - Player preservation: `startHostFirestoreLobby` now preserves already-joined players in pre-game state (`!gameStarted`), preventing asynchronous Firestore snapshots from wiping them.
- **Automatic Lobby Teardown on Host Exit (`server.js`, `js/app.js`, `js/wop-socket-client.js`):**
  - When the host leaves a lobby (`lobby:leave` with `isHost: true` or matching host email), the entire lobby is closed immediately, signaled to all connected participants via `lobby:closed`, and removed from memory and SQLite.
  - Remaining clients receive a notification and are gracefully routed back to setup.
- **Resolved Friends List Flickering (`js/app.js`):**
  - `renderFriendsList` no longer clears `container.innerHTML` with `"Loading friends..."` during re-renders, seamlessly swapping DOM nodes once data is loaded.
  - Replaced N sequential `getUserProfile` calls with the optimized `/api/social/friends?email=...` endpoint (single SQL query with realtime socket presence).
  - Added debouncing for live presence events (`wop:presence`).
- **Real-Time Lobby Display Synchronization in Admin Panel (`server.js`, `js/app.js`):**
  - Added server helper `findLiveLobbyForUser` to synchronize active lobbies directly from the `activeLobbies` in-memory map, ensuring the lobby code shown in the Admin Panel is always accurate.
  - Admin user list refreshes smoothly upon `wop:presence` events when the modal is open.

### Overig
- Version and cache-busting query parameters bumped to **2.0.23**.

---

## [2.0.22] - 2026-11-05

### Bugfixes
- **Restored Account Deletion for Admins and Masters (`server.js`, `js/app.js`, `js/wop-socket-client.js`, `database.js`):**
  - Completely reworked authorization in `DELETE /api/admin/user`: previously, an overly strict check (`!isMasterEmail(requester)`) blocked all administrators without exception, as well as masters not in the static `MASTER_EMAILS` list.
  - Implemented role hierarchy: Masters can delete all accounts (except unalterable fixed master accounts); Administrators can delete regular users and moderators (but not other Admins or Masters).
  - Unlocked self-account deletion (`deleteOwnAccount`): Authenticated users can now reliably delete their own accounts via the API.
  - Full cascading cleanup in `database.js`: Deleting a user now also cleans up `push_subscriptions` and hosted `lobbies`.
  - Immediate session termination: Active WebSocket connections of the deleted user are instantly disconnected via the `auth:deleted` event and network presence is updated.
  - Client error handling: `DocumentReference.prototype.delete` and `deleteUser` now inspect HTTP status codes and provide transparent frontend error messages.

### Overig
- Version and cache-busting query parameters bumped to **2.0.22**.

---

## [2.0.21] - 2026-11-05

### Bugfixes
- **Resilient Email Dispatch with Direct-TLS SMTPS Fallback (`server.js`):**
  - Implemented a native Node.js `tls`-based SMTPS client on port 465 that operates completely without external npm dependencies.
  - Automatic fallback to Direct-TLS if `nodemailer` is not installed in `node_modules` on the server.
  - Bash variable expansion auto-correction: Prevents authentication failures if `$6` in password was expanded to an empty variable during `.env` creation (`F44l6ee` → `F44l$66ee`).
  - `.env` paths are now resolved absolutely relative to `__dirname` to avoid PM2 working directory issues.
  - Lina's administration guide updated to include `npm install`.

### Overig
- Version and cache-busting query parameters bumped to **2.0.21**.

---

## [2.0.20] - 2026-11-05

### Bugfixes
- **Automatic Online Status on App Open (`server.js`, `js/app.js`, `js/wop-socket-client.js`):**
  - When disconnecting, `presenceStatus` is no longer overwritten to `offline` in SQLite, keeping the user preference intact.
  - On app launch and WebSocket connect (`auth:identify`), status automatically resets to `online` (unless user explicitly configured `dnd`).
  - `loadUserDataFromCloud()` and `wop:presence` no longer set local status to `offline` while the app is active in the foreground.
- **Lobby Chat Message Deduplication (`js/wop-socket-client.js`, `js/app.js`):**
  - Resolved double event processing: `socket.on("lobby:data")` now exclusively delegates to `window.handleIncomingData` instead of also invoking `listeners.lobbyHost`.
  - Unique message ID deduplication (`chatSeenIds`) and case-insensitive sender comparison (`namesEqual`) completely prevent duplicate chat bubbles.
- **Protection Against Players Accidentally Dropping (`server.js`, `js/app.js`, `js/wop-socket-client.js`):**
  - `startHostFirestoreLobby` preserves all existing players during an active game (`gameStarted === true`) and does not drop them on temporary snapshot discrepancies.
  - Removed outdated PeerJS check (`!hostConnection || !hostConnection.open`) on visibility change which erroneously triggered `scheduleLobbyReconnect` on tab switches.
  - On WebSocket reconnect (`socket.on("connect")`), clients automatically re-join the active lobby room (`lobby:join`).
  - Elimination & kicking enforcement: Eliminated or removed players can no longer send lobby chat messages (enforced by `sendChatMessage` and server `lobby:data`), and `kickEliminatedPlayerToSetup` explicitly executes `lobby:leave`.

### Overig
- Version and cache-busting query parameters raised to **2.0.20**.

---

## [2.0.19] - 2026-11-05

### Bugfixes
- **Lobby Invitations (`server.js`, `js/app.js`, `js/wop-socket-client.js`):**
  - Fixed missing sender email (`fromEmail`) in `sendGameInvite`, which previously caused the server endpoint `/api/social/invite` to fail with HTTP 400.
  - Client adapter now throws controlled errors instead of faking invite IDs.
  - Server now only filters out users with `dnd` (Do Not Disturb) and no longer blocks invites during brief socket reconnections.
  - Incoming invitations now trigger both the invite modal and an interactive Sileo toast with a direct "Join" button.
  - When the recipient is not active in the foreground, Web Push with tag `invite-{id}` is dispatched.
- **Lobby Join via Code & Host Lookup (`js/app.js`, `js/wop-socket-client.js`):**
  - Integrated direct query to `/api/lobby/:code` in `joinGame`, resolving host email directly from server/SQLite state.
  - `CollectionReference.prototype.get` in socket client now supports queries by `currentLobby` and returns document snapshots for host and players.
  - `DocumentReference.prototype.get` for `lobbies` merges game state (`state`) with lobby metadata (`hostEmail`, `players`).
  - `socket.on("lobby:players_updated")` immediately updates the active game player list via `handleIncomingData({ type: "UPDATE_PLAYERS" })`.
- **Email Verification & SMTP Delivery (`server.js`, `package.json`):**
  - Added and registered `nodemailer` dependency in `package.json`.
  - Automatic SSL activation (`secure: true`) for port 465.
  - Full support for Netcup SMTP (`mxe8db.netcup.net:465`) with TLS configuration and formatted sender address.
- **Notifications & Sileo Toast UX (`src/sileo-entry.js`, `server.js`, `js/wop-socket-client.js`):**
  - Fixed duplicate notifications on iOS by suppressing server-side Web Push while an active WebSocket connection exists.
  - Sileo Toast title computation fixed with string titles, preventing clipping and vertical shift on high-DPI Android devices.
  - Automatic chat opening when tapping either the toast bubble or the action button.

### Overig
- Version and cache-busting query parameters raised to **2.0.19**.

---

## [2.0.18] - 2026-11-05

### Fixes
- **Achievements:** Restored classic, reachable names (First Steps, 10/25/50 Dares, Truths, Streaks, Tasks, Party Level, Coins, Party-Animal). Ribbon UI and tiers kept. Targets are attainable.

### Overig
- Version and cache-busting query parameters raised to **2.0.18**.

---

## [2.0.17] - 2026-11-05

### Fixes / UX
- **Email code only by mail:** Confirmation code is **not** shown in the app. Only “code sent to your email”. Resend only by mail (SMTP required).
- **Online status in profile:** Pill shows current status (Online / Away / Do not disturb / Offline); selection stays active and is stored locally.
- **Achievements (ribbon UI):** Trophy grid collapsed by default, open via button, click shows progress to unlock (Bronze / Silver / Gold / Platinum).

### Overig
- Version and cache-busting query parameters raised to **2.0.17**.

---

## [2.0.16] - 2026-11-05

### Nieuwe functies
- **Achievements / Badges with tiers (Bronze → Silver → Gold → Platinum) (`js/app.js`, `css/style.css`):**
  - Badges have a tier and color highlighting.
  - Click opens a detail overlay with progress bar and next-tier hint.
- **Compact online-status pill (`index.html`, `css/style.css`, `js/app.js`):**
  - Status selection as a small pill dropdown (dot + label + chevron) instead of a large 2×2 grid.
  - Selected status stays visible and active until changed.
- **Real email required + confirmation code (`server.js`, `database.js`, `js/app.js`):**
  - Registration only with valid email format.
  - Disposable / joke domains are blocked.
  - Domain must exist (MX/DNS check) – fake addresses are rejected.
  - New accounts get a 6-digit confirmation code (valid 30 min); login only after confirmation.
  - Endpoints: `POST /api/auth/verify-email`, `POST /api/auth/resend-code`.
  - Existing accounts stay verified (migration `emailVerified DEFAULT 1`).
  - Optional SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`).

### UX
- Badge tiles are clickable and show tier label; profile shows total achievements count.
- Presence pill closes after selection and on outside click.
- Verification overlay after registration or login without confirmed email.

### Overig
- Version and cache-busting query parameters raised to **2.0.16**.

---

## [2.0.15] - 2026-11-05

### UX
- **Online status UI fully DE/EN (`js/app.js`):**
  - Title, description, button labels (Online / Away / Do not disturb / Offline) and hint texts follow the selected language.
  - Switching German ↔ English updates all presence strings (no mixed DE/EN text anymore).

### Overig
- Version and cache-busting query parameters raised to **2.0.15**.

---

## [2.0.14] - 2026-11-05

### Nieuwe functies
- **Extended online status (presence) in profile (`index.html`, `js/app.js`, `server.js`, `database.js`):**
  - New statuses: **Online**, **Away**, **Do not disturb**, **Offline** (selectable in the profile).
  - Status is broadcast live via WebSocket (`social:presence` / `user:setPresence`) and `PUT /api/user/presence`.
  - New DB field `presenceStatus` (migration via `ALTER TABLE`).
- **Immediate offline on disconnect (`server.js`):**
  - When the last socket disconnects, the user is marked **offline immediately** and broadcast to all clients (no more 5-second grace period) – same idea as chat presence.
- **Invite rules by status (`server.js`, `js/app.js`):**
  - Game invites only to **Online** or **Away**.
  - **Do not disturb** and **Offline** block invites on server and client.

### UX
- **Discord support card layout (`index.html`, `css/style.css`):**
  - Text “Questions about the game? Message me on Discord.” sits above the status badge (no longer squeezed beside it).
  - Status badge and button clearly stacked (`.discord-contact-card--stacked`).

### Overig
- Version and cache-busting query parameters raised to **2.0.14**.

---

## [2.0.13] - 2026-11-05

### Bugfixes
- **Chat messages persist after reload (`js/app.js`, `js/wop-socket-client.js`, `database.js`):**
  - `sendDirectMessage` always persists via `POST /api/dm/send` into SQLite and checks `res.ok` (no silent “success” only in local cache).
  - After reloading the app/site, `loadDmThread` reliably loads history from `/api/dm/history` (up to 100 messages).
  - `getDirectMessages` correctly fetches the newest messages (`ORDER BY datetime(createdAt) DESC` then ascending for chat order).
  - WebSocket handler `dm:incoming` updates open thread, badge and inbox; duplicates are blocked via `dmSeenIds`.
  - `CollectionReference.add` for `directMessages` throws on API failure instead of returning a fake id.

### Overig
- Version and cache-busting query parameters raised to **2.0.13**.

---

## [2.0.12] - 2026-11-05

### Nieuwe functies
- **Full English changelog (`docs/CHANGELOG.en.md`, `changelog.html`):**
  - With language set to **English**, the complete changelog is loaded from `docs/CHANGELOG.en.md` – every version fully translated, not only a summary.
  - **Deutsch** still uses `docs/CHANGELOG.md`.
  - Switcher and UI match Rules / Legal notice (title, footer, loading text, version badge).

### UX
- **Footer link “Changelog” instead of version number (`index.html`):**
  - In the legal footer and on the login modal the link label is **Changelog** (no version number in the link text).
  - The current version remains visible only on the changelog page badge at the top (e.g. “Current: v2.0.12”).
  - DE/EN labels for the link together with Rules, Legal notice and Privacy.

### Overig
- Version and cache-busting query parameters raised to **2.0.12**.

---

## [2.0.11] - 2026-11-05

### Nieuwe functies
- **Language switch Deutsch / English on the changelog page (`changelog.html`):**
  - Same switcher style as Rules and Legal notice (🇩🇪 Deutsch / 🇬🇧 English).
  - UI strings (title, subtitle, back link, footer links, loading text, version badge) are fully translated.
  - English loads the **complete** English changelog from `docs/CHANGELOG.en.md` (every version fully translated, not only a summary).
  - Language preference is stored in `localStorage` (`wop_changelog_lang`) and otherwise follows the app language or browser language.

### UX
- **Footer link shows “Changelog” instead of the version number (`index.html`):**
  - In the legal footer and on the login modal the link label is **Changelog** (no version number in the link text).
  - The current version remains visible only on the changelog page badge at the top (e.g. “Current: v2.0.11”).
  - Footer / login labels are switched with DE/EN together with Rules, Legal notice and Privacy.

### Overig
- Version and cache-busting query parameters set to **2.0.11**.

---

## [2.0.10] - 2026-11-05

### Nieuwe functies
- **Version / changelog link in the game footer (`index.html`, `changelog.html`):**
  - The legal footer (next to Rules · Legal notice · Privacy) includes a link to the changelog page.
  - Opening it shows `docs/CHANGELOG.md` in the same glassmorphism / dark theme as Rules, Legal notice and Privacy.
  - The same link is available on the login / register modal before signing in.
  - Cache-busting query parameters raised to 2.0.10.

### UX
- **Removed redundant Changelog self-link on the changelog page (`changelog.html`):**
  - The footer of `changelog.html` no longer includes a “Changelog” entry while you are already on that page.
  - Footer there: **Game · Rules · Legal notice · Privacy**.

---

## [2.0.9] - 2026-11-05 (Branch: `feat/ws-server`)

### Nieuwe functies
- **Master can assign master roles (`js/app.js`, `server.js`):**
  - In the admin panel, accounts with role `master` see an additional **Master** option in the role dropdown (alongside User, Mod and Admin).
  - `changeUserRole` allows setting `role: "master"` only when the acting user is themselves `master`; Admin and Moderator keep their previous rights (only User / Mod / Admin).
  - Fixed master accounts from `MASTER_EMAILS` (e.g. `master@vibe.party`, `christian.heinrich@omoflow.de`) remain immutable and cannot be demoted or deleted.
  - Master roles granted by a master to other emails can later be changed or revoked by a master.

### Bugfixes
- **Server-side role assignment hardening (`server.js`):**
  - `PUT /api/admin/user/role` now strictly checks: fixed master emails are locked; only a master requester may set `master`; admins are limited to `user` / `moderator` / `admin`.
  - Prevents assigning a master role via the API fallback from non-master accounts.

---

## [2.0.8] - 2026-11-05 (Branch: `feat/ws-server`)

### Nieuwe functies
- **Direct reply button in the toast pill (`src/sileo-entry.js`, `js/sileo-bundle.js`):**
  - A compact purple “Reply” button (`.sileo-reply-btn`) is rendered in the pill header so the recipient can open the chat with one tap without expanding the toast.

### Bugfixes
- **Vertical text & icon shift on Android / mobile fixed (`src/sileo-entry.js`, `js/sileo-bundle.js`):**
  - Global `box-sizing: border-box !important` and margin reset on all elements inside `[data-sileo-viewport]`.
  - Native `padding: 0.5rem` on `[data-sileo-header]` with `content-box` previously pushed content down; fixed centering (`display: flex; align-items: center; height: var(--sileo-height); padding: 0 14px`).
  - SVG background shape (`rect` and `path`) forced to `fill: #000000 !important`.
- **Full suppression of iOS system notifications while the app is active (`server.js`, `js/wop-socket-client.js`, `js/app.js`):**
  - WebKit on iOS runs push events in isolated processes where `clients.matchAll()` often returns an empty array and forces an Apple banner.
  - Suppression is handled server-side: `js/wop-socket-client.js` reports app visibility (`visibilitychange`) to the server.
  - In `server.js`, `/api/dm/send` uses `isUserActiveInApp(toEmail)`; if the recipient has the app visible in the foreground, no Web Push is sent to APNs, so only the Sileo in-app toast appears.
  - Removed a redundant `showAppNotification` call inside `showDmToast` in `js/app.js`.
  - Service Worker-cache verhoogd naar `wop-party-v6`.

---

## [2.0.7] - 2026-11-05 (Branch: `feat/ws-server`)

### Nieuwe functies
- **Sileo toast deep black & reply button (`src/sileo-entry.js`, `js/sileo-bundle.js`, `js/app.js`):**
  - Toast background set to pure deep black (`#000000`, SVG fill `#000000`) with a darker drop shadow.
  - Interactive “Reply” button (`[data-sileo-button]`) with gradient styling and hover that opens the private chat with the sender.
  - Click handler on the whole toast (`[data-sileo-toast]`) also opens the chat when the content is tapped.

### Bugfixes
- **Suppression of duplicate system notifications while the app is open (`js/app.js`, `sw.js`):**
  - In `showDmToast` (`js/app.js`), `showAppNotification` runs only when `document.visibilityState !== "visible"`.
  - In the service worker (`sw.js`), the `push` handler uses `clients.matchAll({ type: "window" })`; if any client has `visibilityState === "visible"`, `self.registration.showNotification` is skipped so only the Sileo in-app toast is shown.
  - Service Worker-cache verhoogd naar `wop-party-v5`.

---

## [2.0.6] - 2026-11-05 (Branch: `feat/ws-server`)

### Nieuwe functies
- **Sileo toast (React-based in-app notifications) (`src/sileo-entry.js`, `js/sileo-bundle.js`, `js/app.js`):**
  - Full integration of the fluid React toast component `sileo` with spring physics animations and dark glassmorphism design.
  - Precompiled self-contained bundle (`js/sileo-bundle.js` & `js/sileo-bundle.css`) without CDN latency for full offline PWA support.
  - Incoming direct messages show an interactive Sileo action pill at the top (`💬 Name: Text…`) with an “Open” button that switches into the chat.
  - Service Worker precache extended with the Sileo bundle.
- **Automated SQLite backup script (`scripts/backup-db.sh`):**
  - Consistent online backup for SQLite in WAL mode (`.backup` / `VACUUM INTO`) with gzip compression and rotation of backups older than 14 days.

---

## [2.0.5] - 2026-11-05 (Branch: `feat/ws-server`)

### Nieuwe functies
- **Real Web Push notifications (`server.js`, `database.js`, `sw.js` & `app.js`):**
  - Full W3C Web Push integration with automatic VAPID key management in SQLite (`server_settings`).
  - New table `push_subscriptions` for browser endpoints and encryption keys (`p256dh`, `auth`).
  - Incoming DMs are delivered via `sendWebPushNotification` even when the app is closed or the device is in standby.
  - Tapping the system push opens the PWA and navigates to the relevant chat.

### Bugfixes
- **Realtime chat badge & inbox updates fixed (`js/wop-socket-client.js`, `js/app.js` & `server.js`):**
  - Added missing `orderBy` on `CollectionReference` (previously caused a `TypeError` and blocked the realtime listener).
  - Direct WebSocket hook on `dm:incoming` so the unread badge (`#hud-dm-badge`) and conversation list update live without opening the icon first.
  - `socket.join('user:<email>')` on the server for reliable user-room targeting.

---

## [2.0.4] - 2026-11-04 (Branch: `feat/ws-server`)

### Bugfixes
- **Chat badge & unread counter corrected (`js/app.js`, `js/wop-socket-client.js`):**
  - The badge on the chat icon in the bottom nav (`#hud-dm-badge`) no longer shows the total number of open conversations; it counts truly unread messages via `/api/dm/unread-count`.
  - When unread is 0, the badge is fully hidden (`display: none`).
  - In the chat overview (`dm-inbox-list`) each conversation shows its own red badge with that contact’s unread count.
  - Opening a chat marks messages read via `POST /api/dm/mark-read` in SQLite (`read = 1`), so conversation and menu badges clear immediately.

---

## [2.0.3] - 2026-11-04 (Branch: `feat/ws-server`)

### Nieuwe functies
- **Smoother play and confirmation flow (`js/app.js`):**
  - After submitting a truth answer or marking a dare done, the active player no longer has to confirm their own result again (“I confirm” / “Next”).
  - The active player is treated as already confirmed for the round (`nextTurnVotedPlayers = [targetPlayer]`).
  - The confirm button shows `✅ Done (Waiting for others…)` and only waits for the other players who are viewing the result.

---

## [2.0.2] - 2026-11-04 (Branch: `feat/ws-server`)

### Nieuwe functies
- **Direct message inbox & chat overview (`server.js`, `database.js` & `app.js`):**
  - Implemented `getDmConversations(email)` and endpoint `/api/dm/conversations`.
  - The chat tab lists all past and new conversations sorted by date with avatar, live online status, text preview and unread count.
  - Chats can be opened by tapping the conversation or the “Open” button.

### Bugfixes
- **Dialog popup in page flow fixed (`index.html`, `css/style.css` & `js/wop-socket-client.js`):**
  - Custom dialog modal (`#wop-custom-dialog-overlay`) defaults to `display: none;` so it no longer renders incorrectly at the bottom behind the nav bar.
- **Privacy & legal notice cleaned up (`impressum.html`):**
  - Personal Discord profile link for Lina removed from German and English imprint contact details.
- **Admin guide extended (`docs/ADMIN_LINA_GUIDE.md`):**
  - Instructions for creating Linux user `lina` with forced password change on first login (`sudo passwd -e lina`).
  - Sudoers with `NOPASSWD:` for `pm2 restart wop-server` so Lina can restart the service without Christian’s password.
  - Step-by-step SSH access on Android via Termius / JuiceSSH including 1-tap snippet automation.

---

## [2.0.1] - 2026-11-04 (Branch: `feat/ws-server`)

### Bugfixes
- **Friend list sync fixed (`database.js` & `wop-socket-client.js`):**
  - `getUserByEmail(email)` now loads all friendship rows from SQLite table `friends` and attaches them as `friends: [...]` on the user object so the frontend (`app.js`) initializes `myFriends` correctly.
  - `DocumentReference.set` in `wop-socket-client.js` forwards `arrayUnion` / `arrayRemove` for friendships to the REST and WebSocket endpoints.
- **Bidirectional friendship storage (`scripts/migrate-from-firebase.js` & `database.js`):**
  - Migration and friend ops (`addFriendPair`) store friendships strictly bidirectionally (`(email, friendEmail)` and `(friendEmail, email)`).
- **Presence and timestamp detection corrected (“Never online” fixed, `js/app.js`):**
  - `getLastActiveMillis` previously only handled Firestore Timestamp objects and ignored SQLite ISO/DateTime strings (returned `0`). Now parses ISO-8601 and SQLite datetime formats.
  - `formatLastOnline` treats users with live `isOnline` or recent activity as “Online now” instead of “Never online”.
- **Live socket online status in admin panel & player list (`server.js`):**
  - Endpoints `/api/admin/users`, `/api/user/profile` and `/api/users/online` enrich users with the active socket map (`userSockets`) in realtime.
  - `window.wopIdentify` triggers socket identification on login, register and reconnects without requiring a full reload.

---

## [2.0.0] - 2026-11-04 (Branch: `feat/ws-server`)

### Nieuwe functies
- **Node.js & Express backend:** Dedicated backend on port `3002` fully replaces the previous serverless Firebase architecture.
- **Realtime WebSockets with Socket.io:**
  - In-memory and room-based event bus (`lobby:*`, `dm:*`, `social:*`).
  - Lobby, turn, wheel and chat latency reduced from ~1,000–3,000 ms to under 15 ms.
  - Automatic connect/disconnect handling with native online presence without heartbeat polling.
- **SQLite persistence layer (`wop.sqlite`):**
  - SQLite database in Write-Ahead Logging mode (`WAL`) for write/read performance and crash resilience.
  - Tables for `users`, `friends`, `friend_requests`, `direct_messages`, `invites`, `feedback` and `lobbies`.
  - SQL injection protection via parameterized prepared statements.
- **Production deployment configuration:**
  - `nginx-wop.conf`: Nginx reverse proxy for `www.wop.omoflow.de` with WebSocket upgrade (`$http_upgrade`) and Let’s Encrypt SSL.
  - `ecosystem.config.cjs`: PM2 config in `fork` mode with memory limits (`450M`) and production flags.
- **Custom design dialog popup:**
  - Full replacement of native browser `alert` & `confirm` with an animated glassmorphism popup and contextual icons.
- **Legal links on the login screen:**
  - Legal notice, Privacy and Rules are available in the login/register modal before authentication.
- **Server & admin guide for Lina:**
  - Detailed documentation under `docs/ADMIN_LINA_GUIDE.md` for user management, permissions and server operations.

### Bugfixes
- **Firestore quota and latency lags removed:** Writing game actions to Cloud Firestore documents (`hostMessage`, `lobbyMessage`) replaced by native Socket.io room broadcasts.
- **Ghost online states fixed:** Players are no longer left as `isOnline: true` after closed tabs or dropped connections; the server updates presence via socket disconnect hooks.
- **Bottom nav hidden before login:** Main menu (`#app-bottom-nav`) is hidden for logged-out users and appears only after successful authentication.
- **PWA resource use optimized:** Heavy Firebase client libraries (`firebase-app-compat.js`, `firebase-firestore-compat.js`) removed from the frontend, reducing load time and bundle size.
