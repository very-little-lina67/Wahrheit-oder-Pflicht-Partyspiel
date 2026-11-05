/**
 * ==============================================================================
 * WAHRHEIT ODER PFLICHT - WEBSOCKET & REST CLIENT ADAPTER
 * ==============================================================================
 * Ersetzt das Firebase-SDK vollständig durch:
 * - Socket.io für latenzfreie Echtzeit-Kommunikation (< 15ms)
 * - REST-API für Benutzerkonten, Profile, Freundschaften, DMs und Admin
 * - 100% kompatible Schnittstelle für nahtlosen Spielbetrieb
 * ==============================================================================
 */

(function () {
    // 1. Socket.io Verbindung initialisieren
    let socket = null;
    try {
        if (typeof io !== "undefined") {
            socket = io({
                reconnection: true,
                reconnectionAttempts: 20,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000
            });

            socket.on("connect", () => {
                console.log("✅ WebSocket verbunden mit WOP-Server [ID:", socket.id + "]");
                const email = localStorage.getItem("wop_user_email_v6");
                const name = localStorage.getItem("wop_user_name_v6");
                if (email) {
                    socket.emit("auth:identify", {
                        email,
                        name,
                        isVisible: document.visibilityState === "visible"
                    });
                }
            });

            // Sichtbarkeitsstatus an Server übermitteln (unterdrückt System-Push wenn App im Vordergrund ist)
            const reportVisibility = () => {
                if (socket && socket.connected) {
                    socket.emit("user:visibility", {
                        isVisible: document.visibilityState === "visible"
                    });
                }
            };
            document.addEventListener("visibilitychange", reportVisibility);
            window.addEventListener("focus", reportVisibility);
            window.addEventListener("pageshow", reportVisibility);

            socket.on("disconnect", (reason) => {
                console.warn("⚠️ WebSocket getrennt:", reason);
            });

            socket.on("connect_error", (err) => {
                console.warn("WebSocket Verbindungsfehler:", err.message);
            });
        } else {
            console.warn("⚠️ Socket.io Client-Bibliothek nicht verfügbar. Fallback auf REST.");
        }
    } catch (e) {
        console.error("Fehler bei Socket.io Initialisierung:", e);
    }

    window.wopSocket = socket;

    // Globale Identifikation für Socket.io (bei Login oder Reconnect aufrufbar)
    window.wopIdentify = function(email, name, currentLobby = "") {
        if (!email) return;
        if (socket && socket.connected) {
            socket.emit("auth:identify", {
                email,
                name: name || "Spieler",
                currentLobby,
                isVisible: document.visibilityState === "visible"
            });
        }
    };

    // 2. Firebase FieldValue Kompatibilität
    window.firebase = {
        apps: [{ name: "[DEFAULT]" }],
        initializeApp: () => {},
        firestore: Object.assign(() => window.db, {
            FieldValue: {
                serverTimestamp: () => new Date().toISOString(),
                delete: () => undefined,
                arrayUnion: (...items) => ({ __op: "arrayUnion", items }),
                arrayRemove: (...items) => ({ __op: "arrayRemove", items })
            },
            setLogLevel: () => {}
        })
    };

    // Callback-Register für Snapshot-Listener
    const listeners = {
        invites: new Set(),
        friendRequests: new Set(),
        directMessages: new Set(),
        lobbyUsers: new Set(),
        lobbyHost: new Set(),
        lobbyState: new Set(),
        friends: new Set()
    };

    // Socket Event-Verteilung auf registrierte Snapshot-Listener
    if (socket) {
        socket.on("social:invite_received", (invite) => {
            listeners.invites.forEach(cb => {
                try {
                    cb({
                        docChanges: () => [{
                            type: "added",
                            doc: { id: invite.id, data: () => invite }
                        }],
                        docs: [{ id: invite.id, data: () => invite }]
                    });
                } catch (e) { console.error(e); }
            });
        });

        socket.on("social:friend_request_received", (req) => {
            listeners.friendRequests.forEach(cb => {
                try {
                    cb({
                        docs: [{ id: req.id, data: () => req }]
                    });
                } catch (e) { console.error(e); }
            });
        });

        socket.on("social:friends_updated", () => {
            listeners.friends.forEach(cb => {
                try { cb(); } catch (e) {}
            });
        });

        // Live Presence (online / away / dnd / offline) – sofort überall
        socket.on("social:presence", (payload) => {
            try {
                window.dispatchEvent(new CustomEvent("wop:presence", { detail: payload || {} }));
            } catch (e) { /* ignore */ }
            listeners.friends.forEach(cb => {
                try { cb(); } catch (e) {}
            });
        });

        socket.on("dm:incoming", (msg) => {
            listeners.directMessages.forEach(cb => {
                try {
                    cb({
                        docChanges: () => [{
                            type: "added",
                            doc: { id: msg.id, data: () => msg }
                        }],
                        docs: [{ id: msg.id, data: () => msg }]
                    });
                } catch (e) { console.error(e); }
            });
        });

        socket.on("lobby:players_updated", ({ players }) => {
            if (typeof window.handleIncomingData === "function") {
                window.handleIncomingData({ type: "UPDATE_PLAYERS", players });
            }
            listeners.lobbyUsers.forEach(cb => {
                try {
                    const docs = (players || []).map(p => ({
                        id: p.email || p.name,
                        data: () => ({
                            name: p.name,
                            displayName: p.name,
                            accessory: p.accessory,
                            eliminated: p.eliminated,
                            isSpectator: p.isSpectator,
                            currentLobby: window.activeLobbyCode || ""
                        })
                    }));
                    cb({
                        forEach: (fn) => docs.forEach(fn),
                        docs
                    });
                } catch (e) { console.error(e); }
            });
        });

        socket.on("lobby:data", (data) => {
            // Direkte Weiterleitung an handleIncomingData, falls vorhanden
            if (typeof window.handleIncomingData === "function") {
                window.handleIncomingData(data);
            }
            listeners.lobbyHost.forEach(cb => {
                try {
                    cb({
                        exists: true,
                        data: () => ({
                            currentLobby: window.activeLobbyCode || "",
                            hostMessage: { seq: Date.now(), data, recent: [{ seq: Date.now(), data }] }
                        })
                    });
                } catch (e) { console.error(e); }
            });
        });

        socket.on("lobby:state", (state) => {
            listeners.lobbyState.forEach(cb => {
                try {
                    cb({
                        exists: true,
                        data: () => state
                    });
                } catch (e) { console.error(e); }
            });
        });
    }

    // 3. Database Adapter
    window.db = {
        settings: () => {},
        batch: () => ({
            update: () => {},
            set: () => {},
            delete: () => {},
            commit: async () => {}
        }),
        collection: (collectionName) => {
            return new CollectionReference(collectionName);
        }
    };

    class CollectionReference {
        constructor(name, queryFilters = []) {
            this.name = name;
            this.queryFilters = queryFilters;
            this.limitVal = 100;
        }

        where(field, op, value) {
            return new CollectionReference(this.name, [...this.queryFilters, { field, op, value }]);
        }

        orderBy(field, direction = "asc") {
            this.orderByField = field;
            this.orderDirection = direction;
            return this;
        }

        limit(n) {
            this.limitVal = n;
            return this;
        }

        doc(docId) {
            return new DocumentReference(this.name, docId);
        }

        async add(data) {
            const cleanData = processFieldValues(data);
            if (this.name === "feedback") {
                const res = await fetch("/api/feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cleanData)
                });
                const resData = await res.json();
                return { id: resData.id || "fb_" + Date.now() };
            }

            if (this.name === "invites") {
                if (!cleanData.fromEmail) {
                    cleanData.fromEmail = localStorage.getItem("wop_user_email_v6") || "";
                }
                const res = await fetch("/api/social/invite", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cleanData)
                });
                const resData = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(resData.error || "Fehler beim Senden der Einladung");
                }
                return { id: resData.invite?.id || "inv_" + Date.now() };
            }

            if (this.name === "friendRequests") {
                const res = await fetch("/api/social/friend-request", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cleanData)
                });
                const resData = await res.json();
                return { id: resData.request?.id || "fr_" + Date.now() };
            }

            if (this.name === "directMessages") {
                const res = await fetch("/api/dm/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fromEmail: cleanData.fromEmail,
                        fromName: cleanData.fromName || "",
                        toEmail: cleanData.toEmail,
                        text: cleanData.text
                    })
                });
                const resData = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(resData.error || ("DM send failed: HTTP " + res.status));
                }
                const msg = resData.message || resData;
                return { id: msg.id || ("dm_" + Date.now()), message: msg };
            }

            return { id: "item_" + Date.now() };
        }

        async get() {
            if (this.name === "users") {
                const currentLobbyFilter = this.queryFilters.find(f => f.field === "currentLobby");
                if (currentLobbyFilter) {
                    const lobbyCode = String(currentLobbyFilter.value || "").trim().toLowerCase();
                    try {
                        const res = await fetch(`/api/lobby/${encodeURIComponent(lobbyCode)}`);
                        if (res.ok) {
                            const data = await res.json();
                            const lobby = data.lobby;
                            if (lobby) {
                                const docs = [];
                                if (lobby.hostEmail) {
                                    docs.push({
                                        id: lobby.hostEmail,
                                        data: () => ({
                                            email: lobby.hostEmail,
                                            name: lobby.hostName || "Host",
                                            displayName: lobby.hostName || "Host",
                                            lobbyRole: "host",
                                            currentLobby: lobbyCode,
                                            lobbyHostEmail: lobby.hostEmail,
                                            isOnline: true
                                        })
                                    });
                                }
                                (lobby.players || []).forEach(p => {
                                    if (p.email && p.email.toLowerCase() === (lobby.hostEmail || "").toLowerCase()) {
                                        return;
                                    }
                                    docs.push({
                                        id: p.email || p.name,
                                        data: () => ({
                                            ...p,
                                            name: p.name,
                                            displayName: p.name,
                                            lobbyRole: p.isSpectator ? "spectator" : "player",
                                            currentLobby: lobbyCode,
                                            lobbyHostEmail: lobby.hostEmail,
                                            isOnline: true
                                        })
                                    });
                                });
                                return createSnapshot(docs);
                            }
                        }
                    } catch (e) {
                        console.warn("Fehler beim Abruf von Lobby-Nutzern:", e);
                    }
                    return createSnapshot([]);
                }

                const isOnlineFilter = this.queryFilters.find(f => f.field === "isOnline");
                if (isOnlineFilter) {
                    const res = await fetch("/api/users/online");
                    const data = await res.json();
                    const userList = (Array.isArray(data.users) && data.users.length)
                        ? data.users
                        : (data.online || []).map(email => ({ email, isOnline: true }));
                    const docs = userList.map(u => ({
                        id: u.email,
                        data: () => u
                    }));
                    return createSnapshot(docs);
                }

                // Rangliste / User-Liste: öffentlicher Endpoint (inkl. monthlyCoins)
                // Fallback auf Admin-Endpoint falls vorhanden
                let list = null;
                try {
                    const lbRes = await fetch("/api/leaderboard");
                    if (lbRes.ok) {
                        list = await lbRes.json();
                    }
                } catch (e) {}
                if (!list) {
                    const requester = localStorage.getItem("wop_user_email_v6") || "";
                    const res = await fetch(`/api/admin/users?requester=${encodeURIComponent(requester)}`);
                    if (res.ok) {
                        list = await res.json();
                    }
                }
                if (list && Array.isArray(list)) {
                    const docs = list.map(u => ({
                        id: u.email,
                        data: () => u
                    }));
                    return createSnapshot(docs);
                }
                return createSnapshot([]);
            }

            if (this.name === "feedback") {
                const requester = localStorage.getItem("wop_user_email_v6") || "";
                const res = await fetch(`/api/admin/feedback?requester=${encodeURIComponent(requester)}`);
                if (res.ok) {
                    const list = await res.json();
                    const docs = (list || []).map(fb => ({
                        id: fb.id,
                        data: () => fb
                    }));
                    return createSnapshot(docs);
                }
                return createSnapshot([]);
            }

            if (this.name === "friendRequests") {
                const toEmailFilter = this.queryFilters.find(f => f.field === "toEmail");
                const email = toEmailFilter ? toEmailFilter.value : (localStorage.getItem("wop_user_email_v6") || "");
                const res = await fetch(`/api/social/requests?email=${encodeURIComponent(email)}`);
                if (res.ok) {
                    const list = await res.json();
                    const docs = (list || []).map(r => ({
                        id: r.id,
                        data: () => r
                    }));
                    return createSnapshot(docs);
                }
                return createSnapshot([]);
            }

            if (this.name === "directMessages") {
                const me = (localStorage.getItem("wop_user_email_v6") || "").trim().toLowerCase();
                const toFilter = this.queryFilters.find(f => f.field === "toEmail");
                const fromFilter = this.queryFilters.find(f => f.field === "fromEmail");
                const readFilter = this.queryFilters.find(f => f.field === "read");

                const toVal = toFilter ? String(toFilter.value).trim().toLowerCase() : "";
                const fromVal = fromFilter ? String(fromFilter.value).trim().toLowerCase() : "";
                const other = (toVal && toVal !== me) ? toVal : (fromVal && fromVal !== me ? fromVal : "");

                if (other) {
                    const res = await fetch(`/api/dm/history?me=${encodeURIComponent(me)}&other=${encodeURIComponent(other)}&limit=${this.limitVal || 50}`);
                    if (res.ok) {
                        const list = await res.json();
                        const docs = (list || []).map(m => ({
                            id: m.id,
                            data: () => ({
                                ...m,
                                createdAt: { toMillis: () => Date.parse(m.createdAt) || 0, toDate: () => new Date(m.createdAt) }
                            })
                        }));
                        return createSnapshot(docs);
                    }
                } else if (readFilter && (readFilter.value === false || readFilter.value === 0)) {
                    // Ungelesene Nachrichten abfragen
                    const res = await fetch(`/api/dm/unread-count?email=${encodeURIComponent(me)}`);
                    if (res.ok) {
                        const data = await res.json();
                        const count = data.unread || 0;
                        const docs = Array.from({ length: count }, (_, idx) => ({
                            id: `unread_${idx}`,
                            data: () => ({ read: false, toEmail: me })
                        }));
                        return createSnapshot(docs);
                    }
                } else {
                    // Konversationen / Posteingang abrufen
                    const res = await fetch(`/api/dm/conversations?email=${encodeURIComponent(me)}`);
                    if (res.ok) {
                        const list = await res.json();
                        const docs = (list || []).map(m => ({
                            id: m.id,
                            data: () => ({
                                ...m,
                                toName: m.partnerName,
                                fromName: m.partnerName,
                                createdAt: { toMillis: () => Date.parse(m.createdAt) || 0, toDate: () => new Date(m.createdAt) }
                            })
                        }));
                        return createSnapshot(docs);
                    }
                }
                return createSnapshot([]);
            }

            return createSnapshot([]);
        }

        onSnapshot(callback) {
            if (this.name === "invites") {
                listeners.invites.add(callback);
                // Initialer Abruf
                const toEmailFilter = this.queryFilters.find(f => f.field === "toEmail");
                const email = toEmailFilter ? toEmailFilter.value : (localStorage.getItem("wop_user_email_v6") || "");
                if (email) {
                    fetch(`/api/social/invites?email=${encodeURIComponent(email)}`)
                        .then(r => r.json())
                        .then(list => {
                            if (Array.isArray(list) && list.length) {
                                callback({
                                    docChanges: () => list.map(inv => ({
                                        type: "added",
                                        doc: { id: inv.id, data: () => inv }
                                    })),
                                    docs: list.map(inv => ({ id: inv.id, data: () => inv }))
                                });
                            }
                        }).catch(() => {});
                }
                return () => listeners.invites.delete(callback);
            }

            if (this.name === "friendRequests") {
                listeners.friendRequests.add(callback);
                return () => listeners.friendRequests.delete(callback);
            }

            if (this.name === "directMessages") {
                listeners.directMessages.add(callback);
                return () => listeners.directMessages.delete(callback);
            }

            if (this.name === "users") {
                listeners.lobbyUsers.add(callback);
                return () => listeners.lobbyUsers.delete(callback);
            }

            return () => {};
        }
    }

    class DocumentReference {
        constructor(collectionName, docId) {
            this.collectionName = collectionName;
            this.id = docId;
        }

        async get() {
            if (this.collectionName === "users") {
                const res = await fetch(`/api/user/profile?email=${encodeURIComponent(this.id)}`);
                if (res.ok) {
                    const data = await res.json();
                    return {
                        exists: true,
                        id: this.id,
                        data: () => data
                    };
                }
                return { exists: false, id: this.id, data: () => null };
            }

            if (this.collectionName === "lobbies") {
                const res = await fetch(`/api/lobby/${encodeURIComponent(this.id)}`);
                if (res.ok) {
                    const data = await res.json();
                    const l = data.lobby || {};
                    return {
                        exists: true,
                        id: this.id,
                        data: () => ({
                            ...(l.state || {}),
                            ...l,
                            code: this.id,
                            hostEmail: l.hostEmail || ""
                        })
                    };
                }
                return { exists: false, id: this.id, data: () => null };
            }

            return { exists: false, id: this.id, data: () => null };
        }

        async set(data, options = {}) {
            const cleanData = processFieldValues(data);

            if (this.collectionName === "users") {
                // Host / Client Nachrichten sofort über Socket senden, wenn vorhanden
                if (cleanData.hostMessage && socket && window.activeLobbyCode) {
                    socket.emit("lobby:data", {
                        code: window.activeLobbyCode,
                        data: cleanData.hostMessage.data
                    });
                }
                if (cleanData.lobbyMessage && socket && window.activeLobbyCode) {
                    socket.emit("lobby:data", {
                        code: window.activeLobbyCode,
                        data: cleanData.lobbyMessage.data
                    });
                }

                // Freundschaftsänderungen direkt synchronisieren
                if (data.friends && typeof data.friends === "object") {
                    if (data.friends.__op === "arrayUnion") {
                        const items = Array.isArray(data.friends.items) ? data.friends.items : [];
                        for (const f of items) {
                            fetch("/api/social/accept-request", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userEmail: this.id, friendEmail: f })
                            }).catch(() => {});
                        }
                    } else if (data.friends.__op === "arrayRemove") {
                        const items = Array.isArray(data.friends.items) ? data.friends.items : [];
                        for (const f of items) {
                            fetch("/api/social/remove-friend", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userEmail: this.id, friendEmail: f })
                            }).catch(() => {});
                        }
                    }
                }

                // Profil in SQLite sichern
                await fetch("/api/user/profile", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: this.id, ...cleanData })
                });
                return;
            }

            if (this.collectionName === "lobbies") {
                if (socket && socket.connected) {
                    socket.emit("lobby:state_sync", {
                        code: this.id,
                        state: cleanData
                    });
                }
                return;
            }
        }

        async update(data) {
            return this.set(data, { merge: true });
        }

        async delete() {
            if (this.collectionName === "invites") {
                await fetch(`/api/social/invite/${encodeURIComponent(this.id)}`, { method: "DELETE" });
                return;
            }
            if (this.collectionName === "feedback") {
                const requester = localStorage.getItem("wop_user_email_v6") || "";
                await fetch(`/api/admin/feedback/${encodeURIComponent(this.id)}?requester=${encodeURIComponent(requester)}`, { method: "DELETE" });
                return;
            }
            if (this.collectionName === "friendRequests") {
                await fetch("/api/social/decline-request", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reqId: this.id })
                });
                return;
            }
            if (this.collectionName === "users") {
                const requester = localStorage.getItem("wop_user_email_v6") || "";
                await fetch("/api/admin/user", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ requester, email: this.id })
                });
                return;
            }
        }

        onSnapshot(callback) {
            if (this.collectionName === "lobbies") {
                listeners.lobbyState.add(callback);
                // Einmaligen initialen Stand holen
                this.get().then(snap => {
                    if (snap.exists) callback(snap);
                }).catch(() => {});
                return () => listeners.lobbyState.delete(callback);
            }

            if (this.collectionName === "users") {
                listeners.lobbyHost.add(callback);
                return () => listeners.lobbyHost.delete(callback);
            }

            return () => {};
        }
    }

    function createSnapshot(docs) {
        return {
            empty: docs.length === 0,
            size: docs.length,
            docs: docs,
            forEach: (fn) => docs.forEach(fn)
        };
    }

    function processFieldValues(obj) {
        if (!obj || typeof obj !== "object") return obj;
        const result = Array.isArray(obj) ? [] : {};
        for (const [k, v] of Object.entries(obj)) {
            if (v && typeof v === "object" && v.__op) {
                // FieldValue Operation
                if (v.__op === "arrayUnion") {
                    result[k + "ToAdd"] = v.items;
                    result[k] = v.items;
                } else if (v.__op === "arrayRemove") {
                    result[k + "ToRemove"] = v.items;
                    result[k] = [];
                }
            } else if (v !== undefined) {
                result[k] = v;
            }
        }
        return result;
    }

    // ==============================================================================
    // 4. CUSTOM DESIGN DIALOG POPUPS (Ersetzt Browser alert & confirm)
    // ==============================================================================
    const dialogQueue = [];
    let isDialogOpen = false;

    function detectIcon(msg, isConfirm) {
        if (!msg) return isConfirm ? "❓" : "ℹ️";
        if (msg.includes("🚨") || msg.includes("⚠️") || msg.includes("Achtung") || msg.includes("unwiderruflich")) return "⚠️";
        if (msg.includes("🎉") || msg.includes("Erfolgreich") || msg.includes("erfolgreich") || msg.includes("bestätigt")) return "🎉";
        if (msg.includes("❌") || msg.includes("Fehler") || msg.includes("Error") || msg.includes("fehlgeschlagen")) return "❌";
        if (msg.includes("👥") || msg.includes("Freund")) return "👥";
        if (msg.includes("💬") || msg.includes("Chat")) return "💬";
        if (msg.includes("🚀") || msg.includes("Lobby")) return "🚀";
        if (msg.includes("🗑️") || msg.includes("löschen")) return "🗑️";
        return isConfirm ? "❓" : "ℹ️";
    }

    function detectTitle(msg, isConfirm) {
        const isEn = (window.currentLang === "en");
        if (isConfirm) return isEn ? "Confirmation" : "Bestätigung";
        if (msg && (msg.includes("Fehler") || msg.includes("Error"))) return isEn ? "Error" : "Hinweis";
        if (msg && (msg.includes("Erfolgreich") || msg.includes("Success"))) return isEn ? "Success" : "Erfolg";
        return isEn ? "Notification" : "Hinweis";
    }

    window.customAlert = function (message, customTitle) {
        return new Promise((resolve) => {
            dialogQueue.push({
                type: "alert",
                message: String(message || ""),
                title: customTitle,
                resolve
            });
            processNextDialog();
        });
    };

    window.customConfirm = function (message, customTitle) {
        return new Promise((resolve) => {
            dialogQueue.push({
                type: "confirm",
                message: String(message || ""),
                title: customTitle,
                resolve
            });
            processNextDialog();
        });
    };

    // Globalen alert überschreiben
    window.alert = function (msg) {
        window.customAlert(msg);
    };

    function processNextDialog() {
        if (isDialogOpen || dialogQueue.length === 0) return;
        const current = dialogQueue.shift();
        isDialogOpen = true;

        const overlay = document.getElementById("wop-custom-dialog-overlay");
        const iconEl = document.getElementById("wop-dialog-icon");
        const titleEl = document.getElementById("wop-dialog-title");
        const msgEl = document.getElementById("wop-dialog-msg");
        const okBtn = document.getElementById("wop-dialog-ok");
        const cancelBtn = document.getElementById("wop-dialog-cancel");

        if (!overlay || !msgEl || !okBtn) {
            console.log("Dialog fallback:", current.message);
            isDialogOpen = false;
            current.resolve(true);
            return;
        }

        const isConfirm = current.type === "confirm";
        const isEn = (window.currentLang === "en");

        if (iconEl) iconEl.textContent = detectIcon(current.message, isConfirm);
        if (titleEl) titleEl.textContent = current.title || detectTitle(current.message, isConfirm);
        msgEl.textContent = current.message;

        if (isConfirm) {
            if (cancelBtn) {
                cancelBtn.style.display = "block";
                cancelBtn.textContent = isEn ? "Cancel" : "Abbrechen";
            }
            okBtn.textContent = isEn ? "Confirm" : "Bestätigen";
            okBtn.className = "wop-dialog-btn wop-dialog-btn-primary";
        } else {
            if (cancelBtn) cancelBtn.style.display = "none";
            okBtn.textContent = isEn ? "OK" : "Verstanden";
            okBtn.className = "wop-dialog-btn wop-dialog-btn-primary";
        }

        overlay.style.display = "flex";
        overlay.classList.add("active");
        overlay.setAttribute("aria-hidden", "false");

        const cleanup = (result) => {
            overlay.classList.remove("active");
            overlay.setAttribute("aria-hidden", "true");
            overlay.style.display = "none";
            okBtn.onclick = null;
            if (cancelBtn) cancelBtn.onclick = null;
            document.removeEventListener("keydown", keyHandler);
            isDialogOpen = false;
            current.resolve(result);
            setTimeout(processNextDialog, 80);
        };

        const keyHandler = (e) => {
            if (e.key === "Escape") {
                cleanup(false);
            } else if (e.key === "Enter") {
                cleanup(true);
            }
        };

        okBtn.onclick = () => cleanup(true);
        if (cancelBtn) cancelBtn.onclick = () => cleanup(false);
        document.addEventListener("keydown", keyHandler);
        okBtn.focus();
    }
})();

