#!/usr/bin/env bash
# ==============================================================================
# Automatisiertes SQLite-Backup für Wahrheit oder Pflicht (WAL-Mode Safe)
# ==============================================================================
set -euo pipefail

DB_PATH="${1:-/var/www/wop/wop.sqlite}"
BACKUP_DIR="${2:-/var/backups/wop}"
RETENTION_DAYS="${3:-14}"

TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"
BACKUP_FILE="${BACKUP_DIR}/wop_${TIMESTAMP}.sqlite"

# Sicherstellen, dass das Backup-Verzeichnis existiert
mkdir -p "${BACKUP_DIR}"

if [ ! -f "${DB_PATH}" ]; then
    echo "❌ Fehler: Datenbankdatei nicht gefunden unter: ${DB_PATH}" >&2
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔄 Starte konsistentes SQLite-Online-Backup..."

# Online-Backup via sqlite3 CLI (garantiert atomare Konsistenz auch im laufenden WAL-Betrieb)
if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "${DB_PATH}" ".backup '${BACKUP_FILE}'"
else
    # Fallback falls sqlite3 CLI nicht installiert ist (VACUUM INTO via Node oder Kopie)
    node -e "
        import sqlite3 from 'sqlite3';
        const db = new sqlite3.Database('${DB_PATH}');
        db.run(\"VACUUM INTO '${BACKUP_FILE}'\", (err) => {
            if (err) { console.error(err); process.exit(1); }
            db.close();
        });
    "
fi

# Komprimieren mit gzip
gzip -f "${BACKUP_FILE}"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Backup erfolgreich erstellt: ${BACKUP_FILE}.gz ($(du -h "${BACKUP_FILE}.gz" | cut -f1))"

# Alte Backups rotieren (standardmäßig älter als 14 Tage bereinigen)
DELETED_COUNT="$(find "${BACKUP_DIR}" -type f -name "wop_*.sqlite.gz" -mtime +"${RETENTION_DAYS}" -print -delete | wc -l || true)"
if [ "${DELETED_COUNT}" -gt 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🧹 ${DELETED_COUNT} veraltete(s) Backup(s) (> ${RETENTION_DAYS} Tage) gelöscht."
fi
