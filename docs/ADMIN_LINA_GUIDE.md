# Server- & Admin-Leitfaden für Lina

Willkommen auf dem Server für **Wahrheit oder Pflicht** (`www.wop.omoflow.de`)!
In diesem Dokument findest du alle wichtigen Schritte, um dich auf dem Server anzumelden, den Code zu aktualisieren und den Status der App zu überwachen.

---

## 1. Serverseitige Einrichtung durch den Server-Administrator (Christian)

*Diese Schritte führt Christian einmalig als `admin_ch` auf dem Server aus:*

### A. Benutzerin „lina“ anlegen & Startpasswort setzen
```bash
# 1. Benutzer "lina" anlegen (Startpasswort vergeben):
sudo adduser lina

# 2. Passwort beim ersten Login zwingend ändern lassen:
sudo passwd -e lina
```
*(Dadurch wird Lina beim allerersten SSH-Login direkt aufgefordert, ihr eigenes geheimes Passwort zu wählen).*

### B. Zugriffsrechte für den Projektordner vergeben
```bash
# 3. Gemeinsame Gruppe für Projekt-Berechtigungen erstellen:
sudo groupadd wop-admins
sudo usermod -aG wop-admins admin_ch
sudo usermod -aG wop-admins lina

# 4. Gruppenrechte für den Projektordner setzen:
sudo chown -R :wop-admins /var/www/wop
sudo chmod -R 775 /var/www/wop

# 5. Setgid-Bit setzen (neue Dateien erben automatisch die Gruppe wop-admins):
sudo chmod -R g+s /var/www/wop
```

### C. PM2-Rechte ohne Passwortabfrage (NOPASSWD) einrichten
Damit Lina den Server-Prozess `wop-server` via PM2 steuern kann, **ohne Christians Passwort eingeben zu müssen**, wird eine gezielte Sudoers-Regel hinterlegt:

```bash
# Sudoers-Konfiguration für Lina anlegen:
echo "lina ALL=(admin_ch) NOPASSWD: /usr/local/bin/pm2, /usr/bin/pm2" | sudo tee /etc/sudoers.d/lina-pm2
sudo chmod 0440 /etc/sudoers.d/lina-pm2
```

*(Lina kann ab sofort `sudo -u admin_ch pm2 restart wop-server` komplett passwortfrei ausführen).*

---

## 2. Anleitung für Lina: SSH-Zugriff auf dem Android-Smartphone

Lina kann den Server bequem direkt vom Android-Handy aus steuern. Dafür wird die kostenlose und sichere App **Termius** empfohlen.

### Schritt 1: App herunterladen
- Öffne den **Google Play Store** auf deinem Smartphone.
- Suche nach **„Termius – SSH / SFTP and Telnet Client“** (oder alternativ **„JuiceSSH“**).
- Installiere und starte die App.

### Schritt 2: Server-Verbindung einrichten
1. Tippe in Termius unten rechts auf das **`+`**-Symbol und wähle **„New Host“**.
2. Fülle folgende Felder aus:
   - **Alias / Label:** `WOP Server` (Name frei wählbar)
   - **Hostname:** Die IP-Adresse deines Servers oder deine Domain (z. B. `wop.omoflow.de`)
   - **Port:** `22` (Standard)
   - **Username:** `lina`
   - **Password:** Dein Startpasswort (von Christian)
3. Tippe oben rechts auf das Häkchen bzw. **„Save“**.

### Schritt 3: Erstes Anmelden & eigenes Passwort vergeben
1. Tippe auf den Eintrag **„WOP Server“**.
2. Es erscheint eine Sicherheitsabfrage zum Host-Schlüssel: Tippe auf **„Accept“** / **„Continue“**.
3. Da Christian dein Startpasswort als temporär markiert hat, fordert dich das Terminal direkt auf:
   - `Current password:` Tippe das Startpasswort ein und drücke Enter (Hinweis: Die Eingabe von Passwörtern im Terminal ist unsichtbar).
   - `New password:` Tippe dein neues, privates Wunschpasswort ein und drücke Enter.
   - `Retype new password:` Wiederhole dein neues Passwort und drücke Enter.
4. Fertig! Du bist nun mit dem Server verbunden.

---

## 3. Die wichtigsten Befehle für Lina

### 📁 In den Projektordner wechseln
```bash
cd /var/www/wop
```

---

### 🚀 Code aktualisieren & Server neu starten
Sobald Änderungen auf GitHub hochgeladen wurden, führst du folgende Zeilen aus:

```bash
cd /var/www/wop
git pull
sudo -u admin_ch pm2 restart wop-server
```

*(Dank der NOPASSWD-Regel wird dabei kein Passwort abgefragt).*

---

### 📊 Server-Status & Auslastung prüfen
```bash
sudo -u admin_ch pm2 status
```
Zeigt an, ob `wop-server` den Status **online** hat, wie viel RAM verbraucht wird und wie lange er läuft.

---

### 📜 Live-Logs ansehen (Fehlersuche & Aktivität)
```bash
# Die letzten 50 Log-Zeilen ansehen:
sudo -u admin_ch pm2 logs wop-server --lines 50

# Live-Stream der Logs (Beenden mit Strg + C):
sudo -u admin_ch pm2 logs wop-server
```

---

### 💡 Tipp für Android (Termius Snippets / Schnellzugriff)
In Termius kannst du unter **„Snippets“** einen Kurzbefehl anlegen:
- Name: `Update & Restart`
- Befehl: `cd /var/www/wop && git pull && sudo -u admin_ch pm2 restart wop-server`

Damit genügt auf dem Smartphone künftig ein einziger Fingertipp, um den neuesten Code zu ziehen und die App neu zu starten!

---

## 4. Wichtige Projektinformationen

| Eigenschaft | Wert |
|---|---|
| **Domain** | `https://www.wop.omoflow.de` |
| **Server-Pfad** | `/var/www/wop` |
| **Backend-Port** | `3002` (intern via Nginx) |
| **Datenbank** | `/var/www/wop/wop.sqlite` (SQLite WAL) |
| **Git Branch** | `feat/ws-server` |
