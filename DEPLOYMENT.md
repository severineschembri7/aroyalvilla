# VPS Deployment Guide for africanroyalvilla.co.tz

This project is a TanStack Start/Vite application built for a Node server. Use this guide to deploy it safely on the VPS that serves `africanroyalvilla.co.tz`.

## 1. Server requirements

- Ubuntu/Debian VPS with SSH access.
- Node.js 22 LTS.
- npm 10 or newer.
- Nginx as the public reverse proxy.
- PM2 or systemd to keep the Node server running.
- DNS A record for `africanroyalvilla.co.tz` pointing to the VPS public IP.

## 2. One-time VPS setup

```bash
sudo apt update
sudo apt install -y nginx git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Create an app folder:

```bash
sudo mkdir -p /var/www/africanroyalvilla
sudo chown -R $USER:$USER /var/www/africanroyalvilla
```

Clone the repository or pull the connected branch into that folder:

```bash
cd /var/www/africanroyalvilla
git clone YOUR_REPOSITORY_URL app
cd app
```

## 3. Environment file

Create `.env` on the VPS. Do not commit this file.

```bash
nano .env
```

Add the Supabase/Lovable environment variables used by the project, for example:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

## 4. Install, build, and run

Use `npm install` for this project, then build and start:

```bash
cd /var/www/africanroyalvilla/app
npm install
npm run build
npm run start
```

The `start` script runs the built Nitro server from `.output/server/index.mjs`.

## 5. Keep the app online with PM2

```bash
sudo npm install -g pm2
cd /var/www/africanroyalvilla/app
pm2 start npm --name africanroyalvilla -- run start
pm2 save
pm2 startup
```

After `pm2 startup`, run the command PM2 prints.

Useful commands:

```bash
pm2 status
pm2 logs africanroyalvilla
pm2 restart africanroyalvilla
```

## 6. Nginx configuration

Create the Nginx site file:

```bash
sudo nano /etc/nginx/sites-available/africanroyalvilla.co.tz
```

Use this configuration, replacing `3000` if your runtime uses another port:

```nginx
server {
    listen 80;
    server_name africanroyalvilla.co.tz www.africanroyalvilla.co.tz;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/africanroyalvilla.co.tz /etc/nginx/sites-enabled/africanroyalvilla.co.tz
sudo nginx -t
sudo systemctl reload nginx
```

## 7. HTTPS certificate

Install Certbot and request SSL:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d africanroyalvilla.co.tz -d www.africanroyalvilla.co.tz
```

## 8. Updating live after future changes

```bash
cd /var/www/africanroyalvilla/app
git pull origin YOUR_BRANCH_NAME
npm install
npm run build
pm2 restart africanroyalvilla
```

Then test:

```bash
curl -I https://africanroyalvilla.co.tz
pm2 logs africanroyalvilla --lines 100
```

## 9. Staff operations browser test

After deployment, open:

- `https://africanroyalvilla.co.tz/`
- `https://africanroyalvilla.co.tz/login`
- `https://africanroyalvilla.co.tz/system`

If no staff account exists in local fallback storage, `/system` shows the first-run management setup. In production, prefer using Supabase-backed staff profiles and environment-approved staff emails/roles.

## 10. Rollback plan

If the release causes trouble:

```bash
cd /var/www/africanroyalvilla/app
git log --oneline -5
git checkout PREVIOUS_GOOD_COMMIT
npm install
npm run build
pm2 restart africanroyalvilla
```

Avoid force-pushing or rewriting published Git history because this project is connected to Lovable.
