# Changelog: Truth or Dare

All notable changes to this project are documented in this file in a precise, technical style.

---

## [2.0.22] - 2026-11-05

### Bug Fixes
- **Restored Account Deletion for Admins and Masters (`server.js`, `js/app.js`, `js/wop-socket-client.js`, `database.js`):**
  - Completely reworked authorization in `DELETE /api/admin/user`: previously, an overly strict check (`!isMasterEmail(requester)`) blocked all administrators without exception, as well as masters not in the static `MASTER_EMAILS` list.
  - Implemented role hierarchy: Masters can delete all accounts (except unalterable fixed master accounts); Administrators can delete regular users and moderators (but not other Admins or Masters).
  - Unlocked self-account deletion (`deleteOwnAccount`): Authenticated users can now reliably delete their own accounts via the API.
  - Full cascading cleanup in `database.js`: Deleting a user now also cleans up `push_subscriptions` and hosted `lobbies`.
  - Immediate session termination: Active WebSocket connections of the deleted user are instantly disconnected via the `auth:deleted` event and network presence is updated.
  - Client error handling: `DocumentReference.prototype.delete` and `deleteUser` now inspect HTTP status codes and provide transparent frontend error messages.

### Misc
- Version and cache-busting query parameters bumped to **2.0.22**.

---

## [2.0.21] - 2026-11-05

### Bug Fixes
- **Resilient Email Dispatch with Direct-TLS SMTPS Fallback (`server.js`):**
  - Implemented a native Node.js `tls`-based SMTPS client on port 465 that operates completely without external npm dependencies.
  - Automatic fallback to Direct-TLS if `nodemailer` is not installed in `node_modules` on the server.
  - Bash variable expansion auto-correction: Prevents authentication failures if `$6` in password was expanded to an empty variable during `.env` creation (`F44l6ee` → `F44l$66ee`).
  - `.env` paths are now resolved absolutely relative to `__dirname` to avoid PM2 working directory issues.
  - Lina's administration guide updated to include `npm install`.

### Misc
- Version and cache-busting query parameters bumped to **2.0.21**.

---

## [2.0.20] - 2026-11-05

### Bug Fixes
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

### Misc
- Version and cache-busting query parameters raised to **2.0.20**.

---

## [2.0.19] - 2026-11-05

### Bug Fixes
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

### Misc
- Version and cache-busting query parameters raised to **2.0.19**.

---

## [2.0.18] - 2026-11-05

### Fixes
- **Achievements:** Restored classic, reachable names (First Steps, 10/25/50 Dares, Truths, Streaks, Tasks, Party Level, Coins, Party-Animal). Ribbon UI and tiers kept. Targets are attainable.

### Misc
- Version and cache-busting query parameters raised to **2.0.18**.

---

## [2.0.17] - 2026-11-05

### Fixes / UX
- **Email code only by mail:** Confirmation code is **not** shown in the app. Only “code sent to your email”. Resend only by mail (SMTP required).
- **Online status in profile:** Pill shows current status (Online / Away / Do not disturb / Offline); selection stays active and is stored locally.
- **Achievements (ribbon UI):** Trophy grid collapsed by default, open via button, click shows progress to unlock (Bronze / Silver / Gold / Platinum).

### Misc
- Version and cache-busting query parameters raised to **2.0.17**.

---

## [2.0.16] - 2026-11-05

### New Features
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

### Misc
- Version and cache-busting query parameters raised to **2.0.16**.

---

## [2.0.15] - 2026-11-05

### UX
- **Online status UI fully DE/EN (`js/app.js`):**
  - Title, description, button labels (Online / Away / Do not disturb / Offline) and hint texts follow the selected language.
  - Switching German ↔ English updates all presence strings (no mixed DE/EN text anymore).

### Misc
- Version and cache-busting query parameters raised to **2.0.15**.

---

## [2.0.14] - 2026-11-05

### New Features
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

### Misc
- Version and cache-busting query parameters raised to **2.0.14**.

---

## [2.0.13] - 2026-11-05

### Bug Fixes
- **Chat messages persist after reload (`js/app.js`, `js/wop-socket-client.js`, `database.js`):**
  - `sendDirectMessage` always persists via `POST /api/dm/send` into SQLite and checks `res.ok` (no silent “success” only in local cache).
  - After reloading the app/site, `loadDmThread` reliably loads history from `/api/dm/history` (up to 100 messages).
  - `getDirectMessages` correctly fetches the newest messages (`ORDER BY datetime(createdAt) DESC` then ascending for chat order).
  - WebSocket handler `dm:incoming` updates open thread, badge and inbox; duplicates are blocked via `dmSeenIds`.
  - `CollectionReference.add` for `directMessages` throws on API failure instead of returning a fake id.

