# Deployment Guide

Step-by-step instructions for deploying Research 4 Students on an Ubuntu VPS
using **Nginx** as a reverse proxy and **PM2** as a process manager.

---

## Prerequisites

Before starting, make sure the following are in place:

- Ubuntu 20.04 or 22.04 (fresh or existing VPS)
- A domain name with an **A record** pointing to your VPS public IP
- Root or sudo access on the server
- Git installed (`sudo apt install -y git`)

**Install Node.js 18+ via nvm:**

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Install and activate Node.js 18
nvm install 18
nvm use 18

# Verify
node -v && npm -v
```

**Install PM2 and Nginx:**

```bash
# PM2 — process manager for Node.js
npm install -g pm2

# Nginx — reverse proxy and static file server
sudo apt update && sudo apt install -y nginx
```

---

## 1. Clone and Install

```bash
git clone https://github.com/your-username/research4students.git
cd research4students

# Install backend dependencies (production only)
cd server && npm install --production
cd ..

# Install frontend dependencies and build for production
cd client && npm install && npm run build
cd ..
```

The build output will be at `client/dist/` — this is what Nginx will serve.

---

## 2. Configure Environment Variables

```bash
cd server
cp .env.example .env
nano .env
```

Fill in all values in `.env`:

```env
PORT=5000
NODE_ENV=production
ACCESS_TOKEN_SECRET=your_access_secret_here
REFRESH_TOKEN_SECRET=your_refresh_secret_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password_here
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=your_discord_channel_id
```

> ⚠️ **Warning:** Never use weak or default secrets in production. Generate strong random secrets with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```
> Run this twice — once for `ACCESS_TOKEN_SECRET`, once for `REFRESH_TOKEN_SECRET`.

---

## 3. Start Backend with PM2

```bash
cd /path/to/research4students/server

# Start the Express server as a named PM2 process
pm2 start src/app.js --name "r4s-backend"

# Save process list so it survives reboots
pm2 save

# Register PM2 as a system startup service
pm2 startup
```

Follow the output of `pm2 startup` — it will print a `sudo` command you need to run once to finalize the service registration.

**Useful PM2 commands:**

| Command | Description |
|---|---|
| `pm2 status` | Check all running processes |
| `pm2 logs r4s-backend` | Stream live logs |
| `pm2 logs r4s-backend --lines 100` | View last 100 log lines |
| `pm2 restart r4s-backend` | Restart the backend |
| `pm2 stop r4s-backend` | Stop the backend |
| `pm2 delete r4s-backend` | Remove the process from PM2 |

---

## 4. Configure Nginx

Nginx serves the React build as static files and proxies `/api` and `/socket.io`
requests to the Node.js backend running on port 5000.

**Create the site config:**

```bash
sudo nano /etc/nginx/sites-available/research4students
```

Paste the following — replace `YOUR_DOMAIN` with your actual domain name:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN www.YOUR_DOMAIN;

    # Serve React frontend (built static files)
    root /var/www/research4students/client/dist;
    index index.html;

    # Handle React Router — unknown paths fall back to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Express backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy Socket.io — WebSocket upgrade is required
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve legacy local uploads (pre-Discord files)
    location /uploads/ {
        alias /var/www/research4students/server/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

**Deploy the project files and activate the site:**

```bash
# Copy the entire project to the web root
sudo mkdir -p /var/www/research4students
sudo cp -r /path/to/research4students/. /var/www/research4students

# Enable the site by creating a symlink
sudo ln -s /etc/nginx/sites-available/research4students \
           /etc/nginx/sites-enabled/

# Remove the default placeholder site to avoid conflicts
sudo rm -f /etc/nginx/sites-enabled/default

# Validate the Nginx configuration syntax
sudo nginx -t

# Apply the new configuration
sudo systemctl reload nginx
```

> ✅ The site should now be accessible at `http://YOUR_DOMAIN`

---

## 5. Enable SSL with Certbot (HTTPS)

```bash
# Install Certbot with the Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Issue a certificate and let Certbot auto-configure Nginx for HTTPS
sudo certbot --nginx -d YOUR_DOMAIN -d www.YOUR_DOMAIN

# Verify that automatic renewal works
sudo certbot renew --dry-run
```

Certbot will automatically modify your Nginx config to redirect HTTP → HTTPS
and schedule a renewal cron job. Certificates are renewed every 90 days without
any manual intervention.

After SSL is active, confirm `NODE_ENV` is set correctly in `server/.env`:

```env
NODE_ENV=production
```

Then restart the backend to apply any environment changes:

```bash
pm2 restart r4s-backend
```

> ✅ Your site is now live and secured at `https://YOUR_DOMAIN`

---

## 6. Redeployment

Use this workflow whenever you push updates to the live server:

```bash
cd /var/www/research4students

# Pull the latest code
git pull origin main

# Rebuild the frontend
cd client && npm install && npm run build && cd ..

# Update backend dependencies if package.json changed
cd server && npm install --production && cd ..

# Restart the backend process
pm2 restart r4s-backend

# Reload Nginx only if the Nginx config itself changed
sudo systemctl reload nginx
```

> **Note:** The frontend is served as static files, so changes only take effect
> after `npm run build` and a Nginx reload. The backend picks up changes after
> `pm2 restart`.

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| **502 Bad Gateway** | Backend not running | `pm2 status` → `pm2 restart r4s-backend` |
| **WebSocket connection failed** | Missing `Upgrade` header in Nginx | Check the `/socket.io/` location block |
| **Static files not updating** | Old build still cached | Rebuild client: `npm run build`, then `sudo systemctl reload nginx` |
| **SSL certificate not renewing** | Certbot cron not registered | Run `sudo certbot renew --dry-run` to diagnose |
| **Discord bot not connecting** | Wrong token or channel ID | Check `server/.env`, then `pm2 logs r4s-backend` |
| **404 on page refresh** | React Router paths not handled | Confirm `try_files $uri $uri/ /index.html` is in the Nginx config |
| **Permission denied on `/uploads/`** | Wrong file ownership | `sudo chown -R www-data:www-data /var/www/research4students/server/uploads` |
