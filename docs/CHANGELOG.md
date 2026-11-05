# Changelog: Wahrheit oder Pflicht

Alle wesentlichen Änderungen am Projekt werden in dieser Datei präzise und technisch dokumentiert.

---

## [2.0.18] - 2026-11-05

### Fixes
- **Erfolge:** Wieder die klassischen, erreichbaren Namen (Erste Schritte, 10/25/50 Pflichten, Wahrheiten, Streaks, Aufgaben, Partystufe, Coins, Party-Animal). Ribbon-UI und Stufen bleiben. Ziele sind spielbar (nicht unerreichbar).

### Misc
- Version **2.0.18**.

---

## [2.0.17] - 2026-11-05

### Fixes / UX
- **E-Mail-Code nur per Mail:** Bestätigungscode wird **nicht** in der App angezeigt. Nur „Code an deine E-Mail gesendet“. Erneut senden ebenfalls nur per Mail (SMTP erforderlich).
- **Online-Status im Profil:** Pill zeigt den aktuellen Status (Online / Abwesend / Bitte nicht stören / Offline), Auswahl bleibt aktiv und wird lokal gespeichert.
- **Erfolge wie im Screenshot:** Ribbon-Trophäen-Grid mit den Namen aus dem Profil-Design (AUSDAUER-MEISTER, TRINK-PROFI, WINDEL-STAMMGAST, …, LAST ONE STANDING, SYNCHRON-CHAMPION). Standardmäßig eingeklappt, öffnen per Button, Klick zeigt Fortschritt bis zur Freischaltung.

### Misc
- Version und Cache-Busting auf **2.0.17**.

---

## [2.0.16] - 2026-11-05

### New Features
- **Echte E-Mail-Pflicht + Bestätigungscode** (`server.js`, `database.js`, `js/app.js`): Format-Check, Wegwerf-Domains blockiert, MX/DNS-Prüfung, 6-stelliger Code, Login erst nach Bestätigung. Optional SMTP.
- **Erfolge mit Stufen** und kompakter Online-Status-Pill (Grundlage).

### Misc
- Version **2.0.16**.

---

## [2.0.15] - 2026-11-05

### UX
- Online-Status UI vollständig DE/EN.

### Misc
- Version **2.0.15**.