### Misc
- Version and cache-busting query parameters raised to **2.0.13**.

---

## [2.0.12] - 2026-11-05

### New Features
- **Full English changelog (`docs/CHANGELOG.en.md`, `changelog.html`):**
  - With language set to **English**, the complete changelog is loaded from `docs/CHANGELOG.en.md` – every version fully translated, not only a summary.
  - **Deutsch** still uses `docs/CHANGELOG.md`.
  - Switcher and UI match Rules / Legal notice (title, footer, loading text, version badge).

### UX
- **Footer link “Changelog” instead of version number (`index.html`):**
  - In the legal footer and on the login modal the link label is **Changelog** (no version number in the link text).
  - The current version remains visible only on the changelog page badge at the top (e.g. “Current: v2.0.12”).
  - DE/EN labels for the link together with Rules, Legal notice and Privacy.

### Misc
- Version and cache-busting query parameters raised to **2.0.12**.

---

## [2.0.11] - 2026-11-05

### New Features
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

### Misc
- Version and cache-busting query parameters set to **2.0.11**.

---

## [2.0.10] - 2026-11-05

### New Features
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

### New Features
- **Master can assign master roles (`js/app.js`, `server.js`):**
  - In the admin panel, accounts with role `master` see an additional **Master** option in the role dropdown (alongside User, Mod and Admin).
  - `changeUserRole` allows setting `role: "master"` only when the acting user is themselves `master`; Admin and Moderator keep their previous rights (only User / Mod / Admin).
  - Fixed master accounts from `MASTER_EMAILS` (e.g. `master@vibe.party`, `christian.heinrich@omoflow.de`) remain immutable and cannot be demoted or deleted.
  - Master roles granted by a master to other emails can later be changed or revoked by a master.

### Bug Fixes
- **Server-side role assignment hardening (`server.js`):**
  - `PUT /api/admin/user/role` now strictly checks: fixed master emails are locked; only a master requester may set `master`; admins are limited to `user` / `moderator` / `admin`.
  - Prevents assigning a master role via the API fallback from non-master accounts.

---

## [2.0.8] - 2026-11-05 (Branch: `feat/ws-server`)

### New Features
- **Direct reply button in the toast pill (`src/sileo-entry.js`, `js/sileo-bundle.js`):**
  - A compact purple “Reply” button (`.sileo-reply-btn`) is rendered in the pill header so the recipient can open the chat with one tap without expanding the toast.

### Bug Fixes
- **Vertical text & icon shift on Android / mobile fixed (`src/sileo-entry.js`, `js/sileo-bundle.js`):**
  - Global `box-sizing: border-box !important` and margin reset on all elements inside `[data-sileo-viewport]`.
  - Native `padding: 0.5rem` on `[data-sileo-header]` with `content-box` previously pushed content down; fixed centering (`display: flex; align-items: center; height: var(--sileo-height); padding: 0 14px`).
  - SVG background shape (`rect` and `path`) forced to `fill: #000000 !important`.
- **Full suppression of iOS system notifications while the app is active (`server.js`, `js/wop-socket-client.js`, `js/app.js`):**
  - WebKit on iOS runs push events in isolated processes where `clients.matchAll()` often returns an empty array and forces an Apple banner.
  - Suppression is handled server-side: `js/wop-socket-client.js` reports app visibility (`visibilitychange`) to the server.
  - In `server.js`, `/api/dm/send` uses `isUserActiveInApp(toEmail)`; if the recipient has the app visible in the foreground, no Web Push is sent to APNs, so only the Sileo in-app toast appears.
  - Removed a redundant `showAppNotification` call inside `showDmToast` in `js/app.js`.
  - Service Worker cache bumped to `wop-party-v6`.

---

## [2.0.7] - 2026-11-05 (Branch: `feat/ws-server`)

### New Features
- **Sileo toast deep black & reply button (`src/sileo-entry.js`, `js/sileo-bundle.js`, `js/app.js`):**
  - Toast background set to pure deep black (`#000000`, SVG fill `#000000`) with a darker drop shadow.
  - Interactive “Reply” button (`[data-sileo-button]`) with gradient styling and hover that opens the private chat with the sender.
  - Click handler on the whole toast (`[data-sileo-toast]`) also opens the chat when the content is tapped.

