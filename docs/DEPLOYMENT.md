# Deployment-Leitfaden: Server & Nginx Setup für `www.wop.omoflow.de`

Dieser Leitfaden beschreibt die Inbetriebnahme auf dem Produktivserver (Ubuntu / Debian).

---

## 1. Voraussetzungen

- **Node.js:** v20+ oder v22+
- **PM2:** Global installiert (`npm install -g pm2`)
- **Nginx:** Webserver / Reverse Proxy
- **Certbot:** Für automatische SSL-Zertifikate von Let's Encrypt
- **DNS-Eintrag:**
  - `A`-Record für `www.wop.omoflow.de` ➔ IP deines Servers
  - `A`-Record für `wop.omoflow.de` ➔ IP deines Servers (optional für Redirect)

---

## 2. Projekt auf dem Server klonen & vorbereiten

```bash
# In das Zielverzeichnis wechseln (z. B. /var/www/wop oder ~/apps/wop)
cd /var/www
git clone https://github.com/<DEIN-REPO>/Wahrheit-oder-Pflicht-Partyspiel.git wop
cd wop

# Branch auschecken
git checkout feat/ws-server

# Abhängigkeiten installieren
npm install --production

# .env Datei anlegen
cat << 'EOF' > .env
PORT=3002
NODE_ENV=production
CORS_ORIGIN=https://www.wop.omoflow.de,https://wop.omoflow.de
DATABASE_PATH=./wop.sqlite
EOF
```

---

## 3. PM2 Prozess starten

```bash
# Starten über die fertige Konfigurationsdatei
pm2 start ecosystem.config.cjs

# Autostart bei Server-Neustart sichern
pm2 save
pm2 startup
```

Status prüfen:
```bash
pm2 status
pm2 logs wop-server
```

---

## 4. Nginx Konfiguration einrichten

1. Konfigurationsdatei auf dem Server anlegen:
   ```bash
   sudo nano /etc/nginx/sites-available/wop.omoflow.de
   ```

2. Inhalt aus [nginx-wop.conf](file:///Users/christianheinrich/Projekts/Wahrheit-oder-Pflicht-Partyspiel/nginx-wop.conf) einfügen:

```nginx
# HTTP -> HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name www.wop.omoflow.de wop.omoflow.de;

    return 301 https://$host$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.wop.omoflow.de wop.omoflow.de;

    # SSL Zertifikate (von Certbot generiert)
    # ssl_certificate /etc/letsencrypt/live/www.wop.omoflow.de/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/www.wop.omoflow.de/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Gzip Kompression für schnelle Ladezeiten
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Maximale Upload-Größe
    client_max_body_size 10M;

    # Statische Frontend-Dateien & SPA-Fallback über Node-Server
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket-Verbindung für Socket.io
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3002/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Längeres Timeout für dauerhafte WebSocket-Sessions
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

3. Site aktivieren und Nginx prüfen:
   ```bash
   sudo ln -s /etc/nginx/sites-available/wop.omoflow.de /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. SSL-Zertifikat via Let's Encrypt einrichten:
   ```bash
   sudo certbot --nginx -d www.wop.omoflow.de -d wop.omoflow.de
   ```

---

## 5. Healthcheck & Verifikation

```bash
# Lokaler Test auf dem Server:
curl -I http://127.0.0.1:3002/api/health

# Externer Test über Domain:
curl -I https://www.wop.omoflow.de/api/health
```

