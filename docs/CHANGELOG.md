# Changelog: Wahrheit oder Pflicht

Alle wesentlichen Änderungen an diesem Projekt.

---

## [2.0.37] - 2026-11-09

### Neue Features / Verbesserungen
- **Vollständige Unterstützung für Französisch (fr) und Niederländisch (nl):**
  - Komplette Übersetzungsobjekte `fr` und `nl` in `js/app.js` (UI, Shop, Profil, Lobby, Spielablauf, Chat, Feedback und Glücksrad-Sektoren).
  - Sprachauswahl (Auth-Modal + In-App) bietet jetzt 🇩🇪 Deutsch, 🇬🇧 English, 🇫🇷 Français, 🇳🇱 Nederlands.
  - Spracherkennung/Persistenz akzeptiert `fr` und `nl`; Array `SUPPORTED_LANGS` eingeführt.
  - Titel, Helfer (`msg`, `getUserDisplayName`) und Fallbacks auf vier Sprachen erweitert, sodass beim Sprachwechsel die gesamte Oberfläche übersetzt wird und nicht nur die Hälfte.
- Changelog- und Regelwerk-Seiten um die zusätzlichen Sprachen erweitert.

### Sonstiges
- Version auf **2.0.37** angehoben; Cache-Busting-Query-Parameter auf `?v=2.0.37` aktualisiert.

---
