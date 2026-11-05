#!/usr/bin/env bash
# ==============================================================================
# Automatisiertes SQLite-Wiederherstellungsskript für Wahrheit oder Pflicht
# ==============================================================================
set -euo pipefail

BACKUP_FILE="${1:-}"
DB_PATH="${2:-/var/www/wop/wop.sqlite}"
BACKUP_DIR="${3:-/var/backups/wop}"

# Wenn kein konkretes Backup angegeben wurde: automatisch das neueste wählen
if [ -z "${BACKUP_FILE}" ]; then
    BACKUP_FILE="$(ls -t "${BACKUP_DIR}"/wop_*.sqlite.gz 2>/dev/null | head -n 1 || true)"
    if [ -z "${BACKUP_FILE}" ]; then
        echo "❌ Kein Backup unter ${BACKUP_DIR} gefunden!" >&2
        echo "Verfügbare Backups anzeigen mit: ls -lh ${BACKUP_DIR}" >&2
        exit 1
    fi
    echo "ℹ️ Kein Backup angegeben – verwende automatisch das neueste Backup:"
    echo "   📁 ${BACKUP_FILE}"
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ Angegebene Backup-Datei existiert nicht: ${BACKUP_FILE}" >&2
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🛑 Stoppe Server-Prozess vor Wiederherstellung..."
if sudo -n -u admin_ch pm2 status >/dev/null 2>&1; then
    sudo -u admin_ch pm2 stop wop-server || true
elif command -v pm2 >/dev/null 2>&1; then
    pm2 stop wop-server || true
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🧹 Bereinige temporäre SQLite WAL/SHM-Dateien..."
rm -f "${DB_PATH}-wal" "${DB_PATH}-shm"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 📦 Entpacke und stelle Datenbank wieder her..."
gunzip -c "${BACKUP_FILE}" > "${DB_PATH}"
chmod 664 "${DB_PATH}" 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🚀 Starte Server-Prozess wieder..."
if sudo -n -u admin_ch pm2 status >/dev/null 2>&1; then
    sudo -u admin_ch pm2 start wop-server || true
elif command -v pm2 >/dev/null 2>&1; then
    pm2 start wop-server || true
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Wiederherstellung erfolgreich abgeschlossen!"
echo "Die Benutzerkonten, Spielstände und Statistiken entsprechen nun dem Stand des Backups."
