# Server- & Admin-Leitfaden für Lina

Willkommen auf dem Server für **Wahrheit oder Pflicht** (`www.wop.omoflow.de`)!
In diesem Dokument findest du alle wichtigen Schritte, um dich auf dem Server anzumelden, den Code zu aktualisieren und den Status der App zu überwachen.

---

## 1. Serverseitige Einrichtung durch den Server-Administrator (Christian)

*Diese Schritte führt Christian einmalig als `admin_ch` auf dem Server aus:*

```bash
# 1. Benutzer "lina" anlegen (wird nach Passwort gefragt):
sudo adduser lina

# 2. Gemeinsame Gruppe für Projekt-Berechtigungen erstellen:
sudo groupadd wop-admins
sudo usermod -aG wop-admins admin_ch
sudo usermod -aG wop-admins lina

# 3. Gruppenrechte für den Projektordner setzen:
sudo chown -R :wop-admins /var/www/wop
sudo chmod -R 775 /var/www/wop

# 4. Setgid-Bit setzen (neue Dateien erben automatisch die Gruppe wop-admins):
sudo chmod -R g+s /var/www/wop
```

*(Optional: Falls Lina `pm2` für ihren eigenen Benutzer nutzen soll oder den globalen PM2-Daemon teilen möchte, kann sie auf denselben Socket zugreifen oder mit `sudo -u admin_ch pm2 ...` arbeiten, oder Christian gibt ihr `sudo`-Rechte für pm2).*

---

## 2. Anleitung für Lina: So loggst du dich ein

Öffne ein Terminal (macOS / Linux) oder PowerShell (Windows) und gib ein:

```bash
ssh lina@<DEINE_SERVER_IP>
```

Gib bei der Passwortabfrage dein Passwort ein (die Eingabe bleibt unsichtbar, einfach tippen und `Enter` drücken).

---

## 3. Die wichtigsten Befehle

### 📁 In das Projektverzeichnis wechseln
```bash
cd /var/www/wop
```

---

### 🚀 Code aktualisieren (Git Pull) & Server neu starten
Wenn auf GitHub neuer Code gepusht wurde:

```bash
cd /var/www/wop
git pull
pm2 restart wop-server
```

---

### 📊 Status & Auslastung prüfen
```bash
pm2 status
```
*(Zeigt den Status `online`, CPU und RAM-Verbrauch des `wop-server` Prozesses an).*

---

### 📜 Live-Logs ansehen (Fehlersuche & Aktivität)
```bash
# Die letzten 50 Zeilen anzeigen:
pm2 logs wop-server --lines 50

# Live mitlesen (Beenden mit Strg + C):
pm2 logs wop-server
```

---

### 🔄 Prozess stoppen & neu starten
```bash
# Neustart:
pm2 restart wop-server

# Anhalten:
pm2 stop wop-server

# Wieder starten:
pm2 start ecosystem.config.cjs
```

---

## 4. Wichtige Projektinformationen

| Eigenschaft | Wert |
|---|---|
| **Domain** | `https://www.wop.omoflow.de` |
| **Server-Pfad** | `/var/www/wop` |
| **Backend-Port** | `3002` (intern via Nginx) |
| **Datenbank** | `/var/www/wop/wop.sqlite` (SQLite WAL) |
| **Git Branch** | `feat/ws-server` |
