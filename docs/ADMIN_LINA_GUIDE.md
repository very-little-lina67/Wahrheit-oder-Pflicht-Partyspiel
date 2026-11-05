# Schnell-Anleitung für Lina (Admin)

Willkommen im Admin-Bereich für **Wahrheit oder Pflicht** (`www.wop.omoflow.de`).  
Dieses Dokument enthält alle Befehle, die du für die Verwaltung des Servers auf deinem Smartphone (Termius) benötigst.

---

## ⚠️ Einmaliger Schritt: Git-Berechtigung setzen

Falls Git beim Aktualisieren meldet: `fatal: detected dubious ownership in repository at '/var/www/wop'`, führe diesen Befehl **einmalig** aus:

```bash
git config --global --add safe.directory /var/www/wop
```

Danach akzeptiert Git deine Befehle dauerhaft ohne Nachfrage.

---

## 🚀 1. App aktualisieren & neu starten

Sobald neuer Code oder Updates bereitstehen, führst du diesen Befehl aus:

```bash
cd /var/www/wop && git pull && sudo -u admin_ch pm2 restart wop-server
```

> **Wichtig:** Achte darauf, dass bei `sudo -u` kein Leerzeichen zwischen dem Minus und dem `u` steht. Dank der NOPASSWD-Regel wird kein Passwort abgefragt!

---

## 💾 2. Datenbank & Benutzer-Statistiken aus Backup wiederherstellen

Falls jemals Daten verloren gehen oder der Stand auf ein früheres Backup zurückgesetzt werden soll:

### A. Verfügbare Backups ansehen
```bash
ls -lh /var/backups/wop/
```
*(Zeigt dir alle verfügbaren Backups mit Datum, Uhrzeit und Dateigröße an).*

### B. Neuestes Backup automatisch wiederherstellen
```bash
/var/www/wop/scripts/restore-db.sh
```
*(Das Skript stoppt den Server sicher, bereinigt temporäre WAL-Dateien, stellt die Datenbank wieder her und startet den Server automatisch neu).*

### C. Ein ganz bestimmtes früheres Backup wiederherstellen
Falls du nicht das letzte, sondern ein älteres Backup einspielen möchtest:
```bash
/var/www/wop/scripts/restore-db.sh /var/backups/wop/wop_JAHR-MONAT-TAG_UHRZEIT.sqlite.gz
```

---

## 📊 3. Server-Status & Fehler-Logs prüfen

### Status & Speicherauslastung anzeigen
```bash
sudo -u admin_ch pm2 status
```
*(Zeigt an, ob `wop-server` online ist, wie viel RAM belegt wird und wie viele Neustarts stattfanden).*

### Die letzten Meldungen / Logs ansehen
```bash
sudo -u admin_ch pm2 logs wop-server --lines 30
```
*(Zeigt die letzten 30 Server-Meldungen an).*

---

## 📱 Tipp für Termius (Smartphone): Schnellzugriff-Buttons

Du kannst dir diese Befehle in der **Termius-App** unter **„Snippets“** als Buttons anlegen:

| Snippet-Name | Befehl |
|---|---|
| **Update & Restart** | `cd /var/www/wop && git pull && sudo -u admin_ch pm2 restart wop-server` |
| **Status prüfen** | `sudo -u admin_ch pm2 status` |
| **Backup wiederherstellen** | `/var/www/wop/scripts/restore-db.sh` |