### Bug Fixes
- **Suppression of duplicate system notifications while the app is open (`js/app.js`, `sw.js`):**
  - In `showDmToast` (`js/app.js`), `showAppNotification` runs only when `document.visibilityState !== "visible"`.
  - In the service worker (`sw.js`), the `push` handler uses `clients.matchAll({ type: "window" })`; if any client has `visibilityState === "visible"`, `self.registration.showNotification` is skipped so only the Sileo in-app toast is shown.
  - Service Worker cache bumped to `wop-party-v5`.

---

## [2.0.6] - 2026-11-05 (Branch: `feat/ws-server`)

### New Features
- **Sileo toast (React-based in-app notifications) (`src/sileo-entry.js`, `js/sileo-bundle.js`, `js/app.js`):**
  - Full integration of the fluid React toast component `sileo` with spring physics animations and dark glassmorphism design.
  - Precompiled self-contained bundle (`js/sileo-bundle.js` & `js/sileo-bundle.css`) without CDN latency for full offline PWA support.
  - Incoming direct messages show an interactive Sileo action pill at the top (`💬 Name: Text…`) with an “Open” button that switches into the chat.
  - Service Worker precache extended with the Sileo bundle.
- **Automated SQLite backup script (`scripts/backup-db.sh`):**
  - Consistent online backup for SQLite in WAL mode (`.backup` / `VACUUM INTO`) with gzip compression and rotation of backups older than 14 days.

---

## [2.0.5] - 2026-11-05 (Branch: `feat/ws-server`)

### New Features
- **Real Web Push notifications (`server.js`, `database.js`, `sw.js` & `app.js`):**
  - Full W3C Web Push integration with automatic VAPID key management in SQLite (`server_settings`).
  - New table `push_subscriptions` for browser endpoints and encryption keys (`p256dh`, `auth`).
  - Incoming DMs are delivered via `sendWebPushNotification` even when the app is closed or the device is in standby.
  - Tapping the system push opens the PWA and navigates to the relevant chat.

### Bug Fixes
- **Realtime chat badge & inbox updates fixed (`js/wop-socket-client.js`, `js/app.js` & `server.js`):**
  - Added missing `orderBy` on `CollectionReference` (previously caused a `TypeError` and blocked the realtime listener).
  - Direct WebSocket hook on `dm:incoming` so the unread badge (`#hud-dm-badge`) and conversation list update live without opening the icon first.
  - `socket.join('user:<email>')` on the server for reliable user-room targeting.

---

## [2.0.4] - 2026-11-04 (Branch: `feat/ws-server`)

### Bug Fixes
- **Chat badge & unread counter corrected (`js/app.js`, `js/wop-socket-client.js`):**
  - The badge on the chat icon in the bottom nav (`#hud-dm-badge`) no longer shows the total number of open conversations; it counts truly unread messages via `/api/dm/unread-count`.
  - When unread is 0, the badge is fully hidden (`display: none`).
  - In the chat overview (`dm-inbox-list`) each conversation shows its own red badge with that contact’s unread count.
  - Opening a chat marks messages read via `POST /api/dm/mark-read` in SQLite (`read = 1`), so conversation and menu badges clear immediately.

---

## [2.0.3] - 2026-11-04 (Branch: `feat/ws-server`)

### New Features
- **Smoother play and confirmation flow (`js/app.js`):**
  - After submitting a truth answer or marking a dare done, the active player no longer has to confirm their own result again (“I confirm” / “Next”).
  - The active player is treated as already confirmed for the round (`nextTurnVotedPlayers = [targetPlayer]`).
  - The confirm button shows `✅ Done (Waiting for others…)` and only waits for the other players who are viewing the result.

---

## [2.0.2] - 2026-11-04 (Branch: `feat/ws-server`)

### New Features
- **Direct message inbox & chat overview (`server.js`, `database.js` & `app.js`):**
  - Implemented `getDmConversations(email)` and endpoint `/api/dm/conversations`.
  - The chat tab lists all past and new conversations sorted by date with avatar, live online status, text preview and unread count.
  - Chats can be opened by tapping the conversation or the “Open” button.

### Bug Fixes
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

### Bug Fixes
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

### New Features
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

### Bug Fixes
- **Firestore quota and latency lags removed:** Writing game actions to Cloud Firestore documents (`hostMessage`, `lobbyMessage`) replaced by native Socket.io room broadcasts.
- **Ghost online states fixed:** Players are no longer left as `isOnline: true` after closed tabs or dropped connections; the server updates presence via socket disconnect hooks.
- **Bottom nav hidden before login:** Main menu (`#app-bottom-nav`) is hidden for logged-out users and appears only after successful authentication.
- **PWA resource use optimized:** Heavy Firebase client libraries (`firebase-app-compat.js`, `firebase-firestore-compat.js`) removed from the frontend, reducing load time and bundle size.
