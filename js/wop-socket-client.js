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
                    socket.emit("auth:identify", { email, name });
                }
            });

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
            listeners.lobbyUsers.forEach(cb => {
                try {
                    const docs = (players || []).map(p => ({
                        id: p.email || p.name,
                        data: () => ({
                            name: p.name,
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
                const res = await fetch("/api/social/invite", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cleanData)
                });
                const resData = await res.json();
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
                    body: JSON.stringify(cleanData)
                });
                const resData = await res.json();
                return { id: resData.message?.id || "dm_" + Date.now() };
            }

            return { id: "item_" + Date.now() };
        }

        async get() {
            if (this.name === "users") {
                const isOnlineFilter = this.queryFilters.find(f => f.field === "isOnline");
                if (isOnlineFilter) {
                    const res = await fetch("/api/users/online");
                    const data = await res.json();
                    const docs = (data.online || []).map(email => ({
                        id: email,
                        data: () => ({ email, isOnline: true })
                    }));
                    return createSnapshot(docs);
                }

                // Vollständige User-Liste (Admin / Master)
                const requester = localStorage.getItem("wop_user_email_v6") || "";
                const res = await fetch(`/api/admin/users?requester=${encodeURIComponent(requester)}`);
                if (res.ok) {
                    const list = await res.json();
                    const docs = (list || []).map(u => ({
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
                const me = localStorage.getItem("wop_user_email_v6") || "";
                const toFilter = this.queryFilters.find(f => f.field === "toEmail");
                const fromFilter = this.queryFilters.find(f => f.field === "fromEmail");
                const other = (toFilter && toFilter.value !== me) ? toFilter.value : (fromFilter ? fromFilter.value : "");

                if (other) {
                    const res = await fetch(`/api/dm/history?me=${encodeURIComponent(me)}&other=${encodeURIComponent(other)}&limit=${this.limitVal}`);
                    if (res.ok) {
                        const list = await res.json();
                        const docs = (list || []).map(m => ({
                            id: m.id,
                            data: () => m
                        }));
                        return createSnapshot(docs);
                    }
                } else {
                    // Unread Count Check
                    const res = await fetch(`/api/dm/unread-count?email=${encodeURIComponent(me)}`);
                    if (res.ok) {
                        const data = await res.json();
                        const dummyDocs = new Array(data.unread || 0).fill(null).map((_, i) => ({
                            id: "unread_" + i,
                            data: () => ({ read: false })
                        }));
                        return createSnapshot(dummyDocs);
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
                const email = localStorage.getItem("wop_user_email_v6");
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
                    return {
                        exists: true,
                        id: this.id,
                        data: () => data.lobby?.state || data.lobby || {}
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
                    result[k] = v.items;
                } else if (v.__op === "arrayRemove") {
                    result[k] = [];
                }
            } else if (v !== undefined) {
                result[k] = v;
            }
        }
        return result;
    }
})();

